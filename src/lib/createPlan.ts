import { supabase } from "./supabase/client";
import type { RunnerFormData, GeneratedPlan } from "./types";

async function toUuid(id: string): Promise<string> {
  const data = new TextEncoder().encode("running-plan:" + id);
  const hash = await crypto.subtle.digest("SHA-1", data);
  const b = new Uint8Array(hash);
  b[6] = (b[6] & 0x0f) | 0x50;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b.slice(0, 16)).map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

export async function createPlan(
  formData: RunnerFormData,
  generatedPlan: GeneratedPlan,
  userId: string
): Promise<{ planId: string } | { error: string }> {
  const { data, error } = await supabase
    .from("plans")
    .insert({
      user_id: await toUuid(userId),
      race_date: formData.raceDate,
      race_type: formData.raceType,
      form_data: formData,
      generated_plan: generatedPlan,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { planId: data.id };
}
