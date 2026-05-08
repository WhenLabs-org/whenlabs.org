(() => {
  const article = document.querySelector('article');
  if (!article) return;

  const headings = article.querySelectorAll('h2.section-heading');
  if (!headings.length) return;

  // 1. Slugify each H2 to an id (skip if already set).
  const slugify = (s) => s.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 64);
  const items = [];
  const used = new Set();
  headings.forEach((h) => {
    let slug = h.id || slugify(h.textContent);
    let i = 2;
    while (used.has(slug)) slug = slugify(h.textContent) + '-' + (i++);
    used.add(slug);
    if (!h.id) h.id = slug;
    items.push({ slug, text: h.textContent });

    // 2. Anchor link affordance next to each H2.
    const a = document.createElement('a');
    a.href = '#' + slug;
    a.className = 'anchor-link';
    a.setAttribute('aria-label', 'Anchor: ' + h.textContent);
    a.textContent = '#';
    h.appendChild(a);
  });

  // 3. Build TOC and inject after .paper-actions / .paper-meta / first child.
  if (items.length >= 2) {
    const toc = document.createElement('details');
    toc.className = 'toc';
    const ol = items.map(i => `<li><a href="#${i.slug}">${i.text.replace(/#$/, '').trim()}</a></li>`).join('');
    toc.innerHTML = `<summary>Contents</summary><ol>${ol}</ol>`;
    const anchor = article.querySelector('.paper-actions')
                || article.querySelector('.paper-rule')
                || article.querySelector('.paper-meta')
                || article.firstElementChild;
    if (anchor) anchor.insertAdjacentElement('afterend', toc);
  }

  // 4. Scroll progress bar (skip under prefers-reduced-motion).
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!prefersReduced) {
    const bar = document.createElement('div');
    bar.className = 'scroll-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.prepend(bar);
    let ticking = false;
    function update() {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const p = total > 0 ? Math.min(1, Math.max(0, window.scrollY / total)) : 0;
      bar.style.transform = `scaleX(${p})`;
      ticking = false;
    }
    function onScroll() { if (!ticking) { requestAnimationFrame(update); ticking = true; } }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
  }

  // 5. Top backlink (visible on mobile only via CSS) — gives mobile readers
  //    an escape route without scrolling 40k+ pixels.
  if (!document.querySelector('.backlink-top')) {
    const back = document.createElement('a');
    back.className = 'backlink backlink-top';
    back.href = '/';
    back.innerHTML = '<span class="arr">←</span> whenlabs';
    article.insertAdjacentElement('beforebegin', back);
  }
})();
