import { callOpenRouterJSON } from '../config/openrouter';
import { IntentResponse } from './intent.agent';
import { ParsedLogEntry } from '../parsers/parser.interface';

/**
 * Analysis Agent
 * Uses AI to analyze logs for patterns, anomalies, and issues
 * Based on the classified intent and provided log data
 */

export interface AnalysisRequest {
  intent: IntentResponse;
  logs: ParsedLogEntry[];
  metadata?: {
    total_logs_analyzed?: number;
    time_range?: {
      start: string;
      end: string;
    };
  };
}

export interface AnalysisFinding {
  type: 'error' | 'warning' | 'info' | 'pattern' | 'anomaly';
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  affected_entities?: string[];
  count?: number;
  timestamp?: string;
  suggestion?: string;
}

export interface AnalysisResult {
  intent_class: string;
  intent_summary: string;
  analysis_goals: string[];
  total_logs_analyzed: number;
  findings: AnalysisFinding[];
  metrics: {
    errors_found: number;
    warnings_found: number;
    anomalies_detected: number;
    patterns_identified: number;
  };
  summary: string;
  recommended_actions: string[];
  analyzed_at: string;
}

/**
 * Analyze logs based on intent using AI
 */
export async function analyzeLogs(request: AnalysisRequest): Promise<AnalysisResult> {
  const { intent, logs, metadata = {} } = request;

  // If no logs, return empty result
  if (!logs || logs.length === 0) {
    return {
      intent_class: intent.intent_class_label,
      intent_summary: `Analysis for ${intent.intent_class_label} intent`,
      analysis_goals: intent.analysis_goals,
      total_logs_analyzed: 0,
      findings: [],
      metrics: {
        errors_found: 0,
        warnings_found: 0,
        anomalies_detected: 0,
        patterns_identified: 0,
      },
      summary: 'No logs available for analysis.',
      recommended_actions: [],
      analyzed_at: new Date().toISOString(),
    };
  }

  // Prepare log data for AI analysis
  // Limit to a sample of logs to avoid token limits
  const sampleLogs = logs.slice(0, 500); // Analyze up to 500 log entries
  const logSample = sampleLogs.map(log => ({
    timestamp: log.timestamp,
    level: log.level,
    message: log.message.substring(0, 200), // Truncate long messages
    status_code: log.status_code,
    ip_address: log.ip_address,
    path: log.request_path,
  }));

  const systemPrompt = `You are a Log Analysis Agent specializing in ${intent.intent_class_label}.

Your task is to analyze the provided log entries and identify:
1. Errors and their causes
2. Anomalies and unusual patterns
3. Performance issues
4. Security concerns
5. Trends and patterns

Provide findings in a structured JSON format with specific, actionable insights.`;

  const analysisPrompt = `
INTENT CLASS: ${intent.intent_class_id} (${intent.intent_class_label})
INTENT SUBCLASSES: ${intent.candidate_subclasses.join(', ')}

ANALYSIS GOALS:
${intent.analysis_goals.map(g => `- ${g}`).join('\n')}

ANALYSIS TECHNIQUES TO USE:
${intent.analysis_techniques.map(t => `- ${t}`).join('\n')}

METRICS OF INTEREST:
${intent.metrics_of_interest.map(m => `- ${m}`).join('\n')}

LOG SAMPLE (${sampleLogs.length} entries from ${metadata.total_logs_analyzed || logs.length} total):
${JSON.stringify(logSample, null, 2)}

TIME RANGE: ${metadata.time_range?.start || 'N/A'} to ${metadata.time_range?.end || 'N/A'}

Analyze these logs and provide findings. Focus on:
${intent.analysis_goals.map(g => `- ${g}`).join('\n')}

Return ONLY valid JSON with this structure:
{
  "findings": [
    {
      "type": "error|warning|info|pattern|anomaly",
      "title": "Brief title",
      "description": "Detailed description",
      "severity": "critical|high|medium|low",
      "affected_entities": ["entity1", "entity2"],
      "count": 10,
      "timestamp": "2026-03-13T14:30:00Z",
      "suggestion": "How to fix or address this"
    }
  ],
  "metrics": {
    "errors_found": 5,
    "warnings_found": 10,
    "anomalies_detected": 2,
    "patterns_identified": 3
  },
  "summary": "Brief overall summary",
  "recommended_actions": ["action1", "action2"]
}
`;

  try {
    const aiResult = await callOpenRouterJSON<{
      findings: AnalysisFinding[];
      metrics: {
        errors_found: number;
        warnings_found: number;
        anomalies_detected: number;
        patterns_identified: number;
      };
      summary: string;
      recommended_actions: string[];
    }>(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: analysisPrompt }
      ],
      { temperature: 0.3, max_tokens: 2048 }
    );

    // Build final result
    const result: AnalysisResult = {
      intent_class: intent.intent_class_label,
      intent_summary: `${intent.intent_class_label} analysis focused on: ${intent.candidate_subclasses.join(', ')}`,
      analysis_goals: intent.analysis_goals,
      total_logs_analyzed: metadata.total_logs_analyzed || logs.length,
      findings: aiResult.findings || [],
      metrics: aiResult.metrics || {
        errors_found: 0,
        warnings_found: 0,
        anomalies_detected: 0,
        patterns_identified: 0,
      },
      summary: aiResult.summary || 'No summary provided.',
      recommended_actions: aiResult.recommended_actions || [],
      analyzed_at: new Date().toISOString(),
    };

    return result;
  } catch (err: any) {
    console.error('❌ Log Analysis Error:', err);

    // Fallback: basic statistical analysis if AI fails
    return performFallbackAnalysis(intent, logs, metadata.total_logs_analyzed || logs.length);
  }
}

