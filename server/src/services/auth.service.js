import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';
import { env } from '../config/env.js';
import { AppError } from '../middleware/error.middleware.js';

export const authService = {
  async register(data) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new AppError('Email already registered', 409, 'EMAIL_TAKEN');

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: { email: data.email, passwordHash, name: data.name },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    const token = jwt.sign({ userId: user.id }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
    return { user, token };
  },

  async login(data) {
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');

    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');

    const token = jwt.sign({ userId: user.id }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
    return {
      user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt },
      token,
    };
  },

  async getProfile(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');
    return user;
  },
};
