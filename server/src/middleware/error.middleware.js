import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

// Custom application error class
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'APP_ERROR') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

// 404 handler
export const notFound = (req, res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND'));
};

// Global error handler
export const errorHandler = (err, req, res, _next) => {
  // Zod validation errors
  if (err instanceof ZodError) {
    return res.status(422).json({
      success: false,
      error: 'Validation Error',
      code: 'VALIDATION_ERROR',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  // Custom app errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
    });
  }

  // Prisma unique constraint
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'A record with this value already exists',
        code: 'DUPLICATE_ENTRY',
        field: err.meta?.target?.join(', '),
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Record not found',
        code: 'NOT_FOUND',
      });
    }
  }

  // Unhandled — log and return generic error
  console.error('[Unhandled Error]', err);
  return res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
    code: 'INTERNAL_ERROR',
  });
};
