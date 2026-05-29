/**
 * Commerce utilities — thin wrappers over @majorlogic/api-client.
 * All purchase/telemetry logic is defined once in the shared package.
 */
import { buildGoUrl as _buildGoUrl, trackClick as _trackClick } from '../../../../packages/api-client/src/index.js';

export { buildGoUrl, trackClick } from '../../../../packages/api-client/src/index.js';

export function openBuyLink({ entityId, seller = '', domain = 'laptop-student-us', decisionRunId = null, clickType = 'buy_now_clicked' }) {
  _trackClick({ entityId, decisionRunId, clickType, domain });
  window.open(_buildGoUrl(entityId, { seller, domain }), '_blank', 'noopener,noreferrer');
}
