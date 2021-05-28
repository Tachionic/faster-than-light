import { waffleChai } from '@ethereum-waffle/chai'
import { ethers, waffle } from 'hardhat'
import { use, expect } from 'chai'
// eslint-disable-next-line no-unused-vars
import { BN } from '@openzeppelin/test-helpers'
import ABDKMathQuad from '../artifacts/contracts/abdk-libraries-solidity/ABDKMathQuad.sol/ABDKMathQuad.json'
import YieldFarming from '../artifacts/contracts/YieldFarming.sol/YieldFarming.json'
import ERC20Mock from '../artifacts/contracts/ERC20Mock.sol/ERC20Mock.json'
import Timestamp from '../artifacts/contracts/Timestamp.sol/Timestamp.json'
use(waffleChai)

const mainDeploy = async (_multiplier) => {
  const INITIAL_BALANCE = 1000
  const DEPLOY_TIMESTAMP = 1
  const DEPOSIT_TIMESTAMP = DEPLOY_TIMESTAMP + 24 * 60 * 60 // one day later
  const UNLOCK_TIMESTAMP = DEPOSIT_TIMESTAMP + 24 * 60 * 60 // one day later
  const TIMEOUT = 1
  // eslint-disable-next-line no-unused-vars
  const [first, second, third] = waffle.provider.getWallets()
  const timestampMock = await waffle.deployMockContract(first, Timestamp.abi)
  await timestampMock.mock.getTimestamp.returns(DEPLOY_TIMESTAMP)
  expect(await timestampMock.getTimestamp()).to.be.bignumber.equal(DEPLOY_TIMESTAMP)
  const acceptedToken = await waffle.deployContract(first, ERC20Mock, [
    'ERC20Mock name',
    'ERC20Mock symbol',
    first.address,
    INITIAL_BALANCE])
  const aBDKMath = await waffle.deployContract(first, ABDKMathQuad)
  const RewardCalculator = await ethers.getContractFactory(
    'RewardCalculator',
    {
      libraries: {
        ABDKMathQuad: aBDKMath.address
      }
    }
  )
  const rewardCalculator = await RewardCalculator.deploy()
  const tokenName = 'A token name'
  const tokenSymbol = 'A token symbol'
  const interestRate = await aBDKMath.div(
    await aBDKMath.fromInt(25),
    await aBDKMath.fromInt(10000)
  )
  const multiplier = await aBDKMath.fromInt(_multiplier)
  const lockTime = TIMEOUT
  class Record {
    constructor (address, shares) {
      this.address = address
      this.shares = shares
    }
  }
  const payees = [new Record(first.address, 100), new Record(second.address, 100), new Record(third.address, 100)]
  const yieldFarming = await waffle.deployContract(first, YieldFarming, [
    timestampMock.address,
    acceptedToken.address,
    rewardCalculator.address,
    tokenName,
    tokenSymbol,
    interestRate,
    multiplier,
    lockTime,
    payees.map((payee) => { return payee.address }),
    payees.map((payee) => { return payee.shares })
  ])
  const YieldFarmingToken = await ethers.getContractFactory('YieldFarmingToken')
  const yieldFarmingToken = await YieldFarmingToken.attach(await yieldFarming.yieldFarmingToken())
  return { acceptedToken, first, second, third, yieldFarming, yieldFarmingToken, timestampMock, payees, INITIAL_BALANCE, DEPLOY_TIMESTAMP, DEPOSIT_TIMESTAMP, UNLOCK_TIMESTAMP }
}

describe('YieldFarming contract', () => {
  describe('With multiplier 1E12', async () => {
    let deploy
    beforeEach(async () => {
      deploy = await mainDeploy(1E12)
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
        depositValue = deploy.INITIAL_BALANCE
        await deploy.acceptedToken.increaseAllowance(deploy.yieldFarming.address, depositValue)
      })
      it('TokenTimeLock: release time is before current time', async () => {
        await deploy.timestampMock.mock.getTimestamp.returns(deploy.DEPLOY_TIMESTAMP - 1)
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
          const depositValue = deploy.INITIAL_BALANCE
          await deploy.acceptedToken.increaseAllowance(deploy.yieldFarming.address, depositValue)
          await deploy.timestampMock.mock.getTimestamp.returns(deploy.DEPOSIT_TIMESTAMP)
          await deploy.yieldFarming.deposit(depositValue, { from: deploy.first.address })
        })
        it('before unlock', async () => {
          await expect(deploy.yieldFarming.releaseTokens())
            .to.be.revertedWith('TokenTimeLock: current time is before release time')
        })
        describe('after unlock', async () => {
          beforeEach(async () => {
            await deploy.timestampMock.mock.getTimestamp.returns(deploy.UNLOCK_TIMESTAMP)
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
            describe('Pull payment', async () => {
              let expectedPayment
              beforeEach(async () => {
                expectedPayment = Math.trunc(
                  deploy.INITIAL_BALANCE * deploy.payees[0].shares /
                  deploy.payees.reduce(
                    (totalValue, payee) => { return totalValue + payee.shares },
                    0
                  )
                )
              })
              it('Emit PaymentReleased', async () => {
                await expect(deploy.yieldFarming.release(deploy.first.address))
                  .to.emit(deploy.yieldFarming, 'PaymentReleased')
                  .withArgs(deploy.first.address, expectedPayment)
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
      deploy = await mainDeploy(0)
    })
    describe('Release token', async () => {
      describe('with deposit', async () => {
        beforeEach(async () => {
          const depositValue = deploy.INITIAL_BALANCE
          await deploy.acceptedToken.increaseAllowance(deploy.yieldFarming.address, depositValue)
          await deploy.yieldFarming.deposit(depositValue, { from: deploy.first.address })
        })
        describe('after unlock', async () => {
          beforeEach(async () => {
            await deploy.timestampMock.mock.getTimestamp.returns(deploy.DEPOSIT_TIMESTAMP)
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
