-- Tabuleiro: diretório de grandes patrimônios, organizações e relações documentadas.
-- Usa os círculos e a tabela app_admins que já existem no projeto RiseGoat.

CREATE TABLE IF NOT EXISTS public.magnates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  foto_url TEXT,
  setor TEXT NOT NULL CHECK (setor IN ('tech','financas','imobiliario','energia','industria','midia','saude','varejo','logistica','agro','educacao','outros')),
  sub_setor TEXT,
  pais TEXT,
  regiao TEXT,
  patrimonio_faixa TEXT CHECK (patrimonio_faixa IN ('<1B','1-10B','10-50B','50-100B','100B+')),
  patrimonio_estimado_musd NUMERIC,
  tipo TEXT NOT NULL DEFAULT 'indefinido' CHECK (tipo IN ('self-made','herdeiro','familia','estatal','indefinido')),
  atividade TEXT NOT NULL DEFAULT 'ativo' CHECK (atividade IN ('ativo','silencioso','aposentado','falecido')),
  bio_curta TEXT,
  fonte_principal TEXT,
  fontes JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(fontes) = 'array'),
  tags TEXT[] NOT NULL DEFAULT '{}',
  visivel_publico BOOLEAN NOT NULL DEFAULT false,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_magnates_setor ON public.magnates(setor);
CREATE INDEX IF NOT EXISTS idx_magnates_pais ON public.magnates(pais);
CREATE INDEX IF NOT EXISTS idx_magnates_regiao ON public.magnates(regiao);
CREATE INDEX IF NOT EXISTS idx_magnates_publico ON public.magnates(visivel_publico);
CREATE INDEX IF NOT EXISTS idx_magnates_patrimonio ON public.magnates(patrimonio_faixa);
CREATE INDEX IF NOT EXISTS idx_magnates_tags ON public.magnates USING GIN(tags);
-- A constraint UNIQUE(slug) já cria um índice B-tree para o slug.

CREATE TABLE IF NOT EXISTS public.magnate_empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  magnate_id UUID NOT NULL REFERENCES public.magnates(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'operacional' CHECK (tipo IN ('holding','operacional','fundo','family_office','fundacao')),
  setor TEXT,
  pais TEXT,
  fonte TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT magnate_empresas_unique UNIQUE (magnate_id, nome, tipo)
);
CREATE INDEX IF NOT EXISTS idx_empresas_magnate ON public.magnate_empresas(magnate_id);

CREATE TABLE IF NOT EXISTS public.magnate_conexoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origem_id UUID NOT NULL REFERENCES public.magnates(id) ON DELETE CASCADE,
  destino_id UUID NOT NULL REFERENCES public.magnates(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('board','coinvest','fundacao','clube','universidade','familia','politico')),
  forca INTEGER CHECK (forca BETWEEN 1 AND 5),
  fonte TEXT,
  data_inicio DATE,
  data_fim DATE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_conexao UNIQUE(origem_id, destino_id, tipo),
  CONSTRAINT no_self_loop CHECK (origem_id <> destino_id)
);
CREATE INDEX IF NOT EXISTS idx_conexoes_origem ON public.magnate_conexoes(origem_id);
CREATE INDEX IF NOT EXISTS idx_conexoes_destino ON public.magnate_conexoes(destino_id);
CREATE INDEX IF NOT EXISTS idx_conexoes_tipo ON public.magnate_conexoes(tipo);

CREATE TABLE IF NOT EXISTS public.magnate_notas_circulo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  magnate_id UUID NOT NULL REFERENCES public.magnates(id) ON DELETE CASCADE,
  circle_id UUID NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  autor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conteudo TEXT NOT NULL CHECK (length(btrim(conteudo)) > 0),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notas_magnate ON public.magnate_notas_circulo(magnate_id);
CREATE INDEX IF NOT EXISTS idx_notas_circle ON public.magnate_notas_circulo(circle_id, criado_em DESC);

