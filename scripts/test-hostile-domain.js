import { evDomainPack } from "../domains/ev-market-us/domain-pack.js";

const mockEVs = [
    { 
        title: "Tesla Model 3 Performance", 
        price: 54000, 
        specs: { range: 315, accel: 3.1, charging: 250, brand: "Tesla", model: "M3P", battery_size_kwh: 82 }
    },
    { 
        title: "Chevrolet Bolt EV", 
        price: 26500, 
        specs: { range: 259, accel: 6.5, charging: 55, brand: "Chevy", model: "Bolt", battery_size_kwh: 65 }
    },
    { 
        title: "Ford Mustang Mach-E GT", 
        price: 59000, 
        specs: { range: 270, accel: 3.5, charging: 150, brand: "Ford", model: "MachE", battery_size_kwh: 91 }
    }
];

console.log("--- HOSTILE DOMAIN TEST: Electric Vehicles ---");

// Test 1: Family Commuter Profile
console.log("\n[TEST 1] Profile: Family Commuter (Range & Value Priority)");
const familyProfile = { intent: "family_commuter" };
const familyResults = mockEVs.map(entity => evDomainPack.evaluateCandidate({ profile: familyProfile, entity }));

familyResults.sort((a, b) => b.score - a.score);
const familyWinner = familyResults[0];

console.log(`WINNER: ${familyWinner.entity.title}`);
console.log(`SCORE: ${familyWinner.score}`);
console.log(`REASON: ${familyWinner.whyThis}`);

// Test 2: Performance Enthusiast Profile
console.log("\n[TEST 2] Profile: Performance Enthusiast (Acceleration & Charging Priority)");
const perfProfile = { intent: "performance" };
const perfResults = mockEVs.map(entity => evDomainPack.evaluateCandidate({ profile: perfProfile, entity }));

perfResults.sort((a, b) => b.score - a.score);
const perfWinner = perfResults[0];

console.log(`WINNER: ${perfWinner.entity.title}`);
console.log(`SCORE: ${perfWinner.score}`);
console.log(`REASON: ${perfWinner.whyThis}`);

// Check for Penalties
const bolt = perfResults.find(r => r.entity.title.includes("Bolt"));
console.log(`\n[PENALTY CHECK] Chevy Bolt in Performance Profile:`);
console.log(`Eligible: ${bolt.eligible}`);
console.log(`Reasoning: ${bolt.whyThis}`);

if (familyWinner.entity.title.includes("Bolt") && perfWinner.entity.title.includes("Tesla")) {
    console.log("\n✅ HOSTILE DOMAIN TEST PASSED!");
    console.log("The same engine correctly prioritized Value/Range for families and Speed/Charging for enthusiasts across a non-laptop domain.");
} else {
    console.log("\n❌ HOSTILE DOMAIN TEST FAILED!");
}
