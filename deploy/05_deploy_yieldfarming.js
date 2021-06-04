import { constants } from '../src/utils/Constants'
import { RecordList } from '../src/utils/RecordList'
import { ethers } from 'hardhat'

export default async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments
  const { deployer, first, second, third, fourth } = await getNamedAccounts()
  const aBDKMathContract = await deployments.get('ABDKMathQuad')
  const aBDKMath = await ethers.getContractAt('ABDKMathQuad', aBDKMathContract.address)
  const timestampContract = await deployments.get('Timestamp')
  let safeERC20
  switch (hre.network.name){
    case constants.NETWORK.DEPLOYMENT:
  //     // FIXME
  //     // safeERC20 = await ethers.getContractAt(
  //     //   'IERC20',
  //     //   '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
  //     // )
      const uChildERC20ProxyContract = await deployments.get('UChildERC20Proxy')
      const uChildERC20Proxy = await ethers.getContractAt('UChildERC20Proxy', uChildERC20ProxyContract.address)
      const implementation = uChildERC20Proxy.implementation()
      break
    default:
  //     // const timestamp = await ethers.getContractAt("Timestamp", timestampContract.address)
  //     safeERC20 = await deployments.get('ERC20Mock')
      break
  }
  // console.log(safeERC20)
  // // const eRC20Mock = await ethers.getContractAt("ERC20Mock", eRC20MockContract.address)
  // const rewardCalculatorContract = await deployments.get('RewardCalculator')
  // // const rewardCalculator = await ethers.getContractAt("RewardCalculator", rewardCalculatorContract.address)
  // const interestRate = await aBDKMath.div(
  //   await aBDKMath.fromInt(constants.INTEREST.NUMERATOR),
  //   await aBDKMath.fromInt(constants.INTEREST.DENOMINATOR)
  // )
  // const multiplier = await aBDKMath.fromInt(constants.MULTIPLIER)
  // const recordList = new RecordList([first, second, third, fourth], [10, 10, 30, 50])

  // await deploy('YieldFarming', {
  //   from: deployer,
  //   args: [
  //     timestampContract.address,
  //     safeERC20.address,
  //     rewardCalculatorContract.address,
  //     constants.TOKEN.NAME,
  //     constants.TOKEN.SYMBOL,
  //     interestRate,
  //     multiplier,
  //     constants.LOCK_TIME,
  //     recordList.addresses(),
  //     recordList.sharesList()
  //   ],
  //   log: true
  // })
}
export const tags = ['YieldFarming']
module.exports.dependencies = ['ABDKMathQuad', 'Timestamp', 'RewardCalculator', 'UChildAdministrableERC20', 'UChildAdministrableERC20'] // this ensure the ABDKMathQuad script above is executed first, so `deployments.get('ABDKMathQuad')` succeeds