/**
 * Fallback analysis using basic statistics if AI fails
 */
function performFallbackAnalysis(
  intent: IntentResponse,
  logs: ParsedLogEntry[],
  totalLogs: number
): AnalysisResult {
  const findings: AnalysisFinding[] = [];

  // Count by level
  const levelCounts: Record<string, number> = {};
  for (const log of logs) {
    if (log.level) {
      levelCounts[log.level] = (levelCounts[log.level] || 0) + 1;
    }
  }

  // Count error status codes
  const errorStatusCodes: Record<number, number> = {};
  for (const log of logs) {
    if (log.status_code && log.status_code >= 400) {
      errorStatusCodes[log.status_code] = (errorStatusCodes[log.status_code] || 0) + 1;
    }
  }

  // Create findings
  if (levelCounts.error > 0) {
    findings.push({
      type: 'error',
      title: 'Error Logs Found',
      description: `Found ${levelCounts.error} error logs in the analyzed period.`,
      severity: 'high',
      count: levelCounts.error,
      suggestion: 'Review error logs for common patterns and root causes.',
    });
  }

  if (Object.keys(errorStatusCodes).length > 0) {
    findings.push({
      type: 'warning',
      title: 'HTTP Error Status Codes',
      description: `Found HTTP errors: ${Object.entries(errorStatusCodes).map(([code, count]) => `${code} (${count})`).join(', ')}`,
      severity: 'medium',
      suggestion: 'Investigate the most frequent error status codes.',
    });
  }

  if (levelCounts.warn > 0) {
    findings.push({
      type: 'warning',
      title: 'Warning Logs Found',
      description: `Found ${levelCounts.warn} warning logs in the analyzed period.`,
      severity: 'low',
      count: levelCounts.warn,
      suggestion: 'Review warnings for potential issues before they become critical.',
    });
  }

  return {
    intent_class: intent.intent_class_label,
    intent_summary: `${intent.intent_class_label} analysis (fallback mode)`,
    analysis_goals: intent.analysis_goals,
    total_logs_analyzed: totalLogs,
    findings,
    metrics: {
      errors_found: levelCounts.error || 0,
      warnings_found: (levelCounts.warn || 0) + Object.keys(errorStatusCodes).length,
      anomalies_detected: 0,
      patterns_identified: findings.length,
    },
    summary: `Basic analysis performed. Found ${levelCounts.error || 0} errors and ${levelCounts.warn || 0} warnings.`,
    recommended_actions: ['Review error logs', 'Investigate HTTP errors'],
    analyzed_at: new Date().toISOString(),
  };
}

/**
 * Get specific analysis by type
 */
export async function getAnalysisByType(
  type: 'security' | 'performance' | 'availability' | 'compliance' | 'usage' | 'operational',
  logs: ParsedLogEntry[]
): Promise<AnalysisResult> {
  const intent: IntentResponse = {
    intent_class_id: type,
    intent_class_label: `${type.charAt(0).toUpperCase() + type.slice(1)} Intent`,
    candidate_subclasses: [],
    confidence: 1,
    analysis_goals: [],
    suggested_filters: {
      time_window: 'last 24h',
      entities: [],
      log_sources: [],
    },
    metrics_of_interest: [],
    analysis_techniques: [],
    mode: 'online',
    reporting: {
      summary_scale: [],
      priority: 'medium',
      notes_for_report_agent: '',
    },
    reasoning: 'Direct analysis request',
  };

  return analyzeLogs({ intent, logs });
}

export default {
  analyzeLogs,
  getAnalysisByType,
};