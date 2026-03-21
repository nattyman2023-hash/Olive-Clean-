import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

let cachedKey: string | null = null;

export function useMapTilerKey() {
  const [key, setKey] = useState<string | null>(cachedKey);
  const [loading, setLoading] = useState(!cachedKey);

  useEffect(() => {
    if (cachedKey) return;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-maptiler-key");
        if (error) throw error;
        cachedKey = data.key;
        setKey(data.key);
      } catch {
        console.error("Failed to fetch MapTiler key");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { key, loading };
}
