import { BigNumber, providers, utils, Contract } from 'ethers';
import { parseEther } from 'viem';
import hre from 'hardhat';

export const DEFAULT_SUPPLY = 1e8;
export const REWARDS_DURATION_SECONDS = 60n * 60n * 24n * 7n; // 7 days
const PERMIT_TYPEHASH = utils.keccak256(
  utils.toUtf8Bytes('Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)'),
);

export async function mockToken({
  accounts,
  synth = undefined,
  name = 'name',
  symbol = 'ABC',
  supply = DEFAULT_SUPPLY,
  skipInitialAllocation = false,
}: {
    accounts: { account: { address: string } }[];
    synth?: string;
    name?: string;
    symbol?: string;
    supply?: number;
    skipInitialAllocation?: boolean;
  }) {
  const [deployerAccount, owner] = accounts;

  const totalSupply = parseEther(supply.toString());

  const proxy = await hre.viem.deployContract('ProxyERC20', [owner.account.address]);
  const tokenState = await hre.viem.deployContract('TokenState', [owner.account.address, deployerAccount.account.address]);

  if (!skipInitialAllocation && supply > 0) {
    await tokenState.write.setBalanceOf([owner.account.address, totalSupply], { account: deployerAccount.account });
  }

  const tokenArgs = [
    proxy.address,
    tokenState.address,
    name,
    symbol,
    totalSupply,
    owner.account.address,
  ];

  if (synth) {
    tokenArgs.push(synth);
  }

  const token = await hre.viem.deployContract(synth ? 'MockSynth' : 'PublicEST', tokenArgs);
  await Promise.all([
    tokenState.write.setAssociatedContract([token.address], { account: owner.account }),
    proxy.write.setTarget([token.address], { account: owner.account }),
  ]);

  return { token, tokenState, proxy };
}

export async function deployStakingRewardsFixture() {
  const [owner, rewardsDistribution, stakingAccount1, otherAccount] = await hre.viem.getWalletClients();

  const { token: rewardsToken } = await mockToken({
    accounts: [owner, rewardsDistribution],
    name: 'Rewards Token',
    symbol: 'RWD',
  });

  const { token: stakingToken } = await mockToken({
    accounts: [owner, stakingAccount1],
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
    otherAccount,
    publicClient,
  };
}

function getDomainSeparator(name: string, tokenAddress: string, chainId: number) {
  return utils.keccak256(
    utils.defaultAbiCoder.encode(
      ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
      [
        utils.keccak256(
          utils.toUtf8Bytes('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'),
        ),
        utils.keccak256(utils.toUtf8Bytes(name)),
        utils.keccak256(utils.toUtf8Bytes('1')),
        chainId,
        tokenAddress,
      ],
    ),
  );
}

export async function getApprovalDigest(
  token: Contract,
  approve: {
    owner: string
    spender: string
    value: BigNumber
  },
  nonce: BigNumber,
  deadline: BigNumber,
  chainId: number,
): Promise<string> {
  const name = await token.name();
  const DOMAIN_SEPARATOR = getDomainSeparator(name, token.address, chainId);
  return utils.keccak256(
    utils.solidityPack(
      ['bytes1', 'bytes1', 'bytes32', 'bytes32'],
      [
        '0x19',
        '0x01',
        DOMAIN_SEPARATOR,
        utils.keccak256(
          utils.defaultAbiCoder.encode(
            ['bytes32', 'address', 'address', 'uint256', 'uint256', 'uint256'],
            [PERMIT_TYPEHASH, approve.owner, approve.spender, approve.value, nonce, deadline],
          ),
        ),
      ],
    ),
  );
}

export function expandTo18Decimals(n: number): BigNumber {
  return BigNumber.from(n).mul(BigNumber.from(10).pow(18));
}

export async function mineBlock(provider: providers.JsonRpcProvider, timestamp: number): Promise<void> {
  return provider.send('evm_mine', [timestamp]);
}
