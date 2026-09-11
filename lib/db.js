import { neon } from '@neondatabase/serverless';

// Usa a mesma variável de ambiente do padrão Vercel + Neon.
const url = process.env.DATABASE_URL;
if (!url) {
  console.warn('DATABASE_URL não definida — configure no Vercel / .env.local');
}

export const sql = neon(url);
