import { describe, it, expect, vi, afterEach } from 'vitest';
import { hojeBrasilia } from '../lib/data';

describe('hojeBrasilia (regra 0.6 — data em America/Sao_Paulo, não UTC)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('bate com a data UTC quando ainda é cedo (mesmo dia nas duas)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-22T14:00:00.000Z')); // 11:00 em Brasília
    expect(hojeBrasilia()).toBe('2026-09-22');
  });

  it('depois das 21h de Brasília, a data UTC já virou o dia seguinte — não pode vazar isso', () => {
    vi.useFakeTimers();
    // 2026-09-23T01:30:00Z = 2026-09-22T22:30 em Brasília (UTC-3) — ainda dia 22 lá,
    // mas em UTC já é dia 23. Esse é exatamente o bug que a regra 0.6 corrige.
    vi.setSystemTime(new Date('2026-09-23T01:30:00.000Z'));
    expect(hojeBrasilia()).toBe('2026-09-22');
  });

  it('logo depois da meia-noite em Brasília já é o novo dia', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-23T03:30:00.000Z')); // 00:30 em Brasília
    expect(hojeBrasilia()).toBe('2026-09-23');
  });
});
