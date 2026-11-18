import { createClient, SupabaseClient } from '@supabase/supabase-js';

const PLACEHOLDER_VALUES = new Set([
  'your_supabase_project_url',
  'your_supabase_anon_key',
  'MY_SUPABASE_URL',
  'MY_SUPABASE_ANON_KEY',
  'undefined',
  'null'
]);

const cleanConfigValue = (val: unknown): string => {
  if (typeof val !== 'string') return '';
  const trimmed = val.trim().replace(/^["']|["']$/g, '');
  if (!trimmed || PLACEHOLDER_VALUES.has(trimmed)) return '';
  return trimmed;
};

const isValidHttpUrl = (val: string): boolean => {
  try {
    const parsed = new URL(val);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

export const getSupabaseConfig = () => {
  let definedUrl = '';
  let definedKey = '';
  try {
    definedUrl = process.env.SUPABASE_URL || '';
    definedKey = process.env.SUPABASE_ANON_KEY || '';
  } catch {
    // ignore when process is unavailable
  }

  const urlCandidates = [
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.SUPABASE_URL,
    definedUrl
  ];

  const keyCandidates = [
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    import.meta.env.VITE_SUPABASE_API_KEY,
    import.meta.env.VITE_SUPABASE_KEY,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
    import.meta.env.SUPABASE_ANON_KEY,
    import.meta.env.SUPABASE_API_KEY,
    definedKey
  ];

  let url = '';
  for (const candidate of urlCandidates) {
    const cleaned = cleanConfigValue(candidate);
    if (cleaned && isValidHttpUrl(cleaned)) {
      url = cleaned;
      break;
    }
  }

  let anonKey = '';
  for (const candidate of keyCandidates) {
    const cleaned = cleanConfigValue(candidate);
    if (cleaned) {
      anonKey = cleaned;
      break;
    }
  }

  return { url, anonKey };
};

export const isSupabaseConfigured = (): boolean => {
  const { url, anonKey } = getSupabaseConfig();
  return !!(url && anonKey);
};

let supabaseInstance: SupabaseClient | null = null;
let lastConfigSignature = '';

export const getSupabase = (): SupabaseClient => {
  const { url, anonKey } = getSupabaseConfig();

  if (!url || !anonKey) {
    return {} as SupabaseClient;
  }

  const signature = `${url}::${anonKey}`;
  if (supabaseInstance && lastConfigSignature === signature) {
    return supabaseInstance;
  }

  supabaseInstance = createClient(url, anonKey);
  lastConfigSignature = signature;
  return supabaseInstance;
};

// For backward compatibility with existing imports
export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    const instance = getSupabase();
    return (instance as any)[prop];
  }
});
