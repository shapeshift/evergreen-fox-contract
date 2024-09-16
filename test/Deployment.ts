import StakingRewardsModule, { REWARDS_DURATION } from '../ignition/modules/StakingRewards';
import hre from 'hardhat';
import { expect } from 'chai';

describe('Deployment', function () {
  it('Should set the rewards duration', async function () {
    const { stakingRewards } = await hre.ignition.deploy(StakingRewardsModule);
    const rewardsDuration: bigint = await stakingRewards.read.rewardsDuration();
    expect(rewardsDuration).to.equal(REWARDS_DURATION);
  });
});
