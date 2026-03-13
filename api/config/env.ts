import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const candidatePaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'api/.env'),
];

for (const envPath of candidatePaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

export const env = {
  port: Number(process.env.PORT || 3000),
  openRouterApiKey: process.env.OPENROUTER_API_KEY || '',
  openRouterModel:
    process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-8b-instruct:free',
  dbPath: process.env.DB_PATH,
};

export default env;
