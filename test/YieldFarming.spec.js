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

describe('YieldFarming', () => {
  const TIMEOUT = 1
  // const [firstAccount, secondAccount] = accounts
  const INITIAL_BALANCE = 1000
  beforeEach(async () => {
    // eslint-disable-next-line no-unused-vars
    const [first, second] = waffle.provider.getWallets()
    this.first = first
    this.second = second
    const timestampMock = await waffle.deployMockContract(first, Timestamp.abi)
    await timestampMock.mock.getTimestamp.returns(1)
    expect(await timestampMock.getTimestamp()).to.be.bignumber.equal(1)
    this.acceptedToken = await waffle.deployContract(first, ERC20Mock, [
      'ERC20Mock name',
      'ERC20Mock symbol',
      first.address,
      INITIAL_BALANCE])
    this.aBDKMath = await waffle.deployContract(first, ABDKMathQuad)
    const RewardCalculator = await ethers.getContractFactory(
      'RewardCalculator',
      {
        libraries: {
          ABDKMathQuad: this.aBDKMath.address
        }
      }
    )
    const rewardCalculator = await RewardCalculator.deploy()
    const tokenName = 'A token name'
    const tokenSymbol = 'A token symbol'
    const interestRate = await this.aBDKMath.div(
      await this.aBDKMath.fromInt(25),
      await this.aBDKMath.fromInt(10000)
    )
    const multiplier = await this.aBDKMath.fromInt(1E12)
    const lockTime = TIMEOUT
    this.yieldFarming = await waffle.deployContract(first, YieldFarming, [
      timestampMock.address,
      this.acceptedToken.address,
      rewardCalculator.address,
      tokenName,
      tokenSymbol,
      interestRate,
      multiplier,
      lockTime
    ])
    // this.yieldFarmingToken = await YieldFarmingToken.at(await this.yieldFarming.yieldFarmingToken())
  })
  it('Ownership', async () => {
    const firstOwner = await this.yieldFarming.owner()
    expect(firstOwner).to.equal(this.first.address)
    await expect(this.yieldFarming.transferOwnership(this.second.address))
    .to.emit(this.yieldFarming, 'OwnershipTransferred')
    .withArgs(this.first.address, this.second.address)
    const secondOwner = await this.yieldFarming.owner()
    expect(secondOwner).to.equal(this.second.address)
  })
})

// const RewardCalculator = artifacts.require('RewardCalculator')
// const YieldFarming = artifacts.require('YieldFarming')
// const YieldFarmingToken = artifacts.require('YieldFarmingToken')
// const ABDKMathQuad = artifacts.require('ABDKMathQuad')
// const ERC20Mock = artifacts.require('ERC20Mock')
// const truffleAssert = require('truffle-assertions')
// const { expectRevert, time, expectEvent, BN } = require('@openzeppelin/test-helpers')
// const { expect } = require('chai')
// const {deployMockContract} = require('@ethereum-waffle/mock-contract');

// function timeout (ms) {
//   return new Promise(resolve => setTimeout(resolve, ms))
// }

