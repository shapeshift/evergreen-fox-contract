# Evergreen FOX staking contract (synthetix fork)

## Mainnet deployment

- [StakingRewards](https://etherscan.io/address/0xe7e16e2b05440c2e484c5c41ac3e5a4d15da2744)

### Notes for operation of rewards periods (Attention: multisig signers)

#### Initial set-up

> [!CAUTION]
> Executing these transactions in sequence is critical.

1. Call `acceptOwnership` from the DAO multisig.
1. Call `setRewardsDistribution` setting the DAO multisig address as the rewards distribution address.
2. Call `setRewardsDuration` with the correct duration for the rewards period in seconds.
3. Transfer FOX to the StakingRewards contract. (NOTE: this step can be done and tested with a smaller amount of FOX if desired)
4. Call `notifyRewardAmount` with the amount of FOX to be distributed over the rewards period duration. This will start the rewards period immediately.

#### Ongoing operation

**Starting a new rewards period** - Prior to adding more FOX for a new period, be sure that the the previous period has expired AND the correct duration is set.

**Modifying Rewards Amount** - The amount of rewards can be increased at any time during an active period by sending FOX to the contract and then calling `notifyRewardAmount`. However, be aware that this resets the program period countdown all over again.

**Changing program duration** - The duration of a rewards period can not be changed during an active rewards period. To modify the duration, the current period must expire and then the duration can be set before starting the next period.

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
