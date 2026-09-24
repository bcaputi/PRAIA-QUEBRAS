-- Coluna "baixado" (checkbox de conferido/baixado no Colibri) em registros.
-- Já constava no schema.sql, mas bancos criados antes dela não têm.
ALTER TABLE registros ADD COLUMN IF NOT EXISTS baixado BOOLEAN NOT NULL DEFAULT FALSE;
