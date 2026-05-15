'use strict';
// ═══════════════════════════════════════════
//  HONIČKA VE FÁBII – Side-scrolling minigame
// ═══════════════════════════════════════════

const Chase = (() => {
  let canvas, ctx;
  let active = false;
  let state = null;

  const W = 1280, H = 720;
  const LANE_COUNT = 3;
  const LANE_Y = [280, 420, 560];
  const ROAD_TOP = 220, ROAD_BOT = 620;
  const CAR_W = 120, CAR_H = 60;
  const PLAYER_X = 160;

  const OBSTACLE_TYPES = [
    { name: 'auto',    emoji: '🚗', w: 100, h: 50, color: '#cc3333', speed: 1.0 },
    { name: 'náklaďák', emoji: '🚛', w: 140, h: 60, color: '#666666', speed: 0.7 },
    { name: 'policie', emoji: '🚔', w: 110, h: 50, color: '#2255cc', speed: 1.4 },
    { name: 'kráva',   emoji: '🐄', w: 80,  h: 55, color: '#8B6914', speed: 0.4 },
    { name: 'traktor', emoji: '🚜', w: 130, h: 65, color: '#44aa44', speed: 0.5 },
  ];

  function start(onWin, onLose) {
    const ov = document.getElementById('chase-ov');
    if (!ov) return;
    canvas = document.getElementById('chase-canvas');
    ctx = canvas.getContext('2d');
    canvas.width = W; canvas.height = H;
    ov.classList.add('on');
    gs.running = false;
    active = true;

    state = {
      lane: 1,
      targetLane: 1,
      playerY: LANE_Y[1],
      speed: 5,
      distance: 0,
      goal: 3000,
      obstacles: [],
      spawnTimer: 0,
      spawnInterval: 60,
      score: 0,
      lives: 3,
      invuln: 0,
      roadOffset: 0,
      trees: _initTrees(),
      shakeT: 0,
      nitro: 0,
      onWin, onLose,
      t: 0,
    };

    _bindKeys();
    _loop();
    if (gs.stats) gs.stats.minigamesPlayed++;
  }

  function _initTrees() {
    const trees = [];
    for (let i = 0; i < 12; i++) {
      trees.push({
        x: Math.random() * W * 1.5,
        side: Math.random() < 0.5 ? 'top' : 'bot',
        size: 20 + Math.random() * 30,
      });
    }
    return trees;
  }

  let _keyDown = null, _keyUp = null;
  function _bindKeys() {
    _keyDown = (e) => {
      if (!active || !state) return;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        if (state.targetLane > 0) state.targetLane--;
      }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        if (state.targetLane < LANE_COUNT - 1) state.targetLane++;
      }
      if (e.key === ' ' || e.key === 'Shift') {
        e.preventDefault();
        if (state.nitro <= 0) state.nitro = 90;
      }
    };
    window.addEventListener('keydown', _keyDown);
  }

  function _unbindKeys() {
    if (_keyDown) window.removeEventListener('keydown', _keyDown);
    _keyDown = null;
  }

  function stop(won) {
    active = false;
    _unbindKeys();
    const ov = document.getElementById('chase-ov');
    if (ov) ov.classList.remove('on');
    if (won && state && state.onWin) state.onWin(state.score);
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

    // Lerp player Y to target lane
    const targetY = LANE_Y[s.targetLane];
    s.playerY += (targetY - s.playerY) * 0.15;
    s.lane = s.targetLane;

    // Speed ramps up over time
    s.speed = 5 + Math.min(s.distance / 400, 8);
    let curSpeed = s.speed;
    if (s.nitro > 0) { curSpeed *= 1.8; s.nitro--; }
    s.distance += curSpeed * 0.5;
    s.roadOffset = (s.roadOffset + curSpeed) % 80;

    // Spawn obstacles
    s.spawnTimer--;
    if (s.spawnTimer <= 0) {
      const diff = Math.min(s.distance / 500, 1);
      s.spawnInterval = Math.max(20, 60 - diff * 35);
      s.spawnTimer = s.spawnInterval + Math.random() * 20;
      const type = OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)];
      const lane = Math.floor(Math.random() * LANE_COUNT);
      s.obstacles.push({
        x: W + 50,
        lane,
        y: LANE_Y[lane],
        type,
        hit: false,
      });
    }

    // Move obstacles
    for (const ob of s.obstacles) {
      ob.x -= curSpeed * ob.type.speed + 2;
    }
    s.obstacles = s.obstacles.filter(ob => ob.x > -200);

    // Collision
    if (s.invuln > 0) s.invuln--;
    for (const ob of s.obstacles) {
      if (ob.hit) continue;
      const dx = Math.abs(ob.x - PLAYER_X);
      const dy = Math.abs(ob.y - s.playerY);
      if (dx < (CAR_W/2 + ob.type.w/2 - 15) && dy < (CAR_H/2 + ob.type.h/2 - 10)) {
        if (s.invuln <= 0) {
          ob.hit = true;
          s.lives--;
          s.invuln = 60;
          s.shakeT = 15;
          screenShake(200);
          if (s.lives <= 0) { stop(false); return; }
        }
      }
    }

    // Score
    s.score = Math.floor(s.distance);

    // Trees
    for (const t of s.trees) {
      t.x -= curSpeed * 0.6;
      if (t.x < -50) { t.x = W + 50 + Math.random() * 200; }
    }

    // Win
    if (s.distance >= s.goal) {
      if (gs.stats) gs.stats.minigamesWon++;
      stop(true);
    }

    if (s.shakeT > 0) s.shakeT--;
  }

  function _render() {
    if (!state) return;
    const s = state;
    const shk = s.shakeT > 0 ? (Math.random() - 0.5) * 8 : 0;

    ctx.save();
    ctx.translate(shk, shk * 0.5);

    // Sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, ROAD_TOP);
    skyGrad.addColorStop(0, '#1a3a5c');
    skyGrad.addColorStop(1, '#3a7a4a');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, ROAD_TOP);

    // Grass below road
    ctx.fillStyle = '#2a5a2a';
    ctx.fillRect(0, ROAD_BOT, W, H - ROAD_BOT);

    // Road
    ctx.fillStyle = '#333333';
    ctx.fillRect(0, ROAD_TOP, W, ROAD_BOT - ROAD_TOP);

    // Road lines
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 3;
    ctx.setLineDash([40, 40]);
    ctx.lineDashOffset = -s.roadOffset;
    for (let i = 1; i < LANE_COUNT; i++) {
      const ly = ROAD_TOP + (ROAD_BOT - ROAD_TOP) * i / LANE_COUNT;
      ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(W, ly); ctx.stroke();
    }
    ctx.setLineDash([]);

    // Road edges
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, ROAD_TOP); ctx.lineTo(W, ROAD_TOP); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, ROAD_BOT); ctx.lineTo(W, ROAD_BOT); ctx.stroke();

    // Trees
    for (const t of s.trees) {
      const ty = t.side === 'top' ? ROAD_TOP - 20 - t.size : ROAD_BOT + 20;
      ctx.fillStyle = '#1a4a1a';
      ctx.beginPath();
      ctx.moveTo(t.x, ty);
      ctx.lineTo(t.x - t.size * 0.6, ty + t.size);
      ctx.lineTo(t.x + t.size * 0.6, ty + t.size);
      ctx.fill();
      ctx.fillStyle = '#553311';
      ctx.fillRect(t.x - 4, ty + t.size, 8, 15);
    }

    // Obstacles
    for (const ob of s.obstacles) {
      ctx.fillStyle = ob.hit ? '#666' : ob.type.color;
      const hw = ob.type.w / 2, hh = ob.type.h / 2;
      _drawCar(ctx, ob.x, ob.y, ob.type.w, ob.type.h, ob.type.color, true);
    }

    // Player car (Fábie)
    const blink = s.invuln > 0 && Math.floor(s.t / 4) % 2;
    if (!blink) {
      _drawFabie(ctx, PLAYER_X, s.playerY);
    }

    // Nitro flames
    if (s.nitro > 0) {
      ctx.fillStyle = `hsl(${30 + Math.random() * 20}, 100%, ${50 + Math.random() * 20}%)`;
      ctx.beginPath();
      ctx.ellipse(PLAYER_X - 65, s.playerY, 20 + Math.random() * 15, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // HUD
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, 50);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px "Outfit", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`🚗 Vzdálenost: ${s.score} / ${s.goal}m`, 20, 34);
    ctx.textAlign = 'center';
    ctx.fillText('❤️'.repeat(s.lives) + '🖤'.repeat(Math.max(0, 3 - s.lives)), W / 2, 34);
    ctx.textAlign = 'right';
    const nitroBar = s.nitro > 0 ? ` 🔥 NITRO ${Math.ceil(s.nitro / 90 * 100)}%` : ' [SPACE] Nitro';
    ctx.fillText(nitroBar, W - 20, 34);

    // Progress bar
    const pct = Math.min(s.distance / s.goal, 1);
    ctx.fillStyle = '#333';
    ctx.fillRect(20, H - 30, W - 40, 12);
    ctx.fillStyle = '#22cc66';
    ctx.fillRect(20, H - 30, (W - 40) * pct, 12);
    ctx.fillStyle = '#fff';
    ctx.font = '11px "Outfit"';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.floor(pct * 100)}%`, W / 2, H - 20);

    // Controls hint
    if (s.t < 180) {
      ctx.globalAlpha = Math.max(0, 1 - s.t / 180);
      ctx.fillStyle = '#ffffff';
      ctx.font = '18px "Outfit"';
      ctx.textAlign = 'center';
      ctx.fillText('↑↓ Přepínání pruhů · SPACE Nitro boost', W / 2, H - 60);
      ctx.globalAlpha = 1;
    }
  }

  function _drawFabie(ctx, x, y) {
    // Škoda Fábie - zelená
    ctx.fillStyle = '#33aa55';
    _roundRect(ctx, x - 55, y - 22, 110, 44, 8);
    ctx.fill();
    ctx.fillStyle = '#228844';
    _roundRect(ctx, x - 30, y - 18, 55, 36, 5);
    ctx.fill();
    // Okna
    ctx.fillStyle = '#88ccff';
    ctx.fillRect(x - 25, y - 15, 22, 14);
    ctx.fillRect(x + 5, y - 15, 22, 14);
    // Kola
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(x - 35, y + 22, 10, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 35, y + 22, 10, 0, Math.PI * 2); ctx.fill();
    // Světla
    ctx.fillStyle = '#ffee44';
    ctx.fillRect(x + 50, y - 8, 6, 6);
    ctx.fillRect(x + 50, y + 2, 6, 6);
  }

  function _drawCar(ctx, x, y, w, h, color, enemy) {
    ctx.fillStyle = color;
    _roundRect(ctx, x - w/2, y - h/2, w, h, 6);
    ctx.fill();
    if (enemy) {
      ctx.fillStyle = '#222';
      ctx.fillRect(x - w/4, y - h/3, w/4, h/3);
      // Red tail lights
      ctx.fillStyle = '#ff3333';
      ctx.fillRect(x + w/2 - 5, y - 6, 5, 5);
      ctx.fillRect(x + w/2 - 5, y + 1, 5, 5);
    }
  }

  function _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  return { start, stop, active: () => active };
})();
