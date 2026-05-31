import { analyzeLogs } from '../agents/analysis.agent';
import { fetchLogs, filterLogsInMemory, storeLogs } from '../agents/data.agent';
import { classifyIntent } from '../agents/intent.agent';
import { generateReport } from '../agents/report.agent';
import env from '../config/env';
import { getDatabase } from '../config/database';
import { parseLogs } from '../parsers/log-parser.service';
import { ParsedLogEntry } from '../parsers/parser.interface';
import {
  AnalyzeLogsRequest,
  AnalysisPipelineResponse,
} from '../types/analysis.types';

function persistAnalysisResult(result: AnalysisPipelineResponse) {
  if (!env.persistenceEnabled) {
    return;
  }

  const db = getDatabase();
  const insert = db.prepare(`
    INSERT INTO analysis_results (
      intent_id,
      intent_class,
      total_logs_analyzed,
      errors_found,
      anomalies_detected,
      findings,
      metrics
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insert.run(
    result.intent.intent_class_id,
    result.intent.intent_class_label,
    result.analysis.total_logs_analyzed,
    result.analysis.metrics.errors_found,
    result.analysis.metrics.anomalies_detected,
    JSON.stringify(result.analysis.findings),
    JSON.stringify(result.analysis.metrics)
  );
}

export async function runLogAnalysis(
  request: AnalyzeLogsRequest
): Promise<AnalysisPipelineResponse> {
  const intent = await classifyIntent(request);
  let parsedEntries: ParsedLogEntry[] = [];

  let ingestion: AnalysisPipelineResponse['ingestion'];
  if (request.log_input?.content) {
    const parsed = parseLogs(request.log_input.content, {
      source: request.log_input.source,
      forceFormat: request.log_input.format,
    });

    parsedEntries = parsed.entries;
    const shouldPersist = env.persistenceEnabled && request.persist_logs !== false;
    const storedCount = shouldPersist && parsed.entries.length > 0
      ? await storeLogs(parsed.entries)
      : 0;

    ingestion = {
      format: parsed.format,
      total_parsed: parsed.total_parsed,
      failed: parsed.failed,
      stored_count: storedCount,
      errors: parsed.errors,
    };
  }

  const data = parsedEntries.length > 0
    ? filterLogsInMemory(parsedEntries, {
        intent,
        time_window: request.time_window,
        limit: request.limit,
      })
    : await fetchLogs({
        intent,
        time_window: request.time_window,
        limit: request.limit,
      });

  const analysis = await analyzeLogs({
    intent,
    logs: data.logs,
    metadata: {
      total_logs_analyzed: data.filtered_count,
      time_range: data.time_range,
    },
  });

  const report = await generateReport(intent, analysis);

  const response: AnalysisPipelineResponse = {
    intent,
    ingestion,
    data: request.include_raw_logs ? data : { ...data, logs: undefined },
    analysis,
    report,
  };

  persistAnalysisResult(response);

  return response;
}

export default {
  runLogAnalysis,
};
