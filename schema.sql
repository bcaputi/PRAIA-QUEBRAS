-- ============================================================
--  PRAIA — Registro de Perdas & Produção
--  Rode este arquivo no seu banco Neon (SQL Editor) UMA vez,
--  depois rode db/seed_items.sql para carregar os itens.
-- ============================================================

-- Funcionários que lançam (identificados por PIN)
CREATE TABLE IF NOT EXISTS funcionarios (
  id          SERIAL PRIMARY KEY,
  nome        TEXT NOT NULL,
  pin         TEXT NOT NULL UNIQUE,
  cargo       TEXT,
  admin       BOOLEAN DEFAULT FALSE,
  ativo       BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
-- Admin inicial — ENTRE com PIN 1234 e troque depois na aba Funcionários
INSERT INTO funcionarios (nome, pin, cargo, admin)
VALUES ('Brunno', '1234', 'Gerente', TRUE)
ON CONFLICT (pin) DO NOTHING;

CREATE TABLE IF NOT EXISTS items (
  codigo        TEXT PRIMARY KEY,
  nome          TEXT NOT NULL,
  classificacao TEXT,
  setor         TEXT,
  unidade       TEXT,
  custo         NUMERIC DEFAULT 0
);

-- Lançamentos de QUEBRA, BUFFET e REFEICAO (mesma estrutura, coluna "tipo" separa)
CREATE TABLE IF NOT EXISTS registros (
  id           SERIAL PRIMARY KEY,
  tipo         TEXT NOT NULL,               -- QUEBRA | BUFFET | REFEICAO
  codigo       TEXT,
  nome         TEXT NOT NULL,
  unidade      TEXT,
  quantidade   NUMERIC NOT NULL,
  custo_unit   NUMERIC DEFAULT 0,
  custo_total  NUMERIC DEFAULT 0,
  motivo       TEXT,                         -- só QUEBRA
  responsavel  TEXT,
  observacao   TEXT,
  data         DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_registros_data ON registros (data);
CREATE INDEX IF NOT EXISTS idx_registros_tipo ON registros (tipo);

-- Produção (cabeçalho): o que foi produzido, quanto rendeu, quem fez
CREATE TABLE IF NOT EXISTS producoes (
  id                    SERIAL PRIMARY KEY,
  produto               TEXT NOT NULL,
  codigo                TEXT,
  quantidade_produzida  NUMERIC,            -- rendimento
  unidade               TEXT,
  responsavel           TEXT,
  observacao            TEXT,
  custo_total           NUMERIC DEFAULT 0,  -- soma dos insumos
  data                  DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_producoes_data ON producoes (data);

-- Insumos usados em cada produção
CREATE TABLE IF NOT EXISTS producao_insumos (
  id           SERIAL PRIMARY KEY,
  producao_id  INTEGER REFERENCES producoes(id) ON DELETE CASCADE,
  codigo       TEXT,
  nome         TEXT NOT NULL,
  unidade      TEXT,
  quantidade   NUMERIC NOT NULL,
  custo_unit   NUMERIC DEFAULT 0,
  custo_total  NUMERIC DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_insumos_prod ON producao_insumos (producao_id);
