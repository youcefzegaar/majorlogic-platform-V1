// Pure parsing helpers — no external side effects
import { clamp } from "../../packages/shared-kernel/src/index.js";

export function parseCapacity(rawValue) {
  const value = String(rawValue ?? "").toLowerCase();
  const match = value.match(/(\d+(\.\d+)?)/);
  if (!match) {
    return 0;
  }

  const amount = Number(match[1]);
  if (value.includes("tb")) {
    return Math.round(amount * 1024);
  }

  return Math.round(amount);
}

export function parseNumber(rawValue, fallback = 0) {
  const match = String(rawValue ?? "").match(/(\d+(\.\d+)?)/);
  return match ? Number(match[1]) : fallback;
}

export function normalizeGpuClass(rawGpu) {
  const value = String(rawGpu ?? "").toLowerCase();
  if (value.includes("4070") || value.includes("4080") || value.includes("4090")) return "high_dgpu";
  if (value.includes("4060") || value.includes("4050")) return "mid_dgpu";
  return "integrated";
}

export function scoreGpu(gpuClass) {
  if (gpuClass === "high_dgpu") return 100;
  if (gpuClass === "mid_dgpu") return 84;
  return 40;
}

export function resolveSellerTier(offer) {
  if (!offer) return 4; // Unknown
  const type = offer.sellerType;
  const cond = offer.condition;
  const seller = String(offer.seller ?? "").toLowerCase();

  if (type === "brand_direct") return 1;
  if (type === "retailer") return 1;
  if (type === "certified_reseller") return 2;

  if (type === "marketplace") {
    if (cond === "new") return 2;
    return 4; // Risky marketplace refurbished/open-box
  }

  // Robust fallback for known retailers if type is missing in source
  const knownTier1 = ["amazon", "best buy", "b&h", "newegg", "walmart", "target", "micro center"];
  const knownBrands = ["apple", "lenovo", "dell", "hp", "asus", "acer", "msi", "microsoft", "framework"];

  if (knownTier1.includes(seller)) return 2; // Treat known retailers as Tier 2 if type unknown
  if (knownBrands.includes(seller)) return 1; // Treat known brands as Tier 1 if type unknown

  return 3;
}

export function detectBrand(itemName) {
  const value = String(itemName ?? "").toLowerCase();
  if (value.includes("macbook") || value.includes("apple")) return "apple";
  if (value.includes("thinkpad") || value.includes("lenovo")) return "lenovo";
  if (value.includes("asus")) return "asus";
  if (value.includes("dell")) return "dell";
  if (value.includes("acer")) return "acer";
  if (value.includes("hp")) return "hp";
  if (value.includes("surface") || value.includes("microsoft")) return "microsoft";
  if (value.includes("msi")) return "msi";
  return "unknown";
}

