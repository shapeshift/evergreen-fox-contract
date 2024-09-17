import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';

export const REWARDS_DISTRIBUTION = '0xEc84524385ffD1eA423Ec4682caa5AB56071FbC7';
export const REWARDS_TOKEN = '0xc770EEfAd204B5180dF6a14Ee197D99d808ee52d'; // FOX
export const STAKING_TOKEN = '0x470e8de2eBaef52014A47Cb5E6aF86884947F08c'; // ETH/FOX Pool
export const OWNER = '0x90A48D5CF7343B08dA12E067680B4C6dbfE551Be'; // DAO multi-sig

const StakingRewardsModule = buildModule('StakingRewardsModule', (m) => {
  const deployer = m.getAccount(0);
  const owner = m.getParameter('owner', OWNER);
  const rewardsDistribution = m.getParameter('rewardsDistribution', REWARDS_DISTRIBUTION);
  const rewardsToken = m.getParameter('rewardsToken', REWARDS_TOKEN);
  const stakingToken = m.getParameter('stakingToken', STAKING_TOKEN);

  const stakingRewards = m.contract('StakingRewards', [owner, rewardsDistribution, rewardsToken, stakingToken], {
    from: deployer,
  });

  return { stakingRewards };
});

export default StakingRewardsModule;
