import { IdentityManager as IM } from "../packages/catalog-identity/src/index.js";

const im = new IM();

const obs = [
    { 
        itemName: "MacBook Air M3", 
        specs: { brand: "Apple", ramGb: 16, storageGb: 512, cpu: "M3" },
        trust: { sourceConfidence: 0.9 }
    },
    { 
        itemName: "MACBOOK AIR M3 (2024)", 
        specs: { brand: "Apple", ramGb: 16, storageGb: 512, cpu: "M3" },
        trust: { sourceConfidence: 0.8 }
    },
    { 
        itemName: "ASUS G14", 
        specs: { brand: "ASUS", ramGb: 16, storageGb: 1000, cpu: "R9" },
        trust: { sourceConfidence: 0.9 }
    }
];

const rules = {
    identityFields: ["brand", "ramGb", "storageGb", "cpu"]
};

const result = im.resolve(obs, rules);

console.log("Unique Entities:", result.stats.unique);
console.log("Collapsed Count:", result.stats.collapsed);

if (result.stats.unique === 2 && result.stats.collapsed === 1) {
    console.log("✅ Identity Resolution Spike Passed!");
} else {
    console.error("❌ Identity Resolution Spike Failed!");
    process.exit(1);
}
