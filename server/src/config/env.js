import 'dotenv/config';

// Simple env export — reads from .env file automatically via dotenv
export const env = {
  PORT: parseInt(process.env.PORT || '10000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'smarterp_dev_secret_change_in_production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
  isDev: process.env.NODE_ENV !== 'production',
};
