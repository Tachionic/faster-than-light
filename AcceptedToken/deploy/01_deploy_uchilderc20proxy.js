import { ethers } from 'hardhat'

export default async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()
  const uChildAdministrableERC20Contract = await deployments.get('UChildAdministrableERC20')
  const uChildAdministrableERC20 = await ethers.getContractAt('UChildAdministrableERC20', uChildAdministrableERC20Contract.address)
  await deploy('UChildERC20Proxy', {
    from: deployer,
    args: [uChildAdministrableERC20.address],
    log: true
  })
}
export const tags = ['UChildERC20Proxy']
module.exports.dependencies = ['UChildAdministrableERC20'] // this ensures the UChildAdministrableERC20 script above is executed first, so `deployments.get('UChildAdministrableERC20')` succeeds
