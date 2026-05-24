import type { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import type { Role } from '../types';
import { sendError } from '../utils/response.util';

export function authorize(roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user || !roles.includes(user.role)) {
      return sendError(res, StatusCodes.FORBIDDEN, 'Forbidden');
    }
    next();
  };
}
