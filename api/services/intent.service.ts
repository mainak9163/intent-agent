import {
  classifyIntent as classifyIntentWithAgent,
  IntentRequest,
  IntentResponse,
} from '../agents/intent.agent';
import {
  IntentClassificationRequest,
  IntentClassificationResponse,
} from '../types/intent.types';

export async function classifyIntent(
  payload: IntentClassificationRequest
): Promise<IntentClassificationResponse> {
  return classifyIntentWithAgent(payload as IntentRequest) as Promise<IntentResponse>;
}
