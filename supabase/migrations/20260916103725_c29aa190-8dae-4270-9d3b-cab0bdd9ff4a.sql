GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT ON public.organizations TO authenticated;
GRANT SELECT, UPDATE ON public.people TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.org_memberships TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.spaces TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_expectations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.signals TO authenticated;
GRANT SELECT, INSERT ON public.signal_relationships TO authenticated;
GRANT SELECT, INSERT ON public.signal_comments TO authenticated;
GRANT SELECT, INSERT ON public.signal_attachments TO authenticated;
GRANT SELECT, INSERT ON public.signal_participants TO authenticated;
GRANT SELECT, INSERT ON public.signal_forwards TO authenticated;
GRANT SELECT, UPDATE ON public.notifications TO authenticated;

GRANT SELECT ON public.space_health TO authenticated;
GRANT SELECT ON public.org_pulse_counts TO authenticated;
GRANT SELECT ON public.mentionable_entities TO authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

GRANT EXECUTE ON FUNCTION public.create_organization(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_elevated_role(uuid) TO authenticated;