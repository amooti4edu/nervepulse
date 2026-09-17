CREATE OR REPLACE FUNCTION public.signal_org(_signal_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  select organization_id from signals where id = _signal_id
$$;

REVOKE ALL ON FUNCTION public.signal_org(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.signal_org(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS signal_participants_select ON public.signal_participants;
CREATE POLICY signal_participants_select ON public.signal_participants
FOR SELECT TO authenticated
USING (public.is_org_member(public.signal_org(signal_id)));

DROP POLICY IF EXISTS signal_participants_insert ON public.signal_participants;
CREATE POLICY signal_participants_insert ON public.signal_participants
FOR INSERT TO authenticated
WITH CHECK (public.is_org_member(public.signal_org(signal_id)));