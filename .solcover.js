module.exports = {
    norpc: true,
    testCommand: 'npm test',
    compileCommand: 'npm run compile',
    skipFiles: [
        'abdk-libraries-solidity',
        'Migrations.sol',
        'ERC20Mock.sol'
    ],
    providerOptions: {
        default_balance_ether: '10000000000000000000000000',
    },
    mocha: {
        fgrep: '[skip-on-coverage]',
        invert: true,
    },
}
