import { deployStakingRewardsFixture, loadFixtureWithGas } from './utils';
import { expect } from 'chai';

describe('StakingRewards', () => {
  describe('Deployment', function () {
    it('deploy cost [ @skip-on-coverage ]', async () => {
      const { gasUsed } = await loadFixtureWithGas(deployStakingRewardsFixture);
      expect(gasUsed.toString()).to.eq('2388750');
    });
  });
});
