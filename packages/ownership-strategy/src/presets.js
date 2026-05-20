/**
 * Ownership Config Presets
 * Pre-calibrated parameters for common domain categories.
 * Used as starting points in the admin UI — admins can override any value.
 */

export const OWNERSHIP_PRESETS = {
  consumer_electronics_us: {
    label: 'Consumer Electronics (US)',
    description: 'Laptops, monitors, peripherals — 3–5 year ownership cycle.',
    renewedDiscountRange: [0.15, 0.32],
    openBoxDiscountRange: [0.08, 0.14],
    defaultOwnershipYears: 4,
    apr: 0.189,
    affiliateTag: 'majorlogic-20',
    marketSources: {
      renewed:   'amazon_renewed',
      openBox:   'ebay',
      financing: 'amazon',
    },
  },

  smartphone_us: {
    label: 'Smartphone (US)',
    description: 'Phones — shorter 2–3 year cycle, active certified market via Back Market.',
    renewedDiscountRange: [0.12, 0.25],
    openBoxDiscountRange: [0.06, 0.12],
    defaultOwnershipYears: 2.5,
    apr: 0.189,
    affiliateTag: 'majorlogic-20',
    marketSources: {
      renewed:   'back_market',
      openBox:   'swappa',
      financing: 'amazon',
    },
  },

  camera_photography_us: {
    label: 'Camera & Photography (US)',
    description: 'Cameras and lenses — high resale value, active used market.',
    renewedDiscountRange: [0.18, 0.38],
    openBoxDiscountRange: [0.08, 0.16],
    defaultOwnershipYears: 5,
    apr: 0.189,
    affiliateTag: 'majorlogic-20',
    marketSources: {
      renewed:   'amazon_renewed',
      openBox:   'ebay',
      financing: 'amazon',
    },
  },

  home_appliance_us: {
    label: 'Home Appliances (US)',
    description: 'Washing machines, fridges — long 8–12 year cycles, open box common at retailers.',
    renewedDiscountRange: [0.20, 0.45],
    openBoxDiscountRange: [0.10, 0.22],
    defaultOwnershipYears: 10,
    apr: 0.149,
    affiliateTag: 'majorlogic-20',
    marketSources: {
      renewed:   'costco',
      openBox:   'bestbuy',
      financing: 'affirm',
    },
  },

  gaming_console_us: {
    label: 'Gaming Console (US)',
    description: 'Consoles and accessories — 5–7 year generational cycles.',
    renewedDiscountRange: [0.15, 0.30],
    openBoxDiscountRange: [0.06, 0.12],
    defaultOwnershipYears: 6,
    apr: 0.189,
    affiliateTag: 'majorlogic-20',
    marketSources: {
      renewed:   'amazon_renewed',
      openBox:   'ebay',
      financing: 'amazon',
    },
  },
};

export const DEFAULT_PRESET_KEY = 'consumer_electronics_us';
export const DEFAULT_PRESET = OWNERSHIP_PRESETS[DEFAULT_PRESET_KEY];
