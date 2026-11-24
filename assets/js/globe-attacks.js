// Educational traffic only. Cities are fictional scenario endpoints, not attribution.
const RAD = Math.PI / 180;
export const GLOBE_TILT = 0.16;
export const GLOBE_SCALE = 1.06;
export const POSTER_ANGLE = 0.48;

const cities = {
  'San Francisco': [37.77, -122.42], 'New York': [40.71, -74.01],
  'São Paulo': [-23.55, -46.63], London: [51.51, -0.13],
  Frankfurt: [50.11, 8.68], Lagos: [6.52, 3.38],
  'Cape Town': [-33.92, 18.42], Dubai: [25.2, 55.27],
  Mumbai: [19.08, 72.88], Singapore: [1.35, 103.82],
  Tokyo: [35.68, 139.69], Sydney: [-33.87, 151.21]
};

const scenarios = [
  ['New York', 'London', 'bot'], ['São Paulo', 'New York', 'intrusion'],
  ['San Francisco', 'Tokyo', 'bot'], ['London', 'Lagos', 'intrusion'],
  ['Lagos', 'São Paulo', 'bot'], ['Frankfurt', 'Dubai', 'intrusion'],
  ['Mumbai', 'Singapore', 'bot'], ['Tokyo', 'Sydney', 'intrusion'],
  ['Singapore', 'Tokyo', 'bot'], ['Sydney', 'Mumbai', 'intrusion'],
  ['Dubai', 'Cape Town', 'bot'], ['Cape Town', 'Frankfurt', 'intrusion']
];
const palette = { bot: [255, 188, 105], intrusion: [255, 113, 139] };

export function locationVector([latitude, longitude]) {
  const lat = latitude * RAD;
  const lon = longitude * RAD;
  return [Math.cos(lat) * Math.cos(lon), Math.sin(lat), -Math.cos(lat) * Math.sin(lon)];
}

// Inverse of COBE's camera-to-world transform. Return normalized screen coordinates.
export function projectPoint([x, y, z], phi, theta = GLOBE_TILT) {
  const c = Math.cos(phi), s = Math.sin(phi), ct = Math.cos(theta), st = Math.sin(theta);
  const px = c * x + s * z;
  const py = s * st * x + ct * y - c * st * z;
  const depth = -s * ct * x + st * y + c * ct * z;
  return {
    x: 0.5 + px * 0.4 * GLOBE_SCALE,
    y: 0.5 - py * 0.4 * GLOBE_SCALE,
    visible: depth >= 0 || px * px + py * py > 1.002,
    depth
  };
}

export function arcPoint(from, to, t) {
  const dot = Math.max(-1, Math.min(1, from.reduce((sum, value, i) => sum + value * to[i], 0)));
  const angle = Math.acos(dot);
  const denominator = Math.sin(angle);
  const a = angle < 0.0001 ? 1 - t : Math.sin((1 - t) * angle) / denominator;
  const b = angle < 0.0001 ? t : Math.sin(t * angle) / denominator;
  const elevation = 1 + Math.sin(Math.PI * t) * 0.19;
  return from.map((value, i) => (value * a + to[i] * b) * elevation);
}

export const ATTACK_ROUTES = scenarios.map(([from, to, kind], index) => {
  const start = locationVector(cities[from]);
  const end = locationVector(cities[to]);
  return { from, to, kind, index, start, end,
    points: Array.from({ length: 65 }, (_, i) => arcPoint(start, end, i / 64)) };
});

