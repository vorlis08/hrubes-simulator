'use strict';
// ═══════════════════════════════════════════════════════════════════
//  NOVÉ EFEKTY – OPTIMALIZOVANÉ PRO VÝKON
// ═══════════════════════════════════════════════════════════════════

// ─── Ambient occlusion v rozích ───────────────────────────────────────
function drawAmbientOcclusion(ctx, W, H, intensity = 0.15) {
  const corners = [
    { x: 0, y: 0, flipX: 1, flipY: 1 },
    { x: W, y: 0, flipX: -1, flipY: 1 },
    { x: 0, y: H, flipX: 1, flipY: -1 },
    { x: W, y: H, flipX: -1, flipY: -1 }
  ];

  for (const corner of corners) {
    const grad = ctx.createRadialGradient(
      corner.x, corner.y, 0,
      corner.x, corner.y, Math.max(W, H) * 0.4
    );
    grad.addColorStop(0, `rgba(0,0,0,${intensity})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(
      corner.x + (corner.flipX > 0 ? 0 : -Math.max(W, H) * 0.4),
      corner.y + (corner.flipY > 0 ? 0 : -Math.max(W, H) * 0.4),
      Math.max(W, H) * 0.4,
      Math.max(W, H) * 0.4
    );
  }
}

// ─── Glow effect na světlech (efektivní) ──────────────────────────────
function drawGlow(ctx, x, y, radius, color, intensity = 0.5) {
  const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
  grad.addColorStop(0, color.replace(')', `, ${intensity})`));
  grad.addColorStop(0.5, color.replace(')', `, ${intensity * 0.5})`));
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

// ─── Electric arc efekt (pro Figurovou) ──────────────────────────────
function drawElectricArc(ctx, x1, y1, x2, y2, t, thickness = 2, color = '#06b6d4') {
  ctx.strokeStyle = color;
  ctx.lineWidth = thickness;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const segmentCount = 8;
  const dx = (x2 - x1) / segmentCount;
  const dy = (y2 - y1) / segmentCount;

  ctx.beginPath();
  ctx.moveTo(x1, y1);

  for (let i = 1; i <= segmentCount; i++) {
    const baseX = x1 + dx * i;
    const baseY = y1 + dy * i;
    const wobble = Math.sin(t * 0.008 + i * 0.5) * 3;
    const perpX = -dy / Math.hypot(dx, dy) * wobble;
    const perpY = dx / Math.hypot(dx, dy) * wobble;
    ctx.lineTo(baseX + perpX, baseY + perpY);
  }
  ctx.stroke();

  // Vnitřní jas
  ctx.strokeStyle = 'rgba(200,240,255,0.6)';
  ctx.lineWidth = thickness * 0.5;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  for (let i = 1; i <= segmentCount; i++) {
    const baseX = x1 + dx * i;
    const baseY = y1 + dy * i;
    const wobble = Math.sin(t * 0.008 + i * 0.5 + 0.3) * 2;
    const perpX = -dy / Math.hypot(dx, dy) * wobble;
    const perpY = dx / Math.hypot(dx, dy) * wobble;
    ctx.lineTo(baseX + perpX, baseY + perpY);
  }
  ctx.stroke();
}

// ─── Pixel distortion (pokud je potřeba) ──────────────────────────────
function drawPixelGlitch(ctx, sourceImageData, x, y, intensity = 0.1) {
  if (!sourceImageData) return;
  const data = sourceImageData.data;
  const randomRows = Math.floor(sourceImageData.height * intensity);
  for (let i = 0; i < randomRows; i++) {
    const row = Math.floor(Math.random() * sourceImageData.height);
    const offset = Math.floor(Math.random() * 20) - 10;
    const startIdx = row * sourceImageData.width * 4;
    for (let j = 0; j < sourceImageData.width * 4 - offset * 4; j += 4) {
      if (startIdx + j + offset * 4 < data.length) {
        data[startIdx + j] = data[startIdx + j + offset * 4];
        data[startIdx + j + 1] = data[startIdx + j + offset * 4 + 1];
        data[startIdx + j + 2] = data[startIdx + j + offset * 4 + 2];
      }
    }
  }
}

// ─── Pulsing aura efekt (pro speciální stavy) ────────────────────────
function drawPulsingAura(ctx, x, y, maxRadius, color, t, freq = 0.003) {
  const pulse = (Math.sin(t * freq) + 1) / 2;
  const radius = maxRadius * (0.7 + pulse * 0.3);
  const alpha = pulse * 0.6;

  // Extrahuj RGB složky bezpečně – .replace() na rgba() by přidalo 5. parametr (invalid CSS)
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  const [r, g, b] = m ? [m[1], m[2], m[3]] : [100, 200, 255];

  const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
  grad.addColorStop(0,   `rgba(${r},${g},${b},${alpha})`);
  grad.addColorStop(0.7, `rgba(${r},${g},${b},${alpha * 0.3})`);
  grad.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

// ─── Dynamický počet částic na základě FPS ──────────────────────────
function getParticleCount(baseCount, fpsMonitor) {
  if (!fpsMonitor || fpsMonitor.fps > 50) return baseCount;
  if (fpsMonitor.fps > 40) return Math.floor(baseCount * 0.8);
  if (fpsMonitor.fps > 30) return Math.floor(baseCount * 0.5);
  return Math.floor(baseCount * 0.3);
}

// ─── Bloom effect (na světlech) ───────────────────────────────────────
function drawBloom(ctx, x, y, color, size, t) {
  // Vnější oreol
  for (let ring = 3; ring > 0; ring--) {
    const alpha = (0.3 / ring) * (0.5 + 0.5 * Math.sin(t * 0.004));
    ctx.fillStyle = color.replace(')', `, ${alpha})`);
    ctx.beginPath();
    ctx.arc(x, y, size * (1 + ring * 0.4), 0, Math.PI * 2);
    ctx.fill();
  }
}

// ─── Optimalizovaný dust/smoke efekt ──────────────────────────────────
function drawOptimizedDust(ctx, particles, t) {
  ctx.save();
  for (const p of particles) {
    const progress = (t - p.startTime) / p.duration;
    if (progress < 0 || progress > 1) continue;

    const x = p.x + Math.sin(t * 0.003 + p.id) * p.wobble;
    const y = p.y + progress * p.distance;
    const alpha = progress < 0.3 ? progress / 0.3 : (1 - progress) * 0.7;
    const size = p.size * (0.5 + progress);

    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ─── Stínovaný text efekt ────────────────────────────────────────────
function drawShadowText(ctx, text, x, y, shadowOffset = 2, textColor = '#fff', shadowColor = 'rgba(0,0,0,0.5)') {
  ctx.fillStyle = shadowColor;
  ctx.fillText(text, x + shadowOffset, y + shadowOffset);
  ctx.fillStyle = textColor;
  ctx.fillText(text, x, y);
}

// ─── Vibrace efekt (na vzrušení, strach atd) ────────────────────────
function applyScreenVibration(ctx, W, H, intensity, phase) {
  const offsetX = Math.sin(phase * 0.2) * intensity * 2;
  const offsetY = Math.cos(phase * 0.15) * intensity * 2;
  ctx.translate(offsetX, offsetY);
}

// ─── Croma aberration light efekt ─────────────────────────────────────
function drawChromaLight(ctx, x, y, size, t) {
  const offset = 2;
  const channels = [
    { color: 'rgba(255,0,0,0.3)', offsetX: offset },
    { color: 'rgba(0,255,0,0.3)', offsetX: 0 },
    { color: 'rgba(0,0,255,0.3)', offsetX: -offset }
  ];

  for (const ch of channels) {
    const grad = ctx.createRadialGradient(x + ch.offsetX, y, 0, x + ch.offsetX, y, size);
    grad.addColorStop(0, ch.color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x + ch.offsetX, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ─── Rytmické pulzování (pro hudbu/efekty) ──────────────────────────
function drawRhythmicPulse(ctx, x, y, radius, beat, color = 'rgba(255,255,255,0.5)') {
  const pulseRadius = radius * (1 + beat * 0.3);
  const alpha = (1 - beat) * 0.6;
  ctx.strokeStyle = color.replace(')', `, ${alpha})`);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, pulseRadius, 0, Math.PI * 2);
  ctx.stroke();
}
