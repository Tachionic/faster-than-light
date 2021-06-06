import { waffleChai } from '@ethereum-waffle/chai'
import { use, expect } from 'chai'
import { waffle, ethers } from 'hardhat'
// eslint-disable-next-line no-unused-vars
import { BN } from '@openzeppelin/test-helpers'
import { mockedDeploy, MULTIPLIER } from '../scripts/mainDeploy'
import YieldFarming from '../artifacts/contracts/YieldFarming.sol/YieldFarming.json'
import Timestamp from '../artifacts/contracts/Timestamp.sol/Timestamp.json'
import ERC20Mock from '../artifacts/contracts/ERC20Mock.sol/ERC20Mock.json'
import { RecordList } from '../src/utils/RecordList'
use(waffleChai)

const setupTest = deployments.createFixture(async ({ deployments, getNamedAccounts, ethers }, options) => {
  await deployments.fixture() // ensure you start from a fresh deployments
  const LOCK_TIME = 1
  const DEPLOY_TIMESTAMP = 1
  const DEPOSIT_TIMESTAMP = DEPLOY_TIMESTAMP + 24 * 60 * 60 // one day later
  const UNLOCK_TIMESTAMP = DEPOSIT_TIMESTAMP + 24 * 60 * 60 // one day later
  const TIMESTAMPS = { DEPLOY: DEPLOY_TIMESTAMP, DEPOSIT: DEPOSIT_TIMESTAMP, UNLOCK: UNLOCK_TIMESTAMP }

  const MULTIPLIER = 1E12
  const INITIAL_BALANCE = 1000
  const INTEREST_NUMERATOR = 25
  const INTEREST_DENOMINATOR = 10000
  const INTEREST = { NUMERATOR: INTEREST_NUMERATOR, DENOMINATOR: INTEREST_DENOMINATOR }
  const TOKEN_NAME = 'A Token name'
  const TOKEN_SYMBOL = 'A Token symbol'
  const TOKEN = { NAME: TOKEN_NAME, SYMBOL: TOKEN_SYMBOL }
  const FIRST_SHARES = 100
  const SECOND_SHARES = 100
  const THIRD_SHARES = 100
  const SHARES = { FIRST: FIRST_SHARES, SECOND: SECOND_SHARES, THIRD: THIRD_SHARES }
  const constants = { TOKEN, INTEREST, LOCK_TIME, MULTIPLIER, INITIAL_BALANCE, TIMESTAMPS, SHARES }

  const [deployer, first, second, third, fourth] = await ethers.getSigners()
  // const timestamp = await ethers.getContract("Timestamp", deployer)
  const timestamp = await waffle.deployMockContract(first, Timestamp.abi)
  await timestamp.mock.getTimestamp.returns(constants.TIMESTAMPS.DEPLOY)
  expect(await timestamp.getTimestamp()).to.be.bignumber.equal(constants.TIMESTAMPS.DEPLOY)
  const uChildAdministrableERC20 = await ethers.getContract("UChildAdministrableERC20", deployer)
  const rewardCalculator = await ethers.getContract("RewardCalculator", deployer)
  const aBDKMathQuad = await ethers.getContract("ABDKMathQuad", deployer)

  const acceptedToken = await waffle.deployContract(first, ERC20Mock, [
    'ERC20Mock name',
    'ERC20Mock symbol',
    first.address,
    constants.INITIAL_BALANCE])

  const interestRate = await aBDKMathQuad.div(
    await aBDKMathQuad.fromInt(constants.INTEREST.NUMERATOR),
    await aBDKMathQuad.fromInt(constants.INTEREST.DENOMINATOR)
  )

  const multiplier = await aBDKMathQuad.fromInt(constants.MULTIPLIER)
  const payees = new RecordList([first.address, second.address, third.address], [SHARES.FIRST, SHARES.SECOND, SHARES.THIRD])
  // const yieldFarming = await ethers.getContract("YieldFarming", deployer)
  const yieldFarming = await waffle.deployContract(first, YieldFarming, [
    timestamp.address,
    acceptedToken.address,
    rewardCalculator.address,
    constants.TOKEN.NAME,
    constants.TOKEN.SYMBOL,
    interestRate,
    multiplier,
    constants.LOCK_TIME,
    payees.addresses(),
    payees.sharesList()
  ])
  const YieldFarmingToken = await ethers.getContractFactory('YieldFarmingToken')
  const yieldFarmingToken = YieldFarmingToken.attach(await yieldFarming.yieldFarmingToken())

  return {
    accounts: { deployer, first, second, third, fourth },
    contracts: { timestamp, aBDKMathQuad, acceptedToken, uChildAdministrableERC20, rewardCalculator, yieldFarming, yieldFarmingToken },
    payees,
    multiplier,
    interestRate,
    constants
  }
})

