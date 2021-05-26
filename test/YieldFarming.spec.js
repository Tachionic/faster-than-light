import { waffleChai } from '@ethereum-waffle/chai'
import { ethers, waffle } from 'hardhat'
import { use, expect } from 'chai'
// eslint-disable-next-line no-unused-vars
import { BN } from '@openzeppelin/test-helpers'
import ABDKMathQuad from '../artifacts/contracts/abdk-libraries-solidity/ABDKMathQuad.sol/ABDKMathQuad.json'
// import YieldFarmingToken from '../artifacts/contracts/YieldFarmingToken.sol/YieldFarmingToken.json'
import YieldFarming from '../artifacts/contracts/YieldFarming.sol/YieldFarming.json'
import ERC20Mock from '../artifacts/contracts/ERC20Mock.sol/ERC20Mock.json'
import Timestamp from '../artifacts/contracts/Timestamp.sol/Timestamp.json'
use(waffleChai)

describe('YieldFarming', () => {
  let first, second, acceptedToken, timestampMock, yieldFarming, yieldFarmingToken, aBDKMath
  const TIMEOUT = 1
  // const [firstAccount, secondAccount] = accounts
  const INITIAL_BALANCE = 1000
  beforeEach(async () => {
    // eslint-disable-next-line no-unused-vars
    [first, second] = waffle.provider.getWallets()
    timestampMock = await waffle.deployMockContract(first, Timestamp.abi)
    await timestampMock.mock.getTimestamp.returns(0)
    expect(await timestampMock.getTimestamp()).to.be.bignumber.equal(0)
    acceptedToken = await waffle.deployContract(first, ERC20Mock, [
      'ERC20Mock name',
      'ERC20Mock symbol',
      first.address,
      INITIAL_BALANCE])
    aBDKMath = await waffle.deployContract(first, ABDKMathQuad)
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
    const multiplier = await aBDKMath.fromInt(1E12)
    const lockTime = TIMEOUT
    yieldFarming = await waffle.deployContract(first, YieldFarming, [
      timestampMock.address,
      acceptedToken.address,
      rewardCalculator.address,
      tokenName,
      tokenSymbol,
      interestRate,
      multiplier,
      lockTime
    ])
    const YieldFarmingToken = await ethers.getContractFactory('YieldFarmingToken')
    yieldFarmingToken = await YieldFarmingToken.attach(await yieldFarming.yieldFarmingToken())
  })
  it('Ownership', async () => {
    const firstOwner = await yieldFarming.owner()
    expect(firstOwner).to.equal(first.address)
    await expect(yieldFarming.transferOwnership(second.address))
      .to.emit(yieldFarming, 'OwnershipTransferred')
      .withArgs(first.address, second.address)
    const secondOwner = await yieldFarming.owner()
    expect(secondOwner).to.equal(second.address)
  })
  describe('Deposit', async () => {
    let depositValue
    beforeEach(async () => {
      depositValue = INITIAL_BALANCE
      await acceptedToken.increaseAllowance(yieldFarming.address, depositValue)
    })
    it('Emit AcceptedTokenDeposit', async () => {
      await expect(yieldFarming.deposit(depositValue))
        .to.emit(yieldFarming, 'AcceptedTokenDeposit')
        .withArgs(first.address, depositValue)
    })
  })
  describe('Release token', async () => {
    describe('without deposit', async () => {
      // beforeEach(async () => {
      //   const depositValue = INITIAL_BALANCE
      //   await yieldFarming.deposit(depositValue, { from: firstAccount })
      // })
      it('try release', async () => {
        await expect(yieldFarming.releaseTokens())
          .to.be.revertedWith('TokenTimeLock not found!')
      })
      it('try get TokenTimeLock', async () => {
        await expect(yieldFarming.getMyTokenTimeLock())
          .to.be.revertedWith('TokenTimeLock not found!')
      })
    })
    describe('with deposit', async () => {
      beforeEach(async () => {
        const depositValue = INITIAL_BALANCE
        await acceptedToken.increaseAllowance(yieldFarming.address, depositValue)
        await yieldFarming.deposit(depositValue, { from: first.address })
      })
      // it.only('can withdraw payment', async () => {
      //   expect(await yieldFarming.payments(firstAccount)).to.be.bignumber.equal(depositValue);

      //   await yieldFarming.withdrawPayments(firstAccount);

      //   expect(await balanceTracker.delta()).to.be.bignumber.equal(depositValue);
      //   expect(await yieldFarming.payments(firstAccount)).to.be.bignumber.equal('0');
      // });
      it('before unlock', async () => {
        await expect(yieldFarming.releaseTokens())
          .to.be.revertedWith('TokenTimeLock: current time is before release time')
      })
      describe('after unlock', async () => {
        beforeEach(async () => {
          await timestampMock.mock.getTimestamp.returns(1 + TIMEOUT)
        })
        it('Emit YieldFarmingTokenRelease', async () => {
          const releaseValue = 1000000000000000
          await expect(yieldFarming.releaseTokens())
            .to.emit(yieldFarming, 'YieldFarmingTokenRelease')
            .withArgs(first.address, releaseValue)
        })
      })
    })
  })
  describe('Burn token', async () => {
    let burnValue
    beforeEach(async () => {
      const depositValue = INITIAL_BALANCE
      await acceptedToken.increaseAllowance(yieldFarming.address, depositValue)
      await yieldFarming.deposit(depositValue)
      burnValue = 1
      await timestampMock.mock.getTimestamp.returns(TIMEOUT)
      await yieldFarming.releaseTokens()
      await yieldFarmingToken.increaseAllowance(yieldFarming.address, burnValue)
    })
    it('Emit YieldFarmingTokenBurn', async () => {
      await expect(yieldFarming.burn(burnValue))
        .to.emit(yieldFarming, 'YieldFarmingTokenBurn')
        .withArgs(first.address, burnValue)
    })
  })
})
