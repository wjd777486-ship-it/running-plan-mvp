"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import type { RunnerFormData, GeneratedPlan } from "@/lib/types";

export async function createPlan(
  formData: RunnerFormData,
  generatedPlan: GeneratedPlan,
  userId: string
): Promise<{ planId: string } | { error: string }> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("plans")
    .insert({
      user_id: userId,
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
