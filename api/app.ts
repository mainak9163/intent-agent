import express, { Application } from "express";
import cors from "cors";
import intentRoutes from "./routes/intent.routes";
import analysisRoutes from "./routes/analysis.routes";
import { requestLogger } from "./middlewares/request-logger";
import { errorHandler } from "./middlewares/error-handler";

const app: Application = express();

app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/v1/intent", intentRoutes);
app.use("/v1/analysis", analysisRoutes);

app.use(errorHandler);

export default app;
