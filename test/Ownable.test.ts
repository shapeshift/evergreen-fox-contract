import { expect } from 'chai';
import { getAddress } from 'viem';
import { loadFixture } from '@nomicfoundation/hardhat-toolbox-viem/network-helpers';
import { deployStakingRewardsFixture } from './utils';

describe('StakingRewards Owned', function () {
  describe('Ownership', function () {
    it('Should set the right owner', async function () {
      const { stakingRewards, owner } = await loadFixture(deployStakingRewardsFixture);
      expect(await stakingRewards.read.owner()).to.equal(getAddress(owner.account.address));
    });

    it('Should allow owner to nominate new owner', async function () {
      const { stakingRewards, owner, stakingAccount1 } = await loadFixture(deployStakingRewardsFixture);

      await stakingRewards.write.nominateNewOwner([stakingAccount1.account.address], { account: owner.account });

      expect(await stakingRewards.read.nominatedOwner()).to.equal(getAddress(stakingAccount1.account.address));
    });

    it('Should not allow non-owner to nominate new owner', async function () {
      const { stakingRewards, stakingAccount1, stakingAccount2 } = await loadFixture(deployStakingRewardsFixture);

      await expect(stakingRewards.write.nominateNewOwner([stakingAccount2.account.address], { account: stakingAccount1.account }))
        .to.be.rejectedWith('Only the contract owner may perform this action');
    });

    it('Should allow nominated owner to accept ownership', async function () {
      const { stakingRewards, owner, stakingAccount1 } = await loadFixture(deployStakingRewardsFixture);

      await stakingRewards.write.nominateNewOwner([stakingAccount1.account.address], { account: owner.account });
      await stakingRewards.write.acceptOwnership({ account: stakingAccount1.account });

      expect(await stakingRewards.read.owner()).to.equal(getAddress(stakingAccount1.account.address));
      expect(await stakingRewards.read.nominatedOwner()).to.equal(getAddress('0x0000000000000000000000000000000000000000'));
    });

    it('Should not allow non-nominated address to accept ownership', async function () {
      const { stakingRewards, owner, stakingAccount1, stakingAccount2 } = await loadFixture(deployStakingRewardsFixture);

      await stakingRewards.write.nominateNewOwner([stakingAccount1.account.address], { account: owner.account });

      await expect(stakingRewards.write.acceptOwnership({ account: stakingAccount2.account }))
        .to.be.rejectedWith('You must be nominated before you can accept ownership');
    });
  });

  describe('Owner-only functions', function () {
    it('Should allow owner to set rewards duration', async function () {
      const { stakingRewards, owner } = await loadFixture(deployStakingRewardsFixture);
      const newDuration = 14n * 24n * 60n * 60n; // 14 days

      await stakingRewards.write.setRewardsDuration([newDuration], { account: owner.account });

      expect(await stakingRewards.read.rewardsDuration()).to.equal(newDuration);
    });

    it('Should not allow non-owner to set rewards duration', async function () {
      const { stakingRewards, stakingAccount1 } = await loadFixture(deployStakingRewardsFixture);
      const newDuration = 14n * 24n * 60n * 60n; // 14 days

      await expect(stakingRewards.write.setRewardsDuration([newDuration], { account: stakingAccount1.account }))
        .to.be.rejectedWith('Only the contract owner may perform this action');
    });

    it('Should allow owner to recover ERC20 tokens', async function () {
      const { stakingRewards, rewardsToken, owner } = await loadFixture(deployStakingRewardsFixture);
      const initaiBalance = await rewardsToken.read.balanceOf([owner.account.address]);
      const amount = 1000n;

      await rewardsToken.write.transfer([stakingRewards.address, amount], { account: owner.account });

      await stakingRewards.write.recoverERC20([rewardsToken.address, amount], { account: owner.account });

      expect(await rewardsToken.read.balanceOf([owner.account.address])).to.equal(initaiBalance);
    });

    it('Should not allow non-owner to recover ERC20 tokens', async function () {
      const { stakingRewards, rewardsToken, stakingAccount1 } = await loadFixture(deployStakingRewardsFixture);
      const amount = 1000n;

      await expect(stakingRewards.write.recoverERC20([rewardsToken.address, amount], { account: stakingAccount1.account }))
        .to.be.rejectedWith('Only the contract owner may perform this action');
    });

    it('Should not allow recovering staking token', async function () {
      const { stakingRewards, stakingToken, owner } = await loadFixture(deployStakingRewardsFixture);
      const amount = 1000n;

      await expect(stakingRewards.write.recoverERC20([stakingToken.address, amount], { account: owner.account }))
        .to.be.rejectedWith('Cannot withdraw the staking token');
    });
  });

  describe('Ownership transfer and privileges', function () {
    it('Should allow nominated owner to invoke owner functions only after accepting ownership', async function () {
      const { stakingRewards, owner, stakingAccount1 } = await loadFixture(deployStakingRewardsFixture);
      const newDuration = BigInt(14 * 24 * 60 * 60); // 14 days

      // Nominate new owner
      await stakingRewards.write.nominateNewOwner([stakingAccount1.account.address], { account: owner.account });

      // Attempt to set rewards duration before accepting ownership (should fail)
      await expect(stakingRewards.write.setRewardsDuration([newDuration], { account: stakingAccount1.account }))
        .to.be.rejectedWith('Only the contract owner may perform this action');

      // Accept ownership
      await stakingRewards.write.acceptOwnership({ account: stakingAccount1.account });

      // Attempt to set rewards duration after accepting ownership (should succeed)
      await stakingRewards.write.setRewardsDuration([newDuration], { account: stakingAccount1.account });

      expect(await stakingRewards.read.rewardsDuration()).to.equal(newDuration);
    });
  });
});
