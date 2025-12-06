import { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error("Error Handler:", err);

  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error"
  });
}
