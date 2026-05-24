import pool from '../../config/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { StatusCodes } from 'http-status-codes';
import type { Role, User } from '../../types';
import { AppError } from '../../utils/app-error.util';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';
const SALT_ROUNDS = getSaltRounds();

export async function signup(name: string, email: string, password: string, role?: Role) {
  if (!name || !email || !password) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Missing required fields');
  }

  if (!isValidEmail(email)) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid email');
  }

  if (role && !isValidRole(role)) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid role');
  }

  const r = await pool.query<{ id: number }>('SELECT id FROM users WHERE email = $1', [email]);
  if (r.rows.length) throw new AppError(StatusCodes.CONFLICT, 'Email already registered');

  const userRole = role || 'contributor';
  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const insert = await pool.query<User>(
    'INSERT INTO users (name,email,password,role) VALUES ($1,$2,$3,$4) RETURNING id,name,email,role,created_at,updated_at',
    [name, email, hash, userRole]
  );
  return insert.rows[0];
}

export async function login(email: string, password: string) {
  if (!email || !password) throw new AppError(StatusCodes.BAD_REQUEST, 'Missing credentials');

  const r = await pool.query<User & { password: string }>(
    'SELECT id,name,email,password,role,created_at,updated_at FROM users WHERE email = $1',
    [email]
  );
  if (!r.rows.length) throw new AppError(StatusCodes.UNAUTHORIZED, 'Invalid email or password');

  const user = r.rows[0];
  if (!user) throw new AppError(StatusCodes.UNAUTHORIZED, 'Invalid email or password');

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) throw new AppError(StatusCodes.UNAUTHORIZED, 'Invalid email or password');

  const token = jwt.sign({ id: user.id, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '6h' });
  const { password: _password, ...safeUser } = user;
  void _password;

  return { token, user: safeUser };
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidRole(role: string): role is Role {
  return role === 'contributor' || role === 'maintainer';
}

function getSaltRounds() {
  const rounds = Number(process.env.SALT_ROUNDS) || 10;
  if (rounds < 8 || rounds > 12) return 10;
  return rounds;
}
