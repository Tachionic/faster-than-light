const RewardCalculator = artifacts.require('RewardCalculator')
const YieldFarming = artifacts.require('YieldFarming')
const ERC20Mock = artifacts.require('ERC20Mock')
const ABDKMathQuad = artifacts.require('ABDKMathQuad')
const Timestamp = artifacts.require('Timestamp')
const { time } = require('@openzeppelin/test-helpers')

module.exports = async (deployer, network, accounts) => {
  await deployer.deploy(ERC20Mock, 'ERC20Mock name', 'ERC20Mock symbol', accounts[0], 1E9)
  const eRC20Mock = await ERC20Mock.deployed()
  const tokenName = 'A token name'
  const tokenSymbol = 'A token symbol'
  const interestRate = '0x3FFF71547652B82FE1777D0FFDA0D23A'
  const multiplier = '0x3FFF71547652B82FE1777D0FFDA0D23A'
  const lockTime = time.duration.days(1)
  await deployer.deploy(Timestamp)
  const timestamp = await Timestamp.deployed()
  await deployer.deploy(ABDKMathQuad)
  const aBDKMathQuad = await ABDKMathQuad.deployed()
  RewardCalculator.link('ABDKMathQuad', aBDKMathQuad.address)
  await deployer.deploy(RewardCalculator)
  const rewardCalculator = await RewardCalculator.deployed()
  await deployer.deploy(
    YieldFarming,
    timestamp.address,
    eRC20Mock.address,
    rewardCalculator.address,
    tokenName,
    tokenSymbol,
    interestRate,
    multiplier,
    lockTime
  )
}
