import { gemini } from "../config/gemini-client";
import {
  IntentClassificationRequest,
  IntentClassificationResponse
} from "../types/intent.types";
import { INTENT_CLASSES, ANALYSIS_TECHNIQUES } from "../constants/intent-schema";

/**
 * Utility: remove Markdown fences, trailing text, or invalid prefixes.
 */
function cleanGeminiJSON(text: string): string {
  return text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .replace(/^\s*[\uFEFF\xEF\xBB\xBF]?/, "") // remove BOM
    .trim();
}

/**
 * Utility: safe JSON parse with helpful debugging.
 */
function safeParseJSON(raw: string): any {
  const cleaned = cleanGeminiJSON(raw);

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("❌ JSON PARSE ERROR — Raw Gemini Output:\n", cleaned);
    throw new Error("Gemini returned invalid JSON. Check logs for raw output.");
  }
}

export async function classifyIntent(
  payload: IntentClassificationRequest
): Promise<IntentClassificationResponse> {
  const { prompt, mode = "online", locale, organizationContext } = payload;

  const taxonomy = INTENT_CLASSES.map((c) => ({
    id: c.id,
    label: c.label,
    subclasses: c.subclasses
  }));

  /**
   * STRICT JSON MODE INSTRUCTIONS
   */
  const systemInstructions = `
You are an Intent Classification Agent.
You MUST return ONLY valid JSON.
No explanations. No markdown. No \`\`\` fences.

Taxonomy is included below. Choose the best matching:
- intent_class_id
- intent_class_label
- 1–3 candidate_subclasses
- analysis goals, filters, metrics, techniques
`;

  const jsonSpec = {
    intent_class_id: "string",
    intent_class_label: "string",
    candidate_subclasses: ["string"],
    confidence: 0.0,
    analysis_goals: ["string"],
    suggested_filters: {
      time_window: "string",
      entities: ["string"],
      log_sources: ["string"]
    },
    metrics_of_interest: ["string"],
    analysis_techniques: ["string"],
    mode: "string",
    reporting: {
      summary_scale: ["string"],
      priority: "string",
      notes_for_report_agent: "string"
    },
    reasoning: "string"
  };

  const fullPrompt = `
SYSTEM:
${systemInstructions}

JSON_SCHEMA:
${JSON.stringify(jsonSpec, null, 2)}

INTENT_TAXONOMY:
${JSON.stringify(taxonomy, null, 2)}

ANALYSIS_TECHNIQUES:
${JSON.stringify(ANALYSIS_TECHNIQUES)}

USER_PROMPT:
"${prompt}"

RETURN FORMAT:
Return ONLY a valid JSON object — no markdown, no commentary.
`;

  try {
    const model = gemini.getGenerativeModel({
      model: "gemini-2.5-pro"
    });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2
      }
    });

    const textResponse = result.response.text();

    return safeParseJSON(textResponse) as IntentClassificationResponse;
  } catch (err: any) {
    console.error("❌ Gemini API Error:", err);
    throw new Error(err.message || "Gemini error while classifying intent");
  }
}