export function buildProductImageDataUri({ itemName, variantName, brand }) {
  const palettes = {
    apple: ["#0F2B5B", "#50D5D1"],
    lenovo: ["#17335C", "#66C7BF"],
    asus: ["#102E68", "#4AB7E8"],
    dell: ["#123B78", "#76C2FF"],
    acer: ["#133E6C", "#5ED6C0"],
    hp: ["#164E63", "#3DD7D6"],
    microsoft: ["#1A3768", "#6FDBDB"],
    msi: ["#1C2C5B", "#6F8DFF"],
    unknown: ["#17335C", "#50D5D1"]
  };
  const [start, end] = palettes[brand] ?? palettes.unknown;
  const title = String(itemName ?? "Laptop");
  const subtitle = String(variantName ?? "");
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="960" height="620" viewBox="0 0 960 620">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FBFDFF" />
          <stop offset="100%" stop-color="#EEF5FB" />
        </linearGradient>
        <linearGradient id="screen" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${start}" />
          <stop offset="100%" stop-color="${end}" />
        </linearGradient>
      </defs>
      <rect width="960" height="620" rx="36" fill="url(#bg)" />
      <ellipse cx="490" cy="522" rx="238" ry="28" fill="rgba(15,43,91,0.10)" />
      <g transform="translate(240 120)">
        <rect x="110" y="20" width="420" height="255" rx="22" fill="#DCE6F4" stroke="#B9C7DA" stroke-width="6"/>
        <rect x="132" y="42" width="376" height="211" rx="14" fill="url(#screen)"/>
        <path d="M20 294 L620 294 L546 346 L95 346 Z" fill="#DCE4F0" stroke="#B9C7DA" stroke-width="5"/>
        <path d="M130 318 L510 318" stroke="#B6C5D8" stroke-width="6" stroke-linecap="round"/>
      </g>
      <text x="72" y="86" fill="#122033" font-size="34" font-family="Segoe UI, Arial, sans-serif" font-weight="700">${title}</text>
      <text x="72" y="124" fill="#607086" font-size="22" font-family="Segoe UI, Arial, sans-serif">${subtitle}</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function estimateResaleScore({ itemName, specs, trust }) {
  const brand = detectBrand(itemName);
  const brandBase = {
    apple: 96,
    lenovo: 82,
    asus: 76,
    dell: 62,
    unknown: 55
  };

  const performanceLift = clamp((specs.performance - 70) * 0.35, 0, 10);
  const trustLift = clamp((trust.sourceConfidence - 0.8) * 40, 0, 8);
  return clamp((brandBase[brand] ?? 55) + performanceLift + trustLift, 0, 100);
}

export function resolveFitContext(observation, segment, fitContexts) {
  const baseline = fitContexts[segment];
  const official = baseline.official;
  const safe = baseline.safe;

  const meetsOfficial =
    observation.specs.ramGb >= official.minRamGb &&
    observation.specs.storageGb >= official.minStorageGb &&
    (!official.needsDedicatedGpu || observation.specs.gpuClass !== "integrated");

  const meetsSafe =
    observation.specs.ramGb >= safe.minRamGb &&
    observation.specs.storageGb >= safe.minStorageGb &&
    (!safe.needsDedicatedGpu || observation.specs.gpuClass !== "integrated");

  return {
    official,
    safe,
    state: meetsSafe ? "meets_safe" : meetsOfficial ? "meets_official" : "below_official"
  };
}

export function normalizeDecisionProfile(profile) {
  const sliders = {
    virtualMachines: profile.sliders?.virtual_machines ?? 0,
    video4k: profile.sliders?.video_4k ?? 0,
    gaming: profile.sliders?.gaming ?? 0,
    portability: profile.sliders?.portability ?? 0
  };

  const preferences = {
    portability: profile.preferences?.portability ?? sliders.portability,
    battery: profile.preferences?.battery ?? 0,
    display: profile.preferences?.display ?? 0,
    resale: profile.preferences?.resale ?? 50
  };

  const context = {
    acceptsOpenBox: Boolean(profile.context?.acceptsOpenBox ?? profile.context?.open_box_accepted),
    acceptsRefurbished: Boolean(profile.context?.acceptsRefurbished ?? profile.context?.refurbished_accepted),
    financingAllowed: Boolean(profile.context?.financingAllowed ?? false)
  };

  return {
    ...profile,
    profileId: profile.id ?? profile.profileId ?? "anonymous_profile",
    sliders,
    preferences,
    context
  };
}

export function buildSoftRequirements(profile, fit, ruleset) {
  const softRequirements = {
    minRamGb: fit.safe.minRamGb,
    minStorageGb: fit.safe.minStorageGb,
    needsDedicatedGpu: Boolean(fit.safe.needsDedicatedGpu),
    portabilityFloor: 0,
    batteryFloor: 0
  };

  const sliderRules = ruleset.sliderSoftRules ?? {};

  if (profile.sliders.virtualMachines >= 70 && sliderRules.virtual_machines?.gte_70) {
    softRequirements.minRamGb = Math.max(
      softRequirements.minRamGb,
      sliderRules.virtual_machines.gte_70.softMinRamGb ?? 0
    );
    softRequirements.minStorageGb = Math.max(
      softRequirements.minStorageGb,
      sliderRules.virtual_machines.gte_70.softMinStorageGb ?? 0
    );
  }

  if (profile.sliders.video4k >= 70 && sliderRules.video_4k?.gte_70) {
    softRequirements.needsDedicatedGpu =
      softRequirements.needsDedicatedGpu ||
      Boolean(sliderRules.video_4k.gte_70.softNeedsDedicatedGpu);
    softRequirements.minRamGb = Math.max(
      softRequirements.minRamGb,
      sliderRules.video_4k.gte_70.softMinRamGb ?? 0
    );
  }

  if (profile.sliders.gaming >= 70 && sliderRules.gaming?.gte_70) {
    softRequirements.needsDedicatedGpu =
      softRequirements.needsDedicatedGpu ||
      Boolean(sliderRules.gaming.gte_70.softNeedsDedicatedGpu);
  }

  if (profile.sliders.portability >= 70 && sliderRules.portability?.gte_70) {
    softRequirements.batteryFloor = sliderRules.portability.gte_70.softMinBatteryScore ?? 0;
    softRequirements.portabilityFloor = sliderRules.portability.gte_70.softMinPortabilityScore ?? 0;
  }

  return softRequirements;
}

export function scoreHeadroom(actualValue, targetValue) {
  if (targetValue <= 0) {
    return 100;
  }

  return clamp((actualValue / targetValue) * 100);
}

export function chooseOffer(entity, profile) {
  const offers = [...entity.market.offers].sort((left, right) => left.priceUsd - right.priceUsd);
  const allowedOffers = offers.filter((offer) => {
    if (offer.condition === "open_box") {
      return profile.context.acceptsOpenBox;
    }

    if (offer.condition === "refurbished") {
      return profile.context.acceptsRefurbished;
    }

    return true;
  });

  const baselineOffer = allowedOffers[0] ?? entity.market.bestOffer ?? offers[0] ?? null;
  const heroOffer = allowedOffers.find((offer) => offer.condition !== "open_box") ??
    offers.find((offer) => offer.condition !== "open_box") ??
    baselineOffer;

  return {
    baselineOffer,
    heroOffer
  };
}

export function summarizeExclusions(exclusionReasons) {
  const uniqueReasons = [...new Set(exclusionReasons)];
  if (!uniqueReasons.length) {
    return "No eligible device remained after applying the current rules.";
  }

  return `No eligible device remained after applying these constraints: ${uniqueReasons.join(", ")}.`;
}

export function rankCandidates(entries, tieBreakersOrder) {
  const tieBreakers = tieBreakersOrder ?? [];

  const extractTieBreaker = (entry, key) => {
    if (key === "lower_risk") return -(entry.penaltyScore ?? 0);
    if (key === "higher_headroom") return entry.headroomScore ?? 0;
    if (key === "higher_trust") return entry.componentScores?.trust ?? 0;
    if (key === "higher_resale") return entry.componentScores?.resale ?? 0;
    if (key === "lower_price") return -(entry.selectedOffer?.priceUsd ?? Number.POSITIVE_INFINITY);
    return 0;
  };

  return [...entries].sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    for (const tieBreaker of tieBreakers) {
      const delta = extractTieBreaker(right, tieBreaker) - extractTieBreaker(left, tieBreaker);
      if (delta !== 0) {
        return delta;
      }
    }

    return left.entity.entityId.localeCompare(right.entity.entityId);
  });
}
