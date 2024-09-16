import type { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox-viem';
import * as dotenv from 'dotenv';

dotenv.config();

const config: HardhatUserConfig = {
  networks: {
    localhost: {
      url: 'http://127.0.0.1:8545',
    },
    // Mainnet configuration (only used if INFURA_API_KEY and PRIVATE_KEY are set)
    // Let's us still test locally without setting up mainnet
    ...(process.env.INFURA_API_KEY && process.env.PRIVATE_KEY
      ? {
        mainnet: {
          url: `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
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
      {
        version: '0.8.24',
      },
    ],
  },
};

export default config;
