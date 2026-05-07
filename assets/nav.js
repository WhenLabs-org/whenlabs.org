(() => {
  const toggle = document.querySelector('.nav-toggle');
  const drawer = document.querySelector('.nav-drawer');
  if (!toggle || !drawer) return;

  const closeBtn = drawer.querySelector('.nav-drawer-close');
  let lastFocused = null;

  function focusables() {
    return drawer.querySelectorAll('a, button:not([disabled]), [tabindex]:not([tabindex="-1"])');
  }

  function open() {
    lastFocused = document.activeElement;
    drawer.removeAttribute('hidden');
    toggle.setAttribute('aria-expanded', 'true');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('nav-open');
    requestAnimationFrame(() => closeBtn && closeBtn.focus());
  }

  function close() {
    drawer.setAttribute('hidden', '');
    toggle.setAttribute('aria-expanded', 'false');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('nav-open');
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }

  toggle.addEventListener('click', open);
  if (closeBtn) closeBtn.addEventListener('click', close);

  drawer.addEventListener('click', (e) => {
    if (e.target === drawer) close();
  });

  document.addEventListener('keydown', (e) => {
    if (drawer.hasAttribute('hidden')) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'Tab') {
      const f = focusables();
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  drawer.querySelectorAll('a').forEach((a) => a.addEventListener('click', close));
})();
