import createGlobe from 'cobe';
import { createAttackLayer, GLOBE_SCALE, GLOBE_TILT, POSTER_ANGLE } from './globe-attacks.js';

// Decorative geography and illustrative traffic only: no real incidents or live data.
const stage = document.querySelector('.globe-stage');
if (stage) {
  const canvas = stage.querySelector('canvas');
  const toggle = stage.querySelector('.globe-toggle');
  const attacks = createAttackLayer(stage);
  const motionAllowed = matchMedia('(prefers-reduced-motion: no-preference)');
  let globe;
  let paused = false;
  let visible = true;
  let lost = false;
  let angle = POSTER_ANGLE;
  let simulationTime = 0;
  let lastTime = 0;
  let width = 0;
  let warmup = 0;
  let redraw = 0;
  const dpr = Math.min(devicePixelRatio || 1, 1.5);

  const drawAttacks = () => {
    const animatedGlobe = globe && motionAllowed.matches && !lost;
    const pixels = Math.max(1, Math.round(canvas.getBoundingClientRect().width * dpr));
    attacks.draw(animatedGlobe ? angle : POSTER_ANGLE, animatedGlobe ? simulationTime : 0, pixels);
  };
  const shouldAnimate = () => !paused && motionAllowed.matches && !document.hidden && visible && !lost;
  const sync = () => {
    const active = shouldAnimate();
    lastTime = 0;
    globe?.toggle(active);
    stage.dataset.motion = active && globe ? 'running' : 'static';
    toggle.setAttribute('aria-label', paused ? 'Play globe and threat simulation' : 'Pause globe and threat simulation');
    toggle.hidden = !globe || !motionAllowed.matches || lost;
    // Reduced motion uses the same geographic image with no WebGL render loop.
    stage.classList.toggle('globe-reduced', !motionAllowed.matches);
    drawAttacks();
  };

  function initialize() {
    if (globe || !motionAllowed.matches || lost) return;
    try {
      const context = { alpha: true, antialias: false, preserveDrawingBuffer: true };
      if (!canvas.getContext('experimental-webgl', context)) return;
      width = Math.round(canvas.getBoundingClientRect().width * dpr);
      globe = createGlobe(canvas, {
        devicePixelRatio: dpr,
        width,
        height: width,
        phi: angle,
        theta: GLOBE_TILT,
        dark: 1,
        diffuse: 1.7,
        scale: GLOBE_SCALE,
        mapSamples: 24000,
        mapBrightness: 4.8,
        mapBaseBrightness: 0.025,
        baseColor: [0.32, 0.48, 0.88],
        glowColor: [0.12, 0.23, 0.65],
        markerColor: [1, 0.6, 0.35],
        markers: [],
        context,
        onRender(state) {
          const now = performance.now();
          if (shouldAnimate() && lastTime && !stage.hasAttribute('data-globe-poster')) {
            const elapsed = Math.min(now - lastTime, 50);
            angle += elapsed * 0.000075;
            simulationTime += elapsed / 1000;
          }
          lastTime = now;
          state.phi = angle;
          state.width = width;
          state.height = width;
          attacks.draw(angle, simulationTime, width);
        }
      });
      // Allow the renderer's bundled map texture to settle before cross-fading.
      warmup = window.setTimeout(() => {
        if (!lost) stage.classList.add('globe-ready');
        sync();
      }, 600);
      sync();
    } catch {
      globe?.destroy();
      globe = undefined;
      stage.dataset.motion = 'static';
      // The locally generated globe poster stays visible if WebGL is unavailable.
    }
  }

  toggle.addEventListener('click', () => {
    paused = !paused;
    sync();
  });
  motionAllowed.addEventListener('change', () => { initialize(); sync(); });
  document.addEventListener('site:motion-change', () => { initialize(); sync(); });
  document.addEventListener('visibilitychange', sync);
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    lost = true;
    stage.classList.remove('globe-ready');
    sync();
  });
  canvas.addEventListener('webglcontextrestored', () => {
    globe?.destroy();
    globe = undefined;
    lost = false;
    initialize();
  });

  const resize = new ResizeObserver(() => {
    width = Math.max(1, Math.round(canvas.getBoundingClientRect().width * dpr));
    drawAttacks();
    // Render the new size even when paused, but never start a reduced-motion loop.
    if (globe && motionAllowed.matches && !lost) {
      clearTimeout(redraw);
      globe.toggle(true);
      redraw = window.setTimeout(sync, 80);
    }
  });
  resize.observe(canvas);
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  }, { threshold: 0.05 });
  observer.observe(stage);
  window.addEventListener('pagehide', () => {
    clearTimeout(warmup);
    clearTimeout(redraw);
    globe?.toggle(false);
  });
  window.addEventListener('pageshow', sync);
  initialize();
  sync();
}