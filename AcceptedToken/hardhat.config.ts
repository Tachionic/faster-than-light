import type { HardhatUserConfig, HttpNetworkUserConfig } from "hardhat/types";
import 'hardhat-deploy'

import '@nomiclabs/hardhat-solhint'
import "@nomiclabs/hardhat-ethers"
import "@nomiclabs/hardhat-waffle"
import 'solidity-coverage'
import 'hardhat-gas-reporter'

const fs = require('fs');
const path = require('path');

for (const f of fs.readdirSync(path.join(__dirname, 'hardhat'))) {
  require(path.join(__dirname, 'hardhat', f));
}

const enableGasReport = !!process.env.ENABLE_GAS_REPORT;
const enableProduction = process.env.COMPILE_MODE === 'production';

const { MNEMONIC, PK, INFURA_KEY } = process.env;

const DEFAULT_MNEMONIC =
  "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";

const sharedNetworkConfig: HttpNetworkUserConfig = {};
if (PK) {
  sharedNetworkConfig.accounts = [PK];
} else {
  sharedNetworkConfig.accounts = {
    mnemonic: MNEMONIC || DEFAULT_MNEMONIC,
  };
}

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  paths: {
    sources: "contracts",
    artifacts: "artifacts"
  },
  solidity: {
    version: '0.6.12',
    settings: {
      optimizer: {
        enabled: enableGasReport || enableProduction,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      blockGasLimit: 10000000,
    },
    mumbai: {
      ...sharedNetworkConfig,
      url: `https://polygon-mumbai.infura.io/v3/${INFURA_KEY}`,
    }
  },
  namedAccounts: {
    deployer: 0,
    first: 1,
    second: 2,
    third: 3,
    fourth: 4
  },
  gasReporter: {
    enable: enableGasReport,
    currency: 'USD',
    outputFile: process.env.CI ? 'gas-report.txt' : undefined,
  },
};
