import { supabase } from "./supabase/client";
import type { PlanRecord } from "./types";

export async function getPlanById(
  planId: string
): Promise<{ record: PlanRecord } | { error: string }> {
  const { data, error } = await supabase
    .from("plans")
    .select("*")
    .eq("id", planId)
    .single<PlanRecord>();

  if (error) return { error: error.message };
  return { record: data };
}
