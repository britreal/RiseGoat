/*
  RiseGoat — Centro de Comando de Teia de Autoridade
  Additive schema: does not alter or remove the existing creator-page features.
*/

CREATE TABLE IF NOT EXISTS public.authority_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  property_type text NOT NULL DEFAULT 'Site',
  platform text NOT NULL DEFAULT '',
  url text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Ativo',
  objective text NOT NULL DEFAULT 'Atrair',
  tags text NOT NULL DEFAULT '',
  files jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.authority_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL DEFAULT '',
  telegram text NOT NULL DEFAULT '',
  occupation text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Frio',
  strategic_value text NOT NULL DEFAULT '',
  next_action text NOT NULL DEFAULT '',
  next_action_at timestamptz,
  tags text NOT NULL DEFAULT '',
  files jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.authority_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  origin_id uuid NOT NULL,
  origin_type text NOT NULL CHECK (origin_type IN ('property','contact')),
  destination_id uuid NOT NULL,
  destination_type text NOT NULL CHECK (destination_type IN ('property','contact')),
  connection_type text NOT NULL DEFAULT 'Link',
  description text NOT NULL DEFAULT '',
  strength text NOT NULL DEFAULT 'Média',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT authority_connections_not_self CHECK (
    NOT (origin_id = destination_id AND origin_type = destination_type)
  )
);

CREATE TABLE IF NOT EXISTS public.authority_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  entity_id uuid,
  entity_type text CHECK (entity_type IN ('property','contact')),
  task_type text NOT NULL DEFAULT 'Analisar',
  priority text NOT NULL DEFAULT 'Média',
  due_date date,
  status text NOT NULL DEFAULT 'Backlog',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.authority_contents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  property_id uuid REFERENCES public.authority_properties(id) ON DELETE SET NULL,
  content_type text NOT NULL DEFAULT 'Post',
  status text NOT NULL DEFAULT 'Ideia',
  link text NOT NULL DEFAULT '',
  views bigint NOT NULL DEFAULT 0,
  clicks bigint NOT NULL DEFAULT 0,
  conversions bigint NOT NULL DEFAULT 0,
  published_at timestamptz,
  tags text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.authority_leverage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id uuid NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('property','contact')),
  connection_degree numeric NOT NULL DEFAULT 0,
  centrality numeric NOT NULL DEFAULT 0,
  decision_power numeric NOT NULL DEFAULT 0,
  resources numeric NOT NULL DEFAULT 0,
  score numeric GENERATED ALWAYS AS (
    (connection_degree * 0.3) +
    (centrality * 0.3) +
    (decision_power * 0.2) +
    (resources * 0.2)
  ) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, entity_id, entity_type)
);

CREATE TABLE IF NOT EXISTS public.contact_dossiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.authority_contacts(id) ON DELETE CASCADE,
  wants text NOT NULL DEFAULT '',
  fears text NOT NULL DEFAULT '',
  failed_before text NOT NULL DEFAULT '',
  allies text NOT NULL DEFAULT '',
  rivals text NOT NULL DEFAULT '',
  public_secret text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contact_id)
);

CREATE TABLE IF NOT EXISTS public.contact_negotiations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.authority_contacts(id) ON DELETE CASCADE,
  history text NOT NULL DEFAULT '',
  style text NOT NULL DEFAULT '',
  limits text NOT NULL DEFAULT '',
  triggers text NOT NULL DEFAULT '',
  alternatives text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contact_id)
);

CREATE TABLE IF NOT EXISTS public.reciprocity_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.authority_contacts(id) ON DELETE CASCADE,
  favor_given text NOT NULL DEFAULT '',
  favor_received text NOT NULL DEFAULT '',
  value_given numeric NOT NULL DEFAULT 0,
  value_received numeric NOT NULL DEFAULT 0,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  context text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.authority_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity text NOT NULL,
  involved text NOT NULL DEFAULT '',
  estimated_value numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Identificada',
  your_part text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hidden_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_a text NOT NULL,
  person_b text NOT NULL,
  relation text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT '',
  strength text NOT NULL DEFAULT 'Média',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cross_influence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  influencer text NOT NULL,
  influenced text NOT NULL,
  intensity numeric NOT NULL DEFAULT 5 CHECK (intensity >= 1 AND intensity <= 10),
  topic text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.node_monetization (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id uuid NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('property','contact')),
  direct_revenue numeric NOT NULL DEFAULT 0,
  indirect_revenue numeric NOT NULL DEFAULT 0,
  cost numeric NOT NULL DEFAULT 0,
  roi numeric GENERATED ALWAYS AS (
    CASE
      WHEN cost = 0 THEN direct_revenue + indirect_revenue
      ELSE ((direct_revenue + indirect_revenue - cost) / cost) * 100
    END
  ) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, entity_id, entity_type)
);

CREATE TABLE IF NOT EXISTS public.commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_value numeric NOT NULL DEFAULT 0,
  rate numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'A receber',
  due_date date,
  received_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_pipeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product text NOT NULL,
  product_type text NOT NULL DEFAULT 'Digital',
  status text NOT NULL DEFAULT 'Ideia',
  channel text NOT NULL DEFAULT '',
  monthly_revenue numeric NOT NULL DEFAULT 0,
  margin numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.authority_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authority_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authority_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authority_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authority_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authority_leverage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_dossiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_negotiations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reciprocity_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authority_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hidden_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cross_influence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.node_monetization ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_pipeline ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'authority_properties','authority_contacts','authority_connections','authority_tasks',
    'authority_contents','authority_leverage','contact_dossiers','contact_negotiations',
    'reciprocity_ledger','authority_opportunities','hidden_connections','cross_influence',
    'node_monetization','commissions','product_pipeline'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "owner_all_%s" ON public.%I', table_name, table_name);
    EXECUTE format(
      'CREATE POLICY "owner_all_%s" ON public.%I FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)',
      table_name, table_name
    );
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_authority_properties_user ON public.authority_properties(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_authority_contacts_user ON public.authority_contacts(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_authority_connections_user ON public.authority_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_authority_tasks_user_due ON public.authority_tasks(user_id, due_date, status);
CREATE INDEX IF NOT EXISTS idx_authority_contents_user ON public.authority_contents(user_id, status);
CREATE INDEX IF NOT EXISTS idx_authority_opportunities_user ON public.authority_opportunities(user_id, status);
CREATE INDEX IF NOT EXISTS idx_reciprocity_contact ON public.reciprocity_ledger(user_id, contact_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_product_pipeline_user ON public.product_pipeline(user_id, status);

NOTIFY pgrst, 'reload schema';
