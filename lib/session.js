import crypto from 'crypto';
import { sql } from './db';

const COOKIE_NAME = 'praia_session';
const DURACAO_MS = 1000 * 60 * 60 * 24 * 30; // 30 dias

function segredo() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error('SESSION_SECRET não configurada');
  return s;
}

function assinar(payload) {
  return crypto.createHmac('sha256', segredo()).update(payload).digest('base64url');
}

// token = "<funcionarioId>.<expiraEmMs>.<assinatura>" — não guarda nome/admin (isso é
// sempre buscado de novo no banco em lerSessao, pra desativar alguém invalidar na hora).
export function criarToken(funcionarioId) {
  const expira = Date.now() + DURACAO_MS;
  const payload = `${funcionarioId}.${expira}`;
  return `${payload}.${assinar(payload)}`;
}

export function verificarToken(token) {
  if (!token) return null;
  const partes = String(token).split('.');
  if (partes.length !== 3) return null;
  const [id, expira, assinatura] = partes;
  const payload = `${id}.${expira}`;
  const esperado = assinar(payload);
  // comparação em tempo constante — evita timing attack na assinatura
  const a = Buffer.from(assinatura);
  const b = Buffer.from(esperado);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  if (Date.now() > Number(expira)) return null;
  const funcionarioId = Number(id);
  return Number.isFinite(funcionarioId) ? funcionarioId : null;
}

export const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: DURACAO_MS / 1000,
};
export { COOKIE_NAME };

// Lê o cookie da sessão, valida a assinatura/expiração e busca o funcionário ATUAL
// no banco (nome/admin/ativo nunca vêm só do token) — devolve null se não houver
// sessão válida ou o funcionário tiver sido desativado/excluído nesse meio tempo.
export async function lerSessao(request) {
  const token = request.cookies?.get ? request.cookies.get(COOKIE_NAME)?.value : null;
  const funcionarioId = verificarToken(token);
  if (!funcionarioId) return null;
  const rows = await sql`
    SELECT id, nome, cargo, admin, ativo
    FROM funcionarios
    WHERE id = ${funcionarioId} AND ativo = true`;
  return rows[0] || null;
}
