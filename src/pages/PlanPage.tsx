import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PlanShell from "../components/plan/PlanShell";
import { getPlanById } from "../lib/getPlan";
import type { GeneratedPlan } from "../lib/types";

export default function PlanPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const planId = searchParams.get("id");

  const [generatedPlan, setGeneratedPlan] = useState<GeneratedPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!planId) {
      navigate("/onboarding", { replace: true });
      return;
    }

    let cancelled = false;

    (async () => {
      const result = await getPlanById(planId);
      if (cancelled) return;

      if ("error" in result || !result.record.generated_plan) {
        navigate("/onboarding", { replace: true });
        return;
      }

      setGeneratedPlan(result.record.generated_plan);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [planId, navigate]);

  if (!planId || loading || !generatedPlan) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#F5F5F9] px-5">
        <div
          className="animate-spin"
          style={{
            width: 68,
            height: 68,
            borderRadius: 9999,
            border: "4px solid #E5E7EB",
            borderTopColor: "#2B7FFF",
          }}
        />
        <p
          className="font-medium text-[#8E8E93] text-center"
          style={{ fontSize: 14, lineHeight: 1.4 }}
        >
          훈련 계획을 불러오는 중...
        </p>
      </main>
    );
  }

  return <PlanShell generatedPlan={generatedPlan} planId={planId} />;
}
