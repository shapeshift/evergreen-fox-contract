import type { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox-viem';
import * as dotenv from 'dotenv';

dotenv.config();

const config: HardhatUserConfig = {
  networks: {
    localhost: {
      url: 'http://127.0.0.1:8545',
      // Account 0 of the default Hardhat node, funded with ETH so we can test deployment locally
      accounts: ['0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'],
    },
    // Mainnet configuration (only used if INFURA_API_KEY and PRIVATE_KEY are set)
    // Let's us still test locally without setting up mainnet
    ...(process.env.RPC_URL && process.env.PRIVATE_KEY
      ? {
        mainnet: {
          url: process.env.RPC_URL,
          accounts: [process.env.PRIVATE_KEY],
        },
      }
      : {}),
  },
  solidity: {
    compilers: [
      {
        version: '0.5.16',
      },
    ],
  },
  // Etherscan configuration for mainnet deployment verification
  // Optional so we can still test locally without setting up etherscan
  ...(process.env.ETHERSCAN_API_KEY
    ? {
      etherscan: {
        apiKey: process.env.ETHERSCAN_API_KEY,
      },
    }
    : {}),
  sourcify: {
    enabled: true,
  },
};

export default config;
