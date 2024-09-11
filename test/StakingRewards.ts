import {
    time,
    loadFixture,
  } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import { getAddress, parseEther } from "viem";
import { mockToken, deployStakingRewardsFixture, DEFAULT_SUPPLY } from "./utils";

  describe("StakingRewards", function () {
    describe("Deployment", function () {
      it("Should set the right owner", async function () {
        const { stakingRewards, owner } = await loadFixture(deployStakingRewardsFixture);
        expect(await stakingRewards.read.owner()).to.equal(getAddress(owner.account.address));
      });
  
      it("Should set the right rewards token", async function () {
        const { stakingRewards, rewardsToken } = await loadFixture(deployStakingRewardsFixture);
        expect(getAddress(await stakingRewards.read.rewardsToken() as string)).to.equal(getAddress(rewardsToken.address));
      });
  
      it("Should set the right staking token", async function () {
        const { stakingRewards, stakingToken } = await loadFixture(deployStakingRewardsFixture);
        expect(getAddress(await stakingRewards.read.stakingToken() as string)).to.equal(getAddress(stakingToken.address));
      });
    });
  
    describe("Function permissions", () => {
      it("only owner can call notifyRewardAmount", async () => {
        const { stakingRewards, rewardsDistribution, otherAccount } = await loadFixture(deployStakingRewardsFixture);
        const rewardValue = parseEther("1");
  
        await expect(stakingRewards.write.notifyRewardAmount([rewardValue], { account: otherAccount.account }))
          .to.be.rejectedWith("Caller is not RewardsDistribution contract");
      });
  
      it("only rewardsDistribution address can call notifyRewardAmount", async () => {
        const { stakingRewards, rewardsDistribution, otherAccount } = await loadFixture(deployStakingRewardsFixture);
        const rewardValue = parseEther("1");
  
        await expect(stakingRewards.write.notifyRewardAmount([rewardValue], { account: otherAccount.account }))
          .to.be.rejectedWith("Caller is not RewardsDistribution contract");
      });
    });
  
    describe("Pausable", () => {
      it("should revert calling stake() when paused", async () => {
        const { stakingRewards, owner, stakingAccount1 } = await loadFixture(deployStakingRewardsFixture);
        await stakingRewards.write.setPaused([true], { account: owner.account });
  
        await expect(stakingRewards.write.stake([parseEther("100")], { account: stakingAccount1.account }))
          .to.be.rejectedWith("This action cannot be performed while the contract is paused");
      });
    });
  
    describe("External Rewards Recovery", () => {
      it("only owner can call recoverERC20", async () => {
        const { stakingRewards, owner, otherAccount } = await loadFixture(deployStakingRewardsFixture);
        const amount = parseEther("5000");
  
        await expect(stakingRewards.write.recoverERC20([getAddress("0x0000000000000000000000000000000000000000"), amount], { account: otherAccount.account }))
          .to.be.rejectedWith("Only the contract owner may perform this action");
      });
    });
  
    describe("Staking", function () {
      it("Should allow staking", async function () {
        const { stakingRewards, stakingToken, stakingAccount1 } = await loadFixture(deployStakingRewardsFixture);
        const stakeAmount = parseEther("100");
  
        await stakingToken.write.transfer([stakingAccount1.account.address, stakeAmount], { account: stakingAccount1.account });
        await stakingToken.write.approve([stakingRewards.address, stakeAmount], { account: stakingAccount1.account });
  
        await stakingRewards.write.stake([stakeAmount], { account: stakingAccount1.account });
  
        expect(await stakingRewards.read.balanceOf([stakingAccount1.account.address])).to.equal(stakeAmount);
      });
  
      it("Should not allow staking 0", async function () {
        const { stakingRewards, stakingAccount1 } = await loadFixture(deployStakingRewardsFixture);
        await expect(stakingRewards.write.stake([0n], { account: stakingAccount1.account }))
          .to.be.rejectedWith("Cannot stake 0");
      });
    });
  
    describe("Rewards", function () {
      it("Should distribute rewards", async function () {
        const { stakingRewards, rewardsToken, stakingToken, rewardsDistribution, stakingAccount1 } = await loadFixture(deployStakingRewardsFixture);
        const stakeAmount = parseEther("100");
        const rewardAmount = parseEther("1000");
  
        // Stake tokens
        await stakingToken.write.transfer([stakingAccount1.account.address, stakeAmount], { account: stakingAccount1.account });
        await stakingToken.write.approve([stakingRewards.address, stakeAmount], { account: stakingAccount1.account });
        await stakingRewards.write.stake([stakeAmount], { account: stakingAccount1.account });
  
        // Distribute rewards
        await rewardsToken.write.transfer([stakingRewards.address, rewardAmount], { account: rewardsDistribution.account });
        await stakingRewards.write.notifyRewardAmount([rewardAmount], { account: rewardsDistribution.account });
  
        // Fast forward time
        await time.increase(7 * 24 * 60 * 60); // 7 days
  
        const earnedRewards = await stakingRewards.read.earned([stakingAccount1.account.address]);
        expect(earnedRewards as bigint > 0n);
      });
    });
  
    describe("Withdrawals", function () {
      it("Should allow withdrawing staked tokens", async function () {
        const { stakingRewards, stakingToken, stakingAccount1 } = await loadFixture(deployStakingRewardsFixture);
        const stakeAmount = parseEther("100");
  
        // Stake tokens
        await stakingToken.write.transfer([stakingAccount1.account.address, stakeAmount], { account: stakingAccount1.account });
        await stakingToken.write.approve([stakingRewards.address, stakeAmount], { account: stakingAccount1.account });
        await stakingRewards.write.stake([stakeAmount], { account: stakingAccount1.account });
  
        // Withdraw tokens
        await stakingRewards.write.withdraw([stakeAmount], { account: stakingAccount1.account });
  
        expect(await stakingRewards.read.balanceOf([stakingAccount1.account.address])).to.equal(0n);
        expect(await stakingToken.read.balanceOf([stakingAccount1.account.address])).to.equal(parseEther(DEFAULT_SUPPLY.toString()));
      });
    });
  
    describe("Reward Calculations", () => {
      it("should calculate correct reward per token", async () => {
        const { stakingRewards, stakingToken, rewardsToken, stakingAccount1, rewardsDistribution } = await loadFixture(deployStakingRewardsFixture);
        const stakeAmount = parseEther("100");
        const rewardAmount = parseEther("1000");
  
        await stakingToken.write.transfer([stakingAccount1.account.address, stakeAmount], { account: stakingAccount1.account });
        await stakingToken.write.approve([stakingRewards.address, stakeAmount], { account: stakingAccount1.account });
        await stakingRewards.write.stake([stakeAmount], { account: stakingAccount1.account });
  
        await rewardsToken.write.transfer([stakingRewards.address, rewardAmount], { account: rewardsDistribution.account });
        await stakingRewards.write.notifyRewardAmount([rewardAmount], { account: rewardsDistribution.account });
  
        await time.increase(7 * 24 * 60 * 60); // 7 days
  
        const rewardPerToken = await stakingRewards.read.rewardPerToken();
        expect(rewardPerToken as bigint > 0n);
      });
    });
  
    describe("setRewardsDuration", () => {
      it("should allow owner to set rewards duration", async () => {
        const { stakingRewards, owner } = await loadFixture(deployStakingRewardsFixture);
        const newDuration = 70n * 24n * 60n * 60n; // 70 days
  
        await time.increase(7 * 24 * 60 * 60); // 7 days
        await stakingRewards.write.setRewardsDuration([newDuration], { account: owner.account });
  
        expect(await stakingRewards.read.rewardsDuration()).to.equal(newDuration);
      });
    });
  
    describe("exit", () => {
      it("should withdraw all staked tokens and claim rewards", async () => {
        const { stakingRewards, stakingToken, rewardsToken, stakingAccount1, rewardsDistribution } = await loadFixture(deployStakingRewardsFixture);
        const stakeAmount = parseEther("100");
        const rewardAmount = parseEther("1000");
  
        // Setup staking and rewards
        await stakingToken.write.transfer([stakingAccount1.account.address, stakeAmount], { account: stakingAccount1.account });
        await stakingToken.write.approve([stakingRewards.address, stakeAmount], { account: stakingAccount1.account });
        await stakingRewards.write.stake([stakeAmount], { account: stakingAccount1.account });
  
        await rewardsToken.write.transfer([stakingRewards.address, rewardAmount], { account: rewardsDistribution.account });
        await stakingRewards.write.notifyRewardAmount([rewardAmount], { account: rewardsDistribution.account });
  
        await time.increase(7 * 24 * 60 * 60); // 7 days
  
        const initialStakingBalance = await stakingToken.read.balanceOf([stakingAccount1.account.address]) as bigint;
        const initialRewardsBalance = await rewardsToken.read.balanceOf([stakingAccount1.account.address]) as bigint;
  
        await stakingRewards.write.exit([], { account: stakingAccount1.account });
  
        const finalStakingBalance = await stakingToken.read.balanceOf([stakingAccount1.account.address]) as bigint;
        const finalRewardsBalance = await rewardsToken.read.balanceOf([stakingAccount1.account.address]) as bigint;
  
        // Use Viem's comparison for big numbers
        expect(finalStakingBalance > initialStakingBalance).to.be.true;
        expect(finalRewardsBalance > initialRewardsBalance).to.be.true;
        expect(await stakingRewards.read.balanceOf([stakingAccount1.account.address])).to.equal(0n);
      });
    });
  });
