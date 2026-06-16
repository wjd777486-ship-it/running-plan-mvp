import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import type { PlanRecord } from "@/lib/types";
import PlanShell from "@/components/plan/PlanShell";

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await searchParams;
  const planId = Array.isArray(id) ? id[0] : id;

  if (!planId) {
    redirect("/onboarding");
  }

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("plans")
    .select("*")
    .eq("id", planId)
    .single<PlanRecord>();

  if (error || !data || !data.generated_plan) {
    redirect("/onboarding");
  }

  return <PlanShell generatedPlan={data.generated_plan} planId={planId} />;
}
