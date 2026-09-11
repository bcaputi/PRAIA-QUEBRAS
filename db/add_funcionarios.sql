-- ============================================================
--  Migração: adiciona login por PIN de funcionários.
--  Rode isto SÓ se você já tinha criado o banco com a versão
--  anterior (sem PIN). Em banco novo, o schema.sql já inclui.
-- ============================================================

CREATE TABLE IF NOT EXISTS funcionarios (
  id          SERIAL PRIMARY KEY,
  nome        TEXT NOT NULL,
  pin         TEXT NOT NULL UNIQUE,
  cargo       TEXT,
  admin       BOOLEAN DEFAULT FALSE,
  ativo       BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO funcionarios (nome, pin, cargo, admin)
VALUES ('Brunno', '1234', 'Gerente', TRUE)
ON CONFLICT (pin) DO NOTHING;
