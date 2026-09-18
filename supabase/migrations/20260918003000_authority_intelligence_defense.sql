/*
  RiseGoat — Command Center intelligence, Dialog Club, radar and defense.
  Additive migration; existing RiseGoat features remain untouched.
*/

ALTER TABLE public.authority_contacts
  ADD COLUMN IF NOT EXISTS wealth_score numeric NOT NULL DEFAULT 0 CHECK (wealth_score >= 0 AND wealth_score <= 100),
  ADD COLUMN IF NOT EXISTS fame_score numeric NOT NULL DEFAULT 0 CHECK (fame_score >= 0 AND fame_score <= 100),
  ADD COLUMN IF NOT EXISTS decision_power_score numeric NOT NULL DEFAULT 0 CHECK (decision_power_score >= 0 AND decision_power_score <= 100),
  ADD COLUMN IF NOT EXISTS resources_score numeric NOT NULL DEFAULT 0 CHECK (resources_score >= 0 AND resources_score <= 100),
  ADD COLUMN IF NOT EXISTS intelligence_notes text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS source_kind text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS source_id uuid;

ALTER TABLE public.authority_properties
  ADD COLUMN IF NOT EXISTS source_kind text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS source_id uuid,
  ADD COLUMN IF NOT EXISTS audience_score numeric NOT NULL DEFAULT 0 CHECK (audience_score >= 0 AND audience_score <= 100),
  ADD COLUMN IF NOT EXISTS resources_score numeric NOT NULL DEFAULT 0 CHECK (resources_score >= 0 AND resources_score <= 100);

ALTER TABLE public.authority_contents
  ADD COLUMN IF NOT EXISTS source_kind text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS source_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'authority_contacts_source_unique'
      AND conrelid = 'public.authority_contacts'::regclass
  ) THEN
    CREATE UNIQUE INDEX authority_contacts_source_unique
      ON public.authority_contacts(user_id, source_kind, source_id)
      WHERE source_kind <> '' AND source_id IS NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'authority_properties_source_unique'
      AND conrelid = 'public.authority_properties'::regclass
  ) THEN
    CREATE UNIQUE INDEX authority_properties_source_unique
      ON public.authority_properties(user_id, source_kind, source_id)
      WHERE source_kind <> '' AND source_id IS NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'authority_contents_source_unique'
      AND conrelid = 'public.authority_contents'::regclass
  ) THEN
    CREATE UNIQUE INDEX authority_contents_source_unique
      ON public.authority_contents(user_id, source_kind, source_id)
      WHERE source_kind <> '' AND source_id IS NOT NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.authority_threats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'Reputação',
  severity text NOT NULL DEFAULT 'Média',
  source_url text NOT NULL DEFAULT '',
  evidence text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Aberta',
  linked_entity_id uuid,
  linked_entity_type text CHECK (linked_entity_type IN ('property','contact')),
  detected_at timestamptz NOT NULL DEFAULT now(),
  due_date date,
  response_summary text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.authority_defense_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  threat_id uuid NOT NULL REFERENCES public.authority_threats(id) ON DELETE CASCADE,
  action_type text NOT NULL DEFAULT 'Criar tarefa',
  status text NOT NULL DEFAULT 'Sugerida',
  action_title text NOT NULL DEFAULT '',
  response_text text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  executed_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.authority_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_entity_id uuid NOT NULL,
  source_entity_type text NOT NULL CHECK (source_entity_type IN ('property','contact')),
  target_entity_id uuid NOT NULL,
  target_entity_type text NOT NULL CHECK (target_entity_type IN ('property','contact')),
  score numeric NOT NULL DEFAULT 0,
  reason text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Nova',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, source_entity_id, source_entity_type, target_entity_id, target_entity_type)
);

CREATE TABLE IF NOT EXISTS public.authority_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type text NOT NULL,
  name text NOT NULL,
  url text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Conectada',
  last_checked_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, source_type, name)
);

ALTER TABLE public.authority_threats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authority_defense_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authority_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authority_sources ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'authority_threats','authority_defense_actions','authority_suggestions','authority_sources'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "owner_all_%s" ON public.%I', table_name, table_name);
    EXECUTE format(
      'CREATE POLICY "owner_all_%s" ON public.%I FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)',
      table_name, table_name
    );
  END LOOP;
END $$;

