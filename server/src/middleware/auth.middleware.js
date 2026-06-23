import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from './error.middleware.js';

export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError('Authentication token required', 401, 'UNAUTHORIZED');
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch {
    throw new AppError('Invalid or expired token', 401, 'TOKEN_INVALID');
  }
};
