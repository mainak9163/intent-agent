import app from "./app";
import { initDatabase } from "./config/database";
import env from "./config/env";

initDatabase();

const PORT = env.port;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
}

export default app;
