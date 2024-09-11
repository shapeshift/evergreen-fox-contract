import { BigNumber, providers, utils, Contract } from 'ethers'
import { getAddress, parseEther } from "viem";
import hre from "hardhat";
import { loadFixture, takeSnapshot } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";

export const DEFAULT_SUPPLY = 1e8;

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

    const stakingRewards = await hre.viem.deployContract("contracts/StakingRewards.sol:StakingRewards", [
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


  type Fixture<T> = () => Promise<T>;

  interface Snapshot<T> {
    restorer: { restore: () => Promise<void>; snapshotId: string };
    fixture: Fixture<T>;
    data: T;
    gasUsed: bigint;
  }

  let snapshots: Snapshot<any>[] = [];

  // This has been adapted from @nomicfoundation/hardhat-network-helpers/src/loadFixture.ts to include the gas used during the fixture deployment.
  export async function loadFixtureWithGas<T>(fixture: Fixture<T>): Promise<T & { gasUsed: bigint }> {
    if (fixture.name === "") {
      throw new Error("FixtureAnonymousFunctionError");
    }
  
    const snapshot = snapshots.find((s) => s.fixture === fixture);
  
    if (snapshot !== undefined) {
      await snapshot.restorer.restore();
      snapshots = snapshots.filter(
        (s) =>
          Number(s.restorer.snapshotId) <= Number(snapshot.restorer.snapshotId)
      );
  
      return { ...snapshot.data, gasUsed: snapshot.gasUsed };
    } else {
      const client = await hre.viem.getPublicClient();
      const initialGasUsed = await client.getBlockNumber().then(bn => client.getBlock({ blockNumber: bn })).then(b => b!.gasUsed);
      const data = await fixture();
      const finalGasUsed = await client.getBlockNumber().then(bn => client.getBlock({ blockNumber: bn })).then(b => b!.gasUsed);
      const gasUsed = finalGasUsed - initialGasUsed;
  
      const restorer = await takeSnapshot();
  
      snapshots.push({
        restorer,
        fixture,
        data,
        gasUsed,
      });
  
      return { ...data, gasUsed };
    }
  }

const PERMIT_TYPEHASH = utils.keccak256(
  utils.toUtf8Bytes('Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)')
)

function getDomainSeparator(name: string, tokenAddress: string, chainId: number) {
  return utils.keccak256(
    utils.defaultAbiCoder.encode(
      ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
      [
        utils.keccak256(
          utils.toUtf8Bytes('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)')
        ),
        utils.keccak256(utils.toUtf8Bytes(name)),
        utils.keccak256(utils.toUtf8Bytes('1')),
        chainId,
        tokenAddress,
      ]
    )
  )
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
  chainId: number
): Promise<string> {
  const name = await token.name()
  const DOMAIN_SEPARATOR = getDomainSeparator(name, token.address, chainId)
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
            [PERMIT_TYPEHASH, approve.owner, approve.spender, approve.value, nonce, deadline]
          )
        ),
      ]
    )
  )
}

export const REWARDS_DURATION = 60 * 60 * 24 * 135

export function expandTo18Decimals(n: number): BigNumber {
  return BigNumber.from(n).mul(BigNumber.from(10).pow(18))
}

export async function mineBlock(provider: providers.JsonRpcProvider, timestamp: number): Promise<void> {
  return provider.send('evm_mine', [timestamp])
}

export function setupTests() {
  const chai = require('chai')
  if (process.env.HARDHAT) {
    const { ethers, waffle } = require('hardhat')
    const { provider } = waffle
    const stakingRewardsPath = '../artifacts/contracts/StakingRewards.sol/StakingRewards.json'
    const stakingRewardsFactoryPath = '../artifacts/contracts/StakingRewardsFactory.sol/StakingRewardsFactory.json'
    const testERC20Path = '../artifacts/contracts/test/TestERC20.sol/TestERC20.json'
    return {
      expect: chai.expect,
      ethers,
      waffle,
      provider,
      StakingRewards: require(stakingRewardsPath),
      StakingRewardsFactory: require(stakingRewardsFactoryPath),
      TestERC20: require(testERC20Path),
      isHardhat: true,
    }
  } else {
    const ethers = require('ethers')
    const waffle = require('ethereum-waffle')
    const provider = new waffle.MockProvider({
      ganacheOptions: {
        hardfork: 'istanbul',
        mnemonic: 'horn horn horn horn horn horn horn horn horn horn horn horn',
        gasLimit: 9999999,
      },
    })
    const stakingRewardsPath = '../build/StakingRewards.json'
    const stakingRewardsFactoryPath = '../build/StakingRewardsFactory.json'
    const testERC20Path = '../build/TestERC20.json'
    chai.use(waffle.solidity)
    return {
      expect: chai.expect,
      ethers,
      waffle,
      provider,
      StakingRewards: require(stakingRewardsPath),
      StakingRewardsFactory: require(stakingRewardsFactoryPath),
      TestERC20: require(testERC20Path),
      isHardhat: false,
    }
  }
}
