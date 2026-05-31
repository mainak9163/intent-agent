import app from "./api/app";
import { initDatabase } from "./api/config/database";
import env from "./api/config/env";

initDatabase();

const PORT = env.port;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
}

export default app;
