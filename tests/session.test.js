import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { criarToken, verificarToken } from '../lib/session';

describe('token de sessão (regra 0.3 — cookie assinado, não PIN em header)', () => {
  beforeEach(() => {
    vi.stubEnv('SESSION_SECRET', 'segredo-de-teste-apenas');
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('token válido devolve o id do funcionário', () => {
    expect(verificarToken(criarToken(42))).toBe(42);
  });

  it('não deixa o PIN (nem nada além de id/expiração) dentro do token', () => {
    const [id, expira, assinatura] = criarToken(7).split('.');
    expect(id).toBe('7');
    expect(Number(expira)).toBeGreaterThan(Date.now());
    expect(assinatura.length).toBeGreaterThan(20);
  });

  it('rejeita token adulterado (trocar o id pra virar outro funcionário)', () => {
    const [, expira, assinatura] = criarToken(7).split('.');
    expect(verificarToken(`1.${expira}.${assinatura}`)).toBeNull();
  });

  it('rejeita assinatura adulterada', () => {
    const [id, expira] = criarToken(7).split('.');
    expect(verificarToken(`${id}.${expira}.assinaturafalsa`)).toBeNull();
  });

  it('rejeita token de outro segredo', () => {
    const token = criarToken(7);
    vi.stubEnv('SESSION_SECRET', 'outro-segredo');
    expect(verificarToken(token)).toBeNull();
  });

  it('rejeita token expirado', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-22T12:00:00Z'));
    const token = criarToken(7);
    vi.setSystemTime(new Date('2026-11-01T12:00:00Z')); // > 30 dias depois
    expect(verificarToken(token)).toBeNull();
  });

  it('rejeita lixo e valores vazios', () => {
    expect(verificarToken('')).toBeNull();
    expect(verificarToken(undefined)).toBeNull();
    expect(verificarToken('a.b')).toBeNull();
    expect(verificarToken('a.b.c.d')).toBeNull();
  });

  it('sem SESSION_SECRET configurada, falha em vez de assinar com segredo vazio', () => {
    vi.stubEnv('SESSION_SECRET', '');
    expect(() => criarToken(1)).toThrow(/SESSION_SECRET/);
  });
});
