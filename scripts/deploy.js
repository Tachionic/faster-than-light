import { rawDeploy, waffle, expect, ethers, MULTIPLIER, Record } from './mainDeploy'
import { parse, stringify } from 'flatted'
const fs = require('fs')

const deployMe = async (_multiplier) => {
  const LOCK_TIME = 24 * 60 * 60
  const INTEREST_NUMERATOR = 25
  const INTEREST_DENOMINATOR = 10000
  const INTEREST = { NUMERATOR: INTEREST_NUMERATOR, DENOMINATOR: INTEREST_DENOMINATOR }
  const TOKEN_NAME = 'Interest Faster Than Light'
  const TOKEN_SYMBOL = 'IFTL'
  const TOKEN = { NAME: TOKEN_NAME, SYMBOL: TOKEN_SYMBOL }
  const safeERC20 = await ethers.getContractAt(
    'SafeERC20',
    '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
  )
  const MULTIPLIER = _multiplier
  const constants = { MULTIPLIER, LOCK_TIME, INTEREST, TOKEN }
  // const [first, second, third, fourth] = waffle.provider.getWallets()
  const [first, second, third, fourth] = await ethers.getSigners()
  const payees = [
    new Record(first, 10), // shield
    new Record(second, 10), // monetary policy reserve
    new Record(third, 30), // executive team budget
    new Record(fourth, 50) // wroking capital
  ]
  const Timestamp = await ethers.getContractFactory('Timestamp')
  const timestamp = await Timestamp.deploy()
  // return await rawDeploy(timestamp, safeERC20, payees, [first, second, third, fourth], constants)
}

const main = async () => {
  // const deploy = await deployMe(MULTIPLIER)
  // const deploy = await deployMe(MULTIPLIER)
  // const deployString = stringify(deploy)
  // fs.writeFileSync('deploy.json', deployString)
  // const readDeployString = fs.readFileSync('deploy.json')
  // const readDeploy = parse(readDeployString)
  // expect(deploy.acceptedToken.address)
  //   .to.be.equal(readDeploy.acceptedToken.address)
  // expect(deploy.first.address)
  //   .to.be.equal(readDeploy.first.address)
  // expect(deploy.second.address)
  //   .to.be.equal(readDeploy.second.address)
  // expect(deploy.third.address)
  //   .to.be.equal(readDeploy.third.address)
  // expect(deploy.yieldFarming.address)
  //   .to.be.equal(readDeploy.yieldFarming.address)
  // expect(deploy.yieldFarmingToken.address)
  //   .to.be.equal(readDeploy.yieldFarmingToken.address)
  // expect(deploy.timestamp.address)
  //   .to.be.equal(readDeploy.timestamp.address)
  // expect(deploy.payees)
  //   .to.be.deep.equal(readDeploy.payees)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
