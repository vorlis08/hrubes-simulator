'use strict';
// ═══════════════════════════════════════════
//  EXORCISMUS – Rhythm minigame
// ═══════════════════════════════════════════

const Exorcism = (() => {
  let canvas, ctx;
  let active = false;
  let state = null;

  const W = 1280, H = 720;
  const HIT_Y = 580;
  const NOTE_SPEED = 3.5;
  const PERFECT_RANGE = 25;
  const GOOD_RANGE = 55;
  const MISS_RANGE = 85;

  const LANES = [
    { key: 'a', x: 440, color: '#ff4444', label: 'A' },
    { key: 's', x: 560, color: '#44ff44', label: 'S' },
    { key: 'd', x: 680, color: '#4444ff', label: 'D' },
    { key: 'f', x: 800, color: '#ffff44', label: 'F' },
  ];

  // Predefined rhythm patterns (beats in frames from start)
  const PATTERNS = [
    // Wave 1 – simple
    ..._wave(0, [
      [0,0],[30,1],[60,2],[90,3],
      [130,0],[145,1],[160,2],[175,3],
      [220,1],[250,2],[280,1],[310,2],
    ]),
    // Wave 2 – faster
    ..._wave(400, [
      [0,0],[20,1],[40,2],[60,3],
      [80,0],[80,3],[100,1],[100,2],
      [130,0],[145,1],[160,0],[175,1],
      [200,2],[215,3],[230,2],[245,3],
    ]),
    // Wave 3 – intense
    ..._wave(750, [
      [0,0],[12,1],[24,2],[36,3],
      [50,0],[50,2],[65,1],[65,3],
      [80,0],[88,1],[96,2],[104,3],
      [120,0],[120,1],[120,2],[120,3],
      [150,0],[162,1],[174,2],[186,3],
      [200,1],[200,2],[220,0],[220,3],
      [240,0],[248,1],[256,2],[264,3],
    ]),
  ];

  function _wave(offset, notes) {
    return notes.map(([t, lane]) => ({ t: t + offset, lane }));
  }

  function start(onWin, onLose) {
    const ov = document.getElementById('exorcism-ov');
    if (!ov) return;
    canvas = document.getElementById('exorcism-canvas');
    ctx = canvas.getContext('2d');
    canvas.width = W; canvas.height = H;
    ov.classList.add('on');
    gs.running = false;
    active = true;

    const notes = PATTERNS.map(p => ({
      lane: p.lane,
      y: -p.t * NOTE_SPEED * 2,
      hit: false,
      missed: false,
    }));

    state = {
      notes,
      score: 0,
      combo: 0,
      maxCombo: 0,
      perfects: 0,
      goods: 0,
      misses: 0,
      totalNotes: notes.length,
      flash: [0, 0, 0, 0],
      pentaGlow: 0,
      shakeT: 0,
      t: 0,
      onWin, onLose,
    };

    _bindKeys();
    _loop();
    if (gs.stats) gs.stats.minigamesPlayed++;
  }

  let _keyHandler = null;
  function _bindKeys() {
    _keyHandler = (e) => {
      if (!active || !state) return;
      const key = e.key.toLowerCase();
      const li = LANES.findIndex(l => l.key === key);
      if (li === -1) return;
      e.preventDefault();
      _hitLane(li);
    };
    window.addEventListener('keydown', _keyHandler);
  }

  function _unbindKeys() {
    if (_keyHandler) window.removeEventListener('keydown', _keyHandler);
    _keyHandler = null;
  }

  function _hitLane(li) {
    const s = state;
    s.flash[li] = 12;

    let best = null, bestDist = Infinity;
    for (const n of s.notes) {
      if (n.hit || n.missed || n.lane !== li) continue;
      const dist = Math.abs(n.y - HIT_Y);
      if (dist < bestDist) { best = n; bestDist = dist; }
    }

    if (best && bestDist < MISS_RANGE) {
      best.hit = true;
      if (bestDist < PERFECT_RANGE) {
        s.score += 100 * (1 + Math.floor(s.combo / 10));
        s.combo++;
        s.perfects++;
        s.pentaGlow = 20;
      } else if (bestDist < GOOD_RANGE) {
        s.score += 50 * (1 + Math.floor(s.combo / 10));
        s.combo++;
        s.goods++;
        s.pentaGlow = 10;
      } else {
        s.score += 20;
        s.combo = 0;
      }
      if (s.combo > s.maxCombo) s.maxCombo = s.combo;
    } else {
      s.combo = 0;
      s.shakeT = 5;
    }
  }

  function stop(won) {
    active = false;
    _unbindKeys();
    const ov = document.getElementById('exorcism-ov');
    if (ov) ov.classList.remove('on');
    if (won && state && state.onWin) state.onWin(state.score, state.perfects, state.maxCombo);
    else if (!won && state && state.onLose) state.onLose();
    state = null;
    gs.running = true;
  }

  function _loop() {
    if (!active || !state) return;
    _update();
    _render();
    requestAnimationFrame(_loop);
  }

  function _update() {
    const s = state;
    s.t++;

    for (const n of s.notes) {
      if (!n.hit && !n.missed) n.y += NOTE_SPEED;
      if (!n.hit && !n.missed && n.y > HIT_Y + MISS_RANGE + 20) {
        n.missed = true;
        s.misses++;
        s.combo = 0;
        s.shakeT = 8;
      }
    }

    for (let i = 0; i < 4; i++) if (s.flash[i] > 0) s.flash[i]--;
    if (s.pentaGlow > 0) s.pentaGlow--;
    if (s.shakeT > 0) s.shakeT--;

    // Check end
    const allDone = s.notes.every(n => n.hit || n.missed);
    if (allDone) {
      const accuracy = (s.perfects + s.goods) / s.totalNotes;
      if (accuracy >= 0.5) {
        if (gs.stats) gs.stats.minigamesWon++;
        stop(true);
      } else {
        stop(false);
      }
    }
  }

  function _render() {
    if (!state) return;
    const s = state;
    const shk = s.shakeT > 0 ? (Math.random() - 0.5) * 6 : 0;

    ctx.save();
    ctx.translate(shk, shk * 0.5);

    // Background – dark ritual room
    ctx.fillStyle = '#0a0008';
    ctx.fillRect(0, 0, W, H);

    // Pentagram glow
    const pg = 0.15 + s.pentaGlow * 0.03;
    ctx.save();
    ctx.translate(W / 2, 200);
    ctx.globalAlpha = pg;
    _drawPentagram(ctx, 150, '#ff2200');
    ctx.globalAlpha = 1;
    ctx.restore();

    // Candle flames
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const cx = W / 2 + Math.cos(angle) * 180;
      const cy = 200 + Math.sin(angle) * 100;
      ctx.fillStyle = '#ffaa22';
      ctx.beginPath();
      ctx.ellipse(cx, cy - 10 - Math.random() * 5, 6, 12 + Math.random() * 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#553300';
      ctx.fillRect(cx - 3, cy, 6, 20);
    }

    // Lane tracks
    for (let i = 0; i < LANES.length; i++) {
      const l = LANES[i];
      ctx.fillStyle = `rgba(${i === 0 ? '255,68,68' : i === 1 ? '68,255,68' : i === 2 ? '68,68,255' : '255,255,68'}, 0.08)`;
      ctx.fillRect(l.x - 40, 0, 80, H);

      // Hit zone
      const flash = s.flash[i];
      ctx.strokeStyle = flash > 0 ? '#ffffff' : l.color;
      ctx.lineWidth = flash > 0 ? 4 : 2;
      ctx.strokeRect(l.x - 35, HIT_Y - 20, 70, 40);

      // Lane label
      ctx.fillStyle = flash > 0 ? '#ffffff' : l.color;
      ctx.font = 'bold 28px "JetBrains Mono"';
      ctx.textAlign = 'center';
      ctx.fillText(l.label, l.x, HIT_Y + 50);
    }

    // Notes
    for (const n of s.notes) {
      if (n.hit || n.y < -30 || n.y > H + 30) continue;
      const l = LANES[n.lane];
      if (n.missed) {
        ctx.globalAlpha = 0.3;
      }
      ctx.fillStyle = l.color;
      ctx.beginPath();
      ctx.arc(l.x, n.y, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(l.x, n.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.restore();

    // HUD
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, 0, W, 55);
    ctx.fillStyle = '#ff6644';
    ctx.font = 'bold 24px "Outfit"';
    ctx.textAlign = 'left';
    ctx.fillText(`🔥 EXORCISMUS`, 20, 36);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Outfit"';
    ctx.textAlign = 'center';
    ctx.fillText(`Skóre: ${s.score}`, W / 2 - 100, 36);
    ctx.fillText(`Combo: ${s.combo}x`, W / 2 + 100, 36);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#66ff66';
    ctx.fillText(`✅ ${s.perfects + s.goods}`, W - 120, 36);
    ctx.fillStyle = '#ff4444';
    ctx.fillText(`❌ ${s.misses}`, W - 20, 36);

    // Combo flash text
    if (s.combo >= 5 && s.combo % 5 === 0 && s.pentaGlow > 15) {
      ctx.fillStyle = '#ff4400';
      ctx.font = 'bold 48px "Bebas Neue"';
      ctx.textAlign = 'center';
      ctx.fillText(`${s.combo}x COMBO!`, W / 2, 350);
    }

    // Controls hint
    if (s.t < 120) {
      ctx.globalAlpha = Math.max(0, 1 - s.t / 120);
      ctx.fillStyle = '#ffffff';
      ctx.font = '18px "Outfit"';
      ctx.textAlign = 'center';
      ctx.fillText('Mačkej A S D F ve správný moment!', W / 2, H - 40);
      ctx.globalAlpha = 1;
    }
  }

  function _drawPentagram(ctx, r, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a1 = (i * 4 / 5) * Math.PI * 2 - Math.PI / 2;
      const x1 = Math.cos(a1) * r;
      const y1 = Math.sin(a1) * r * 0.6;
      if (i === 0) ctx.moveTo(x1, y1);
      else ctx.lineTo(x1, y1);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.1, 0, Math.PI * 2);
    ctx.stroke();
  }

  return { start, stop, active: () => active };
})();
