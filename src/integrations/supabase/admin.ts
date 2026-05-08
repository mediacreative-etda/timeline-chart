import { createClient } from "@supabase/supabase-js";

const getRequiredEnv = (name: string) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing server environment variable: ${name}`);
  }

  return value;
};

export const createSupabaseAdminClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl) {
    throw new Error("Missing server environment variable: SUPABASE_URL");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};
