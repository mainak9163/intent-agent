import { AnalysisResult } from './analysis.agent';
import { IntentResponse } from './intent.agent';
import { AnalysisReport } from '../types/analysis.types';

function derivePriority(result: AnalysisResult): AnalysisReport['priority'] {
  if (result.findings.some((finding) => finding.severity === 'critical')) {
    return 'critical';
  }

  if (result.findings.some((finding) => finding.severity === 'high')) {
    return 'high';
  }

  return (result.findings[0]?.severity as AnalysisReport['priority']) || 'low';
}

export async function generateReport(
  intent: IntentResponse,
  analysis: AnalysisResult
): Promise<AnalysisReport> {
  const highlights = analysis.findings
    .slice(0, 5)
    .map((finding) => `${finding.title}: ${finding.description}`);

  return {
    title: `${intent.intent_class_label} Log Analysis Report`,
    priority: derivePriority(analysis),
    executive_summary: analysis.summary,
    highlights,
    recommended_actions: analysis.recommended_actions,
    report_notes: intent.reporting.notes_for_report_agent,
    generated_at: new Date().toISOString(),
  };
}

export default {
  generateReport,
};