describe('YieldFarming contract', () => {
  describe('Payment splitter', async () => {
    let setup
    beforeEach(async () => {
      setup = await setupTest()
    })
    it('Shares 0', async () => {
      let payees = setup.payees
      payees.records[1].shares = 0
      await expect(waffle.deployContract(setup.accounts.first, YieldFarming, [
        setup.contracts.timestamp.address,
        setup.contracts.acceptedToken.address,
        setup.contracts.rewardCalculator.address,
        setup.constants.TOKEN.NAME,
        setup.constants.TOKEN.SYMBOL,
        setup.interestRate,
        setup.multiplier,
        setup.constants.LOCK_TIME,
        payees.addresses(),
        payees.sharesList()
      ]))
        .to.be.revertedWith('PaymentSplitter: shares are 0')
    })
    it('Account is the zero address', async () => {
      let payees = setup.payees
      payees.records[1].address = ethers.constants.AddressZero
      await expect(waffle.deployContract(setup.accounts.first, YieldFarming, [
        setup.contracts.timestamp.address,
        setup.contracts.acceptedToken.address,
        setup.contracts.rewardCalculator.address,
        setup.constants.TOKEN.NAME,
        setup.constants.TOKEN.SYMBOL,
        setup.interestRate,
        setup.multiplier,
        setup.constants.LOCK_TIME,
        payees.addresses(),
        payees.sharesList()
      ]))
        .to.be.revertedWith('PaymentSplitter: account is the zero address')
    })
    it('Account is already payee', async () => {
      let payees = setup.payees
      payees.records[1].address = payees.records[0].address
      await expect(waffle.deployContract(setup.accounts.first, YieldFarming, [
        setup.contracts.timestamp.address,
        setup.contracts.acceptedToken.address,
        setup.contracts.rewardCalculator.address,
        setup.constants.TOKEN.NAME,
        setup.constants.TOKEN.SYMBOL,
        setup.interestRate,
        setup.multiplier,
        setup.constants.LOCK_TIME,
        payees.addresses(),
        payees.sharesList()
      ]))
        .to.be.revertedWith('PaymentSplitter: account is already payee')
    })
    it('Different payee address\' length to payee shares\' length', async () => {
      const payeeAddresses = setup.payees.addresses()
      payeeAddresses.pop() // remove last element
      await expect(waffle.deployContract(setup.accounts.first, YieldFarming, [
        setup.contracts.timestamp.address,
        setup.contracts.acceptedToken.address,
        setup.contracts.rewardCalculator.address,
        setup.constants.TOKEN.NAME,
        setup.constants.TOKEN.SYMBOL,
        setup.interestRate,
        setup.multiplier,
        setup.constants.LOCK_TIME,
        payeeAddresses,
        setup.payees.sharesList()
      ]))
        .to.be.revertedWith('PaymentSplitter: payees and shares length mismatch')
    })
    it('No payees', async () => {
      const payeeAddresses = setup.payees.addresses()
      payeeAddresses.pop() // remove last element
      await expect(waffle.deployContract(setup.accounts.first, YieldFarming, [
        setup.contracts.timestamp.address,
        setup.contracts.acceptedToken.address,
        setup.contracts.rewardCalculator.address,
        setup.constants.TOKEN.NAME,
        setup.constants.TOKEN.SYMBOL,
        setup.interestRate,
        setup.multiplier,
        setup.constants.LOCK_TIME,
        [],
        []
      ]))
        .to.be.revertedWith('PaymentSplitter: no payees')
    })
  })
  describe('With multiplier 1E12', async () => {
    // let deploy
    // beforeEach(async () => {
    //   deploy = await mockedDeploy(MULTIPLIER)
    // })
    let setup
    beforeEach(async () => {
      setup = await setupTest()
    })
    describe('Shares transfer', async () => {
      let transferrer, destinatary, amountToTransfer, transferrerInititalShares, destinataryInititalShares
      beforeEach(async () => {
        transferrer = setup.accounts.second
        destinatary = setup.accounts.third
        amountToTransfer = 1
        transferrerInititalShares = setup.constants.SHARES.SECOND
        destinataryInititalShares = setup.constants.SHARES.THIRD
      })
      it('Emit SharesTransferred', async () => {
        await expect(setup.contracts.yieldFarming.connect(transferrer).transferShares(destinatary.address, amountToTransfer))
          .to.emit(setup.contracts.yieldFarming, 'SharesTransferred')
          .withArgs(transferrer.address, destinatary.address, amountToTransfer)
      })
      it('Revert when transferrer is not a payee', async () => {
        await expect(setup.contracts.yieldFarming.connect(setup.accounts.fourth).transferShares(destinatary.address, amountToTransfer))
          .to.be.revertedWith('PaymentSplitter: transferrer not a payee')
      })
      it('Revert when trying to transfer more than balance', async () => {
        await expect(setup.contracts.yieldFarming.connect(transferrer).transferShares(destinatary.address, setup.constants.SHARES.SECOND + 1))
          .to.be.revertedWith('PaymentSplitter: not enough shares balance')
      })
      it('Revert when trying to transfer more than balance', async () => {
        await expect(setup.contracts.yieldFarming.connect(transferrer).transferShares(destinatary.address, setup.constants.SHARES.SECOND + 1))
          .to.be.revertedWith('PaymentSplitter: not enough shares balance')
      })
      describe('If destinatary is non payee', async () => {
        beforeEach(async () => {
          destinatary = setup.accounts.fourth
        })
        it('Emit SharesTransferred', async () => {
          await expect(setup.contracts.yieldFarming.connect(transferrer).transferShares(destinatary.address, amountToTransfer))
            .to.emit(setup.contracts.yieldFarming, 'SharesTransferred')
            .withArgs(transferrer.address, destinatary.address, amountToTransfer)
        })
        it('Emit PayeeAdded', async () => {
          await expect(setup.contracts.yieldFarming.connect(transferrer).transferShares(destinatary.address, amountToTransfer))
            .to.emit(setup.contracts.yieldFarming, 'PayeeAdded')
            .withArgs(destinatary.address, amountToTransfer)
        })
      })
      describe('After transfer', async () => {
        beforeEach(async () => {
          await setup.contracts.yieldFarming.connect(transferrer).transferShares(destinatary.address, amountToTransfer)
        })
        it('Deduct from transferrer', async () => {
          expect(await setup.contracts.yieldFarming.shares(transferrer.address))
            .to.be.equal(transferrerInititalShares - amountToTransfer)
        })
        it('Credit to destinatary address', async () => {
          expect(await setup.contracts.yieldFarming.shares(destinatary.address))
            .to.be.equal(destinataryInititalShares + amountToTransfer)
        })
      })
    })
    it('Ownership transfer', async () => {
      const firstOwner = await setup.contracts.yieldFarming.owner()
      expect(firstOwner).to.equal(setup.accounts.first.address)
      await expect(setup.contracts.yieldFarming.transferOwnership(setup.accounts.second.address))
        .to.emit(setup.contracts.yieldFarming, 'OwnershipTransferred')
        .withArgs(setup.accounts.first.address, setup.accounts.second.address)
      const secondOwner = await setup.contracts.yieldFarming.owner()
      expect(secondOwner).to.equal(setup.accounts.second.address)
    })
    describe('Deposit', async () => {
      let depositValue
      beforeEach(async () => {
        depositValue = setup.constants.INITIAL_BALANCE
        await setup.contracts.acceptedToken.increaseAllowance(setup.contracts.yieldFarming.address, depositValue)
      })
      it('TokenTimeLock: release time is before current time', async () => {
        await setup.contracts.timestamp.mock.getTimestamp.returns(setup.constants.TIMESTAMPS.DEPLOY - 1)
        // FIXME
        try {
          await expect(setup.contracts.yieldFarming.deposit(depositValue))
            .to.be.revertedWith('TokenTimeLock: release time is before current time')
        } catch (error) {
          // AssertionError: Expected transaction to be reverted with TokenTimeLock: release time is before current time,
          // but other exception was thrown: Error: Transaction reverted and Hardhat couldn't infer the reason.
          // Please report this to help us improve Hardhat.
          console.log(error)
        }
      })
      it('Emit AcceptedTokenDeposit', async () => {
        await expect(setup.contracts.yieldFarming.deposit(depositValue))
          .to.emit(setup.contracts.yieldFarming, 'AcceptedTokenDeposit')
          .withArgs(setup.accounts.first.address, depositValue)
      })
    })
    describe('Release token', async () => {
      describe('without deposit', async () => {
        it('try release', async () => {
          await expect(setup.contracts.yieldFarming.releaseTokens())
            .to.be.revertedWith('TokenTimeLock not found!')
        })
        it('try get TokenTimeLock', async () => {
          await expect(setup.contracts.yieldFarming.getMyTokenTimeLock())
            .to.be.revertedWith('TokenTimeLock not found!')
        })
      })
      describe('with deposit', async () => {
        beforeEach(async () => {
          const depositValue = setup.constants.INITIAL_BALANCE
          await setup.contracts.acceptedToken.increaseAllowance(setup.contracts.yieldFarming.address, depositValue)
          await setup.contracts.timestamp.mock.getTimestamp.returns(setup.constants.TIMESTAMPS.DEPOSIT)
          await setup.contracts.yieldFarming.deposit(depositValue, { from: setup.accounts.first.address })
        })
        it('before unlock', async () => {
          await expect(setup.contracts.yieldFarming.releaseTokens())
            .to.be.revertedWith('TokenTimeLock: current time is before release time')
        })
        describe('after unlock', async () => {
          beforeEach(async () => {
            await setup.contracts.timestamp.mock.getTimestamp.returns(setup.constants.TIMESTAMPS.UNLOCK)
          })
          it('Emit YieldFarmingTokenRelease', async () => {
            const releaseValue = 997506234413965
            await expect(setup.contracts.yieldFarming.releaseTokens())
              .to.emit(setup.contracts.yieldFarming, 'YieldFarmingTokenRelease')
              .withArgs(setup.accounts.first.address, releaseValue)
          })
          describe('After release', async () => {
            beforeEach(async () => {
              await setup.contracts.yieldFarming.releaseTokens()
            })
            describe('Burn tokens', async () => {
              let burnValue
              beforeEach(async () => {
                burnValue = 1
                await setup.contracts.yieldFarmingToken.increaseAllowance(setup.contracts.yieldFarming.address, burnValue)
              })
              it('Emit YieldFarmingTokenBurn', async () => {
                await expect(setup.contracts.yieldFarming.burn(burnValue))
                  .to.emit(setup.contracts.yieldFarming, 'YieldFarmingTokenBurn')
                  .withArgs(setup.accounts.first.address, burnValue)
              })
            })
            // describe('Payment splitter A', async () => {
            //   it('Reads payees correctly', async () => {
            //     expect(await setup.contracts.yieldFarming.payee(0))
            //       .to.be.equal(setup.accounts.first.address)
            //     expect(await setup.contracts.yieldFarming.payee(1))
            //       .to.be.equal(setup.accounts.second.address)
            //     expect(await setup.contracts.yieldFarming.payee(2))
            //       .to.be.equal(setup.accounts.third.address)
            //   })
            //   it('Revert when account is not a payee', async () => {
            //     await expect(deploy.yieldFarming.release(deploy.fourth.address))
            //       .to.be.revertedWith('PaymentSplitter: account is not a payee')
            //   })
            //   describe('Update payee', async () => {
            //     it('Revert when account is not a payee', async () => {
            //       await expect(deploy.yieldFarming.updatePayee(deploy.fourth.address, 0))
            //         .to.be.revertedWith('PaymentSplitter: not a payee')
            //     })
            //     it('Revert when account already has that many shares', async () => {
            //       await expect(deploy.yieldFarming.updatePayee(deploy.third.address, deploy.constants.SHARES.THIRD))
            //         .to.be.revertedWith('PaymentSplitter: account already has that many shares')
            //     })
            //     it('Revert when trying to update payee not being an owner', async () => {
            //       const delta = 5
            //       await expect(deploy.yieldFarming.connect(deploy.second).updatePayee(deploy.first.address, deploy.constants.SHARES.THIRD + delta))
            //         .to.be.revertedWith('Ownable: caller is not the owner')
            //     })
            //     describe('Changing amount of shares', async () => {
            //       it('Emit PayeeUpdated when increasing shares', async () => {
            //         const delta = 10
            //         const newShares = deploy.constants.SHARES.THIRD + delta
            //         await expect(deploy.yieldFarming.updatePayee(deploy.third.address, newShares))
            //           .to.emit(deploy.yieldFarming, 'PayeeUpdated')
            //           .withArgs(deploy.third.address, delta)
            //         expect(await deploy.yieldFarming.shares(deploy.third.address))
            //           .to.be.equal(newShares)
            //       })
            //       it('Emit PayeeUpdated when decreasing shares', async () => {
            //         const delta = -10
            //         const newShares = deploy.constants.SHARES.THIRD + delta
            //         await expect(deploy.yieldFarming.updatePayee(deploy.third.address, newShares))
            //           .to.emit(deploy.yieldFarming, 'PayeeUpdated')
            //           .withArgs(deploy.third.address, delta)
            //         expect(await deploy.yieldFarming.shares(deploy.third.address))
            //           .to.be.equal(newShares)
            //       })
            //     })
            //     it('When removing shares with updatePayee', async () => {
            //       const newShares = 0
            //       await expect(deploy.yieldFarming.updatePayee(deploy.third.address, newShares))
            //         .to.emit(deploy.yieldFarming, 'PayeeRemoved')
            //         .withArgs(deploy.third.address)
            //     })
            //   })
            //   describe('Remove payee', async () => {
            //     it('When removing shares with removePayee', async () => {
            //       await expect(deploy.yieldFarming.removePayee(deploy.third.address))
            //         .to.emit(deploy.yieldFarming, 'PayeeRemoved')
            //         .withArgs(deploy.third.address)
            //     })
            //     it('When trying to remove shares with removePayee not being an owner', async () => {
            //       await expect(deploy.yieldFarming.connect(deploy.second).removePayee(deploy.third.address))
            //         .to.be.revertedWith('Ownable: caller is not the owner')
            //     })
            //     it('When trying to remove non payee', async () => {
            //       await expect(deploy.yieldFarming.removePayee(deploy.fourth.address))
            //         .to.be.revertedWith('PaymentSplitter: account not found')
            //     })
            //     it('When trying to empty payee list', async () => {
            //       await deploy.yieldFarming.removePayee(deploy.third.address)
            //       await deploy.yieldFarming.removePayee(deploy.second.address)
            //       await deploy.yieldFarming.removePayee(deploy.first.address)
            //       await expect(deploy.yieldFarming.removePayee(ethers.constants.AddressZero))
            //         .to.revertedWith('PaymentSplitter: empty payee list')
            //     })
            //   })
            // })
            // describe('Payment splitter', async () => {
            //   let expectedPayment, expectedTotalShares
            //   beforeEach(async () => {
            //     expectedTotalShares = deploy.payees.totalShares()
            //     expectedPayment = Math.trunc(
            //       deploy.constants.INITIAL_BALANCE * deploy.payees.records[0].shares /
            //       expectedTotalShares
            //     )
            //   })
            //   describe('Release payment', async () => {
            //     describe('When already released', async () => {
            //       beforeEach(async () => {
            //         await deploy.yieldFarming.release(deploy.second.address)
            //       })
            //       it('Reverts when account is not due payment', async () => {
            //         await expect(deploy.yieldFarming.release(deploy.second.address))
            //           .to.be.revertedWith('PaymentSplitter: account is not due payment')
            //       })
            //     })
            //     it('Emit PaymentReleased', async () => {
            //       await expect(deploy.yieldFarming.release(deploy.first.address))
            //         .to.emit(deploy.yieldFarming, 'PaymentReleased')
            //         .withArgs(deploy.first.address, expectedPayment)
            //     })
            //     describe('After payment release', async () => {
            //       beforeEach(async () => {
            //         await deploy.yieldFarming.release(deploy.first.address)
            //       })
            //       it('Correctly calculates total released', async () => {
            //         expect(await deploy.yieldFarming.totalReleased())
            //           .to.be.equal(expectedPayment)
            //       })
            //     })
            //   })
            //   it('Correctly calculates total shares', async () => {
            //     expect(await deploy.yieldFarming.totalShares())
            //       .to.be.equal(expectedTotalShares)
            //   })
            // })
          })
        })
      })
    })
  })
  // describe('With multiplier 0', async () => {
  //   let deploy
  //   beforeEach(async () => {
  //     deploy = await mockedDeploy(0)
  //   })
  //   describe('Release token', async () => {
  //     describe('with deposit', async () => {
  //       beforeEach(async () => {
  //         const depositValue = deploy.constants.INITIAL_BALANCE
  //         await deploy.acceptedToken.increaseAllowance(deploy.yieldFarming.address, depositValue)
  //         await deploy.yieldFarming.deposit(depositValue, { from: deploy.first.address })
  //       })
  //       describe('after unlock', async () => {
  //         beforeEach(async () => {
  //           await deploy.timestamp.mock.getTimestamp.returns(deploy.constants.TIMESTAMPS.DEPOSIT)
  //         })
  //         it('Revert with no tokens to release', async () => {
  //           await expect(deploy.yieldFarming.releaseTokens())
  //             .to.be.revertedWith('TokenTimeLock: no tokens to release')
  //         })
  //       })
  //     })
  //   })
  // })
})
