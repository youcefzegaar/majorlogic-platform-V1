export function buildGrowthArtifacts({ profile, decision, domainPack }) {
  if (typeof domainPack?.buildGrowthArtifacts !== 'function') {
    return { status: 'not_configured', reason: 'domainPack.buildGrowthArtifacts not provided' };
  }
  return domainPack.buildGrowthArtifacts({ profile, decision });
}
