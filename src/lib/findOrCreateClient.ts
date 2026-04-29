import { supabase } from "@/integrations/supabase/client";

export interface ClientLookupInput {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  address_line1?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}

/**
 * Find an existing client by email (preferred) or phone, otherwise create one.
 * Mirrors the CRM dedup memory: match email/phone to prevent duplicates.
 * Returns the client id.
 */
export async function findOrCreateClient(input: ClientLookupInput): Promise<string> {
  // 1) Match by email
  if (input.email) {
    const { data } = await supabase
      .from("clients")
      .select("id")
      .eq("email", input.email.trim().toLowerCase())
      .maybeSingle();
    if (data) return data.id;
  }
  // 2) Match by phone
  if (input.phone) {
    const { data } = await supabase
      .from("clients")
      .select("id")
      .eq("phone", input.phone)
      .maybeSingle();
    if (data) return data.id;
  }
  // 3) Create
  const insertPayload: any = {
    name: input.name?.trim() || "New Client",
    email: input.email?.trim().toLowerCase() || null,
    phone: input.phone || null,
    address: input.address || null,
    address_line1: input.address_line1 || null,
    city: input.city || null,
    state: input.state || null,
    zip: input.zip || null,
  };
  const { data, error } = await supabase
    .from("clients")
    .insert(insertPayload)
    .select("id")
    .single();
  if (error) throw error;
  return data!.id;
}