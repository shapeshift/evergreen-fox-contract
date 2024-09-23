import StakingRewardsModule, { OWNER, REWARDS_TOKEN, STAKING_TOKEN } from '../ignition/modules/StakingRewards';
import hre from 'hardhat';
import { expect } from 'chai';

describe('Deployment', function () {
  it('Should deploy with constructor params', async function () {
    const { stakingRewards } = await hre.ignition.deploy(StakingRewardsModule);
    const owner = await stakingRewards.read.owner();
    const rewardsDistribution = await stakingRewards.read.rewardsDistribution();
    const rewardsToken = await stakingRewards.read.rewardsToken();
    const stakingToken = await stakingRewards.read.stakingToken();
    expect(owner).to.equal(OWNER);
    expect(rewardsDistribution).to.equal(OWNER);
    expect(rewardsToken).to.equal(REWARDS_TOKEN);
    expect(stakingToken).to.equal(STAKING_TOKEN);
  });
});
