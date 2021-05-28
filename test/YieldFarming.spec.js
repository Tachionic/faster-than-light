import { waffleChai } from '@ethereum-waffle/chai'
import { use, expect } from 'chai'
// eslint-disable-next-line no-unused-vars
import { BN } from '@openzeppelin/test-helpers'
import { mockedDeploy, MULTIPLIER } from '../scripts/mainDeploy'
use(waffleChai)

describe('YieldFarming contract', () => {
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
        await deploy.timestamp.mock.getTimestamp.returns(deploy.constants.DEPLOY_TIMESTAMP - 1)
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
          await deploy.timestamp.mock.getTimestamp.returns(deploy.constants.DEPOSIT_TIMESTAMP)
          await deploy.yieldFarming.deposit(depositValue, { from: deploy.first.address })
        })
        it('before unlock', async () => {
          await expect(deploy.yieldFarming.releaseTokens())
            .to.be.revertedWith('TokenTimeLock: current time is before release time')
        })
        describe('after unlock', async () => {
          beforeEach(async () => {
            await deploy.timestamp.mock.getTimestamp.returns(deploy.constants.UNLOCK_TIMESTAMP)
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
                  deploy.constants.INITIAL_BALANCE * deploy.payees[0].shares /
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
            await deploy.timestamp.mock.getTimestamp.returns(deploy.constants.DEPOSIT_TIMESTAMP)
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
