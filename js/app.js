/* ============================================================
   app.js — scottbreendev.github.io
   ============================================================ */


/* ------------------------------------------------------------
   1. Prevent flash of light theme
   Runs synchronously (script is in <head>, non-deferred) so
   the .dark class is applied before the body paints.
   ------------------------------------------------------------ */
(function () {
  let stored = null;
  try { stored = localStorage.getItem('theme'); } catch (e) { /* storage blocked */ }
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (stored === 'dark' || (!stored && prefersDark)) {
    document.documentElement.classList.add('dark');
  }
})();


document.addEventListener('DOMContentLoaded', function () {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  initThemeToggle();
  initNavScroll();
  initAppBar();
  const rotor = initRotor(!reducedMotion && !!window.gsap);

  if (reducedMotion || !window.gsap) return;
  initAnimations(rotor);
});


/* ------------------------------------------------------------
   2. Theme toggle
   ------------------------------------------------------------ */
function initThemeToggle() {
  const btn = document.getElementById('theme-btn');
  if (!btn) return;
  const root = document.documentElement;

  function label() {
    btn.setAttribute('aria-label',
      root.classList.contains('dark') ? 'Switch to light mode' : 'Switch to dark mode');
  }

  btn.addEventListener('click', function () {
    const dark = root.classList.toggle('dark');
    try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (e) { /* storage blocked */ }
    label();
  });
  label();
}


/* ------------------------------------------------------------
   3. Nav scroll behaviour — transparent → solid at 48px
   ------------------------------------------------------------ */
function initNavScroll() {
  const nav = document.getElementById('nav');
  if (!nav) return;

  function update() {
    nav.classList.toggle('scrolled', window.scrollY > 48);
  }

  window.addEventListener('scroll', update, { passive: true });
  update(); // run once on load in case page is already scrolled
}


/* ------------------------------------------------------------
   4. Mobile app bar — slides up once the hero dock has scrolled
   away, and marks the app whose card is on screen. Styled (and
   only displayed) at phone widths; see styles.css.
   ------------------------------------------------------------ */
function initAppBar() {
  const bar  = document.getElementById('appbar');
  const dock = document.querySelector('.dock');
  if (!bar || !dock || !('IntersectionObserver' in window)) return;

  const items = Array.from(bar.querySelectorAll('.appbar-item'));

  new IntersectionObserver(function (entries) {
    const e = entries[0];
    // Show only once the dock has gone off the top, not before it arrives
    bar.classList.toggle('is-visible', !e.isIntersecting && e.boundingClientRect.top < 0);
  }).observe(dock);

  // An app is "on screen" while its card crosses the middle of the viewport
  const onScreen = new Set();
  const cards = Array.from(document.querySelectorAll('.news-card[data-app], .app-card[data-app]'));
  const spy = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) onScreen.add(e.target); else onScreen.delete(e.target);
    });
    const hit = cards.find(function (c) { return onScreen.has(c); });
    const app = hit ? hit.dataset.app : '';
    items.forEach(function (a) { a.classList.toggle('is-active', a.dataset.app === app); });
  }, { rootMargin: '-45% 0px -45% 0px' });
  cards.forEach(function (c) { spy.observe(c); });
}


/* ------------------------------------------------------------
   5. Hero rotor — the headline cycles through the apps, in step
   with the dock and the news chip. Hovering or focusing a dock
   icon picks that app and holds it. With `animated` false nothing
   cycles on its own, and both news chips stay visible.
   ------------------------------------------------------------ */
