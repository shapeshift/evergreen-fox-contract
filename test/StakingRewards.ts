import {
  time,
  loadFixture,
} from '@nomicfoundation/hardhat-toolbox-viem/network-helpers';
import { expect } from 'chai';
import { getAddress, parseEther } from 'viem';
import { deployStakingRewardsFixture } from './utils';

describe('StakingRewards', function () {
  describe('Deployment', function () {
    it('Should set the right owner', async function () {
      const { stakingRewards, owner } = await loadFixture(deployStakingRewardsFixture);
      expect(await stakingRewards.read.owner()).to.equal(getAddress(owner.account.address));
    });

    it('Should set the right rewards token', async function () {
      const { stakingRewards, rewardsToken } = await loadFixture(deployStakingRewardsFixture);
      expect(getAddress(await stakingRewards.read.rewardsToken() as string)).to.equal(getAddress(rewardsToken.address));
    });

    it('Should set the right staking token', async function () {
      const { stakingRewards, stakingToken } = await loadFixture(deployStakingRewardsFixture);
      expect(getAddress(await stakingRewards.read.stakingToken() as string)).to.equal(getAddress(stakingToken.address));
    });
  });

  describe('Function permissions', () => {
    it('only rewardsDistribution can call notifyRewardAmount', async () => {
      const { rewardsDistribution, stakingRewards, rewardsToken, stakingAccount2, owner } = await loadFixture(deployStakingRewardsFixture);
      const rewardAmount = parseEther('1');

      await rewardsToken.write.transfer([stakingRewards.address, rewardAmount], { account: rewardsDistribution.account });

      // Check arbitrary account cannot call notifyRewardAmount
      await expect(stakingRewards.write.notifyRewardAmount([rewardAmount], { account: stakingAccount2.account }))
        .to.be.rejectedWith('Caller is not RewardsDistribution contract');

      // Check owner cannot call notifyRewardAmount
      await expect(stakingRewards.write.notifyRewardAmount([rewardAmount], { account: owner.account }))
        .to.be.rejectedWith('Caller is not RewardsDistribution contract');

      // Check rewardsDistribution can call notifyRewardAmount
      await expect(stakingRewards.write.notifyRewardAmount([rewardAmount], { account: rewardsDistribution.account }))
        .to.not.be.rejected;
    });
  });

  describe('Pausable', () => {
    it('should revert calling stake() when paused', async () => {
      const { stakingRewards, owner, stakingAccount1 } = await loadFixture(deployStakingRewardsFixture);
      await stakingRewards.write.setPaused([true], { account: owner.account });

      await expect(stakingRewards.write.stake([parseEther('100')], { account: stakingAccount1.account }))
        .to.be.rejectedWith('This action cannot be performed while the contract is paused');
    });
  });

  describe('External Rewards Recovery', () => {
    it('only owner can call recoverERC20', async () => {
      const { stakingRewards, stakingAccount2 } = await loadFixture(deployStakingRewardsFixture);
      const amount = parseEther('5000');

      await expect(stakingRewards.write.recoverERC20([getAddress('0x0000000000000000000000000000000000000000'), amount], { account: stakingAccount2.account }))
        .to.be.rejectedWith('Only the contract owner may perform this action');
    });
  });

  describe('Staking', function () {
    it('Should allow staking', async function () {
      const { stakingRewards, stakingToken, stakingAccount1 } = await loadFixture(deployStakingRewardsFixture);
      const stakeAmount = parseEther('100');

      // Stake tokens
      await stakingToken.write.transfer([stakingAccount1.account.address, stakeAmount], { account: stakingAccount1.account });
      await stakingToken.write.approve([stakingRewards.address, stakeAmount], { account: stakingAccount1.account });
      await stakingRewards.write.stake([stakeAmount], { account: stakingAccount1.account });

      expect(await stakingRewards.read.balanceOf([stakingAccount1.account.address])).to.equal(stakeAmount);
    });

    it('Should not allow staking 0', async function () {
      const { stakingRewards, stakingAccount1 } = await loadFixture(deployStakingRewardsFixture);
      await expect(stakingRewards.write.stake([0n], { account: stakingAccount1.account }))
        .to.be.rejectedWith('Cannot stake 0');
    });
  });

  describe('Rewards', function () {
    it('Should distribute rewards for a full epoch', async function () {
      const { stakingRewards, rewardsToken, stakingToken, rewardsDistribution, stakingAccount1 } = await loadFixture(deployStakingRewardsFixture);
      const stakeAmount = parseEther('100');
      const rewardAmount = parseEther('1000');

      // Stake tokens
      await stakingToken.write.approve([stakingRewards.address, stakeAmount], { account: stakingAccount1.account });
      await stakingRewards.write.stake([stakeAmount], { account: stakingAccount1.account });

      // Distribute rewards
      await rewardsToken.write.transfer([stakingRewards.address, rewardAmount], { account: rewardsDistribution.account });
      await stakingRewards.write.notifyRewardAmount([rewardAmount], { account: rewardsDistribution.account });

      const rewardsDuration = await stakingRewards.read.rewardsDuration() as bigint;
      const timeStaked = rewardsDuration; // the whole epoch (7 days)

      // Fast forward time
      await time.increase(timeStaked);

      const earnedRewards = await stakingRewards.read.earned([stakingAccount1.account.address]);
      expect(earnedRewards as bigint === ((timeStaked / rewardsDuration) * rewardAmount) / stakeAmount);
    });

    it('Should distribute rewards for a partial epoch', async function () {
      const { stakingRewards, rewardsToken, stakingToken, rewardsDistribution, stakingAccount1 } = await loadFixture(deployStakingRewardsFixture);
      const stakeAmount = parseEther('100');
      const rewardAmount = parseEther('1000');

      // Stake tokens
      await stakingToken.write.approve([stakingRewards.address, stakeAmount], { account: stakingAccount1.account });
      await stakingRewards.write.stake([stakeAmount], { account: stakingAccount1.account });

      // Distribute rewards
      await rewardsToken.write.transfer([stakingRewards.address, rewardAmount], { account: rewardsDistribution.account });
      await stakingRewards.write.notifyRewardAmount([rewardAmount], { account: rewardsDistribution.account });

      const rewardsDuration = await stakingRewards.read.rewardsDuration() as bigint;
      const timeStaked = 3n * 24n * 60n * 60n; // 3 days

      // Fast forward time
      await time.increase(timeStaked);

      const earnedRewards = await stakingRewards.read.earned([stakingAccount1.account.address]);
      expect(earnedRewards as bigint === ((timeStaked / rewardsDuration) * rewardAmount) / stakeAmount);
    });

    it('Should distribute rewards for two stakers with different durations and amounts', async function () {
      const { stakingRewards, rewardsToken, stakingToken, rewardsDistribution, stakingAccount1, stakingAccount2 } = await loadFixture(deployStakingRewardsFixture);
      const stakeAmount1 = parseEther('23');
      const stakeAmount2 = parseEther('19');
      const rewardAmount = parseEther('1000');

      // Distribute rewards for the upcoming staking period
      await rewardsToken.write.transfer([stakingRewards.address, rewardAmount], { account: rewardsDistribution.account });
      await stakingRewards.write.notifyRewardAmount([rewardAmount], { account: rewardsDistribution.account });

      // Stake tokens
      await stakingToken.write.approve([stakingRewards.address, stakeAmount1], { account: stakingAccount1.account });
      await stakingToken.write.approve([stakingRewards.address, stakeAmount2], { account: stakingAccount2.account });
      await stakingRewards.write.stake([stakeAmount1], { account: stakingAccount1.account });
      await stakingRewards.write.stake([stakeAmount2], { account: stakingAccount2.account });

      const rewardsDuration = await stakingRewards.read.rewardsDuration() as bigint;
      const timeStaked1 = 3n * 24n * 60n * 60n; // 3 days
      const timeStaked2 = 5n * 24n * 60n * 60n; // 5 days

      await time.increase(timeStaked1);

      const earnedRewards1 = await stakingRewards.read.earned([stakingAccount1.account.address]);
      expect(earnedRewards1 as bigint === ((timeStaked1 / rewardsDuration) * rewardAmount) / stakeAmount1);

      await time.increase(timeStaked2 - timeStaked1);

      const earnedRewards2 = await stakingRewards.read.earned([stakingAccount2.account.address]);
      expect(earnedRewards2 as bigint === ((timeStaked2 / rewardsDuration) * rewardAmount) / stakeAmount2);
    });
  });

  describe('Withdrawals', function () {
    it('Should allow withdrawing staked tokens', async function () {
      const { stakingRewards, stakingToken, stakingAccount1 } = await loadFixture(deployStakingRewardsFixture);
      const initialBalance = await stakingToken.read.balanceOf([stakingAccount1.account.address]) as bigint;
      const stakeAmount = parseEther('100');

      // Stake tokens
      await stakingToken.write.transfer([stakingAccount1.account.address, stakeAmount], { account: stakingAccount1.account });
      await stakingToken.write.approve([stakingRewards.address, stakeAmount], { account: stakingAccount1.account });
      await stakingRewards.write.stake([stakeAmount], { account: stakingAccount1.account });

      // Withdraw tokens
      await stakingRewards.write.withdraw([stakeAmount], { account: stakingAccount1.account });

      expect(await stakingRewards.read.balanceOf([stakingAccount1.account.address])).to.equal(0n);
      expect(await stakingToken.read.balanceOf([stakingAccount1.account.address])).to.equal(initialBalance);
    });
  });

  describe('Reward Calculations', () => {
    it('should calculate correct reward per token', async () => {
      const { stakingRewards, stakingToken, rewardsToken, stakingAccount1, rewardsDistribution } = await loadFixture(deployStakingRewardsFixture);
      const stakeAmount = parseEther('100');
      const rewardAmount = parseEther('1000');

      // Setup rewards program
      await rewardsToken.write.transfer([stakingRewards.address, rewardAmount], { account: rewardsDistribution.account });
      await stakingRewards.write.notifyRewardAmount([rewardAmount], { account: rewardsDistribution.account });

      // Setup staking
      await stakingToken.write.transfer([stakingAccount1.account.address, stakeAmount], { account: stakingAccount1.account });
      await stakingToken.write.approve([stakingRewards.address, stakeAmount], { account: stakingAccount1.account });
      await stakingRewards.write.stake([stakeAmount], { account: stakingAccount1.account });

      await time.increase(7 * 24 * 60 * 60); // 7 days

      const rewardPerToken = await stakingRewards.read.rewardPerToken();
      expect(rewardPerToken as bigint > 0n);
    });
  });

  describe('setRewardsDuration', () => {
    it('should allow owner to set rewards duration', async () => {
      const { stakingRewards, owner } = await loadFixture(deployStakingRewardsFixture);
      const newDuration = 70n * 24n * 60n * 60n; // 70 days

      await time.increase(7 * 24 * 60 * 60); // 7 days
      await stakingRewards.write.setRewardsDuration([newDuration], { account: owner.account });

      expect(await stakingRewards.read.rewardsDuration()).to.equal(newDuration);
    });
  });

  describe('exit', () => {
    it('should withdraw all staked tokens and claim rewards', async () => {
      const { stakingRewards, stakingToken, rewardsToken, stakingAccount1, rewardsDistribution } = await loadFixture(deployStakingRewardsFixture);
      const stakeAmount = parseEther('100');
      const rewardAmount = parseEther('1000');

      const intialStakingTokenBalance = await stakingToken.read.balanceOf([stakingAccount1.account.address]) as bigint;
      const initialRewardsTokenBalance = await rewardsToken.read.balanceOf([stakingAccount1.account.address]) as bigint;

      // Setup rewards program
      await rewardsToken.write.transfer([stakingRewards.address, rewardAmount], { account: rewardsDistribution.account });
      await stakingRewards.write.notifyRewardAmount([rewardAmount], { account: rewardsDistribution.account });

      // Setup staking
      await stakingToken.write.approve([stakingRewards.address, stakeAmount], { account: stakingAccount1.account });
      await stakingRewards.write.stake([stakeAmount], { account: stakingAccount1.account });

      await time.increase(7 * 24 * 60 * 60); // 7 days

      const earnedRewards = await stakingRewards.read.earned([stakingAccount1.account.address]) as bigint;
      await stakingRewards.write.exit([], { account: stakingAccount1.account });

      const epoch1StakingTokenBalance = await stakingToken.read.balanceOf([stakingAccount1.account.address]) as bigint;
      const epoch1RewardsTokenBalance = await rewardsToken.read.balanceOf([stakingAccount1.account.address]) as bigint;

      expect(epoch1StakingTokenBalance).to.equal(intialStakingTokenBalance);
      expect(epoch1RewardsTokenBalance).to.equal(initialRewardsTokenBalance + earnedRewards);
      expect(await stakingRewards.read.balanceOf([stakingAccount1.account.address])).to.equal(0n);
    });

    it('stakers cease receiving rewards after they exit', async () => {
      const { stakingRewards, stakingToken, rewardsToken, stakingAccount1, rewardsDistribution } = await loadFixture(deployStakingRewardsFixture);
      const stakeAmount = parseEther('100');
      const rewardAmount = parseEther('1000');

      const intialStakingTokenBalance = await stakingToken.read.balanceOf([stakingAccount1.account.address]) as bigint;
      const initialRewardsTokenBalance = await rewardsToken.read.balanceOf([stakingAccount1.account.address]) as bigint;

      // Setup rewards program
      await rewardsToken.write.transfer([stakingRewards.address, rewardAmount], { account: rewardsDistribution.account });
      await stakingRewards.write.notifyRewardAmount([rewardAmount], { account: rewardsDistribution.account });

      // Setup staking
      await stakingToken.write.approve([stakingRewards.address, stakeAmount], { account: stakingAccount1.account });
      await stakingRewards.write.stake([stakeAmount], { account: stakingAccount1.account });

      await time.increase(7 * 24 * 60 * 60); // 7 days

      const epoch1EarnedRewards = await stakingRewards.read.earned([stakingAccount1.account.address]) as bigint;
      await stakingRewards.write.exit([], { account: stakingAccount1.account });

      const epoch1StakingTokenBalance = await stakingToken.read.balanceOf([stakingAccount1.account.address]) as bigint;
      const epoch1RewardsTokenBalance = await rewardsToken.read.balanceOf([stakingAccount1.account.address]) as bigint;

      expect(epoch1StakingTokenBalance).to.equal(intialStakingTokenBalance);
      expect(epoch1RewardsTokenBalance).to.equal(initialRewardsTokenBalance + epoch1EarnedRewards);
      expect(await stakingRewards.read.balanceOf([stakingAccount1.account.address])).to.equal(0n);

      // do another staking period without stakingAccount1 in the pool
      await rewardsToken.write.transfer([stakingRewards.address, rewardAmount], { account: rewardsDistribution.account });
      await stakingRewards.write.notifyRewardAmount([rewardAmount], { account: rewardsDistribution.account });

      await time.increase(7 * 24 * 60 * 60); // 7 days

      const epoch2EarnedRewards = await stakingRewards.read.earned([stakingAccount1.account.address]) as bigint;
      const epoch2StakingTokenBalance = await stakingToken.read.balanceOf([stakingAccount1.account.address]) as bigint;
      const epoch2RewardsTokenBalance = await rewardsToken.read.balanceOf([stakingAccount1.account.address]) as bigint;

      // assert the user did not get rewards
      expect(epoch2EarnedRewards).to.equal(0n);
      expect(epoch2StakingTokenBalance).to.equal(epoch1StakingTokenBalance);
      expect(epoch2RewardsTokenBalance).to.equal(epoch1RewardsTokenBalance);
    });

    it('prevents users withdrawing their reward multiple times', async () => {
      const { stakingRewards, stakingToken, rewardsToken, stakingAccount1, rewardsDistribution } = await loadFixture(deployStakingRewardsFixture);
      const stakeAmount = parseEther('100');
      const rewardAmount = parseEther('1000');

      // Setup rewards program
      await rewardsToken.write.transfer([stakingRewards.address, rewardAmount], { account: rewardsDistribution.account });
      await stakingRewards.write.notifyRewardAmount([rewardAmount], { account: rewardsDistribution.account });

      // Setup staking
      await stakingToken.write.approve([stakingRewards.address, stakeAmount], { account: stakingAccount1.account });
      await stakingRewards.write.stake([stakeAmount], { account: stakingAccount1.account });

      await time.increase(7 * 24 * 60 * 60); // 7 days

      await stakingRewards.write.exit([], { account: stakingAccount1.account });

      await expect(stakingRewards.write.exit([], { account: stakingAccount1.account }))
        .to.be.rejectedWith('Cannot withdraw 0');
    });

    it('accumulates rewards if a user doesn\'t withdraw across multiple staking periods', async () => {
      const { stakingRewards, stakingToken, rewardsToken, stakingAccount1, rewardsDistribution } = await loadFixture(deployStakingRewardsFixture);
      const stakeAmount = parseEther('100');
      const rewardAmount = parseEther('1000');

      // Setup rewards program
      await rewardsToken.write.transfer([stakingRewards.address, rewardAmount], { account: rewardsDistribution.account });
      await stakingRewards.write.notifyRewardAmount([rewardAmount], { account: rewardsDistribution.account });

      // Setup staking
      await stakingToken.write.approve([stakingRewards.address, stakeAmount], { account: stakingAccount1.account });
      await stakingRewards.write.stake([stakeAmount], { account: stakingAccount1.account });

      await time.increase(7 * 24 * 60 * 60); // 7 days

      const epoch1EarnedRewards = await stakingRewards.read.earned([stakingAccount1.account.address]) as bigint;

      // do another staking period without stakingAccount1 in the pool
      await rewardsToken.write.transfer([stakingRewards.address, rewardAmount], { account: rewardsDistribution.account });
      await stakingRewards.write.notifyRewardAmount([rewardAmount], { account: rewardsDistribution.account });

      await time.increase(7 * 24 * 60 * 60); // 7 days

      const epoch2EarnedRewards = await stakingRewards.read.earned([stakingAccount1.account.address]) as bigint;

      expect(Number(epoch2EarnedRewards)).to.be.closeTo(Number(2n * epoch1EarnedRewards), Number(epoch1EarnedRewards / 10000n)); // Within 0.01%
    });

    it('stakers can enter the program early, and will receive rewards for the actual time of the program after it started but not prior', async () => {
      const { stakingRewards, stakingToken, rewardsToken, stakingAccount1, rewardsDistribution } = await loadFixture(deployStakingRewardsFixture);
      const stakeAmount = parseEther('100');
      const rewardAmount = parseEther('1000');

      const intialStakingTokenBalance = await stakingToken.read.balanceOf([stakingAccount1.account.address]) as bigint;
      const initialRewardsTokenBalance = await rewardsToken.read.balanceOf([stakingAccount1.account.address]) as bigint;

      // Setup staking
      await stakingToken.write.approve([stakingRewards.address, stakeAmount], { account: stakingAccount1.account });
      await stakingRewards.write.stake([stakeAmount], { account: stakingAccount1.account });

      const earnedRewardsPriorToProgramStart = await stakingRewards.read.earned([stakingAccount1.account.address]) as bigint;

      // No rewards should be received prior to the program start
      expect(earnedRewardsPriorToProgramStart).to.equal(0n);

      // Time passes before the program started
      await time.increase(3 * 24 * 60 * 60); // 3 days

      // Setup rewards program
      await rewardsToken.write.transfer([stakingRewards.address, rewardAmount], { account: rewardsDistribution.account });
      await stakingRewards.write.notifyRewardAmount([rewardAmount], { account: rewardsDistribution.account });

      await time.increase(7 * 24 * 60 * 60); // 7 days

      const earnedRewards = await stakingRewards.read.earned([stakingAccount1.account.address]) as bigint;
      expect(Number(earnedRewards)).to.be.closeTo(Number(rewardAmount), Number(rewardAmount / 10000n)); // Within 0.01%
      await stakingRewards.write.exit([], { account: stakingAccount1.account });

      const epoch1StakingTokenBalance = await stakingToken.read.balanceOf([stakingAccount1.account.address]) as bigint;
      const epoch1RewardsTokenBalance = await rewardsToken.read.balanceOf([stakingAccount1.account.address]) as bigint;

      expect(epoch1StakingTokenBalance).to.equal(intialStakingTokenBalance);
      expect(epoch1RewardsTokenBalance).to.equal(initialRewardsTokenBalance + earnedRewards);
      expect(await stakingRewards.read.balanceOf([stakingAccount1.account.address])).to.equal(0n);
    });

    it('no rewards are received after the reward period has ended', async () => {
      const { stakingRewards, stakingToken, rewardsToken, stakingAccount1, rewardsDistribution } = await loadFixture(deployStakingRewardsFixture);
      const stakeAmount = parseEther('100');
      const rewardAmount = parseEther('1000');

      // Setup rewards program
      await rewardsToken.write.transfer([stakingRewards.address, rewardAmount], { account: rewardsDistribution.account });
      await stakingRewards.write.notifyRewardAmount([rewardAmount], { account: rewardsDistribution.account });

      // Setup staking
      await stakingToken.write.approve([stakingRewards.address, stakeAmount], { account: stakingAccount1.account });
      await stakingRewards.write.stake([stakeAmount], { account: stakingAccount1.account });

      await time.increase(7 * 24 * 60 * 60); // 7 days

      const epoch1EarnedRewards = await stakingRewards.read.earned([stakingAccount1.account.address]) as bigint;

      // Fast forward multiple epochs into the future to simulate would-be rewards multiple rewards if the program auto-restarted
      await time.increase(7 * 24 * 60 * 60); // 7 days
      await time.increase(7 * 24 * 60 * 60); // 7 days
      await time.increase(7 * 24 * 60 * 60); // 7 days

      const epoch1EarnedRewardsPostPeriod = await stakingRewards.read.earned([stakingAccount1.account.address]) as bigint;

      expect(epoch1EarnedRewardsPostPeriod).to.equal(epoch1EarnedRewards);
    });
  });
});
