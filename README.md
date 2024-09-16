# FOX staking contract (synthetix fork)

## Getting started

`nvm use`

`npm i`

## Hardhat usage

Compile: `npx hardhat compile`

Test: `npx hardhat test`

## Deploy with Ignition

`npx hardhat ignition deploy ignition/modules/StakingRewards.ts`

### Deployment notes

The `rewardsDistribution` address has exclusive permissions to call the `notifyRewardAmount` function, which is used to add new rewards to the contract.

The `owner` address has exclusive permissions to call:

- The `recoverERC20` function, which is used to recover any ERC20 tokens that are accidentally sent to the contract (except the staking token).

- The `setRewardsDuration` function, which is used to set the rewards duration.

- The `owner` can nominate a new owner for the contract.
