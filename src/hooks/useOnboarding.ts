import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useOnboarding() {
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    async function check() {
      try {
        const { data, error } = await (supabase as any)
          .from("configuracoes_negocio")
          .select("id, onboarding_completo")
          .eq("onboarding_completo", true)
          .limit(1);
        if (error) throw error;
        setNeedsOnboarding(!data || data.length === 0);
      } catch {
        setNeedsOnboarding(true);
      } finally {
        setLoading(false);
      }
    }
    check();
  }, []);

  return { loading, needsOnboarding };
}
