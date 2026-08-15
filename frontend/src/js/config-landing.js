// ══════════════════════════════════════════════════════════
//  CONFIGURAÇÃO DA LANDING PAGE — config-landing.js
//
//  A autenticação usa Supabase Auth — sem credenciais hardcoded.
//  Configure frontend/.env com as variáveis VITE_SUPABASE_URL e
//  VITE_SUPABASE_KEY (veja o arquivo .env.example).
// ══════════════════════════════════════════════════════════

const LANDING_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const LANDING_SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || '';
