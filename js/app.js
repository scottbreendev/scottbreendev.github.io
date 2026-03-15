/* ============================================================
   app.js — scottbreendev.github.io
   ============================================================ */


/* ------------------------------------------------------------
   1. Prevent flash of light theme
   Runs synchronously (script is in <head>, non-deferred) so
   the .dark class is applied before the body paints.
   ------------------------------------------------------------ */
(function () {
  const stored = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (stored === 'dark' || (!stored && prefersDark)) {
    document.documentElement.classList.add('dark');
  }
})();


/* ------------------------------------------------------------
   2. Alpine.js — global theme store
   ------------------------------------------------------------ */
document.addEventListener('alpine:init', () => {

  Alpine.store('theme', {
    dark: document.documentElement.classList.contains('dark'),

    toggle() {
      this.dark = !this.dark;
      if (this.dark) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    }
  });

});


/* ------------------------------------------------------------
   3. Nav scroll behaviour — transparent → solid at 48px
   ------------------------------------------------------------ */
(function () {
  const nav = document.getElementById('nav');
  if (!nav) return;

  function update() {
    nav.classList.toggle('scrolled', window.scrollY > 48);
  }

  window.addEventListener('scroll', update, { passive: true });
  update(); // run once on load in case page is already scrolled
})();


/* ------------------------------------------------------------
   4. GSAP entrance animations
   All wrapped in prefers-reduced-motion check.
   ------------------------------------------------------------ */
document.addEventListener('DOMContentLoaded', function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  gsap.registerPlugin(ScrollTrigger);

  // ── Hero brand mark (scale + fade)
  gsap.fromTo('.hero-icon-wrap',
    { opacity: 0, scale: 0.82 },
    { opacity: 1, scale: 1, duration: 0.7, ease: 'back.out(1.5)', delay: 0.1 }
  );

  // ── Hero text (staggered y + fade)
  gsap.fromTo('.hero-anim',
    { opacity: 0, y: 24 },
    { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', stagger: 0.13, delay: 0.28 }
  );

  // ── App cards (scroll-triggered, staggered)
  gsap.fromTo('.apps-anim',
    { opacity: 0, y: 30 },
    {
      opacity: 1, y: 0, duration: 0.55, ease: 'power2.out', stagger: 0.1,
      scrollTrigger: { trigger: '#apps', start: 'top 76%' }
    }
  );

  // ── Contact section
  gsap.fromTo('.contact-anim',
    { opacity: 0, y: 22 },
    {
      opacity: 1, y: 0, duration: 0.5, ease: 'power2.out',
      scrollTrigger: { trigger: '#contact', start: 'top 80%' }
    }
  );
});
