// ============================================================
//  MAIN LANDING PAGE BOOTSTRAP
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  checkSession();
  initReveal();

  // Mostrar botão de config Supabase se não configurado
  if (!localStorage.getItem('sb_url')) {
    const tip = document.createElement('div');
    tip.style.cssText = `
      position:fixed;bottom:1.5rem;left:1.5rem;z-index:9998;
      background:var(--blue);color:white;border-radius:10px;
      padding:0.75rem 1.2rem;font-size:0.82rem;font-weight:600;
      cursor:pointer;box-shadow:0 8px 24px rgba(0,48,135,0.3);
      display:flex;align-items:center;gap:8px;
    `;
    tip.innerHTML = '⚙️ Configurar Supabase';
    tip.onclick = () => document.getElementById('configModal').classList.remove('hidden');
    document.body.appendChild(tip);
  }
});
