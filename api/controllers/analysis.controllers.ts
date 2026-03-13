import { NextFunction, Request, Response } from 'express';
import { runLogAnalysis } from '../services/log-analysis.service';
import { AnalyzeLogsRequest } from '../types/analysis.types';

export async function runAnalysisHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const body = req.body as AnalyzeLogsRequest;
    const result = await runLogAnalysis(body);

    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
