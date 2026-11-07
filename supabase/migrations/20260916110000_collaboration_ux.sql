-- Requires the existing Nerve-Pulse schema (signals, memberships, comments, etc.).
-- Notifications contain no message body and NEVER grant access to a signal.
BEGIN;

ALTER TABLE public.notifications ADD COLUMN comment_id uuid REFERENCES public.signal_comments(id) ON DELETE SET NULL;

CREATE TABLE public.signal_followers (
  signal_id uuid NOT NULL REFERENCES public.signals(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (signal_id, person_id)
);
ALTER TABLE public.signal_followers ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.signal_followers TO authenticated;
GRANT ALL ON public.signal_followers TO service_role;
CREATE POLICY followers_select ON public.signal_followers FOR SELECT TO authenticated
  USING (person_id = auth.uid() AND EXISTS (SELECT 1 FROM public.signals s WHERE s.id = signal_id));
CREATE POLICY followers_insert ON public.signal_followers FOR INSERT TO authenticated
  WITH CHECK (person_id = auth.uid() AND EXISTS (SELECT 1 FROM public.signals s WHERE s.id = signal_id));
-- Allow people to unfollow even if access was subsequently revoked.
CREATE POLICY followers_delete ON public.signal_followers FOR DELETE TO authenticated
  USING (person_id = auth.uid());
CREATE INDEX signal_followers_person_idx ON public.signal_followers(person_id);

-- Mentions are events, not participant roles: mentioning an existing participant
-- again must still notify them, without adding duplicate participant records.
CREATE TABLE public.signal_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id uuid NOT NULL REFERENCES public.signals(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  mentioned_by uuid NOT NULL REFERENCES public.people(id),
  comment_id uuid REFERENCES public.signal_comments(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.signal_mentions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.signal_mentions TO authenticated;
GRANT ALL ON public.signal_mentions TO service_role;
CREATE POLICY mentions_select ON public.signal_mentions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.signals s WHERE s.id = signal_id));
CREATE POLICY mentions_insert ON public.signal_mentions FOR INSERT TO authenticated
  WITH CHECK (
    mentioned_by = auth.uid()
    AND EXISTS (SELECT 1 FROM public.signals s WHERE s.id = signal_id)
    AND EXISTS (SELECT 1 FROM public.org_memberships m
      WHERE m.person_id = signal_mentions.person_id
      AND m.organization_id = public.signal_org(signal_id))
    AND (comment_id IS NULL OR EXISTS (
      SELECT 1 FROM public.signal_comments c WHERE c.id = comment_id
      AND c.signal_id = signal_mentions.signal_id AND c.author_id = auth.uid()
    ))
  );
CREATE INDEX signal_mentions_signal_idx ON public.signal_mentions(signal_id);

-- Invoked only by triggers, never exposed as a client notification-writing API.
-- Recipient must still belong to the organization. Signal RLS continues to
-- control what they can read, including after a visibility/role change.
CREATE FUNCTION public.deliver_signal_notification(_signal uuid, _person uuid, _kind text, _comment uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  IF _person IS NOT NULL AND _person IS DISTINCT FROM auth.uid()
    AND EXISTS (SELECT 1 FROM public.org_memberships m JOIN public.signals s
      ON s.organization_id = m.organization_id WHERE s.id = _signal AND m.person_id = _person)
  THEN
    INSERT INTO public.notifications(person_id, signal_id, kind, comment_id) VALUES (_person, _signal, _kind, _comment);
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.deliver_signal_notification(uuid, uuid, text, uuid) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.signal_collaboration_notifications()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE recipient uuid;
BEGIN
  IF TG_TABLE_NAME = 'signal_comments' THEN
    FOR recipient IN SELECT person_id FROM public.signal_followers WHERE signal_id = NEW.signal_id LOOP
      PERFORM public.deliver_signal_notification(NEW.signal_id, recipient, 'comment', NEW.id);
    END LOOP;
  ELSIF TG_TABLE_NAME = 'signal_mentions' THEN
    -- Replace the just-created generic reply alert with a more useful mention
    -- alert for this comment. Repeated mentions on later comments still notify.
    IF NEW.comment_id IS NOT NULL THEN
      DELETE FROM public.notifications WHERE person_id = NEW.person_id
        AND signal_id = NEW.signal_id AND kind = 'comment' AND NOT read
        AND comment_id = NEW.comment_id;
    END IF;
    PERFORM public.deliver_signal_notification(NEW.signal_id, NEW.person_id, 'mention', NEW.comment_id);
  ELSIF TG_TABLE_NAME = 'signal_forwards' THEN
    IF NEW.forwarded_to_person IS NOT NULL THEN
      PERFORM public.deliver_signal_notification(NEW.signal_id, NEW.forwarded_to_person, 'forward');
    ELSE
      FOR recipient IN SELECT person_id FROM public.org_memberships WHERE primary_space_id = NEW.forwarded_to_space LOOP
        PERFORM public.deliver_signal_notification(NEW.signal_id, recipient, 'forward');
      END LOOP;
    END IF;
  ELSIF TG_TABLE_NAME = 'signals' THEN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO public.signal_followers(signal_id, person_id) VALUES (NEW.id, NEW.created_by) ON CONFLICT DO NOTHING;
      IF NEW.owner_id IS NOT NULL THEN
        INSERT INTO public.signal_followers(signal_id, person_id) VALUES (NEW.id, NEW.owner_id) ON CONFLICT DO NOTHING;
      END IF;
    ELSE
      IF NEW.owner_id IS DISTINCT FROM OLD.owner_id OR NEW.owner_space_id IS DISTINCT FROM OLD.owner_space_id THEN
        IF NEW.owner_id IS NOT NULL THEN
          INSERT INTO public.signal_followers(signal_id, person_id) VALUES (NEW.id, NEW.owner_id) ON CONFLICT DO NOTHING;
          PERFORM public.deliver_signal_notification(NEW.id, NEW.owner_id, 'assigned');
        ELSIF NEW.owner_space_id IS NOT NULL THEN
          FOR recipient IN SELECT person_id FROM public.org_memberships WHERE primary_space_id = NEW.owner_space_id LOOP
            PERFORM public.deliver_signal_notification(NEW.id, recipient, 'assigned');
          END LOOP;
        END IF;
      END IF;
      IF NEW.status IS DISTINCT FROM OLD.status THEN
        FOR recipient IN SELECT person_id FROM public.signal_followers WHERE signal_id = NEW.id LOOP
          PERFORM public.deliver_signal_notification(NEW.id, recipient, 'status_changed');
        END LOOP;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.signal_collaboration_notifications() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER collaboration_comments AFTER INSERT ON public.signal_comments FOR EACH ROW EXECUTE FUNCTION public.signal_collaboration_notifications();
CREATE TRIGGER collaboration_mentions AFTER INSERT ON public.signal_mentions FOR EACH ROW EXECUTE FUNCTION public.signal_collaboration_notifications();
CREATE TRIGGER collaboration_forwards AFTER INSERT ON public.signal_forwards FOR EACH ROW EXECUTE FUNCTION public.signal_collaboration_notifications();
CREATE TRIGGER collaboration_signals AFTER INSERT OR UPDATE ON public.signals FOR EACH ROW EXECUTE FUNCTION public.signal_collaboration_notifications();

-- Existing owners/creators start subscribed; they can unfollow at any time.
INSERT INTO public.signal_followers(signal_id, person_id)
SELECT id, created_by FROM public.signals
UNION SELECT id, owner_id FROM public.signals WHERE owner_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Supabase may not have a publication in non-hosted environments.
DO $$
DECLARE table_name text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH table_name IN ARRAY ARRAY['signals', 'signal_comments', 'signal_followers', 'signal_participants', 'signal_forwards', 'notifications'] LOOP
      IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = table_name) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', table_name);
      END IF;
    END LOOP;
  END IF;
END $$;
COMMIT;
