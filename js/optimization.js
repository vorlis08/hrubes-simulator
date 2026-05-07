'use strict';
// ═══════════════════════════════════════════════════════════════════
//  OPTIMALIZAČNÍ SYSTÉM – CACHE, POOLING, RENDERING
// ═══════════════════════════════════════════════════════════════════

// ─── Gradient cache – uložit si vytvořené gradienty ──────────────────
class GradientCache {
  constructor() {
    this.cache = new Map();
    this.maxSize = 200;
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
      p.x += p.vx * (dt / FRAME_MS);
      p.y += p.vy * (dt / FRAME_MS);

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
    this.checkInterval = 500;
    this.lowFPS = false;
    this.veryLowFPS = false;
    this.history = [];
    this.avgFPS = 60;
  }

  update() {
    this.frames++;
    const now = Date.now();
    if (now - this.lastTime >= this.checkInterval) {
      this.fps = Math.round((this.frames * 1000) / (now - this.lastTime));
      this.lowFPS = this.fps < 40;
      this.veryLowFPS = this.fps < 25;
      this.history.push(this.fps);
      if (this.history.length > 10) this.history.shift();
      this.avgFPS = Math.round(this.history.reduce((a, b) => a + b, 0) / this.history.length);
      this.frames = 0;
      this.lastTime = now;
    }
  }

  shouldReduceEffects() {
    return this.lowFPS;
  }

  shouldMinimalEffects() {
    return this.veryLowFPS;
  }

  getQualityTier() {
    if (this.avgFPS >= 55) return 3; // plná kvalita
    if (this.avgFPS >= 40) return 2; // snížená
    if (this.avgFPS >= 25) return 1; // minimální
    return 0; // nouzový režim
  }
}

// ─── Vignette & Scanline cache ──────────────────────────────────────
class OverlayCache {
  constructor() {
    this._vignetteCanvas = null;
    this._vignetteW = 0;
    this._vignetteH = 0;
    this._scanlineCanvas = null;
    this._scanlineW = 0;
    this._scanlineH = 0;
    this._aoCanvas = null;
    this._aoW = 0;
    this._aoH = 0;
  }

  getVignette(W, H) {
    if (this._vignetteCanvas && this._vignetteW === W && this._vignetteH === H) {
      return this._vignetteCanvas;
    }
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const cx = c.getContext('2d');
    const vig = cx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, Math.max(W, H) * 0.78);
    vig.addColorStop(0, 'transparent');
    vig.addColorStop(1, 'rgba(0,0,0,0.38)');
    cx.fillStyle = vig;
    cx.fillRect(0, 0, W, H);
    this._vignetteCanvas = c;
    this._vignetteW = W;
    this._vignetteH = H;
    return c;
  }

  getScanlines(W, H) {
    if (this._scanlineCanvas && this._scanlineW === W && this._scanlineH === H) {
      return this._scanlineCanvas;
    }
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const cx = c.getContext('2d');
    cx.fillStyle = 'rgba(0,0,0,0.04)';
    for (let y = 0; y < H; y += 3) cx.fillRect(0, y, W, 1);
    this._scanlineCanvas = c;
    this._scanlineW = W;
    this._scanlineH = H;
    return c;
  }

  getAmbientOcclusion(W, H, intensity = 0.08) {
    if (this._aoCanvas && this._aoW === W && this._aoH === H) {
      return this._aoCanvas;
    }
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const cx = c.getContext('2d');
    const corners = [
      { x: 0, y: 0, flipX: 1, flipY: 1 },
      { x: W, y: 0, flipX: -1, flipY: 1 },
      { x: 0, y: H, flipX: 1, flipY: -1 },
      { x: W, y: H, flipX: -1, flipY: -1 }
    ];
    for (const corner of corners) {
      const grad = cx.createRadialGradient(corner.x, corner.y, 0, corner.x, corner.y, Math.max(W, H) * 0.4);
      grad.addColorStop(0, `rgba(0,0,0,${intensity})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      cx.fillStyle = grad;
      cx.fillRect(
        corner.x + (corner.flipX > 0 ? 0 : -Math.max(W, H) * 0.4),
        corner.y + (corner.flipY > 0 ? 0 : -Math.max(W, H) * 0.4),
        Math.max(W, H) * 0.4,
        Math.max(W, H) * 0.4
      );
    }
    this._aoCanvas = c;
    this._aoW = W;
    this._aoH = H;
    return c;
  }
}

// ─── Spatial hash pro proximity check ────────────────────────────────
class SpatialHash {
  constructor(cellSize = 120) {
    this.cellSize = cellSize;
    this.grid = new Map();
  }

  _key(x, y) {
    return ((x / this.cellSize) | 0) + ',' + ((y / this.cellSize) | 0);
  }

  clear() {
    this.grid.clear();
  }

  insert(entity) {
    const key = this._key(entity.x, entity.y);
    if (!this.grid.has(key)) this.grid.set(key, []);
    this.grid.get(key).push(entity);
  }

  query(x, y, radius) {
    const results = [];
    const minCX = ((x - radius) / this.cellSize) | 0;
    const maxCX = ((x + radius) / this.cellSize) | 0;
    const minCY = ((y - radius) / this.cellSize) | 0;
    const maxCY = ((y + radius) / this.cellSize) | 0;
    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cy = minCY; cy <= maxCY; cy++) {
        const cell = this.grid.get(cx + ',' + cy);
        if (cell) {
          for (const e of cell) results.push(e);
        }
      }
    }
    return results;
  }
}

// ─── Throttled DOM updates ──────────────────────────────────────────
const domUpdateQueue = {
  _pending: new Map(),
  _rafId: null,

  set(element, prop, value) {
    const key = element.id || element;
    if (!this._pending.has(key)) this._pending.set(key, []);
    this._pending.get(key).push({ element, prop, value });
    if (!this._rafId) {
      this._rafId = requestAnimationFrame(() => this._flush());
    }
  },

  _flush() {
    for (const [, updates] of this._pending) {
      for (const { element, prop, value } of updates) {
        if (prop === 'textContent') element.textContent = value;
        else if (prop === 'innerHTML') element.innerHTML = value;
        else if (prop === 'display') element.style.display = value;
        else if (prop === 'className') element.className = value;
      }
    }
    this._pending.clear();
    this._rafId = null;
  }
};

// ─── Vytvořit globální instance ──────────────────────────────────────
const gradientCache = new GradientCache();
const particlePool = new ParticlePool(600);
const fpsMonitor = new FPSMonitor();
const overlayCache = new OverlayCache();
const spatialHash = new SpatialHash(120);
let offscreenRenderer = null;

// ─── Helper: Cached radial gradient ──────────────────────────────────
function createCachedRadialGradient(x, y, r1, x2, y2, r2, stops) {
  const gradient = gradientCache.get('radial', ctx, x, y, r1, x2, y2, r2);
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
