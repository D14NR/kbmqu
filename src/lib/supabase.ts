import { createClient } from "@supabase/supabase-js";

const normalizeSupabaseUrl = (value: string | undefined) => {
  const raw = String(value || "").trim();
  if (!raw) {
    return "https://oqpblpjvqimozlfdvykw.supabase.co";
  }

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }

  // Support project-ref-only input such as: oqpblpjvqimozlfdvykw
  return `https://${raw}.supabase.co`;
};

const supabaseUrl = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL);
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xcGJscGp2cWltb3psZmR2eWt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NDYyMzcsImV4cCI6MjA4OTMyMjIzN30.xZWJVi3HhofJe6083I_6qmogKQdQIO_kHx9o5Ofc3mc";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const supabaseLpsUrl = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_LPS);
const supabaseLpsAnonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY_LPS || "").trim();

export const supabaseLPS =
  supabaseLpsAnonKey
    ? createClient(supabaseLpsUrl, supabaseLpsAnonKey)
    : // provide a minimal stub to avoid runtime errors when env is missing
      {
        from: (_table: string) => ({
          select: (_cols?: string) => ({
            order: async (_col?: string, _opts?: Record<string, unknown>) => ({ data: [] as any[], error: null }),
          }),
        }),
      } as any;
