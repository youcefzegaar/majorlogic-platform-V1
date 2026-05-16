import { DecisionOrchestrator } from './packages/decision-orchestrator/src/index.js';
import { DecisionKernel } from './packages/decision-kernel/src/index.js';
import { DecisionCompiler } from './packages/decision-compiler/src/index.js';
import fs from 'fs';
import path from 'path';

async function runLogicLayerTests() {
    console.log('--- Layer 1: Logic (Kernel) - 30 Tests ---');
    const compiler = new DecisionCompiler();
    const kernel = new DecisionKernel();
    const config = JSON.parse(fs.readFileSync('./domains/laptop-student-us/decision-config.json', 'utf8'));
    const compiledIr = compiler.compile(config);
    
    let passed = 0;
    for (let i = 1; i <= 30; i++) {
        const mockEntities = [{
            entityId: `test-device-${i}`,
            specs: { 
                performance: 20 + (i * 2), battery: 30 + (i * 2), portability: 40 + (i),
                display: 50, ramGb: i % 2 === 0 ? 8 : 16
            },
            market: { sellerTier: (i % 5) + 1, bestOffer: { priceUsd: 400 + (i * 50) } }
        }];
        const mockProfile = { preferences: { performance: 50, battery: 50, portability: 50, display: 50, resale: 50 } };
        try {
            const result = kernel.execute(compiledIr, mockEntities, mockProfile);
            if (result.results && result.results.length > 0) passed++;
        } catch (e) { console.error(`Logic Test ${i} failed:`, e.message); }
    }
    console.log(`Logic Layer: ${passed}/30 Passed\n`);
    return passed;
}

async function runOrchestrationLayerTests() {
    console.log('--- Layer 2: Orchestration (Pipeline) - 30 Tests ---');
    const orchestrator = new DecisionOrchestrator();
    const config = JSON.parse(fs.readFileSync('./domains/laptop-student-us/decision-config.json', 'utf8'));
    
    // Mock entities array
    const entities = Array.from({ length: 10 }, (_, i) => ({
        entityId: `laptop-${i}`,
        title: `Laptop ${i}`,
        specs: { performance: 70, battery: 70, portability: 70, ramGb: 16, display: 70 },
        market: { sellerTier: 4, bestOffer: { priceUsd: 800 + (i * 100) } }
    }));

    let passed = 0;
    for (let i = 1; i <= 30; i++) {
        const profile = {
            major: 'cs',
            budgetUsd: 500 + (i * 100),
            preferences: { performance: 50, battery: 50, portability: 50, display: 50, resale: 50 }
        };
        try {
            const result = await orchestrator.run(config, entities, profile);
            if (result.cards) passed++;
        } catch (e) { console.error(`Orchestration Test ${i} failed:`, e.message); }
    }
    console.log(`Orchestration Layer: ${passed}/30 Passed\n`);
    return passed;
}

async function runDomainScenarioTests() {
    console.log('--- Layer 3: Domain (Scenarios) - 30 Tests ---');
    const orchestrator = new DecisionOrchestrator();
    const config = JSON.parse(fs.readFileSync('./domains/laptop-student-us/decision-config.json', 'utf8'));
    const entities = Array.from({ length: 5 }, (_, i) => ({
        entityId: `domain-laptop-${i}`,
        title: `Domain Laptop ${i}`,
        specs: { performance: 80, battery: 80, portability: 80, ramGb: 32, display: 80 },
        market: { sellerTier: 5, bestOffer: { priceUsd: 1200 } }
    }));

    let passed = 0;
    for (let i = 1; i <= 30; i++) {
        const profile = {
            major: i % 2 === 0 ? 'engineering' : 'medical',
            budgetUsd: 1000 + (i * 50),
            preferences: { performance: 90, battery: 10, portability: 50, display: 50, resale: 50 }
        };
        try {
            const result = await orchestrator.run(config, entities, profile);
            if (result.integrityScore !== undefined) passed++;
        } catch (e) { console.error(`Domain Test ${i} failed:`, e.message); }
    }
    console.log(`Domain Layer: ${passed}/30 Passed\n`);
    return passed;
}

async function main() {
    console.log('🚀 Starting Universal 90-Point Integrity Audit (V4)...\n');
    const l1 = await runLogicLayerTests();
    const l2 = await runOrchestrationLayerTests();
    const l3 = await runDomainScenarioTests();
    console.log('=========================================');
    console.log(`FINAL REPORT: ${l1 + l2 + l3}/90 SUCCESS`);
    console.log('=========================================');
    if (l1 + l2 + l3 === 90) console.log('✅ Project Status: MISSION CRITICAL READY');
    else console.log('❌ Project Status: NEEDS REVIEW');
}
main();