CREATE TABLE IF NOT EXISTS public.magnate_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  magnate_id UUID NOT NULL REFERENCES public.magnates(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  visto_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_views_magnate ON public.magnate_views(magnate_id, visto_em DESC);
CREATE INDEX IF NOT EXISTS idx_views_user ON public.magnate_views(user_id);

CREATE OR REPLACE FUNCTION public.tabuleiro_touch_atualizado_em()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  NEW.atualizado_em := pg_catalog.now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_magnates_updated ON public.magnates;
CREATE TRIGGER trg_magnates_updated
  BEFORE UPDATE ON public.magnates
  FOR EACH ROW EXECUTE FUNCTION public.tabuleiro_touch_atualizado_em();

DROP TRIGGER IF EXISTS trg_notas_circulo_updated ON public.magnate_notas_circulo;
CREATE TRIGGER trg_notas_circulo_updated
  BEFORE UPDATE ON public.magnate_notas_circulo
  FOR EACH ROW EXECUTE FUNCTION public.tabuleiro_touch_atualizado_em();

-- Every exposed table uses RLS. Policies are recreated idempotently.
ALTER TABLE public.magnates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.magnate_empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.magnate_conexoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.magnate_notas_circulo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.magnate_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS magnates_public_read ON public.magnates;
CREATE POLICY magnates_public_read ON public.magnates
  FOR SELECT TO anon USING (visivel_publico = true);

DROP POLICY IF EXISTS magnates_auth_read ON public.magnates;
CREATE POLICY magnates_auth_read ON public.magnates
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS magnates_admin_write ON public.magnates;
CREATE POLICY magnates_admin_write ON public.magnates
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS empresas_public_read ON public.magnate_empresas;
CREATE POLICY empresas_public_read ON public.magnate_empresas
  FOR SELECT TO anon USING (
    EXISTS (SELECT 1 FROM public.magnates m
      WHERE m.id = magnate_empresas.magnate_id AND m.visivel_publico = true)
  );

DROP POLICY IF EXISTS empresas_auth_read ON public.magnate_empresas;
CREATE POLICY empresas_auth_read ON public.magnate_empresas
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS empresas_admin_write ON public.magnate_empresas;
CREATE POLICY empresas_admin_write ON public.magnate_empresas
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS conexoes_auth_read ON public.magnate_conexoes;
CREATE POLICY conexoes_auth_read ON public.magnate_conexoes
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS conexoes_admin_write ON public.magnate_conexoes;
CREATE POLICY conexoes_admin_write ON public.magnate_conexoes
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS notas_circulo_read ON public.magnate_notas_circulo;
CREATE POLICY notas_circulo_read ON public.magnate_notas_circulo
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.circle_members cm
      WHERE cm.circle_id = magnate_notas_circulo.circle_id
        AND cm.user_id = (SELECT auth.uid())
        AND cm.status = 'accepted')
    OR EXISTS (SELECT 1 FROM public.circles c
      WHERE c.id = magnate_notas_circulo.circle_id AND c.owner_user_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS notas_circulo_insert ON public.magnate_notas_circulo;
CREATE POLICY notas_circulo_insert ON public.magnate_notas_circulo
  FOR INSERT TO authenticated WITH CHECK (
    autor_id = (SELECT auth.uid())
    AND (
      EXISTS (SELECT 1 FROM public.circle_members cm
        WHERE cm.circle_id = magnate_notas_circulo.circle_id
          AND cm.user_id = (SELECT auth.uid())
          AND cm.status = 'accepted')
      OR EXISTS (SELECT 1 FROM public.circles c
        WHERE c.id = magnate_notas_circulo.circle_id AND c.owner_user_id = (SELECT auth.uid()))
    )
  );

DROP POLICY IF EXISTS notas_circulo_update ON public.magnate_notas_circulo;
CREATE POLICY notas_circulo_update ON public.magnate_notas_circulo
  FOR UPDATE TO authenticated
  USING (autor_id = (SELECT auth.uid()))
  WITH CHECK (autor_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS notas_circulo_delete ON public.magnate_notas_circulo;
CREATE POLICY notas_circulo_delete ON public.magnate_notas_circulo
  FOR DELETE TO authenticated USING (autor_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS views_insert ON public.magnate_views;
CREATE POLICY views_insert ON public.magnate_views
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS views_admin_read ON public.magnate_views;
CREATE POLICY views_admin_read ON public.magnate_views
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = (SELECT auth.uid())));

-- Explicit grants: table privileges and RLS are separate controls in Supabase.
GRANT SELECT ON public.magnates, public.magnate_empresas TO anon, authenticated;
GRANT SELECT ON public.magnate_conexoes TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.magnates, public.magnate_empresas, public.magnate_conexoes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.magnate_notas_circulo TO authenticated;
GRANT INSERT, SELECT ON public.magnate_views TO authenticated;

CREATE OR REPLACE FUNCTION public.tabuleiro_stats()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = (SELECT auth.uid()))
    THEN jsonb_build_object(
      'total', (SELECT count(*) FROM public.magnates),
      'por_setor', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object('setor', setor, 'total', total) ORDER BY total DESC), '[]'::jsonb)
        FROM (SELECT setor, count(*) AS total FROM public.magnates GROUP BY setor) AS sector_totals
      ),
      'mais_vistos', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'nome', nome, 'slug', slug, 'total', total) ORDER BY total DESC, nome), '[]'::jsonb)
        FROM (
          SELECT m.id, m.nome, m.slug, count(v.id)::bigint AS total
          FROM public.magnates m
          LEFT JOIN public.magnate_views v ON v.magnate_id = m.id
          GROUP BY m.id, m.nome, m.slug
          ORDER BY count(v.id) DESC, m.nome
          LIMIT 10
        ) AS popular
      )
    )
    ELSE NULL
  END;
$$;

REVOKE ALL ON FUNCTION public.tabuleiro_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tabuleiro_stats() TO authenticated;
