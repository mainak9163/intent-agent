import { Request, Response, NextFunction } from "express";
import { classifyIntent } from "../services/intent.service";
import { IntentClassificationRequest } from "../types/intent.types";

export async function classifyIntentHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const body = req.body as IntentClassificationRequest;
    const response = await classifyIntent(body);

    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      data: response
    });
  } catch (error) {
    next(error);
  }
}
