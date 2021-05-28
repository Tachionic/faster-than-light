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

const MULTIPLIER = 1E12

const mockedDeploy = async (_multiplier) => {
  const INITIAL_BALANCE = 1000
  const DEPLOY_TIMESTAMP = 1
  const DEPOSIT_TIMESTAMP = DEPLOY_TIMESTAMP + 24 * 60 * 60 // one day later
  const UNLOCK_TIMESTAMP = DEPOSIT_TIMESTAMP + 24 * 60 * 60 // one day later
  const INTEREST_NUMERATOR = 25
  const INTEREST_DENOMINATOR = 10000
  const MULTIPLIER = _multiplier
  const mockConstants = { MULTIPLIER, INITIAL_BALANCE, INTEREST_NUMERATOR, INTEREST_DENOMINATOR, DEPLOY_TIMESTAMP, DEPOSIT_TIMESTAMP, UNLOCK_TIMESTAMP }
  const [first, second, third] = waffle.provider.getWallets()
  const timestamp = await waffle.deployMockContract(first, Timestamp.abi)
  await timestamp.mock.getTimestamp.returns(mockConstants.DEPLOY_TIMESTAMP)
  expect(await timestamp.getTimestamp()).to.be.bignumber.equal(mockConstants.DEPLOY_TIMESTAMP)
  const acceptedToken = await waffle.deployContract(first, ERC20Mock, [
    'ERC20Mock name',
    'ERC20Mock symbol',
    first.address,
    INITIAL_BALANCE])
  return await rawDeploy(timestamp, acceptedToken, 1, [first, second, third], mockConstants)
}

const rawDeploy = async (timestamp, acceptedToken, lockTime, accounts, constants) => {
  const [first, second, third] = accounts
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
    await aBDKMath.fromInt(constants.INTEREST_NUMERATOR),
    await aBDKMath.fromInt(constants.INTEREST_DENOMINATOR)
  )
  const multiplier = await aBDKMath.fromInt(constants.MULTIPLIER)
  class Record {
    constructor (address, shares) {
      this.address = address
      this.shares = shares
    }
  }
  const payees = [new Record(first.address, 100), new Record(second.address, 100), new Record(third.address, 100)]
  const yieldFarming = await waffle.deployContract(first, YieldFarming, [
    timestamp.address,
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
  return { acceptedToken, rewardCalculator, first, second, third, yieldFarming, yieldFarmingToken, timestamp, payees, constants }
}

export { mockedDeploy, rawDeploy, Timestamp, waffle, expect, ethers, MULTIPLIER }
