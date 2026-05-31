import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

const testDataDir = path.resolve(process.cwd(), 'tmp', 'api-tests');
const testDbPath = path.join(testDataDir, 'logs.test.db');

process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
process.env.ENABLE_PERSISTENCE = 'false';
process.env.DB_PATH = testDbPath;

type MockExecutor = () => Promise<string>;

let mockQueue: MockExecutor[] = [];
let server: Server;
let baseUrl: string;
let setOpenRouterHandlerForTests: typeof import('../api/config/openrouter').__setOpenRouterHandlerForTests;

function queueOpenRouterJson(payload: unknown) {
  mockQueue.push(async () => JSON.stringify(payload));
}

function queueOpenRouterFailure(message: string) {
  mockQueue.push(async () => {
    throw new Error(message);
  });
}

before(async () => {
  fs.mkdirSync(testDataDir, { recursive: true });

  const appModule = await import('../api/app');
  const openRouterModule = await import('../api/config/openrouter');

  setOpenRouterHandlerForTests = openRouterModule.__setOpenRouterHandlerForTests;

  setOpenRouterHandlerForTests(async () => {
    const next = mockQueue.shift();
    if (!next) {
      throw new Error('No mocked OpenRouter response queued for this test');
    }

    return next();
  });

  server = appModule.default.listen(0);
  await once(server, 'listening');

  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

beforeEach(() => {
  mockQueue = [];
});

after(async () => {
  setOpenRouterHandlerForTests(null);

  if (server) {
    server.close();
    await once(server, 'close');
  }

  fs.rmSync(testDataDir, { recursive: true, force: true });
});

test('GET /health returns service status', async () => {
  const response = await fetch(`${baseUrl}/health`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, 'ok');
  assert.ok(body.timestamp);
});

test('POST /v1/intent/classify returns a structured classification payload', async () => {
  queueOpenRouterJson({
    intent_class_id: 'security',
    intent_class_label: 'Security Intent',
    candidate_subclasses: ['Brute Force Attack Detection'],
    confidence: 0.97,
    analysis_goals: ['Detect repeated login failures'],
    suggested_filters: {
      time_window: 'last 1h',
      entities: ['ip', 'user'],
      log_sources: ['auth'],
    },
    metrics_of_interest: ['failed_login_count'],
    analysis_techniques: ['Correlation Analysis'],
    reporting: {
      summary_scale: ['good', 'warning', 'bad'],
      priority: 'high',
      notes_for_report_agent: 'Escalate if threshold is exceeded.',
    },
    reasoning: 'Repeated login failures are a common brute-force indicator.',
  });

  const response = await fetch(`${baseUrl}/v1/intent/classify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: 'Find brute-force login attempts in auth logs.',
      mode: 'offline',
      locale: 'en',
      organizationContext: {
        environment: 'prod',
        logSources: ['auth'],
      },
    }),
  });

  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.intent_class_id, 'security');
  assert.equal(body.data.intent_class_label, 'Security Intent');
  assert.equal(body.data.mode, 'offline');
  assert.deepEqual(body.data.suggested_filters.log_sources, ['auth']);
});

test('POST /v1/intent/classify returns 500 when the upstream model fails', async () => {
  queueOpenRouterFailure('OpenRouter unavailable');

  const response = await fetch(`${baseUrl}/v1/intent/classify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: 'Detect unusual login failures.',
    }),
  });

  const body = await response.json();

  assert.equal(response.status, 500);
  assert.equal(body.success, false);
  assert.match(body.message, /OpenRouter unavailable/);
});

test('POST /v1/analysis/run ingests logs and falls back to local analysis if AI analysis fails', async () => {
  queueOpenRouterJson({
    intent_class_id: 'security',
    intent_class_label: 'Security Intent',
    candidate_subclasses: ['Brute Force Attack Detection'],
    confidence: 0.96,
    analysis_goals: ['Identify repeated authentication failures'],
    suggested_filters: {
      time_window: 'last 1h',
      entities: ['ip', 'user'],
      log_sources: ['auth'],
    },
    metrics_of_interest: ['failed_login_count', 'http_401_count'],
    analysis_techniques: ['Correlation Analysis', 'Anomaly Detection'],
    reporting: {
      summary_scale: ['good', 'warning', 'bad'],
      priority: 'high',
      notes_for_report_agent: 'Escalate quickly when errors cluster.',
    },
    reasoning: 'Authentication failures in auth logs align with a security investigation.',
  });
  queueOpenRouterFailure('AI analysis unavailable');

  const logContent = [
    JSON.stringify({
      timestamp: '2026-03-13T10:00:00.000Z',
      level: 'error',
      message: 'Failed login for admin user',
      source: 'auth',
      status: 401,
      method: 'POST',
      path: '/login',
      ip: '10.0.0.10',
    }),
    JSON.stringify({
      timestamp: '2026-03-13T10:05:00.000Z',
      level: 'warn',
      message: 'Repeated failed login for admin user',
      source: 'auth',
      status: 401,
      method: 'POST',
      path: '/login',
      ip: '10.0.0.10',
    }),
  ].join('\n');

  const response = await fetch(`${baseUrl}/v1/analysis/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: 'Investigate repeated failed logins in the auth service.',
      mode: 'online',
      log_input: {
        content: logContent,
        source: 'auth',
        format: 'json',
      },
      time_window: {
        start: '2026-03-13T00:00:00.000Z',
        end: '2026-03-14T00:00:00.000Z',
      },
      include_raw_logs: true,
    }),
  });

  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.ingestion.total_parsed, 2);
  assert.equal(body.data.ingestion.stored_count, 0);
  assert.equal(body.data.data.filtered_count, 2);
  assert.equal(body.data.data.logs.length, 2);
  assert.match(body.data.analysis.summary, /Basic analysis performed/);
  assert.equal(body.data.analysis.metrics.errors_found, 1);
  assert.equal(body.data.analysis.metrics.warnings_found, 2);
  assert.equal(body.data.report.priority, 'high');
});
