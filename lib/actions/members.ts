"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

const Input = z.object({
  organizationId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(["admin", "manager", "employee"]),
  primarySpaceId: z.string().uuid().nullable(),
});

/**
 * Adds an already-registered person to the caller's organization.
 * People outside the org are invisible under RLS, so the lookup runs with
 * elevated privileges after verifying the caller can manage the org.
 */
export async function addMemberByEmail(input: z.infer<typeof Input>) {
  const data = Input.parse(input);
  const { supabase } = await requireUser();

  const { data: allowed } = await supabase.rpc("has_elevated_role", {
    org_id: data.organizationId,
  });
  if (!allowed) throw new Error("Only owners, admins and managers can add members");

  const { data: person, error: lookupError } = await supabaseAdmin
    .from("people")
    .select("id, full_name")
    .ilike("email", data.email.trim())
    .maybeSingle();
  if (lookupError) throw new Error(lookupError.message);
  if (!person) return { status: "not_found" as const };

  const { data: existing } = await supabaseAdmin
    .from("org_memberships")
    .select("id")
    .eq("organization_id", data.organizationId)
    .eq("person_id", person.id)
    .maybeSingle();
  if (existing) return { status: "already_member" as const, name: person.full_name };

  const { error } = await supabaseAdmin.from("org_memberships").insert({
    organization_id: data.organizationId,
    person_id: person.id,
    role: data.role,
    primary_space_id: data.primarySpaceId,
  });
  if (error) throw new Error(error.message);

  return { status: "added" as const, name: person.full_name };
}
