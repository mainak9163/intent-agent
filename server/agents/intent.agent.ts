import { callOpenRouterJSON } from '../config/openrouter';
import { INTENT_CLASSES, ANALYSIS_TECHNIQUES } from '../constants/intent-schema';

/**
 * Intent Agent
 * Converts natural-language monitoring requests into structured Intent Objects
 * Uses OpenRouter for classification
 */

export interface IntentRequest {
  prompt: string;
  mode?: 'online' | 'offline';
  locale?: string;
  organizationContext?: {
    orgType?: string;
    environment?: string;
    logSources?: string[];
  };
}

export interface IntentResponse {
  intent_class_id: string;
  intent_class_label: string;
  candidate_subclasses: string[];
  confidence: number;
  analysis_goals: string[];
  suggested_filters: {
    time_window: string;
    entities: string[];
    log_sources: string[];
  };
  metrics_of_interest: string[];
  analysis_techniques: string[];
  mode: string;
  reporting: {
    summary_scale: string[];
    priority: string;
    notes_for_report_agent: string;
  };
  reasoning: string;
}

/**
 * Main intent classification function
 */
export async function classifyIntent(payload: IntentRequest): Promise<IntentResponse> {
  const { prompt, mode = 'online', locale, organizationContext } = payload;

  const taxonomy = INTENT_CLASSES.map((c) => ({
    id: c.id,
    label: c.label,
    subclasses: c.subclasses
  }));

  const systemInstructions = `
You are an Intent Classification Agent for log analysis and monitoring.
You MUST return ONLY valid JSON. No explanations. No markdown.

Taxonomy is included below. Choose the best matching:
- intent_class_id
- intent_class_label
- 1–3 candidate_subclasses
- analysis goals, filters, metrics, techniques

Confidence should be a number between 0 and 1.
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

${organizationContext ? `ORGANIZATION_CONTEXT:\n${JSON.stringify(organizationContext, null, 2)}\n` : ''}
${locale ? `LOCALE: ${locale}\n` : ''}

USER_PROMPT:
"${prompt}"

RETURN FORMAT:
Return ONLY a valid JSON object — no markdown, no commentary.
`;

  try {
    const result = await callOpenRouterJSON<IntentResponse>(
      [
        { role: 'system', content: systemInstructions },
        { role: 'user', content: fullPrompt }
      ],
      { temperature: 0.2, max_tokens: 1024 }
    );

    // Validate required fields
    if (!result.intent_class_id || !result.intent_class_label) {
      throw new Error('Invalid intent response: missing required fields');
    }

    // Ensure mode is set
    result.mode = mode;

    return result;
  } catch (err: any) {
    console.error('❌ Intent Classification Error:', err);
    throw new Error(err.message || 'Error while classifying intent');
  }
}

/**
 * Get intent by ID (fallback)
 */
export function getIntentById(intentId: string) {
  return INTENT_CLASSES.find(c => c.id === intentId);
}

/**
 * Get all available intent classes
 */
export function getAllIntentClasses() {
  return INTENT_CLASSES;
}

export default {
  classifyIntent,
  getIntentById,
  getAllIntentClasses,
};
