// src/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !key) {
  console.warn("Supabase env vars not set. Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are provided.");
}

export const supabase = createClient(url, key);
