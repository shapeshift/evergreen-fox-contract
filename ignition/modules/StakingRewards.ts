import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';

const REWARDS_DISTRIBUTION = '0x32DBc9Cf9E8FbCebE1e0a2ecF05Ed86Ca3096Cb6'; // FIXME: this is a dummy address - it needs to be set

const REWARDS_TOKEN = '0xc770eefad204b5180df6a14ee197d99d808ee52d'; // FOX
const STAKING_TOKEN = '0x470e8de2ebaef52014a47cb5e6af86884947f08c'; // ETH/FOX Pool

export const REWARDS_DURATION = 14n * 24n * 60n * 60n; // 14 days in seconds - FIXME: use the correct value

const StakingRewardsModule = buildModule('StakingRewardsModule', (m) => {
  const owner = m.getAccount(0);
  const rewardsDistribution = m.getParameter('rewardsDistribution', REWARDS_DISTRIBUTION);
  const rewardsToken = m.getParameter('rewardsToken', REWARDS_TOKEN);
  const stakingToken = m.getParameter('stakingToken', STAKING_TOKEN);
  const rewardsDuration = m.getParameter('newRewardsDuration', REWARDS_DURATION);

  const stakingRewards = m.contract('StakingRewards', [owner, rewardsDistribution, rewardsToken, stakingToken], {
    from: owner,
  });

  m.call(stakingRewards, 'setRewardsDuration', [rewardsDuration]);

  return { stakingRewards };
});

export default StakingRewardsModule;
