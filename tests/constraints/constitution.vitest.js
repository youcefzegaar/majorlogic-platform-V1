import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '../..');
const CONFIG_PATH = join(ROOT, 'domains/laptop-student-us/decision-config.json');

describe('Cognitive Constitution Integrity', () => {
  it('decision-config.json exists', () => {
    expect(existsSync(CONFIG_PATH)).toBe(true);
  });

  it('decision-config.json is valid JSON', () => {
    const raw = readFileSync(CONFIG_PATH, 'utf8');
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it('config has required top-level keys', () => {
    const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
    expect(config).toHaveProperty('domainId');
  });

  it('config domainId matches expected value', () => {
    const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
    expect(config.domainId).toBe('laptop-student-us');
  });
});
