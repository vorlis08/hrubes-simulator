'use strict';
// ═══════════════════════════════════════════════════════════════════
//  OPTIMALIZAČNÍ SYSTÉM – CACHE, POOLING, RENDERING
// ═══════════════════════════════════════════════════════════════════

// ─── Gradient cache – uložit si vytvořené gradienty ──────────────────
class GradientCache {
  constructor() {
    this.cache = new Map();
    this.maxSize = 100;
  }

  getKey(type, ...args) {
    return `${type}:${args.join('|')}`;
  }

  get(type, ctx, ...args) {
    const key = this.getKey(type, ...args);
    if (this.cache.has(key)) return this.cache.get(key);

    let gradient;
    if (type === 'radial') {
      const [x, y, r1, x2, y2, r2] = args;
      gradient = ctx.createRadialGradient(x, y, r1, x2, y2, r2);
    } else if (type === 'linear') {
      const [x1, y1, x2, y2] = args;
      gradient = ctx.createLinearGradient(x1, y1, x2, y2);
    }

    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, gradient);
    return gradient;
  }

  addStop(gradient, offset, color) {
    gradient.addColorStop(offset, color);
  }

  clear() {
    this.cache.clear();
  }
}

// ─── Particle pool – efektivní částice ────────────────────────────────
class ParticlePool {
  constructor(initialSize = 500) {
    this.particles = [];
    this.active = [];
    this.inactive = [];

    for (let i = 0; i < initialSize; i++) {
      this.inactive.push({
        x: 0, y: 0, vx: 0, vy: 0,
        life: 0, maxLife: 1,
        size: 1, alpha: 1,
        color: 'rgba(255,255,255,1)',
        type: 'dust'
      });
    }
  }

  spawn(x, y, vx, vy, maxLife, size, color, type = 'dust') {
    let particle;
    if (this.inactive.length > 0) {
      particle = this.inactive.pop();
    } else {
      particle = { x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 1, alpha: 1, color: 'rgba(255,255,255,1)', type: 'dust' };
    }

    particle.x = x;
    particle.y = y;
    particle.vx = vx;
    particle.vy = vy;
    particle.life = 0;
    particle.maxLife = maxLife;
    particle.size = size;
    particle.alpha = 1;
    particle.color = color;
    particle.type = type;

    this.active.push(particle);
    return particle;
  }

  update(dt) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.life += dt;
      p.x += p.vx * (dt / 16.667);
      p.y += p.vy * (dt / 16.667);

      if (p.life >= p.maxLife) {
        this.inactive.push(this.active.splice(i, 1)[0]);
      }
    }
  }

  draw(ctx) {
    for (const p of this.active) {
      const progress = p.life / p.maxLife;
      ctx.globalAlpha = p.alpha * (1 - progress * 0.5);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

// ─── Offscreen canvas – cache statických prvků ────────────────────────
class OffscreenRenderer {
  constructor(width, height) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d');
    this.dirty = true;
    this.lastRoom = null;
  }

  setDirty() {
    this.dirty = true;
  }

  resize(width, height) {
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.dirty = true;
    }
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawTo(mainCtx, x = 0, y = 0) {
    mainCtx.drawImage(this.canvas, x, y);
  }
}

// ─── FPS monitor – sledovat výkon ─────────────────────────────────────
class FPSMonitor {
  constructor() {
    this.frames = 0;
    this.fps = 60;
    this.lastTime = Date.now();
    this.checkInterval = 500; // ms
    this.lowFPS = false; // flag pro dynamické snížení efektů
  }

  update() {
    this.frames++;
    const now = Date.now();
    if (now - this.lastTime >= this.checkInterval) {
      this.fps = Math.round((this.frames * 1000) / (now - this.lastTime));
      this.lowFPS = this.fps < 40;
      this.frames = 0;
      this.lastTime = now;
    }
  }

  shouldReduceEffects() {
    return this.lowFPS;
  }
}

// ─── Vytvořit globální instance ──────────────────────────────────────
const gradientCache = new GradientCache();
const particlePool = new ParticlePool(600);
const fpsMonitor = new FPSMonitor();
let offscreenRenderer = null;

// ─── Helper: Cached radial gradient ──────────────────────────────────
function createCachedRadialGradient(x, y, r1, x2, y2, r2, stops) {
  const gradient = gradientCache.get('radial', ctx, x, y, r1, x2, y2, r2);
  // Pouze přidej stop-y pokud již nejsou
  if (!gradient._initialized) {
    stops.forEach(([offset, color]) => {
      gradientCache.addStop(gradient, offset, color);
    });
    gradient._initialized = true;
  }
  return gradient;
}

function createCachedLinearGradient(x1, y1, x2, y2, stops) {
  const gradient = gradientCache.get('linear', ctx, x1, y1, x2, y2);
  if (!gradient._initialized) {
    stops.forEach(([offset, color]) => {
      gradientCache.addStop(gradient, offset, color);
    });
    gradient._initialized = true;
  }
  return gradient;
}

// ─── Inicializace offscreen rendereru ────────────────────────────────
function initOffscreenRenderer() {
  if (!offscreenRenderer) {
    offscreenRenderer = new OffscreenRenderer(canvas.width, canvas.height);
  } else {
    offscreenRenderer.resize(canvas.width, canvas.height);
  }
}
