# FOX staking contract (synthetix fork)

## Getting started

`nvm use`

`npm i`

## Hardhat usage

Compile: `npx hardhat compile`

Test: `npx hardhat test`

## Deploy with Ignition

### Mainnet

First configure the .env file with valid `RPC_URL`, `PRIVATE_KEY` and `ETHERSCAN_API_KEY` values.

Visualize the deployment plan: `npx hardhat ignition visualize ignition/modules/StakingRewards.ts --network mainnet`

Deploy and verify the contract: `npx hardhat ignition deploy ignition/modules/StakingRewards.ts --network mainnet --verify`

### Local

Start the local hardhat node: `npx hardhat node`

Deploy the contract: `npx hardhat ignition deploy ignition/modules/StakingRewards.ts --network localhost`

### Deployment notes

The `rewardsDistribution` address has exclusive permissions to call the `notifyRewardAmount` function, which is used to add new rewards to the contract.

The `owner` address has exclusive permissions to call:

- The `recoverERC20` function, which is used to recover any ERC20 tokens that are accidentally sent to the contract (except the staking token).

- The `setRewardsDuration` function, which is used to set the rewards duration.

- The `owner` can nominate a new owner for the contract.