CREATE OR REPLACE VIEW public.authority_contact_intelligence AS
SELECT
  c.*,
  round((c.wealth_score + c.fame_score + c.decision_power_score) / 3.0, 2) AS dialog_score,
  CASE
    WHEN ((c.wealth_score + c.fame_score + c.decision_power_score) / 3.0) >= 80 THEN 'C'
    WHEN ((c.wealth_score + c.fame_score + c.decision_power_score) / 3.0) >= 55 THEN 'B'
    ELSE 'A'
  END AS dialog_grade
FROM public.authority_contacts c;

CREATE OR REPLACE FUNCTION public.authority_run_radar(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  isolated_count integer := 0;
  stagnant_count integer := 0;
  negative_count integer := 0;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT count(*) INTO isolated_count
  FROM (
    SELECT p.id
    FROM authority_properties p
    WHERE p.user_id = p_user_id
      AND NOT EXISTS (
        SELECT 1 FROM authority_connections c
        WHERE c.user_id = p_user_id
          AND ((c.origin_id = p.id AND c.origin_type = 'property')
            OR (c.destination_id = p.id AND c.destination_type = 'property'))
      )
    UNION ALL
    SELECT ct.id
    FROM authority_contacts ct
    WHERE ct.user_id = p_user_id
      AND NOT EXISTS (
        SELECT 1 FROM authority_connections c
        WHERE c.user_id = p_user_id
          AND ((c.origin_id = ct.id AND c.origin_type = 'contact')
            OR (c.destination_id = ct.id AND c.destination_type = 'contact'))
      )
  ) isolated;

  INSERT INTO authority_threats (user_id,title,category,severity,evidence,status,detected_at,updated_at)
  SELECT p_user_id, 'Nó isolado: ' || x.name, 'Rede', 'Baixa',
         'O nó não possui conexões registradas.', 'Aberta', now(), now()
  FROM (
    SELECT p.id, p.name
    FROM authority_properties p
    WHERE p.user_id = p_user_id
      AND NOT EXISTS (
        SELECT 1 FROM authority_connections c
        WHERE c.user_id = p_user_id
          AND ((c.origin_id=p.id AND c.origin_type='property') OR (c.destination_id=p.id AND c.destination_type='property'))
      )
    UNION ALL
    SELECT c.id, c.name
    FROM authority_contacts c
    WHERE c.user_id = p_user_id
      AND NOT EXISTS (
        SELECT 1 FROM authority_connections x
        WHERE x.user_id = p_user_id
          AND ((x.origin_id=c.id AND x.origin_type='contact') OR (x.destination_id=c.id AND x.destination_type='contact'))
      )
  ) x
  WHERE NOT EXISTS (
    SELECT 1 FROM authority_threats t
    WHERE t.user_id=p_user_id AND t.category='Rede' AND t.title='Nó isolado: ' || x.name AND t.status='Aberta'
  );

  SELECT count(*) INTO stagnant_count
  FROM authority_opportunities
  WHERE user_id = p_user_id
    AND status NOT IN ('Fechada','Perdida')
    AND updated_at < now() - interval '7 days';

  INSERT INTO authority_threats (user_id,title,category,severity,evidence,status,detected_at,updated_at)
  SELECT p_user_id, 'Oportunidade parada: ' || o.opportunity, 'Oportunidade', 'Média',
         'Sem atualização há mais de 7 dias.', 'Aberta', now(), now()
  FROM authority_opportunities o
  WHERE o.user_id=p_user_id
    AND o.status NOT IN ('Fechada','Perdida')
    AND o.updated_at < now() - interval '7 days'
    AND NOT EXISTS (
      SELECT 1 FROM authority_threats t
      WHERE t.user_id=p_user_id AND t.category='Oportunidade' AND t.title='Oportunidade parada: ' || o.opportunity AND t.status='Aberta'
    );

  SELECT count(*) INTO negative_count
  FROM (
    SELECT contact_id, sum(value_given - value_received) AS balance
    FROM reciprocity_ledger
    WHERE user_id=p_user_id
    GROUP BY contact_id
    HAVING sum(value_given - value_received) < 0
  ) balances;

  RETURN jsonb_build_object(
    'isolated_nodes', isolated_count,
    'stagnant_opportunities', stagnant_count,
    'negative_reciprocity', negative_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.authority_run_radar(uuid) TO authenticated;

CREATE INDEX IF NOT EXISTS idx_authority_threats_user_status ON public.authority_threats(user_id, status, severity);
CREATE INDEX IF NOT EXISTS idx_authority_defense_actions_threat ON public.authority_defense_actions(user_id, threat_id);
CREATE INDEX IF NOT EXISTS idx_authority_suggestions_user ON public.authority_suggestions(user_id, status, score DESC);

NOTIFY pgrst, 'reload schema';