function initRotor(animated) {
  const hero = document.querySelector('.hero');
  if (!hero) return null;

  const words   = Array.from(hero.querySelectorAll('.rotor-word'));
  const items   = Array.from(hero.querySelectorAll('.dock-item'));
  const dock    = hero.querySelector('.dock');
  const caption = document.getElementById('dock-caption-text');
  const news    = hero.querySelector('.hero-news');
  const chips   = Array.from(hero.querySelectorAll('.news-chip'));
  const order   = items.map(function (a) { return a.dataset.app; });
  const names   = {};
  items.forEach(function (a) { names[a.dataset.app] = a.getAttribute('aria-label'); });

  let current = words[0];
  let timer = null;
  let sinceChip = 0;     // headline changes since the news chip last switched
  let held = false;      // pointer or focus is on the dock
  let visible = true;    // hero is on screen

  if (animated) {
    gsap.set(words, { opacity: 0 });
    gsap.set(current, { opacity: 1 });
    if (news) news.classList.add('is-rotating');
  }

  function show(app) {
    const next = words.find(function (w) { return w.dataset.app === app; });
    if (!next || next === current) return;

    hero.dataset.active = app;
    items.forEach(function (a) { a.classList.toggle('is-active', a.dataset.app === app); });
    if (caption) caption.textContent = names[app];

    // The news chip shows this app's news if it has any. Apps without news hold the
    // chip for a beat, then hand over to the next one, so each chip gets a fair turn.
    let chip = chips.find(function (c) { return c.dataset.app === app; });
    sinceChip += 1;
    if (!chip && sinceChip >= 2 && chips.length > 1) {
      const at = chips.findIndex(function (c) { return c.classList.contains('is-current'); });
      chip = chips[(at + 1) % chips.length];
    }
    if (chip && !chip.classList.contains('is-current')) {
      chips.forEach(function (c) { c.classList.toggle('is-current', c === chip); });
      sinceChip = 0;
    }

    const prev = current;
    current = next;

    if (animated) {
      gsap.killTweensOf(words);
      words.forEach(function (w) { if (w !== prev && w !== next) gsap.set(w, { opacity: 0 }); });
      gsap.to(prev, { yPercent: -55, opacity: 0, duration: 0.32, ease: 'power2.in' });
      gsap.fromTo(next,
        { yPercent: 55, opacity: 0 },
        { yPercent: 0, opacity: 1, duration: 0.55, ease: 'back.out(1.7)', delay: 0.14 });
    } else {
      prev.classList.remove('is-current');
      next.classList.add('is-current');
    }
  }

  function advance() {
    if (held || !visible || document.hidden) return;
    const i = order.indexOf(current.dataset.app);
    show(order[(i + 1) % order.length]);
  }

  items.forEach(function (a) {
    // Mouse only: a tap would otherwise leave the rotor held with no "leave" to release it
    a.addEventListener('pointerenter', function (e) {
      if (e.pointerType !== 'mouse') return;
      held = true; show(a.dataset.app);
    });
    a.addEventListener('focus', function () { held = true; show(a.dataset.app); });
    a.addEventListener('click', function () { held = false; });
  });
  if (dock) {
    dock.addEventListener('pointerleave', function () { held = false; });
    dock.addEventListener('focusout',   function () { held = false; });
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
    }, { threshold: 0.25 }).observe(hero);
  }

  return {
    start: function () {
      if (!animated || timer) return;
      advance();
      timer = setInterval(advance, 2600);
    }
  };
}


/* ------------------------------------------------------------
   6. GSAP entrance + scroll animations
   Skipped entirely under prefers-reduced-motion, so everything
   here animates *from* a hidden state and the page reads fine
   without it.
   ------------------------------------------------------------ */
