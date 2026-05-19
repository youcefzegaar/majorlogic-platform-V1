async function fetchPageText(url) {
  // In a real environment, this uses Puppeteer or fetch & cheerio.
  console.log(`  [Sensor:Crawler] Crawling URL -> ${url}`);
  // Mock delay simulating network
  await new Promise(res => setTimeout(res, 800));
  return `(HTML body of ${url} containing IT criteria and laptop recommendations...)`;
}

async function extractStandardsViaLLM(text, schema, prompt, openaiKey) {
  if (!openaiKey) {
    console.log(`  [Sensor:LLM] MOCK AI LAYER ACTIVE (No OPENAI_API_KEY found)`);
    // Simulated intelligent parsing indicating the standard went UP
    return {
      official: {
        minRamGb: 8,
        minStorageGb: 256,
        needsDedicatedGpu: false
      },
      safe: {
        minRamGb: 16,
        minStorageGb: 512,
        needsDedicatedGpu: schema.properties.official.properties.needsDedicatedGpu ? true : false
      },
      confidence: 0.95,
      _rationale: "Mocked AI deduced 16GB RAM is the new baseline from the crawled text."
    };
  }

  console.log(`  [Sensor:LLM] Connecting to Real OpenAI API...`);
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${openaiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4-turbo",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are a technical standards extraction AI. Return only valid JSON matching the schema." },
        { role: "user", content: `${prompt}\n\nSchema:\n${JSON.stringify(schema)}\n\nText:\n${text}` }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Real LLM API Failed: ${response.statusText}`);
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

export async function runStandardsSensor({ domainId, sensorConfig, currentFitContexts }) {
  console.log(`\n🤖 Booting Standards Sensor for domain: [${domainId}]`);
  const proposedUpdates = { ...currentFitContexts };
  let updatesCount = 0;

  for (const [segment, target] of Object.entries(sensorConfig.watchTargets)) {
    console.log(`\n🔎 Assessing Segment: ${segment}`);
    const results = [];
    
    // 1. Crawl all benchmark sources
    for (const url of target.sources) {
      const text = await fetchPageText(url);
      
      // 2. Extract standards remotely
      const extraction = await extractStandardsViaLLM(
        text, 
        target.extractionSchema, 
        target.prompt, 
        process.env.OPENAI_API_KEY
      );
      results.push(extraction);
    }

    // 3. Agnostic Consensus Logic (Merge numeric bounds and boolean peaks based on Mode/Frequency)
    const proposedOfficial = {};
    const proposedSafe = {};

    function mergeByMode(resultsArray, profileKey) {
      const merged = {};
      const valuesByKey = {};

      resultsArray.forEach(res => {
        const profile = res[profileKey] || {};
        for (const [k, v] of Object.entries(profile)) {
          if (!valuesByKey[k]) valuesByKey[k] = [];
          valuesByKey[k].push(v);
        }
      });

      for (const [k, arr] of Object.entries(valuesByKey)) {
        const counts = {};
        let maxFreq = 0;
        let modeValue = arr[0];

        for (const v of arr) {
          const vStr = String(v);
          counts[vStr] = (counts[vStr] || 0) + 1;
          if (counts[vStr] > maxFreq) {
            maxFreq = counts[vStr];
            modeValue = v;
          } else if (counts[vStr] === maxFreq && typeof v === "number" && v > modeValue) {
            // Tie-breaker: if two numbers are equally frequent, favor the higher one for safety
            modeValue = v;
          }
        }
        merged[k] = modeValue;
      }
      return merged;
    }

    Object.assign(proposedOfficial, mergeByMode(results, "official"));
    Object.assign(proposedSafe, mergeByMode(results, "safe"));

    const currentOfficial = currentFitContexts[segment]?.official || {};
    const currentSafe = currentFitContexts[segment]?.safe || {};
    
    // Quick comparison checking if JSON representations differ
    if (JSON.stringify(currentOfficial) !== JSON.stringify(proposedOfficial) || 
        JSON.stringify(currentSafe) !== JSON.stringify(proposedSafe)) {
      console.log(`  ⚠️ [CHANGE DETECTED] Agnostic standards shifted for ${segment}!`);
      console.log(`  - Old Profile: ${JSON.stringify(currentOfficial)} | Safe: ${JSON.stringify(currentSafe)}`);
      console.log(`  - New Profile: ${JSON.stringify(proposedOfficial)} | Safe: ${JSON.stringify(proposedSafe)}`);
      
      updatesCount++;
      proposedUpdates[segment] = {
        ...currentFitContexts[segment],
        official: proposedOfficial,
        safe: proposedSafe
      };
    } else {
      console.log(`  ✅ Clean. Standards for ${segment} haven't changed.`);
    }
  }

  return {
    proposedManifest: proposedUpdates,
    updatesCount,
    meta: { generatedAt: new Date().toISOString(), sensorVersion: "1.0.0" }
  };
}
