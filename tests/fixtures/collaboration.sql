-- Minimal existing-schema fixture, NOT a replacement for production migrations.
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
GRANT USAGE ON SCHEMA public, auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
CREATE TABLE people (id uuid PRIMARY KEY);
CREATE TABLE spaces (id uuid PRIMARY KEY);
CREATE TABLE org_memberships (person_id uuid REFERENCES people(id), organization_id uuid NOT NULL, primary_space_id uuid REFERENCES spaces(id));
CREATE TABLE signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL,
  created_by uuid NOT NULL REFERENCES people(id), owner_id uuid REFERENCES people(id),
  owner_space_id uuid REFERENCES spaces(id), status text NOT NULL DEFAULT 'open',
  visibility text NOT NULL DEFAULT 'org_wide'
);
CREATE TABLE signal_comments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), signal_id uuid NOT NULL REFERENCES signals(id), author_id uuid NOT NULL REFERENCES people(id), body text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE signal_forwards (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), signal_id uuid NOT NULL REFERENCES signals(id), forwarded_by uuid NOT NULL REFERENCES people(id), forwarded_to_person uuid REFERENCES people(id), forwarded_to_space uuid REFERENCES spaces(id));
CREATE TABLE signal_participants (signal_id uuid REFERENCES signals(id), person_id uuid REFERENCES people(id));
CREATE TABLE notifications (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), signal_id uuid REFERENCES signals(id), person_id uuid NOT NULL REFERENCES people(id), kind text NOT NULL, read boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());
CREATE FUNCTION public.signal_org(_signal_id uuid) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$ SELECT organization_id FROM signals WHERE id = _signal_id $$;
ALTER TABLE signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY visible_signals ON signals FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM org_memberships m WHERE m.person_id = auth.uid() AND m.organization_id = signals.organization_id)
  AND (visibility = 'org_wide' OR created_by = auth.uid() OR owner_id = auth.uid())
);
CREATE POLICY edit_signals ON signals FOR UPDATE TO authenticated USING (created_by = auth.uid() OR owner_id = auth.uid());
CREATE POLICY create_signals ON signals FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
ALTER TABLE signal_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY visible_comments ON signal_comments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM signals WHERE id = signal_id));
CREATE POLICY create_comments ON signal_comments FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid() AND EXISTS (SELECT 1 FROM signals WHERE id = signal_id));
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_notifications ON notifications FOR SELECT TO authenticated USING (person_id = auth.uid());
CREATE POLICY update_notifications ON notifications FOR UPDATE TO authenticated USING (person_id = auth.uid());
GRANT SELECT ON people, org_memberships TO authenticated;
GRANT SELECT, INSERT, UPDATE ON signals TO authenticated;
GRANT SELECT, INSERT ON signal_comments, signal_forwards TO authenticated;
GRANT SELECT, UPDATE ON notifications TO authenticated;
