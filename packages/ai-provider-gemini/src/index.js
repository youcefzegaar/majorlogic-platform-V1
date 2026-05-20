import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Gemini AI Provider for MajorLogic Platform.
 * Acts as the 'Voice' of the Cognitive Decision Architecture.
 */
export class GeminiProvider {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.logger = options.logger || console;
    this.modelName = options.modelName || "gemini-2.0-flash"; // Updated: 1.5-flash deprecated
    
    if (!this.apiKey) {
      this.logger.error("[GeminiProvider] Initialization failed: No API Key provided.");
    } else {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
      this.model = this.genAI.getGenerativeModel({ model: this.modelName });
    }
  }

  /**
   * Implements the `aiProvider` interface expected by DecisionExplainer.
   */
  async generate(prompt) {
    if (!this.model) {
      this.logger.log("[GeminiProvider] Operating in Mock Mode (No API Key). Returning fallback narrative.");
      return this._mockGenerate(prompt);
    }

    try {
      this.logger.log(`[GeminiProvider] Calling Gemini API (${this.modelName})...`);
      
      const result = await this.model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
              temperature: 0.2, // Low temperature for factual, deterministic rendering
              maxOutputTokens: 250,
          }
      });
      
      const text = result.response.text();
      return text.trim();
    } catch (error) {
      this.logger.error("[GeminiProvider] API Call Failed", error);
      return this._mockGenerate(prompt); // Fallback gracefully
    }
  }

  _mockGenerate(prompt) {
      // Very basic parser just for the mock to sound realistic if keys are missing
      const isArabic = prompt.includes('LOCALE: ar');
      return isArabic 
        ? "بناءً على تحليل ذكي لمتطلباتك، هذا هو أفضل خيار لك." 
        : "Based on a cognitive analysis of your constraints and needs, this is the optimal choice.";
  }
}