function initAnimations(rotor) {
  gsap.registerPlugin(ScrollTrigger);

  // ── Hero: copy, then the dock icons pop in, then the headline starts cycling
  gsap.from('.hero-anim', {
    opacity: 0, y: 24, duration: 0.6, ease: 'power2.out', stagger: 0.11, delay: 0.1
  });
  gsap.from('.dock-tile', {
    opacity: 0, y: 34, scale: 0.4, duration: 0.6, ease: 'back.out(1.9)', stagger: 0.07, delay: 0.6,
    onComplete: function () { if (rotor) rotor.start(); }
  });

  // ── Section headers
  gsap.utils.toArray('.section-header').forEach(function (el) {
    gsap.from(el.children, {
      opacity: 0, y: 22, duration: 0.55, ease: 'power2.out', stagger: 0.08,
      scrollTrigger: { trigger: el, start: 'top 84%' }
    });
  });

  // ── News cards: card rises, copy staggers in, then the visual assembles
  gsap.utils.toArray('.news-card').forEach(function (card) {
    const tl = gsap.timeline({
      defaults: { ease: 'power3.out' },
      scrollTrigger: { trigger: card, start: 'top 78%' }
    });

    tl.from(card, { opacity: 0, y: 48, duration: 0.7, clearProps: 'transform' })
      .from(card.querySelectorAll('.news-copy > *'),
        { opacity: 0, y: 20, duration: 0.5, stagger: 0.07 }, '-=0.35');

    const win = card.querySelector('.mac-window');
    if (win) {
      tl.from(win, { opacity: 0, x: 90, duration: 0.9 }, 0.15)
        .from(card.querySelector('.mac-popover'),
          { opacity: 0, scale: 0.55, y: 30, transformOrigin: '50% 0%', duration: 0.6, ease: 'back.out(1.8)' }, 0.75);
    }

    const front = card.querySelector('.phone-front');
    if (front) {
      tl.from(card.querySelector('.phone-back'), { opacity: 0, y: 170, duration: 0.9 }, 0.2)
        .from(front, { opacity: 0, y: 130, duration: 0.9 }, 0.32);
    }

    // Gentle drift while the card crosses the viewport
    const visual = card.querySelector('.news-visual');
    gsap.to(visual, {
      y: win ? -18 : -34, ease: 'none',
      scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: 0.6 }
    });
  });

  // ── App cards (batched so each row staggers as it scrolls in)
  gsap.set('.app-card', { opacity: 0, y: 36 });
  ScrollTrigger.batch('.app-card', {
    start: 'top 86%',
    once: true,
    onEnter: function (batch) {
      if (!batch.length) return;
      gsap.to(batch, {
        opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', stagger: 0.09, clearProps: 'transform'
      });
    }
  });

  // ── Touch screens have no hover, so the screenshots move with the scroll instead
  gsap.matchMedia().add('(hover: none)', function () {
    gsap.utils.toArray('.app-card').forEach(function (card) {
      const scrub = { trigger: card, start: 'top 92%', end: 'bottom 12%', scrub: 0.5 };
      const phone = card.querySelector('.app-stage .phone');
      if (phone) {
        gsap.fromTo(phone, { y: 30 }, { y: -22, ease: 'none', scrollTrigger: scrub });
      }
      const front = card.querySelector('.yak-card-front');
      if (front) {
        gsap.fromTo(front, { y: 22 }, { y: -14, ease: 'none', scrollTrigger: scrub });
        gsap.fromTo(card.querySelector('.yak-card-back'),
          { y: 6, x: -8 }, { y: -8, x: 8, ease: 'none', scrollTrigger: scrub });
      }
    });
  });

  // ── Made in Brisbane: photos settle in, then drift apart a little with the scroll
  gsap.from('.made-photo', {
    opacity: 0, y: 70, duration: 0.9, ease: 'power3.out', stagger: 0.15,
    scrollTrigger: { trigger: '.made-photos', start: 'top 82%' }
  });
  gsap.to('.made-photos', {
    y: -26, ease: 'none',
    scrollTrigger: { trigger: '.made-section', start: 'top bottom', end: 'bottom top', scrub: 0.6 }
  });

  // ── Contact section
  gsap.from('.contact-anim', {
    opacity: 0, y: 22, duration: 0.5, ease: 'power2.out',
    scrollTrigger: { trigger: '#contact', start: 'top 82%' }
  });
}
