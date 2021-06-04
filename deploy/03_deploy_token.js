import { constants } from '../src/utils/Constants'
import util from 'util'
import ora  from 'ora'
import chalk from 'chalk'
import child_process from 'child_process'
const exec = util.promisify(child_process.exec)

export default async ({ getNamedAccounts, deployments }) => {
    let spinner = ora(`${chalk.blue('Deploying AcceptedToken...')}`);
    spinner.color = 'cyan'
    spinner.start()
    const { stdout, stderr } = await exec(`cd AcceptedToken && yarn deploy ${hre.network.name}`);
    if (stderr) {
        spinner.fail('Accepted Token deployment failed❗')
        console.error(`error: ${chalk.red(`${stderr}`)}`)
        return
    }
    spinner.succeed(`${chalk.blue('Deployed AcceptedToken❕')}`)
    console.log(`${chalk.green(`${stdout}`)}`);

    if (hre.network.name.localeCompare('hardhat') != 0) {
        let spinner = ora(`${chalk.blue('Copying deployment artifacts...')}`);
        spinner.color = 'cyan'
        spinner.start()
        const { stdout, stderr } = await exec(`find AcceptedToken/deployments/${hre.network.name} -name '*.json' | xargs cp -t deployments/${hre.network.name}`);
        if (stderr) {
            spinner.fail('Deployment artifacts copying failed❗')
            console.error(`error: ${chalk.red(`${stderr}`)}`)
            return
        }
        spinner.succeed(`${chalk.blue('Copied deployment artifacts❕')}`)
        console.log(`${chalk.green(`${stdout}`)}`);
    }

    // if (hre.network.name.localeCompare(constants.NETWORK.DEPLOYMENT) != 0) {
    //     const { deploy } = deployments
    //     const { deployer } = await getNamedAccounts()
    //     await deploy('ERC20Mock', {
    //         from: deployer,
    //         args: [
    //             'ERC20Mock name',
    //             'ERC20Mock symbol',
    //             deployer,
    //             constants.TOKEN.INITIAL_BALANCE
    //         ],
    //         log: true
    //     })
    // }
}
export const tags = ['AcceptedToken']
