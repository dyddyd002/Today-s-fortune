import { createClient } from "@supabase/supabase-js";

// 심화실습①: Supabase 프로젝트의 Project URL / anon(publishable) key.
// 둘 다 브라우저에 노출돼도 되는 값이라 NEXT_PUBLIC_ 접두사를 쓴다.
// (실제 접근 제어는 Supabase의 Row Level Security 정책으로 한다.)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;
