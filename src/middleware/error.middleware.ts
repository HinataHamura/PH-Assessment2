import type { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { AppError } from '../utils/app-error.util';
import { sendError } from '../utils/response.util';

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  void req;
  void next;
  console.error(err);

  if (err instanceof AppError) {
    return sendError(res, err.status, err.message, err.errors);
  }

  if (err instanceof Error) {
    return sendError(res, StatusCodes.INTERNAL_SERVER_ERROR, 'Internal Server Error', err.message);
  }

  return sendError(res, StatusCodes.INTERNAL_SERVER_ERROR, 'Internal Server Error');
}
