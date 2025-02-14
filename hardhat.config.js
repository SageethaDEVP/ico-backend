require("@nomicfoundation/hardhat-toolbox");
require("solidity-coverage");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.19",
  defaultNetwork: "ganache",
  networks: {
    hardhat: {
      allowBlocksWithSameTimestamp: true,
      blockGasLimit: 100000000429720,
    },
    ganache: {
      url: process.env.ganache_network,
      accounts: [process.env.admin_private_key],
    },
    sepolia: {
      url: process.env.sepolia_network,
      accounts: [process.env.admin_private_key],
    },
    bnb: {
      url: process.env.bsc_network,
      accounts: [process.env.admin_private_key],
    },
    polygon: {
      url: process.env.polygon_network,
      accounts: [process.env.admin_private_key],
    },
  },
};
