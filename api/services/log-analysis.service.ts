import { analyzeLogs } from '../agents/analysis.agent';
import { fetchLogs, storeLogs } from '../agents/data.agent';
import { classifyIntent } from '../agents/intent.agent';
import { generateReport } from '../agents/report.agent';
import { db } from '../config/database';
import { parseLogs } from '../parsers/log-parser.service';
import {
  AnalyzeLogsRequest,
  AnalysisPipelineResponse,
} from '../types/analysis.types';

function persistAnalysisResult(result: AnalysisPipelineResponse) {
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

  let ingestion: AnalysisPipelineResponse['ingestion'];
  if (request.log_input?.content) {
    const parsed = parseLogs(request.log_input.content, {
      source: request.log_input.source,
      forceFormat: request.log_input.format,
    });

    const shouldPersist = request.persist_logs !== false;
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

  const data = await fetchLogs({
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
