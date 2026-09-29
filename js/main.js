/* =========================================================
   Marta Marina — MusicMind · interactions
   ========================================================= */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  /* ---------- Year ---------- */
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Hero entrance ---------- */
  const hero = $('#hero');
  if (hero) requestAnimationFrame(() => requestAnimationFrame(() => hero.classList.add('ready')));

  /* ---------- Hero symbol entrance ---------- */
  if (!reduceMotion) {
    const dot = $('.sym-dot'), left = $('.sym-left'), right = $('.sym-right');
    [left, right, dot].forEach((el) => { if (el) { el.style.opacity = '0'; } });
    if (dot) dot.style.transform = 'translateY(-40px)';
    setTimeout(() => {
      [left, right].forEach((el, i) => {
        if (!el) return;
        el.style.transition = 'opacity 1s cubic-bezier(.16,1,.3,1)';
        el.style.transitionDelay = (0.2 + i * 0.12) + 's';
        el.style.opacity = '1';
      });
      if (dot) {
        dot.style.transition = 'opacity .7s ease, transform 1.1s cubic-bezier(.34,1.56,.64,1)';
        dot.style.transitionDelay = '.5s';
        dot.style.opacity = '1';
        dot.style.transform = 'translateY(0)';
      }
    }, 250);
  }

  /* ---------- Unified scroll handler (header · parallax · progress) ---------- */
  const header = $('#header');
  const progress = $('#progress');
  const parallaxEls = $$('[data-parallax]');
  let lastY = window.scrollY;
  let scrollTicking = false;

  const onFrame = () => {
    const y = window.scrollY;

    // header: condensed state + hide on scroll-down
    header.classList.toggle('scrolled', y > 30);
    if (!document.body.classList.contains('menu-open')) {
      if (y > lastY && y > 400) header.classList.add('hidden');
      else header.classList.remove('hidden');
    }

    // scroll progress bar
    if (progress) {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = `scaleX(${h > 0 ? y / h : 0})`;
    }

    // parallax blobs
    if (!reduceMotion) {
      parallaxEls.forEach((el) => {
        const speed = parseFloat(el.dataset.parallax) || 0.1;
        el.style.transform = `translate3d(0, ${y * speed}px, 0)`;
      });
    }

    lastY = y;
    scrollTicking = false;
  };
  const onScroll = () => {
    if (!scrollTicking) { requestAnimationFrame(onFrame); scrollTicking = true; }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onFrame();

  /* ---------- Mobile menu ---------- */
  const toggle = $('#navToggle');
  const navLinks = $('#navLinks');
  const setMenu = (open) => {
    document.body.classList.toggle('menu-open', open);
    document.body.classList.toggle('no-scroll', open);
    // never leave the header transformed under an open menu (see CSS note)
    if (open && header) header.classList.remove('hidden');
    if (toggle) {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    }
  };
  const closeMenu = () => setMenu(false);
  if (toggle) {
    toggle.addEventListener('click', () => {
      setMenu(!document.body.classList.contains('menu-open'));
    });
    $$('a', navLinks).forEach((a) => a.addEventListener('click', closeMenu));
    // Escape closes; leaving the mobile breakpoint resets the menu state
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.body.classList.contains('menu-open')) closeMenu();
    });
    window.matchMedia('(min-width: 861px)').addEventListener('change', (e) => {
      if (e.matches) closeMenu();
    });
  }

  /* ---------- Scroll reveal ---------- */
  const revealEls = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('in'));
  }

  /* ---------- Magnetic buttons ---------- */
  if (!reduceMotion && window.matchMedia('(hover: hover)').matches) {
    $$('[data-magnetic]').forEach((el) => {
      const strength = 18;
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) / r.width;
        const y = (e.clientY - r.top - r.height / 2) / r.height;
        el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- Active nav link (scrollspy) ---------- */
  const sections = ['musicmind', 'metodo', 'programas', 'marta', 'contacto']
    .map((id) => document.getElementById(id)).filter(Boolean);
  const navAnchors = $$('.nav__links .navlink');
  if ('IntersectionObserver' in window && sections.length) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          const id = e.target.id;
          navAnchors.forEach((a) => {
            const active = a.getAttribute('href') === '#' + id;
            a.style.opacity = active ? '1' : '0.55';
            if (active) a.setAttribute('aria-current', 'true');
            else a.removeAttribute('aria-current');
          });
        }
      });
    }, { threshold: 0.5 });
    sections.forEach((s) => spy.observe(s));
  }

  /* =========================================================
     MODAL (wide, cinematic)
     ========================================================= */
  const overlay = $('#overlay');
  const modalWrap = $('#modalWrap');
  const modal = $('#modal');
  const modalAside = $('#modalAside');
  const modalBody = $('#modalBody');
  const modalFoot = $('#modalFoot');
  const modalClose = $('#modalClose');
  let lastFocused = null;

  /* Per-panel personality: width variant + accent colour + entry side.
     On desktop the `side` breaks the monotony (right/left/bottom/top); on mobile
     every drawer falls back to a full-screen sheet (see CSS). Wizard groups
     (p1–p5, prog1–prog3) must share one side so stepping between them doesn't jump. */
  const PANEL = {
    p1:            { variant: 'pillar',  accent: '#2F4A55', side: 'right'  }, // Talento/Identidad — deep ocean
    p2:            { variant: 'pillar',  accent: '#5E7A87', side: 'right'  }, // Coherencia — steel
    p3:            { variant: 'pillar',  accent: '#A98D6B', side: 'right'  }, // Equipo de trabajo — bronze
    p4:            { variant: 'pillar',  accent: '#6E8A96', side: 'right'  }, // Aliados — dusty
    p5:            { variant: 'pillar',  accent: '#3C5A5E', side: 'right'  }, // Fans — teal
    'm-musicmind': { variant: 'wide',    accent: '#5E7A87', side: 'left'   },
    'm-marta':     { variant: 'wide',    accent: '#3C5A5E', side: 'bottom' },
    prog1:         { variant: 'program', accent: '#A98D6B', side: 'bottom' },
    prog2:         { variant: 'program', accent: '#5E7A87', side: 'bottom' },
    prog3:         { variant: 'program', accent: '#3C5A5E', side: 'bottom' },
    prog4:         { variant: 'program', accent: '#6E8A96', side: 'bottom' },
    prog5:         { variant: 'program', accent: '#2F4A55', side: 'bottom' },
    prog6:         { variant: 'program', accent: '#A98D6B', side: 'bottom' },
    prog7:         { variant: 'program', accent: '#5E7A87', side: 'bottom' },
    prog8:         { variant: 'program', accent: '#6E8A96', side: 'bottom' },
    prog9:         { variant: 'program', accent: '#3C5A5E', side: 'bottom' },
    story1:        { variant: 'wide',    accent: '#2F4A55', side: 'right'  }, // carousel cards
    story2:        { variant: 'wide',    accent: '#5E7A87', side: 'right'  },
    story3:        { variant: 'wide',    accent: '#A98D6B', side: 'right'  },
    story4:        { variant: 'wide',    accent: '#6E8A96', side: 'right'  },
    story5:        { variant: 'wide',    accent: '#3C5A5E', side: 'right'  },
    contact:       { variant: 'contact', accent: '#2F4A55', side: 'right'  },
    legal:         { variant: 'wide',    accent: '#3C5A5E', side: 'bottom' }, // footer → entra desde abajo
    privacy:       { variant: 'wide',    accent: '#3C5A5E', side: 'bottom' },
    cookies:       { variant: 'wide',    accent: '#3C5A5E', side: 'bottom' }
  };

  const IG_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>';
  const TT_SVG = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 3c.3 2 1.5 3.4 3.5 3.6v2.5c-1.3.1-2.5-.3-3.6-.9v6.3c0 3.2-2.4 5.5-5.4 5.5C7.8 22 5.5 19.8 5.5 17c0-2.7 2.2-4.9 5-4.9.3 0 .6 0 .9.1v2.6c-.3-.1-.6-.2-.9-.2-1.3 0-2.3 1-2.3 2.3 0 1.3 1 2.3 2.3 2.3 1.4 0 2.5-1.1 2.5-2.7V3h3.5z"/></svg>';
  const MAIL_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>';

  // brand mark in dark ink (reads on the light drawer)
  const MARK_SVG = '<svg viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg">' +
    '<path fill="#2A363B" d="M115.29,114.97l-.14-47.2-26.88,28.69c4.1,3.85,6.71,7.62,6.75,13.3.03,3.31-.93,6.23-3,8.88-5.97,7.66-17.3,7.72-23.19,1.03-2.62-2.98-4.01-6.72-3.81-10.57.31-5.89,3.22-8.78,6.86-12.89-.16-.19-26.84-28.7-26.84-28.7l-.24,47.58c0,2.38-1.83,3.85-3.94,4.63-2.72,1-7.59-.98-7.6-4.54l-.14-62.1c0-1.65,1.03-3.34,2.11-4.19,3.31-2.62,7.32-1.51,9.98,1.42l35.03,38.17,34.16-37.66c2.71-3.14,6.75-4.63,10.24-1.98,1.78,1.35,2.18,3.72,2.18,5.93l-.13,60.24c0,3.23-3.89,5.27-6.62,4.89-2.46-.35-4.8-2.11-4.81-4.92ZM80.09,102.94c-.41.02-4.93,3.38-4.76,7.07.1,2.28,1.64,3.77,3.35,4.34,1.96.65,4.01-.13,5.1-1.48,3.84-4.73-3.37-9.95-3.69-9.93Z"/>' +
    '<circle fill="#CCC2B8" cx="80.2" cy="46.68" r="11.23"/></svg>';

  // pillars open the full-width fold-out accordion instead of the side drawer
  const PILLARS_LIST = ['p1', 'p2', 'p3', 'p4', 'p5'];

  // sequential panels → wizard navigation (move through them without closing)
  const GROUPS = [
    ['prog1', 'prog2', 'prog8'],
    ['prog3', 'prog4'],
    ['prog5', 'prog7', 'prog9', 'prog6']
  ];
  function groupOf(id) {
    for (const list of GROUPS) { const i = list.indexOf(id); if (i > -1) return { list, index: i }; }
    return null;
  }
  let currentId = null;

  function buildFootInto(container, footData) {
    let items = [];
    try { items = footData ? JSON.parse(footData) : []; } catch (_) { items = []; }
    items.forEach((it) => {
      const a = document.createElement('a');
      a.href = it.h || '#contacto';
      if (/^https?:/.test(a.href) && a.host !== location.host) { a.target = '_blank'; a.rel = 'noopener'; }
      a.className = 'btn' + (it.p ? '' : ' btn--ghost');
      a.innerHTML = it.p ? `${it.t} <span class="arrow">→</span>` : it.t;
      a.addEventListener('click', (e) => {
        if ((it.h || '') === '#contacto') { e.preventDefault(); openModal('contact'); }
        else closeModal();
      });
      container.appendChild(a);
    });
    return items.length;
  }

  function buildWizard(group) {
    const wrap = document.createElement('div');
    wrap.className = 'wizard';

    const pos = document.createElement('span');
    pos.className = 'wizard__pos';
    pos.innerHTML = '<b>' + String(group.index + 1).padStart(2, '0') + '</b> / ' + String(group.list.length).padStart(2, '0');

    const dots = document.createElement('div');
    dots.className = 'wizard__dots';
    group.list.forEach((gid, idx) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Ir al ' + (idx + 1));
      if (idx === group.index) b.classList.add('on');
      b.addEventListener('click', () => goToPanel(gid));
      dots.appendChild(b);
    });

    const nav = document.createElement('div');
    nav.className = 'wizard__nav';
    const arrow = (dir, label, path) => {
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'wizard__arrow'; btn.setAttribute('aria-label', label);
      btn.innerHTML = '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="' + path + '"/></svg>';
      btn.addEventListener('click', () => step(dir));
      return btn;
    };
    nav.appendChild(arrow(-1, 'Anterior', 'M10 2 4 8l6 6'));
    nav.appendChild(arrow(1, 'Siguiente', 'M6 2l6 6-6 6'));

    wrap.append(pos, dots, nav);
    return wrap;
  }

  function buildBrand() {
    const el = document.createElement('div');
    el.className = 'p-brand';
    el.innerHTML = '<span class="p-brand__name">Marta Marina · Music Mind</span>' +
      '<div class="p-social">' +
        '<a href="https://www.instagram.com/martamarina.musicmind/" target="_blank" rel="noopener" aria-label="Instagram">' + IG_SVG + '</a>' +
        '<a href="https://tiktok.com/" target="_blank" rel="noopener" aria-label="TikTok">' + TT_SVG + '</a>' +
        '<a href="mailto:hola@martamarina.com" aria-label="Email">' + MAIL_SVG + '</a>' +
      '</div>';
    return el;
  }

  // fill header/body/footer for a panel id (no open animation)
  function populate(id) {
    const tpl = document.getElementById('tpl-' + id);
    if (!tpl) return false;
    const root = tpl.content.cloneNode(true).querySelector('div');
    const eyebrow = root.dataset.eyebrow || 'MusicMind';
    const cfg = PANEL[id] || {};
    const group = groupOf(id);

    modal.dataset.variant = cfg.variant || '';
    modalWrap.dataset.side = cfg.side || 'right';
    modal.style.setProperty('--panel-accent', cfg.accent || '#5E7A87');

    modalAside.className = 'modal__aside';
    modalAside.innerHTML = '<span class="a-symbol">' + MARK_SVG + '</span>' +
      '<span class="a-eyebrow">' + eyebrow + '</span>';

    modalBody.innerHTML = '';
    while (root.firstChild) modalBody.appendChild(root.firstChild);
    modalBody.scrollTop = 0;

    modalFoot.innerHTML = '';
    if (group) modalFoot.appendChild(buildWizard(group));
    const cta = document.createElement('div');
    cta.className = 'modal__cta';
    if (buildFootInto(cta, root.dataset.foot)) modalFoot.appendChild(cta);
    modalFoot.appendChild(buildBrand());

    currentId = id;
    return true;
  }

  function openModal(id) {
    const pIdx = PILLARS_LIST.indexOf(id);
    if (pIdx > -1) { openPillars(pIdx); return; }
    if (!populate(id)) return;
    lastFocused = document.activeElement;
    overlay.classList.add('open');
    modal.classList.add('open');
    document.body.classList.add('no-scroll');
    setTimeout(() => modalClose.focus(), 80);
  }

  // wizard: cross-fade to another panel within the same sequence
  function goToPanel(id) {
    if (id === currentId || !document.getElementById('tpl-' + id)) return;
    if (reduceMotion) { populate(id); return; }
    modalBody.classList.add('swapping');
    setTimeout(() => {
      populate(id);
      modalBody.classList.remove('swapping');
    }, 240);
  }
  function step(dir) {
    const g = groupOf(currentId); if (!g) return;
    const next = (g.index + dir + g.list.length) % g.list.length;
    goToPanel(g.list[next]);
  }

  function closeModal() {
    overlay.classList.remove('open');
    modal.classList.remove('open');
    document.body.classList.remove('no-scroll');
    if (lastFocused) setTimeout(() => lastFocused.focus(), 0);
  }

  /* =========================================================
     PILLARS ACCORDION — full-screen "old map" fold-out
     The 5 pilares live as vertical folds; the active one unfolds and
     the rest stay as spines. Advancing folds one / unfolds the next.
     On mobile it flips to a vertical accordion (see CSS) so it still
     fills the screen. Built lazily from the existing tpl-p1..p5.
     ========================================================= */
  let pillBuilt = false;
  let pillOverlay, pillStage, pillPos, pillPrev, pillNext, pillClose, pillCta;
  let pillPanels = [], pillDots = [];
  let pillCurrent = 0, pillLastFocused = null;

  const ARROW = (path, label) =>
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="' + path + '"/></svg>';

  function buildPillars() {
    if (pillBuilt) return;

    pillOverlay = document.createElement('div');
    pillOverlay.className = 'pill-overlay';
    pillOverlay.id = 'pillOverlay';

    pillStage = document.createElement('div');
    pillStage.className = 'pill-stage';
    pillStage.setAttribute('role', 'dialog');
    pillStage.setAttribute('aria-modal', 'true');
    pillStage.setAttribute('aria-label', 'El método · los 5 pilares');

    pillClose = document.createElement('button');
    pillClose.type = 'button';
    pillClose.className = 'pill-close';
    pillClose.setAttribute('aria-label', 'Cerrar');
    pillClose.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    pillClose.addEventListener('click', closePillars);

    const track = document.createElement('div');
    track.className = 'pill-track';

    PILLARS_LIST.forEach((pid, i) => {
      const tpl = document.getElementById('tpl-' + pid);
      const src = tpl.content.cloneNode(true).querySelector('div');
      const eyebrow = src.dataset.eyebrow || ('Pilar 0' + (i + 1));
      const num = src.dataset.num || String(i + 1).padStart(2, '0');
      const title = (src.querySelector('h2') || {}).textContent || '';
      const accent = (PANEL[pid] || {}).accent || '#5E7A87';
      const dn = src.querySelector('.d-num'); if (dn) dn.remove();

      const panel = document.createElement('div');
      panel.className = 'pill-panel';
      panel.style.setProperty('--acc', accent);
      panel.style.setProperty('--i', i);

      const spine = document.createElement('div');
      spine.className = 'pill-spine';
      spine.innerHTML = '<span class="pill-spine__num">' + num + '</span>' +
        '<span class="pill-spine__title">' + title + '</span>' +
        '<span class="pill-spine__dot"></span>';

      const full = document.createElement('div');
      full.className = 'pill-full';
      full.innerHTML = '<span class="pill-full__num" aria-hidden="true">' + num + '</span>' +
        '<span class="pill-eyebrow">' + MARK_SVG + '<em>' + eyebrow + '</em></span>';
      const body = document.createElement('div');
      body.className = 'pill-body';
      while (src.firstChild) body.appendChild(src.firstChild);
      full.appendChild(body);

      panel.append(spine, full);
      panel.addEventListener('click', (e) => {
        // let links/buttons inside the open panel work normally
        if (panel.classList.contains('active') && e.target.closest('a, button')) return;
        setPillar(i);
      });
      track.appendChild(panel);
      pillPanels.push(panel);
    });

    // control bar (brand · position · dots · CTA · arrows)
    const bar = document.createElement('div');
    bar.className = 'pill-bar';

    const brand = document.createElement('span');
    brand.className = 'pill-brand';
    brand.textContent = 'Marta Marina · MusicMind';

    const wiz = document.createElement('div');
    wiz.className = 'pill-wiz';

    pillPos = document.createElement('span');
    pillPos.className = 'pill-pos';

    const dots = document.createElement('div');
    dots.className = 'pill-dots';
    PILLARS_LIST.forEach((pid, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Ir al pilar ' + (i + 1));
      b.addEventListener('click', () => setPillar(i));
      dots.appendChild(b);
      pillDots.push(b);
    });

    pillCta = document.createElement('a');
    pillCta.className = 'btn pill-cta';
    pillCta.href = '#contacto';
    pillCta.innerHTML = 'Empezar por aquí <span class="arrow">→</span>';
    pillCta.addEventListener('click', (e) => { e.preventDefault(); closePillars(); openModal('contact'); });

    const nav = document.createElement('div');
    nav.className = 'pill-nav';
    pillPrev = document.createElement('button');
    pillPrev.type = 'button'; pillPrev.className = 'pill-arrow';
    pillPrev.setAttribute('aria-label', 'Pilar anterior');
    pillPrev.innerHTML = ARROW('M10 2 4 8l6 6');
    pillPrev.addEventListener('click', () => setPillar(pillCurrent - 1));
    pillNext = document.createElement('button');
    pillNext.type = 'button'; pillNext.className = 'pill-arrow';
    pillNext.setAttribute('aria-label', 'Pilar siguiente');
    pillNext.innerHTML = ARROW('M6 2l6 6-6 6');
    pillNext.addEventListener('click', () => setPillar(pillCurrent + 1));
    nav.append(pillPrev, pillNext);

    wiz.append(pillPos, dots, pillCta, nav);
    bar.append(brand, wiz);

    pillStage.append(pillClose, track, bar);
    pillOverlay.appendChild(pillStage);
    document.body.appendChild(pillOverlay);
    pillBuilt = true;
  }

  function setPillar(i) {
    i = Math.max(0, Math.min(pillPanels.length - 1, i));
    pillCurrent = i;
    const accent = (PANEL[PILLARS_LIST[i]] || {}).accent || '#5E7A87';
    pillStage.style.setProperty('--acc', accent);
    pillPanels.forEach((p, idx) => p.classList.toggle('active', idx === i));
    pillDots.forEach((d, idx) => d.classList.toggle('on', idx === i));
    pillPos.innerHTML = '<b>' + String(i + 1).padStart(2, '0') + '</b> / ' + String(pillPanels.length).padStart(2, '0');
    pillPrev.disabled = i === 0;
    pillNext.disabled = i === pillPanels.length - 1;
    const af = pillPanels[i].querySelector('.pill-full');
    if (af) af.scrollTop = 0;
  }

  function openPillars(i) {
    buildPillars();
    pillLastFocused = document.activeElement;
    setPillar(i || 0);
    document.body.classList.add('no-scroll');
    // force reflow so the entrance transition runs from the folded state
    void pillStage.offsetWidth;
    pillOverlay.classList.add('open', 'intro');
    setTimeout(() => pillOverlay.classList.remove('intro'), 900);
    setTimeout(() => pillClose.focus(), 120);
  }

  function closePillars() {
    if (!pillOverlay) return;
    pillOverlay.classList.remove('open');
    document.body.classList.remove('no-scroll');
    if (pillLastFocused) setTimeout(() => pillLastFocused.focus(), 0);
  }

  document.addEventListener('keydown', (e) => {
    if (!pillOverlay || !pillOverlay.classList.contains('open')) return;
    if (e.key === 'Escape') { closePillars(); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); setPillar(pillCurrent + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); setPillar(pillCurrent - 1); }
  });

  // delegation → also catches [data-modal] triggers inside dynamically cloned templates
  // (e.g. the "política de privacidad" link inside the contact / newsletter consent)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-modal]');
    if (btn) { e.preventDefault(); openModal(btn.dataset.modal); }
  });
  overlay.addEventListener('click', closeModal);
  modalClose.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('open')) return;
    if (e.key === 'Escape') { closeModal(); return; }
    if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && groupOf(currentId)) {
      const t = e.target.tagName;
      if (t !== 'INPUT' && t !== 'TEXTAREA') { e.preventDefault(); step(e.key === 'ArrowRight' ? 1 : -1); }
    }
  });
  modal.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || !modal.classList.contains('open')) return;
    const f = modal.querySelectorAll('button, a[href], input, [tabindex]:not([tabindex="-1"])');
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* =========================================================
     CUSTOM CURSOR
     ========================================================= */
  const cursor = $('#cursor'), cursorDot = $('#cursorDot');
  if (cursor && !reduceMotion && window.matchMedia('(hover: hover)').matches) {
    let cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    let rx = cx, ry = cy;
    window.addEventListener('mousemove', (e) => {
      cx = e.clientX; cy = e.clientY;
      cursorDot.style.transform = `translate(${cx}px, ${cy}px)`;
    });
    const loop = () => {
      rx += (cx - rx) * 0.18; ry += (cy - ry) * 0.18;
      cursor.style.transform = `translate(${rx}px, ${ry}px)`;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    document.addEventListener('mousedown', () => document.body.classList.add('cursor-down'));
    document.addEventListener('mouseup', () => document.body.classList.remove('cursor-down'));
    const hoverSel = 'a, button, .card, input, [data-modal], [data-magnetic]';
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest(hoverSel)) document.body.classList.add('cursor-hover');
    });
    document.addEventListener('mouseout', (e) => {
      if (e.target.closest(hoverSel)) document.body.classList.remove('cursor-hover');
    });
  }

  /* =========================================================
     3D TILT on cards
     ========================================================= */
  if (!reduceMotion && window.matchMedia('(hover: hover)').matches) {
    $$('.card').forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `rotateX(${-py * 6}deg) rotateY(${px * 6}deg) translateY(-6px)`;
      });
      card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    });
  }

  /* =========================================================
     COUNT-UP stats
     ========================================================= */
  $$('.marta__stats .st b').forEach((el) => {
    const m = el.textContent.trim().match(/^(\d+)(\D*)$/);
    if (!m) return;
    const target = parseInt(m[1], 10), suffix = m[2];
    el.dataset.done = '0';
    const run = () => {
      if (el.dataset.done === '1') return; el.dataset.done = '1';
      if (reduceMotion) { el.textContent = target + suffix; return; }
      const dur = 1100; let start = null;
      const step = (t) => {
        if (start === null) start = t;
        const p = Math.min((t - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if ('IntersectionObserver' in window) {
      const o = new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) { run(); o.disconnect(); } }), { threshold: 0.6 });
      o.observe(el);
    } else { run(); }
  });

  /* =========================================================
     CAROUSEL (scroll-snap · arrows · progress) — no autoplay
     ========================================================= */
  (function carousel() {
    const track = $('#carTrack');
    if (!track) return;
    const prev = $('#carPrev'), next = $('#carNext');
    const bar = $('#carBar');

    // step = one card + gap, measured from the DOM so it survives responsive resizing
    const step = () => {
      const card = track.querySelector('.c-card');
      if (!card) return track.clientWidth;
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return card.getBoundingClientRect().width + gap;
    };
    const maxScroll = () => track.scrollWidth - track.clientWidth;

    // reflect scroll position: disable arrows at the ends, size the progress bar
    let ticking = false;
    const sync = () => {
      ticking = false;
      const max = maxScroll();
      const x = track.scrollLeft;
      const atStart = x <= 1, atEnd = x >= max - 1;
      if (prev) prev.disabled = atStart;
      if (next) next.disabled = atEnd;
      // fade each edge only while there are hidden cards on that side (first/last sit flush)
      track.style.setProperty('--fade-l', atStart ? '0px' : 'var(--fade)');
      track.style.setProperty('--fade-r', atEnd ? '0px' : 'var(--fade)');
      if (bar) {
        // simple left-anchored fill: 0 → 100% of scroll travelled (full when nothing to scroll)
        const progressed = max > 0 ? x / max : 1;
        bar.style.width = Math.round(progressed * 100) + '%';
      }
    };
    const onScroll = () => { if (!ticking) { requestAnimationFrame(sync); ticking = true; } };

    track.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    prev && prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: reduceMotion ? 'auto' : 'smooth' }));
    next && next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: reduceMotion ? 'auto' : 'smooth' }));

    // keyboard arrows when the reel itself is focused
    track.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); track.scrollBy({ left: -step(), behavior: reduceMotion ? 'auto' : 'smooth' }); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); track.scrollBy({ left: step(), behavior: reduceMotion ? 'auto' : 'smooth' }); }
    });

    sync();
  })();

  /* =========================================================
     ⚙️  SETTINGS · Configura aquí la conexión
     ---------------------------------------------------------
     El formulario de contacto Y la newsletter usan el MISMO
     endpoint de Google Apps Script (apps-script/Code.gs).
     ========================================================= */
  const SETTINGS = {
    // Pega SOLO el ID del despliegue de Apps Script.
    // Lo encuentras en la URL que te da Google al implementar:
    //   https://script.google.com/macros/s/AQUÍ_VA_EL_ID/exec
    // Déjalo vacío ('') para probar en modo demo (no envía nada).
    APPS_SCRIPT_ID: 'AKfycbw0wveMBW_nT-1N_zcVuboW_LnY4MyD0sXqHkJFsyhP1kn5Q7ZrqoP2Uo8zgeldKzxyrA',
  };

  // No hace falta tocar esto: arma la URL /exec a partir del ID.
  const NEWSLETTER_ENDPOINT = SETTINGS.APPS_SCRIPT_ID
    ? `https://script.google.com/macros/s/${SETTINGS.APPS_SCRIPT_ID}/exec`
    : '';

  const form = $('#newsForm');
  const emailInput = $('#newsEmail');
  const msg = $('#newsMsg');
  const newsBtn = $('#newsBtn');

  const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  function setMsg(text, type) {
    msg.textContent = text;
    msg.className = 'news__msg' + (type ? ' ' + type : '');
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = emailInput.value.trim();
      const newsConsent = document.getElementById('newsConsent');
      if (!validEmail(email)) { setMsg('Introduce un email válido.', 'err'); emailInput.focus(); return; }
      if (newsConsent && !newsConsent.checked) { setMsg('Marca la casilla para suscribirte.', 'err'); newsConsent.focus(); return; }

      newsBtn.disabled = true;
      const original = newsBtn.innerHTML;
      newsBtn.innerHTML = 'Enviando…';
      setMsg('', '');

      try {
        if (!NEWSLETTER_ENDPOINT) {
          // Modo demo: aún no hay endpoint configurado.
          await new Promise((r) => setTimeout(r, 700));
          setMsg('✓ ¡Gracias! (modo demo — configura el endpoint de Apps Script para recibir altas).', 'ok');
          form.reset();
        } else {
          const body = new URLSearchParams({ email, consent: 'true', source: 'web' });
          const res = await fetch(NEWSLETTER_ENDPOINT, { method: 'POST', body });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.result === 'success') {
            setMsg('✓ ¡Listo! Te has suscrito correctamente.', 'ok');
            form.reset();
          } else {
            setMsg(data.message || 'Algo ha fallado. Inténtalo de nuevo.', 'err');
          }
        }
      } catch (_) {
        setMsg('No se pudo conectar. Inténtalo más tarde.', 'err');
      } finally {
        newsBtn.disabled = false;
        newsBtn.innerHTML = original;
      }
    });
  }

  /* =========================================================
     CONTACT FORM  (modal · same Apps Script endpoint)
     ========================================================= */
  if (modalBody) {
    modalBody.addEventListener('submit', async (e) => {
      const cform = e.target;
      if (!cform || cform.id !== 'contactForm') return;
      e.preventDefault();

      const name = cform.elements.name.value.trim();
      const email = cform.elements.email.value.trim();
      const message = cform.elements.message.value.trim();
      const cmsg = cform.querySelector('#contactMsg');
      const cbtn = cform.querySelector('#contactBtn');
      const setC = (t, type) => { cmsg.textContent = t; cmsg.className = 'c-msg' + (type ? ' ' + type : ''); };

      const consent = cform.elements.consent;
      if (!name) { setC('Dime tu nombre.', 'err'); cform.elements.name.focus(); return; }
      if (!validEmail(email)) { setC('Introduce un email válido.', 'err'); cform.elements.email.focus(); return; }
      if (message.length < 5) { setC('Cuéntame un poco más.', 'err'); cform.elements.message.focus(); return; }
      if (consent && !consent.checked) { setC('Debes aceptar la política de privacidad.', 'err'); consent.focus(); return; }

      cbtn.disabled = true;
      const orig = cbtn.innerHTML;
      cbtn.innerHTML = 'Enviando…';
      setC('', '');

      try {
        if (!NEWSLETTER_ENDPOINT) {
          await new Promise((r) => setTimeout(r, 700));
          setC('✓ ¡Gracias! (modo demo — configura el endpoint de Apps Script para recibir mensajes).', 'ok');
          cform.reset();
        } else {
          const body = new URLSearchParams({ type: 'contact', name, email, message, consent: 'true', source: 'web' });
          const res = await fetch(NEWSLETTER_ENDPOINT, { method: 'POST', body });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.result === 'success') {
            setC('✓ ¡Mensaje enviado! Te responderé pronto.', 'ok');
            cform.reset();
          } else {
            setC(data.message || 'Algo ha fallado. Inténtalo de nuevo.', 'err');
          }
        }
      } catch (_) {
        setC('No se pudo conectar. Inténtalo más tarde.', 'err');
      } finally {
        cbtn.disabled = false;
        cbtn.innerHTML = orig;
      }
    });
  }

  /* ---------- Cookie consent ---------- */
  const cookieBar = $('#cookie');
  if (cookieBar) {
    const KEY = 'mm-cookie-consent';
    let stored = null;
    try { stored = localStorage.getItem(KEY); } catch (_) {}

    const hideBar = () => {
      cookieBar.classList.remove('show');
      setTimeout(() => { cookieBar.hidden = true; }, 600);
    };
    const setChoice = (value) => {
      try { localStorage.setItem(KEY, value); } catch (_) {}
      hideBar();
    };

    if (!stored) {
      cookieBar.hidden = false;
      setTimeout(() => cookieBar.classList.add('show'), 900);
    }

    const accept = $('#cookieAccept');
    const reject = $('#cookieReject');
    if (accept) accept.addEventListener('click', () => setChoice('accepted'));
    if (reject) reject.addEventListener('click', () => setChoice('rejected'));
  }

  /* =========================================================
     NEWSLETTER POP-UP  (no promo de inicio · aparece tarde)
     ---------------------------------------------------------
     Se muestra tras un tiempo O tras X clics, lo que ocurra antes.
     No reaparece si el visitante ya se suscribió o lo cerró.
     ========================================================= */
  const nlPop = $('#nlPop');
  if (nlPop) {
    // ---- Ajustes ----
    const NL_KEY    = 'mm-nl-popup'; // recuerda 'subscribed' | 'dismissed'
    const NL_DELAY  = 25000;         // aparece a los 25 s…
    const NL_CLICKS = 8;             // …o tras 8 clics en la página (lo que pase antes)
    // -----------------

    let nlShown = false, nlClicks = 0, nlTimer = null;
    let nlStored = null;
    try { nlStored = localStorage.getItem(NL_KEY); } catch (_) {}

    const cookieVisible = () => { const c = $('#cookie'); return c && !c.hidden; };

    const onNlClick = (e) => {
      if (nlPop.contains(e.target)) return; // los clics dentro del propio popup no cuentan
      if (++nlClicks >= NL_CLICKS) showNlPop();
    };

    function showNlPop() {
      if (nlShown || nlStored) return;
      // no pisar el banner de cookies: si está visible, reintenta en unos segundos
      if (cookieVisible()) { nlTimer = setTimeout(showNlPop, 4000); return; }
      nlShown = true;
      if (nlTimer) clearTimeout(nlTimer);
      document.removeEventListener('click', onNlClick);
      nlPop.hidden = false;
      requestAnimationFrame(() => nlPop.classList.add('show'));
    }

    const hideNlPop = (remember) => {
      nlPop.classList.remove('show');
      setTimeout(() => { nlPop.hidden = true; }, 700);
      if (remember) { try { localStorage.setItem(NL_KEY, remember); } catch (_) {} }
    };

    if (!nlStored) {
      nlTimer = setTimeout(showNlPop, NL_DELAY);
      document.addEventListener('click', onNlClick);

      const nlClose = $('#nlPopClose');
      if (nlClose) nlClose.addEventListener('click', () => hideNlPop('dismissed'));

      const nlForm = $('#nlPopForm');
      const nlEmail = $('#nlPopEmail');
      const nlBtn = $('#nlPopBtn');
      const nlMsg = $('#nlPopMsg');
      const nlConsent = $('#nlPopConsent');
      const setNl = (t, type) => { nlMsg.textContent = t; nlMsg.className = 'nlpop__msg' + (type ? ' ' + type : ''); };

      if (nlForm) {
        nlForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const email = nlEmail.value.trim();
          if (!validEmail(email)) { setNl('Introduce un email válido.', 'err'); nlEmail.focus(); return; }
          if (nlConsent && !nlConsent.checked) { setNl('Marca la casilla para suscribirte.', 'err'); nlConsent.focus(); return; }

          nlBtn.disabled = true;
          const orig = nlBtn.innerHTML;
          nlBtn.innerHTML = 'Enviando…';
          setNl('', '');

          try {
            if (!NEWSLETTER_ENDPOINT) {
              await new Promise((r) => setTimeout(r, 700));
              setNl('✓ ¡Gracias! (modo demo).', 'ok');
            } else {
              const body = new URLSearchParams({ email, consent: 'true', source: 'popup' });
              const res = await fetch(NEWSLETTER_ENDPOINT, { method: 'POST', body });
              const data = await res.json().catch(() => ({}));
              if (!(res.ok && data.result === 'success')) {
                setNl(data.message || 'Algo ha fallado. Inténtalo de nuevo.', 'err');
                nlBtn.disabled = false; nlBtn.innerHTML = orig; return;
              }
              setNl('✓ ¡Listo! Te has suscrito.', 'ok');
            }
            try { localStorage.setItem(NL_KEY, 'subscribed'); } catch (_) {}
            setTimeout(() => hideNlPop(), 1600);
          } catch (_) {
            setNl('No se pudo conectar. Inténtalo más tarde.', 'err');
            nlBtn.disabled = false; nlBtn.innerHTML = orig;
          }
        });
      }
    }
  }

  /* =========================================================
     LEVELS pills (método · 3 niveles de comunicación)
     ========================================================= */
  (function levels() {
    const root = document.getElementById('levels');
    if (!root) return;
    const pills = Array.from(root.querySelectorAll('.lvpill'));
    const panels = Array.from(root.querySelectorAll('.lvpanel'));
    const show = (i) => {
      pills.forEach((p, idx) => {
        const on = idx === i;
        p.classList.toggle('is-on', on);
        p.setAttribute('aria-selected', String(on));
        p.tabIndex = on ? 0 : -1;
      });
      panels.forEach((pan, idx) => {
        const on = idx === i;
        pan.hidden = !on;
        if (on) { pan.classList.remove('is-on'); void pan.offsetWidth; pan.classList.add('is-on'); }
      });
    };
    pills.forEach((p, i) => {
      p.addEventListener('click', () => show(i));
      p.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        const next = (i + (e.key === 'ArrowRight' ? 1 : -1) + pills.length) % pills.length;
        show(next); pills[next].focus();
      });
    });
  })();

})();
