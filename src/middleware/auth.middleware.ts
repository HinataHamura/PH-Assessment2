import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { StatusCodes } from 'http-status-codes';
import type { AuthUser, Role } from '../types';
import { sendError } from '../utils/response.util';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return sendError(res, StatusCodes.UNAUTHORIZED, 'Missing Authorization header');
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader.trim();

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id?: unknown; name?: unknown; role?: unknown };
    if (typeof payload.id !== 'number' || typeof payload.name !== 'string' || !isRole(payload.role)) {
      return sendError(res, StatusCodes.UNAUTHORIZED, 'Invalid or expired token');
    }

    req.user = { id: payload.id, name: payload.name, role: payload.role };
    next();
  } catch (err) {
    void err;
    return sendError(res, StatusCodes.UNAUTHORIZED, 'Invalid or expired token');
  }
}

function isRole(role: unknown): role is Role {
  return role === 'contributor' || role === 'maintainer';
}
