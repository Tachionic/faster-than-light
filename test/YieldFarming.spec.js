import { MockProvider } from '@ethereum-waffle/provider'
import { use, expect } from 'chai'
// import { Contract, ContractFactory, utils, Wallet } from 'ethers'
import { deployMockContract } from '@ethereum-waffle/mock-contract'
import { /* accounts, */ contract } from '@openzeppelin/test-environment'
import { waffleChai } from '@ethereum-waffle/chai'
// eslint-disable-next-line no-unused-vars
import { BN } from '@openzeppelin/test-helpers'
// const YieldFarming = contract.fromArtifact('YieldFarming')
// const ABDKMathQuad = contract.fromArtifact('ABDKMathQuad')
// const TokenTimeLock = contract.fromArtifact('TokenTimeLock')
const Timestamp = contract.fromArtifact('Timestamp')
use(waffleChai)
// use(require('chai-bignumber')())

describe('YieldFarming', () => {
  // const [owner] = accounts
  it('Ownership', async () => {
    // eslint-disable-next-line no-unused-vars
    const [sender, _] = new MockProvider().getWallets()
    // const aBDKMath = await ABDKMathQuad.new()
    // const yieldFarmingMock = await deployMockContract(sender, YieldFarming.abi);
    // await yieldFarmingMock.mock.getTime.returns('1')
    const timestampMock = await deployMockContract(sender, Timestamp.abi)
    await timestampMock.mock.getTimestamp.returns(1)
    expect(await timestampMock.getTimestamp()).to.be.bignumber.equal(1)
    // assert(true)
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
