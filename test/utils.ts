import { parseEther } from 'viem';
import hre from 'hardhat';

export const DEFAULT_SUPPLY = 1e8;
export const REWARDS_DURATION_SECONDS = 60n * 60n * 24n * 7n; // 7 days

export async function mockToken({
  deployerAccount,
  accounts,
  name = 'name',
  symbol = 'ABC',
  supply = DEFAULT_SUPPLY,
  skipInitialAllocation = false,
}: {
    deployerAccount: { account: { address: string } },
    accounts: { account: { address: string } }[];
    name?: string;
    symbol?: string;
    supply?: number;
    skipInitialAllocation?: boolean;
  }) {
  const totalSupply = parseEther(supply.toString());

  const proxy = await hre.viem.deployContract('ProxyERC20', [deployerAccount.account.address]);
  const tokenState = await hre.viem.deployContract('TokenState', [deployerAccount.account.address, deployerAccount.account.address]);

  if (!skipInitialAllocation && supply > 0) {
    await Promise.all(accounts.map(async (account) => {
      await tokenState.write.setBalanceOf([account.account.address, totalSupply / BigInt(accounts.length)], { account: deployerAccount.account.address });
    }));
  }

  const tokenArgs = [
    proxy.address,
    tokenState.address,
    name,
    symbol,
    totalSupply,
    deployerAccount.account.address,
  ];

  const token = await hre.viem.deployContract('PublicEST', tokenArgs);
  await Promise.all([
    tokenState.write.setAssociatedContract([token.address], { account: deployerAccount.account.address }),
    proxy.write.setTarget([token.address], { account: deployerAccount.account.address }),
  ]);

  return { token, tokenState, proxy };
}

export async function deployStakingRewardsFixture() {
  const [owner, rewardsDistribution, stakingAccount1, stakingAccount2] = await hre.viem.getWalletClients();

  const { token: rewardsToken } = await mockToken({
    deployerAccount: owner,
    accounts: [rewardsDistribution, owner],
    name: 'Rewards Token',
    symbol: 'RWD',
  });

  const { token: stakingToken } = await mockToken({
    deployerAccount: owner,
    accounts: [stakingAccount1, stakingAccount2],
    name: 'Staking Token',
    symbol: 'STK',
  });

  const stakingRewards = await hre.viem.deployContract('contracts/StakingRewards.sol:StakingRewards', [
    owner.account.address,
    rewardsDistribution.account.address,
    rewardsToken.address,
    stakingToken.address,
  ]);

  const publicClient = await hre.viem.getPublicClient();

  return {
    stakingRewards,
    rewardsToken,
    stakingToken,
    owner,
    rewardsDistribution,
    stakingAccount1,
    stakingAccount2,
    publicClient,
  };
}
