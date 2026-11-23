const navToggle = document.querySelector('[data-nav-toggle]');
const navMenu = document.querySelector('#site-nav');

if (navToggle && navMenu) {
  const closeMenu = () => {
    navMenu.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  };

  navMenu.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeMenu();
  });

  window.matchMedia('(min-width: 1181px)').addEventListener('change', (event) => {
    if (event.matches) closeMenu();
  });

  navToggle.addEventListener('click', () => {
    const isOpen = navMenu.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && navMenu.classList.contains('open')) {
      navMenu.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.focus();
    }
  });
}

const yearSpans = document.querySelectorAll('[data-year]');
for (const span of yearSpans) {
  span.textContent = new Date().getFullYear();
}

const motionPreference = window.matchMedia('(prefers-reduced-motion: no-preference)');

if (motionPreference.matches && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          if (motionPreference.matches && !entry.target.matches(':focus-within')) {
            entry.target.classList.add('in-view');
          }
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.15 }
  );

  const shield = document.querySelector('.hero-art-shield');
  if (shield) observer.observe(shield);

  for (const item of document.querySelectorAll('.reveal')) {
    if (item.getBoundingClientRect().top >= window.innerHeight) {
      observer.observe(item);
    }
  }
}

const spotlightPreference = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');

for (const card of document.querySelectorAll('.service-card')) {
  card.addEventListener('pointermove', (event) => {
    if (!spotlightPreference.matches || event.pointerType === 'touch') return;

    const bounds = card.getBoundingClientRect();
    card.style.setProperty('--spotlight-x', `${event.clientX - bounds.left}px`);
    card.style.setProperty('--spotlight-y', `${event.clientY - bounds.top}px`);
  });
}