export function createAttackLayer(stage) {
  const canvas = stage.querySelector('.globe-attacks');
  const ctx = canvas?.getContext('2d');
  if (!ctx) return { draw() {} };
  const routeLabel = stage.querySelector('[data-attack-route]');
  const typeLabel = stage.querySelector('[data-attack-type]');
  let lastRoute = -1;
  let logicalSize = 0;

  const color = (kind, alpha = 1) => `rgba(${palette[kind].join(',')},${alpha})`;
  function path(points, kind, alpha, thickness) {
    ctx.strokeStyle = color(kind, alpha);
    ctx.lineWidth = thickness;
    ctx.beginPath();
    let connected = false;
    for (const p of points) {
      if (!p.visible) { connected = false; continue; }
      if (connected) ctx.lineTo(p.x * logicalSize, p.y * logicalSize);
      else ctx.moveTo(p.x * logicalSize, p.y * logicalSize);
      connected = true;
    }
    ctx.stroke();
  }

  function ring(point, kind, radius, alpha) {
    if (!point.visible) return;
    ctx.strokeStyle = color(kind, alpha);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(point.x * logicalSize, point.y * logicalSize, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  function sourceIcon(point, kind) {
    const x = point.x * logicalSize, y = point.y * logicalSize;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#0b1020';
    ctx.strokeStyle = color(kind, 0.95);
    ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    if (kind === 'bot') {
      ctx.rect(-5, -3.5, 10, 7);
      ctx.moveTo(0, -3.5); ctx.lineTo(0, -6);
      ctx.moveTo(-2.5, -0.5); ctx.lineTo(-2.5, 1);
      ctx.moveTo(2.5, -0.5); ctx.lineTo(2.5, 1);
    } else {
      ctx.moveTo(-3, -4); ctx.lineTo(-6, 0); ctx.lineTo(-3, 4);
      ctx.moveTo(3, -4); ctx.lineTo(6, 0); ctx.lineTo(3, 4);
      ctx.moveTo(1, -3); ctx.lineTo(-1, 3);
    }
    ctx.stroke();
    ctx.restore();
  }

  return {
    draw(phi, seconds, pixels) {
      const size = canvas.getBoundingClientRect().width;
      if (!size) return;
      logicalSize = size;
      if (canvas.width !== pixels || canvas.height !== pixels) {
        canvas.width = pixels; canvas.height = pixels;
      }
      ctx.setTransform(pixels / size, 0, 0, pixels / size, 0, 0);
      ctx.clearRect(0, 0, size, size);
      ctx.lineCap = 'round';
      const routes = ATTACK_ROUTES.map(route => ({
        ...route,
        projected: route.points.map(point => projectPoint(point, phi)),
        source: projectPoint(route.start, phi),
        target: projectPoint(route.end, phi)
      }));
      // Faint routes remain readable while only a few bright packets travel at once.
      const visibleRoutes = routes.filter(route => route.projected.some(point => point.visible));
      for (const route of visibleRoutes) {
        path(route.projected, route.kind, 0.17, 0.8);
        const phase = (seconds / 6 + route.index * 0.173) % 1;
        if (phase < 0.72) {
          const progress = phase / 0.72;
          const head = Math.floor(progress * 64);
          const trail = route.projected.slice(Math.max(0, head - 10), head + 1);
          path(trail, route.kind, 0.10, 7);
          path(trail, route.kind, 0.78, 1.5);
          const packet = projectPoint(arcPoint(route.start, route.end, progress), phi);
          if (packet.visible) {
            ctx.fillStyle = '#fff1df';
            ctx.beginPath(); ctx.arc(packet.x * size, packet.y * size, 2, 0, Math.PI * 2); ctx.fill();
          }
        } else {
          const arrival = (phase - 0.72) / 0.28;
          ring(route.target, route.kind, 4 + arrival * 15, (1 - arrival) * 0.7);
        }
        ring(route.source, route.kind, 3, 0.7);
        ring(route.target, route.kind, 2.5, 0.5);
      }
      const front = visibleRoutes.filter(route => route.source.depth > 0.2 && route.source.x > 0.27 && route.source.x < 0.82);
      const selected = front[Math.floor(seconds / 5) % Math.max(front.length, 1)] || visibleRoutes[0];
      if (selected) {
        if (selected.source.visible) sourceIcon(selected.source, selected.kind);
        if (selected.index !== lastRoute) {
          lastRoute = selected.index;
          if (routeLabel) routeLabel.textContent = `${selected.from} → ${selected.to}`;
          if (typeLabel) typeLabel.textContent = `${selected.kind === 'bot' ? 'Bot traffic' : 'Intrusion attempt'} · simulated`;
        }
      }
      canvas.dataset.routes = String(visibleRoutes.length);
    }
  };
}