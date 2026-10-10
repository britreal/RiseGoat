-- Replace broad FOR ALL policies so the admin write rules don't overlap read policies.
DROP POLICY IF EXISTS magnates_admin_write ON public.magnates;
DROP POLICY IF EXISTS empresas_admin_write ON public.magnate_empresas;
DROP POLICY IF EXISTS conexoes_admin_write ON public.magnate_conexoes;
DROP POLICY IF EXISTS magnates_admin_insert ON public.magnates;
DROP POLICY IF EXISTS magnates_admin_update ON public.magnates;
DROP POLICY IF EXISTS magnates_admin_delete ON public.magnates;
DROP POLICY IF EXISTS empresas_admin_insert ON public.magnate_empresas;
DROP POLICY IF EXISTS empresas_admin_update ON public.magnate_empresas;
DROP POLICY IF EXISTS empresas_admin_delete ON public.magnate_empresas;
DROP POLICY IF EXISTS conexoes_admin_insert ON public.magnate_conexoes;
DROP POLICY IF EXISTS conexoes_admin_update ON public.magnate_conexoes;
DROP POLICY IF EXISTS conexoes_admin_delete ON public.magnate_conexoes;

CREATE POLICY magnates_admin_insert ON public.magnates
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = (SELECT auth.uid())));
CREATE POLICY magnates_admin_update ON public.magnates
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = (SELECT auth.uid())));
CREATE POLICY magnates_admin_delete ON public.magnates
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = (SELECT auth.uid())));

CREATE POLICY empresas_admin_insert ON public.magnate_empresas
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = (SELECT auth.uid())));
CREATE POLICY empresas_admin_update ON public.magnate_empresas
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = (SELECT auth.uid())));
CREATE POLICY empresas_admin_delete ON public.magnate_empresas
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = (SELECT auth.uid())));

CREATE POLICY conexoes_admin_insert ON public.magnate_conexoes
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = (SELECT auth.uid())));
CREATE POLICY conexoes_admin_update ON public.magnate_conexoes
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = (SELECT auth.uid())));
CREATE POLICY conexoes_admin_delete ON public.magnate_conexoes
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.app_admins a WHERE a.user_id = (SELECT auth.uid())));
