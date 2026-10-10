-- Keep the author foreign key indexed for circle-note filtering and deletes.
CREATE INDEX IF NOT EXISTS idx_notas_autor
  ON public.magnate_notas_circulo(autor_id);
