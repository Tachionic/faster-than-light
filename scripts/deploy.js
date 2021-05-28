import { rawDeploy, Timestamp, waffle, expect, ethers, MULTIPLIER, Record } from './mainDeploy'
import { parse, stringify } from 'flatted'
const fs = require('fs')

const deployMe = async (_multiplier) => {
  const LOCK_TIME = 24 * 60 * 60
  const INTEREST_NUMERATOR = 25
  const INTEREST_DENOMINATOR = 10000
  const ACCEPTED_TOKEN_ADDRESS = '0xbda5747bfd65f08deb54cb465eb87d40e51b197e'
  const safeERC20 = await ethers.getContractAt('SafeERC20', ACCEPTED_TOKEN_ADDRESS)
  const MULTIPLIER = _multiplier
  const constants = { MULTIPLIER, ACCEPTED_TOKEN_ADDRESS, LOCK_TIME, INTEREST_NUMERATOR, INTEREST_DENOMINATOR }
  const [first, second, third] = waffle.provider.getWallets()
  const payees = [
    new Record(first.address, 100),
    new Record(second.address, 100),
    new Record(third.address, 100)
  ]
  const timestamp = await waffle.deployContract(first, Timestamp)
  return await rawDeploy(timestamp, safeERC20, payees, [first, second, third], constants)
}

const main = async () => {
  const deploy = await deployMe(MULTIPLIER)
  const deployString = stringify(deploy)
  fs.writeFileSync('deploy.json', deployString)
  const readDeployString = fs.readFileSync('deploy.json')
  const readDeploy = parse(readDeployString)
  expect(deploy.acceptedToken.address)
    .to.be.equal(readDeploy.acceptedToken.address)
  expect(deploy.first.address)
    .to.be.equal(readDeploy.first.address)
  expect(deploy.second.address)
    .to.be.equal(readDeploy.second.address)
  expect(deploy.third.address)
    .to.be.equal(readDeploy.third.address)
  expect(deploy.yieldFarming.address)
    .to.be.equal(readDeploy.yieldFarming.address)
  expect(deploy.yieldFarmingToken.address)
    .to.be.equal(readDeploy.yieldFarmingToken.address)
  expect(deploy.timestamp.address)
    .to.be.equal(readDeploy.timestamp.address)
  expect(deploy.payees)
    .to.be.deep.equal(readDeploy.payees)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
