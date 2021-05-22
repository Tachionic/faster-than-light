const RewardCalculator = artifacts.require('RewardCalculator')
const YieldFarming = artifacts.require('YieldFarming')
const ERC20Mock = artifacts.require('ERC20Mock')
const truffleAssert = require('truffle-assertions')
const { expectRevert, time } = require('@openzeppelin/test-helpers')
const { expect } = require('chai')

function timeout (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

contract('YieldFarming', (accounts) => {
  const [firstAccount, secondAccount] = accounts
  const TIMEOUT = 2
  beforeEach(async () => {
    this.eRC20Mock = await ERC20Mock.new('ERC20Mock name', 'ERC20Mock symbol', firstAccount, 1E9)
    const tokenName = 'A token name'
    const tokenSymbol = 'A token symbol'
    const rewardCalculator = await RewardCalculator.new()
    const interestRate = '0x3FFF71547652B82FE1777D0FFDA0D23A'
    const multiplier = '0x3FFF71547652B82FE1777D0FFDA0D23A'
    const lockTime = time.duration.seconds(TIMEOUT)
    this.yieldFarming = await YieldFarming.new(
      this.eRC20Mock.address,
      rewardCalculator.address,
      tokenName,
      tokenSymbol,
      interestRate,
      multiplier,
      lockTime
    )
  })
  it('Ownership', async () => {
    const firstOwner = await this.yieldFarming.owner()
    expect(firstOwner).to.equal(firstAccount)
    const result = await this.yieldFarming.transferOwnership(secondAccount)
    truffleAssert.eventEmitted(result, 'OwnershipTransferred', (ev) => {
      return ev.previousOwner === firstAccount && ev.newOwner === secondAccount
    }, 'OwnershipTransferred should be emitted with correct parameters')
    const secondOwner = await this.yieldFarming.owner()
    expect(secondOwner).to.equal(secondAccount)
  })
  describe('Release token', async () => {
    describe('without deposit', async () => {
      // beforeEach(async () => {
      //   const depositValue = 1E9
      //   await this.yieldFarming.deposit(depositValue, { from: firstAccount })
      // })
      it('try release', async () => {
        await expectRevert(
          this.yieldFarming.releaseTokens(),
          'TokenTimelock not found!'
        )
      })
      it('try get TokenTimelock', async () => {
        await expectRevert(
          this.yieldFarming.getMyTokenTimelock(),
          'TokenTimelock not found!'
        )
      })
    })
    describe('with deposit', async () => {
      let depositValue
      beforeEach(async () => {
        depositValue = 1E9
        await this.eRC20Mock.approveInternal(firstAccount, this.yieldFarming.address, depositValue)
        await this.yieldFarming.deposit(depositValue, { from: firstAccount })
      })
      // it.only('can withdraw payment', async () => {
      //   expect(await this.yieldFarming.payments(firstAccount)).to.be.bignumber.equal(depositValue);

      //   await this.yieldFarming.withdrawPayments(firstAccount);

      //   expect(await balanceTracker.delta()).to.be.bignumber.equal(depositValue);
      //   expect(await this.yieldFarming.payments(firstAccount)).to.be.bignumber.equal('0');
      // });
      it('before unlock', async () => {
        // await timeout(TIMEOUT*1000)
        await expectRevert(
          this.yieldFarming.releaseTokens(),
          'TokenTimelock: current time is before release time'
        )
      })
      it('after unlock', async () => {
        await timeout(TIMEOUT * 1000)
        await this.yieldFarming.releaseTokens()
      })
    })
  })
})
