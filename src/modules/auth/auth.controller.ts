import type { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as service from './auth.service';
import type { Role } from '../../types';
import { sendSuccess } from '../../utils/response.util';

interface SignupBody {
  name?: string;
  email?: string;
  password?: string;
  role?: Role;
}

interface LoginBody {
  email?: string;
  password?: string;
}

export async function signup(req: Request<{}, {}, SignupBody>, res: Response, next: NextFunction) {
  const { name, email, password, role } = req.body;
  try {
    const user = await service.signup(name || '', email || '', password || '', role);
    return sendSuccess(res, StatusCodes.CREATED, 'User registered successfully', user);
  } catch (err) {
    return next(err);
  }
}

export async function login(req: Request<{}, {}, LoginBody>, res: Response, next: NextFunction) {
  const { email, password } = req.body;
  try {
    const result = await service.login(email || '', password || '');
    return sendSuccess(res, StatusCodes.OK, 'Login successful', result);
  } catch (err) {
    return next(err);
  }
}
