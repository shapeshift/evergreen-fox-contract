import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox-viem/network-helpers';
import { deployStakingRewardsFixture, REWARDS_DURATION_SECONDS } from './utils';
import { expect } from 'chai';
import { parseEther } from 'viem';
import hre from 'hardhat';
describe('StakingRewards', () => {
  it('gets rewardsDuration', async () => {
    const { stakingRewards } = await loadFixture(deployStakingRewardsFixture);
    expect(await stakingRewards.read.rewardsDuration()).to.equal(REWARDS_DURATION_SECONDS);
  });

  it('should distribute full rewards for staking entire period', async () => {
    const { stakingRewards, stakingToken, rewardsToken, stakingAccount1, rewardsDistribution } = await loadFixture(deployStakingRewardsFixture);

    // Setup
    const startTime = await time.latest();
    const rewardAmount = parseEther('10');
    const stakeAmount = parseEther('2');
    await stakingToken.write.transfer([stakingAccount1.account.address, stakeAmount], { account: stakingAccount1.account });
    await stakingToken.write.approve([stakingRewards.address, stakeAmount], { account: stakingAccount1.account.address });
    await rewardsToken.write.transfer([stakingRewards.address, rewardAmount], { account: rewardsDistribution.account });

    // Stake
    await stakingRewards.write.stake([stakeAmount], { account: stakingAccount1.account.address });

    // Start rewards
    await stakingRewards.write.notifyRewardAmount([rewardAmount], { account: rewardsDistribution.account.address } );

    // Fast-forward to end of reward period
    await time.increaseTo(startTime + Number(REWARDS_DURATION_SECONDS));

    // Unstake and claim rewards
    await stakingRewards.write.exit([], { account: stakingAccount1.account });

    // Assertions
    const rewardAmountRead = await rewardsToken.read.balanceOf([stakingAccount1.account.address]);
    const expectedReward = Number(rewardAmount);

    expect(Number(rewardAmountRead)).to.be.closeTo(expectedReward, expectedReward / 10000); // Within 0.01%
  });
});
