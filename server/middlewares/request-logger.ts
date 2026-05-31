import { Request, Response, NextFunction } from "express";
import { getRequestContext, runWithRequestContext } from '../config/request-context';

export function requestLogger(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  runWithRequestContext(() => {
    const context = getRequestContext();
    const requestId = context?.requestId || 'no-request-id';

    console.log(`[${requestId}] [${req.method}] ${req.path}`);
    next();
  });
}
