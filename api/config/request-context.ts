import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

export interface RequestContextValue {
  requestId: string;
  llmCallCount: number;
}

const requestContext = new AsyncLocalStorage<RequestContextValue>();

export function runWithRequestContext<T>(callback: () => T): T {
  return requestContext.run(
    {
      requestId: randomUUID(),
      llmCallCount: 0,
    },
    callback
  );
}

export function getRequestContext(): RequestContextValue | undefined {
  return requestContext.getStore();
}

export function incrementLlmCallCount(): number {
  const context = requestContext.getStore();
  if (!context) {
    return 0;
  }

  context.llmCallCount += 1;
  return context.llmCallCount;
}
