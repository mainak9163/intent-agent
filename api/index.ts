import app from "../server/app";
import { initDatabase } from "../server/config/database";
import env from "../server/config/env";

initDatabase();

const PORT = env.port;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
}

export default app;
