import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';

const OWNER = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const REWARDS_DISTRIBUTION = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const REWARDS_TOKEN = '0xc770eefad204b5180df6a14ee197d99d808ee52d'; // FOX
const STAKING_TOKEN = '0x470e8de2ebaef52014a47cb5e6af86884947f08c'; // ETH/FOX Pool

const StakingRewardsModule = buildModule('StakingRewardsModule', (m) => {
  const owner = m.getParameter('owner', OWNER);
  const rewardsDistribution = m.getParameter('rewardsDistribution', REWARDS_DISTRIBUTION);
  const rewardsToken = m.getParameter('rewardsToken', REWARDS_TOKEN);
  const stakingToken = m.getParameter('stakingToken', STAKING_TOKEN);

  const stakingRewards = m.contract('StakingRewards', [owner, rewardsDistribution, rewardsToken, stakingToken]);

  return { stakingRewards };
});

export default StakingRewardsModule;
