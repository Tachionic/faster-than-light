import { constants } from '../src/utils/Constants'

export default async ({ getNamedAccounts, deployments }) => {
    if (hre.network.name.localeCompare(constants.NETWORK.DEPLOYMENT) != 0) {
        const { deploy } = deployments
        const { deployer } = await getNamedAccounts()
        await deploy('ERC20Mock', {
            from: deployer,
            args: [
                'ERC20Mock name',
                'ERC20Mock symbol',
                deployer,
                constants.TOKEN.INITIAL_BALANCE
            ],
            log: true
        })
    }
}
export const tags = ['ERC20Mock']
