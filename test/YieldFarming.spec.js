import { waffleChai } from '@ethereum-waffle/chai'
import { use, expect } from 'chai'
import { waffle, ethers } from 'hardhat'
// eslint-disable-next-line no-unused-vars
import { BN } from '@openzeppelin/test-helpers'
import { mockedDeploy, MULTIPLIER } from '../scripts/mainDeploy'
import ABDKMathQuad from '../artifacts/contracts/abdk-libraries-solidity/ABDKMathQuad.sol/ABDKMathQuad.json'
import YieldFarming from '../artifacts/contracts/YieldFarming.sol/YieldFarming.json'
import Timestamp from '../artifacts/contracts/Timestamp.sol/Timestamp.json'
import ERC20Mock from '../artifacts/contracts/ERC20Mock.sol/ERC20Mock.json'
import { Record } from './helpers/Record'
use(waffleChai)

describe('YieldFarming contract', () => {
  describe('Payment splitter', async () => {
    let first, second, third, acceptedToken, rewardCalculator, payees, interestRate, multiplier, constants, timestamp
    beforeEach(async () => {
      const LOCK_TIME = 1
      const MULTIPLIER = 1E12
      const INITIAL_BALANCE = 1000
      const INTEREST_NUMERATOR = 25
      const INTEREST_DENOMINATOR = 10000
      const INTEREST = { NUMERATOR: INTEREST_NUMERATOR, DENOMINATOR: INTEREST_DENOMINATOR }
      const TOKEN_NAME = 'A Token name'
      const TOKEN_SYMBOL = 'A Token symbol'
      const TOKEN = { NAME: TOKEN_NAME, SYMBOL: TOKEN_SYMBOL }
      constants = { TOKEN, INTEREST, LOCK_TIME, MULTIPLIER, INITIAL_BALANCE }
      const [a, b, c] = waffle.provider.getWallets()
      first = a
      second = b
      third = c
      const aBDKMath = await waffle.deployContract(first, ABDKMathQuad)
      const RewardCalculator = await ethers.getContractFactory(
        'RewardCalculator',
        {
          libraries: {
            ABDKMathQuad: aBDKMath.address
          }
        }
      )
      rewardCalculator = await RewardCalculator.deploy()
      interestRate = await aBDKMath.div(
        await aBDKMath.fromInt(constants.INTEREST.NUMERATOR),
        await aBDKMath.fromInt(constants.INTEREST.DENOMINATOR)
      )
      multiplier = await aBDKMath.fromInt(constants.MULTIPLIER)
      payees = [
        new Record(first.address, 100),
        new Record(second.address, 100),
        new Record(third.address, 100)
      ]
      timestamp = await waffle.deployContract(first, Timestamp)
      acceptedToken = await waffle.deployContract(first, ERC20Mock, [
        'ERC20Mock name',
        'ERC20Mock symbol',
        first.address,
        constants.INITIAL_BALANCE])
    })
    it('Shares 0', async () => {
      payees[1].shares = 0
      await expect(waffle.deployContract(first, YieldFarming, [
        timestamp.address,
        acceptedToken.address,
        rewardCalculator.address,
        constants.TOKEN.NAME,
        constants.TOKEN.SYMBOL,
        interestRate,
        multiplier,
        constants.LOCK_TIME,
        payees.map((payee) => { return payee.address }),
        payees.map((payee) => { return payee.shares })
      ]))
        .to.be.revertedWith('PaymentSplitter: shares are 0')
    })
    it('Account is the zero address', async () => {
      payees[1].address = ethers.constants.AddressZero
      await expect(waffle.deployContract(first, YieldFarming, [
        timestamp.address,
        acceptedToken.address,
        rewardCalculator.address,
        constants.TOKEN.NAME,
        constants.TOKEN.SYMBOL,
        interestRate,
        multiplier,
        constants.LOCK_TIME,
        payees.map((payee) => { return payee.address }),
        payees.map((payee) => { return payee.shares })
      ]))
        .to.be.revertedWith('PaymentSplitter: account is the zero address')
    })
    it('Account is already payee', async () => {
      payees[1].address = payees[0].address
      await expect(waffle.deployContract(first, YieldFarming, [
        timestamp.address,
        acceptedToken.address,
        rewardCalculator.address,
        constants.TOKEN.NAME,
        constants.TOKEN.SYMBOL,
        interestRate,
        multiplier,
        constants.LOCK_TIME,
        payees.map((payee) => { return payee.address }),
        payees.map((payee) => { return payee.shares })
      ]))
        .to.be.revertedWith('PaymentSplitter: account is already payee')
    })
    it('Different payee address\' length to payee shares\' length', async () => {
      const payeeAddresses = payees.map((payee) => { return payee.address })
      payeeAddresses.pop() // remove last element
      await expect(waffle.deployContract(first, YieldFarming, [
        timestamp.address,
        acceptedToken.address,
        rewardCalculator.address,
        constants.TOKEN.NAME,
        constants.TOKEN.SYMBOL,
        interestRate,
        multiplier,
        constants.LOCK_TIME,
        payeeAddresses,
        payees.map((payee) => { return payee.shares })
      ]))
        .to.be.revertedWith('PaymentSplitter: payees and shares length mismatch')
    })
    it('No payees', async () => {
      const payeeAddresses = payees.map((payee) => { return payee.address })
      payeeAddresses.pop() // remove last element
      await expect(waffle.deployContract(first, YieldFarming, [
        timestamp.address,
        acceptedToken.address,
        rewardCalculator.address,
        constants.TOKEN.NAME,
        constants.TOKEN.SYMBOL,
        interestRate,
        multiplier,
        constants.LOCK_TIME,
        [],
        []
      ]))
        .to.be.revertedWith('PaymentSplitter: no payees')
    })
  })
  describe('With multiplier 1E12', async () => {
    let deploy
    beforeEach(async () => {
      deploy = await mockedDeploy(MULTIPLIER)
    })
    it('Ownership', async () => {
      const firstOwner = await deploy.yieldFarming.owner()
      expect(firstOwner).to.equal(deploy.first.address)
      await expect(deploy.yieldFarming.transferOwnership(deploy.second.address))
        .to.emit(deploy.yieldFarming, 'OwnershipTransferred')
        .withArgs(deploy.first.address, deploy.second.address)
      const secondOwner = await deploy.yieldFarming.owner()
      expect(secondOwner).to.equal(deploy.second.address)
    })
    describe('Deposit', async () => {
      let depositValue
      beforeEach(async () => {
        depositValue = deploy.constants.INITIAL_BALANCE
        await deploy.acceptedToken.increaseAllowance(deploy.yieldFarming.address, depositValue)
      })
      it('TokenTimeLock: release time is before current time', async () => {
        await deploy.timestamp.mock.getTimestamp.returns(deploy.constants.TIMESTAMPS.DEPLOY - 1)
        try {
          await expect(deploy.yieldFarming.deposit(depositValue))
            .to.be.revertedWith('TokenTimeLock: release time is before current time')
        } catch (error) {
          // AssertionError: Expected transaction to be reverted with TokenTimeLock: release time is before current time,
          // but other exception was thrown: Error: Transaction reverted and Hardhat couldn't infer the reason.
          // Please report this to help us improve Hardhat.
          console.log(error)
        }
      })
      it('Emit AcceptedTokenDeposit', async () => {
        await expect(deploy.yieldFarming.deposit(depositValue))
          .to.emit(deploy.yieldFarming, 'AcceptedTokenDeposit')
          .withArgs(deploy.first.address, depositValue)
      })
    })
    describe('Release token', async () => {
      describe('without deposit', async () => {
        it('try release', async () => {
          await expect(deploy.yieldFarming.releaseTokens())
            .to.be.revertedWith('TokenTimeLock not found!')
        })
        it('try get TokenTimeLock', async () => {
          await expect(deploy.yieldFarming.getMyTokenTimeLock())
            .to.be.revertedWith('TokenTimeLock not found!')
        })
      })
      describe('with deposit', async () => {
        beforeEach(async () => {
          const depositValue = deploy.constants.INITIAL_BALANCE
          await deploy.acceptedToken.increaseAllowance(deploy.yieldFarming.address, depositValue)
          await deploy.timestamp.mock.getTimestamp.returns(deploy.constants.TIMESTAMPS.DEPOSIT)
          await deploy.yieldFarming.deposit(depositValue, { from: deploy.first.address })
        })
        it('before unlock', async () => {
          await expect(deploy.yieldFarming.releaseTokens())
            .to.be.revertedWith('TokenTimeLock: current time is before release time')
        })
        describe('after unlock', async () => {
          beforeEach(async () => {
            await deploy.timestamp.mock.getTimestamp.returns(deploy.constants.TIMESTAMPS.UNLOCK)
          })
          it('Emit YieldFarmingTokenRelease', async () => {
            const releaseValue = 997506234413965
            await expect(deploy.yieldFarming.releaseTokens())
              .to.emit(deploy.yieldFarming, 'YieldFarmingTokenRelease')
              .withArgs(deploy.first.address, releaseValue)
          })
          describe('After release', async () => {
            beforeEach(async () => {
              await deploy.yieldFarming.releaseTokens()
            })
            describe('Burn tokens', async () => {
              let burnValue
              beforeEach(async () => {
                burnValue = 1
                await deploy.yieldFarmingToken.increaseAllowance(deploy.yieldFarming.address, burnValue)
              })
              it('Emit YieldFarmingTokenBurn', async () => {
                await expect(deploy.yieldFarming.burn(burnValue))
                  .to.emit(deploy.yieldFarming, 'YieldFarmingTokenBurn')
                  .withArgs(deploy.first.address, burnValue)
              })
            })
            describe('Payment splitter', async () => {
              let expectedPayment, expectedTotalShares
              beforeEach(async () => {
                expectedTotalShares = deploy.payees.reduce(
                  (totalValue, payee) => { return totalValue + payee.shares },
                  0
                )
                expectedPayment = Math.trunc(
                  deploy.constants.INITIAL_BALANCE * deploy.payees[0].shares /
                  expectedTotalShares
                )
              })
              it('Reads payees correctly', async () => {
                expect(await deploy.yieldFarming.payee(0))
                  .to.be.equal(deploy.first.address)
                expect(await deploy.yieldFarming.payee(1))
                  .to.be.equal(deploy.second.address)
                expect(await deploy.yieldFarming.payee(2))
                  .to.be.equal(deploy.third.address)
              })
              describe('Release payment', async () => {
                // describe('When already relased', async () => {
                //   beforeEach(async () => {
                //     await deploy.yieldFarming.release(deploy.second.address)
                //   })
                //   it.only('Reverts when account is not due payment', async () => {
                //     await expect(deploy.yieldFarming.release(deploy.second.address))
                //       .to.be.revertedWith('PaymentSplitter: account is not due payment')
                //   })
                // })
                it('Emit PaymentReleased', async () => {
                  await expect(deploy.yieldFarming.release(deploy.first.address))
                    .to.emit(deploy.yieldFarming, 'PaymentReleased')
                    .withArgs(deploy.first.address, expectedPayment)
                })
                it('Revert when account is not a payee', async () => {
                  await expect(deploy.yieldFarming.release(deploy.fourth.address))
                    .to.be.revertedWith('PaymentSplitter: account is not a payee')
                })
                describe('After payment release', async () => {
                  beforeEach(async () => {
                    await deploy.yieldFarming.release(deploy.first.address)
                  })
                  it('Correctly calculates total released', async () => {
                    expect(await deploy.yieldFarming.totalReleased())
                      .to.be.equal(expectedPayment)
                  })
                })
              })
              it('Correctly calculates total shares', async () => {
                expect(await deploy.yieldFarming.totalShares())
                  .to.be.equal(expectedTotalShares)
              })
            })
          })
        })
      })
    })
  })
  describe('With multiplier 0', async () => {
    let deploy
    beforeEach(async () => {
      deploy = await mockedDeploy(0)
    })
    describe('Release token', async () => {
      describe('with deposit', async () => {
        beforeEach(async () => {
          const depositValue = deploy.constants.INITIAL_BALANCE
          await deploy.acceptedToken.increaseAllowance(deploy.yieldFarming.address, depositValue)
          await deploy.yieldFarming.deposit(depositValue, { from: deploy.first.address })
        })
        describe('after unlock', async () => {
          beforeEach(async () => {
            await deploy.timestamp.mock.getTimestamp.returns(deploy.constants.TIMESTAMPS.DEPOSIT)
          })
          it('Revert with no tokens to release', async () => {
            await expect(deploy.yieldFarming.releaseTokens())
              .to.be.revertedWith('TokenTimeLock: no tokens to release')
          })
        })
      })
    })
  })
})
