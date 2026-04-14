export class PublishedCatalog {
  constructor({ entities, domainPack }) {
    this.entities = entities;
    this.domainPack = domainPack;
  }

  getEntity(id) {
    return this.entities.find((entity) => entity.entityId === id);
  }

  all() {
    return [...this.entities];
  }

  matchingProfile(profile) {
    return this.entities.filter((entity) => this.domainPack.entityFitsProfile(entity, profile));
  }

  withinBudget(profile) {
    return this.matchingProfile(profile).filter((entity) => this.domainPack.isWithinBudget(entity, profile));
  }
}
