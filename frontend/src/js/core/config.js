// ══════════════════════════════════════════════════════════
//  CONFIGURAÇÃO SUPABASE — core/config.js
// ══════════════════════════════════════════════════════════

export var SUPABASE_URL = 'https://ivxjetctxmsqrkmlyznz.supabase.co';
export var SUPABASE_KEY = 'sb_publishable_IYY46_75S-rQQcsXsPD1xQ_ta987Zu6';
export var sb = null;

export function initSupabase(url, key) {
  if (!url || !key) return false;
  try {
    if (window.supabase) {
      window.sb = window.supabase.createClient(url, key);
      sb = window.sb;
      return true;
    }
  } catch (e) { console.error(e); }
  return false;
}

export function withTimeout(promise, ms) {
  return new Promise(function (resolve, reject) {
    var timer = setTimeout(function () {
      reject(new Error("Timeout"));
    }, ms);
    promise.then(
      function (res) { clearTimeout(timer); resolve(res); },
      function (err) { clearTimeout(timer); reject(err); }
    );
  });
}

// Bind to window for global availability
window.initSupabase = initSupabase;
window.withTimeout = withTimeout;

// Auto-initialize
initSupabase(SUPABASE_URL, SUPABASE_KEY);
