import type { Response } from 'express';

export function sendSuccess<T>(res: Response, status: number, message: string, data?: T) {
  if (data === undefined) {
    return res.status(status).json({ success: true, message });
  }

  return res.status(status).json({ success: true, message, data });
}

export function sendError(res: Response, status: number, message: string, errors?: unknown) {
  if (errors === undefined) {
    return res.status(status).json({ success: false, message });
  }

  return res.status(status).json({ success: false, message, errors });
}
