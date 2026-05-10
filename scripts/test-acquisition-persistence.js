import { AcquisitionManager, RedditExtractor } from "../packages/catalog-acquisition/src/index.js";

const acquisition = new AcquisitionManager();
acquisition.registerExtractor("reddit", new RedditExtractor());

// Mock Repository
const mockRepository = {
    calls: [],
    async createAcquisitionRun({ domainId, metadata }) {
        this.calls.push({ method: "createAcquisitionRun", domainId, metadata });
        return "mock-run-id";
    },
    async saveReviewObservations(data) {
        this.calls.push({ method: "saveReviewObservations", data });
    },
    async completeAcquisitionRun({ id }) {
        this.calls.push({ method: "completeAcquisitionRun", id });
    }
};

async function testPersistence() {
    console.log("--- TEST: Acquisition Persistence ---");

    await acquisition.fetchReviews("ThinkPad X1", {
        repository: mockRepository,
        domainId: "laptop-test"
    });

    console.log("Repository Calls:", JSON.stringify(mockRepository.calls, null, 2));

    const methodsCalled = mockRepository.calls.map(c => c.method);
    if (methodsCalled.includes("createAcquisitionRun") && 
        methodsCalled.includes("saveReviewObservations") && 
        methodsCalled.includes("completeAcquisitionRun")) {
        console.log("✅ Success: Acquisition results were persisted through the repository.");
    } else {
        console.error("❌ Failure: Missing repository calls.");
        process.exit(1);
    }
}

testPersistence();
