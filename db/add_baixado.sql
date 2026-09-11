-- ============================================================
--  Migração: adiciona o campo "baixado" (conferido no Colibri)
--  em registros (quebra/buffet/refeição) e producoes.
--  Rode isto no SQL Editor do Neon UMA vez.
-- ============================================================

ALTER TABLE registros ADD COLUMN IF NOT EXISTS baixado BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE producoes ADD COLUMN IF NOT EXISTS baixado BOOLEAN NOT NULL DEFAULT FALSE;