// contract('YieldFarming', (accounts) => {
//   const [firstAccount, secondAccount] = accounts
//   const TIMEOUT = 1.5
//   const INITIAL_BALANCE = new BN(1000)
//   beforeEach(async () => {
//     [sender, receiver] = new MockProvider().getWallets();
//     this.acceptedToken = await ERC20Mock.new('ERC20Mock name', 'ERC20Mock symbol', firstAccount, INITIAL_BALANCE)
//     const tokenName = 'A token name'
//     const tokenSymbol = 'A token symbol'
//     this.aBDKMath = await ABDKMathQuad.new()
//     RewardCalculator.link('ABDKMathQuad', this.aBDKMath.address)
//     const rewardCalculator = await RewardCalculator.new()
//     const interestRate = await this.aBDKMath.div(
//       await this.aBDKMath.fromInt(new BN(25)),
//       await this.aBDKMath.fromInt(new BN(10000))
//     )
//     const multiplier = await this.aBDKMath.fromInt(new BN(1E12))
//     const lockTime = time.duration.seconds(TIMEOUT)
//     const mockContract = await deployMockContract(sender, YieldFarming.abi);
//     this.yieldFarming = await YieldFarming.new(
//       this.acceptedToken.address,
//       rewardCalculator.address,
//       tokenName,
//       tokenSymbol,
//       interestRate,
//       multiplier,
//       lockTime
//     )
//     this.yieldFarmingToken = await YieldFarmingToken.at(await this.yieldFarming.yieldFarmingToken())
//   })
//   it('Ownership', async () => {
//     const firstOwner = await this.yieldFarming.owner()
//     expect(firstOwner).to.equal(firstAccount)
//     const result = await this.yieldFarming.transferOwnership(secondAccount)
//     truffleAssert.eventEmitted(result, 'OwnershipTransferred', (ev) => {
//       return ev.previousOwner === firstAccount && ev.newOwner === secondAccount
//     }, 'OwnershipTransferred should be emitted with correct parameters')
//     const secondOwner = await this.yieldFarming.owner()
//     expect(secondOwner).to.equal(secondAccount)
//   })
//   describe('Deposit', async () => {
//     let depositValue
//     beforeEach(async () => {
//       depositValue = INITIAL_BALANCE
//       await this.acceptedToken.increaseAllowance(this.yieldFarming.address, depositValue)
//     })
//     it('Emit AcceptedTokenDeposit', async () => {
//       const { logs } = await this.yieldFarming.deposit(depositValue, { from: firstAccount })
//       expectEvent.inLogs(logs, 'AcceptedTokenDeposit', { messageSender: firstAccount, amount: depositValue })
//     })
//   })
//   describe('Release token', async () => {
//     describe('without deposit', async () => {
//       // beforeEach(async () => {
//       //   const depositValue = INITIAL_BALANCE
//       //   await this.yieldFarming.deposit(depositValue, { from: firstAccount })
//       // })
//       it('try release', async () => {
//         await expectRevert(
//           this.yieldFarming.releaseTokens(),
//           'TokenTimelock not found!'
//         )
//       })
//       it('try get TokenTimelock', async () => {
//         await expectRevert(
//           this.yieldFarming.getMyTokenTimelock(),
//           'TokenTimelock not found!'
//         )
//       })
//     })
//     describe('with deposit', async () => {
//       beforeEach(async () => {
//         const depositValue = INITIAL_BALANCE
//         await this.acceptedToken.increaseAllowance(this.yieldFarming.address, depositValue)
//         await this.yieldFarming.deposit(depositValue, { from: firstAccount })
//       })
//       // it.only('can withdraw payment', async () => {
//       //   expect(await this.yieldFarming.payments(firstAccount)).to.be.bignumber.equal(depositValue);

//       //   await this.yieldFarming.withdrawPayments(firstAccount);

//       //   expect(await balanceTracker.delta()).to.be.bignumber.equal(depositValue);
//       //   expect(await this.yieldFarming.payments(firstAccount)).to.be.bignumber.equal('0');
//       // });
//       it('before unlock', async () => {
//         // await timeout(TIMEOUT*1000)
//         await expectRevert(
//           this.yieldFarming.releaseTokens(),
//           'TokenTimelock: current time is before release time'
//         )
//       })
//       describe('after unlock', async () => {
//         beforeEach(async () => {
//           await timeout(TIMEOUT * 1000)
//         })
//         it('Emit YieldFarmingTokenRelease', async () => {
//           const releaseValue = new BN(1000000000000000)
//           const { logs } = await this.yieldFarming.releaseTokens()
//           expectEvent.inLogs(logs, 'YieldFarmingTokenRelease', { releaser: firstAccount, amount: releaseValue })
//         })
//       })
//     })
//   })
//   describe('Burn token', async () => {
//     let burnValue
//     beforeEach(async () => {
//       const depositValue = INITIAL_BALANCE
//       await this.acceptedToken.increaseAllowance(this.yieldFarming.address, depositValue)
//       await this.yieldFarming.deposit(depositValue, { from: firstAccount })
//       burnValue = new BN(1)
//       await timeout(TIMEOUT * 1000)
//       await this.yieldFarming.releaseTokens()
//       await this.yieldFarmingToken.increaseAllowance(this.yieldFarming.address, burnValue)
//     })
//     it('Emit YieldFarmingTokenBurn', async () => {
//       const { logs } = await this.yieldFarming.burn(burnValue)
//       expectEvent.inLogs(logs, 'YieldFarmingTokenBurn', { burner: firstAccount, amount: burnValue })
//     })
//   })
// })
