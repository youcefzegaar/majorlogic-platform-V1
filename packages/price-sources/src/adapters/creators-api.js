import { NotYetEligibleError } from '../index.js';

// Stub — unlocked when platform meets the sales volume threshold for Creator API access.
export class CreatorsApiAdapter {
  get name() { return 'creators-api'; }

  // eslint-disable-next-line no-unused-vars
  async fetchOffers(_entity) {
    throw new NotYetEligibleError(
      'Creator API requires reaching the minimum sales volume threshold. ' +
      'Set CREATORS_API_KEY once eligibility is confirmed.'
    );
  }
}
