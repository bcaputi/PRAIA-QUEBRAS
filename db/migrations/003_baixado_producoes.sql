-- Coluna "baixado" em producoes (mesmo motivo da 002).
ALTER TABLE producoes ADD COLUMN IF NOT EXISTS baixado BOOLEAN NOT NULL DEFAULT FALSE;
