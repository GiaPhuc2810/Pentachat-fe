import { GAME_MODES } from './gameModes.js';

const COLORS = { mob1: '#6ee7ff', mob2: '#fda4af', mob3: '#fcd34d', asteroid: '#a78bfa', planet: '#fb923c' };

export const cosmicSentinelModule = {
  mode: GAME_MODES.COSMIC,
  getShellEyebrow() {
    return 'Cosmic Hangar';
  },
  getTitleDescription(game) {
    return game?.description || 'Prepare for launch.';
  },
  getMetricLabels() {
    return {
      score: 'Score',
      lives: 'Lives',
      destroyed: 'Destroyed',
      hits: 'Hits',
      gemsEarned: 'Gems Earned',
      walletGems: 'Wallet Gems'
    };
  },
  getStageContent() {
    return {
      title: 'Cosmic Sentinel Arena',
      description: 'Press <strong>Choi</strong> to open the shooter cockpit in the center of the screen.'
    };
  },
  getPanelContent() {
    return {
      firstTitle: 'Ship',
      secondTitle: 'Targets',
      thirdTitle: 'Obstacles',
      firstBody: 'Start a run to load ship config.',
      secondBody: 'Start a run to load target config.',
      thirdBody: 'Start a run to load obstacle config.'
    };
  },
  getSettingsMeta() {
    return {
      title: 'Control',
      primaryActionLabel: 'Fire',
      primaryActionValue: 'Auto'
    };
  },
  start(ctx, cfg) {
    this.preloadAssets(ctx, cfg);
    const canvas = document.getElementById('game-shell-canvas');
    const context = canvas.getContext('2d');
    const now = performance.now();
    const runtime = {
      mode: GAME_MODES.COSMIC,
      canvas,
      ctx: context,
      cfg,
      running: true,
      paused: false,
      submitted: false,
      score: 0,
      lives: cfg.initialLives || 3,
      destroyed: 0,
      hits: 0,
      gemsEarned: 0,
      ship: { x: canvas.width / 2, y: canvas.height - 56, width: 44, height: 54 },
      mouseX: canvas.width / 2,
      mouseY: canvas.height - 56,
      bullets: [],
      enemies: [],
      obstacles: [],
      particles: [],
      stars: createStars(canvas, ctx.getGraphicsProfile().stars),
      graphics: ctx.getGraphicsProfile(),
      backgroundGradient: null,
      lastAt: now,
      lastBullet: now,
      lastEnemy: now,
      lastObstacle: now,
      invulnerableUntil: 0,
      startedAt: now
    };
    runtime.backgroundGradient = context.createLinearGradient(0, 0, 0, canvas.height);
    runtime.backgroundGradient.addColorStop(0, '#040816');
    runtime.backgroundGradient.addColorStop(1, '#0d1731');
    canvas.onmousemove = (event) => {
      const rect = canvas.getBoundingClientRect();
      runtime.mouseX = ((event.clientX - rect.left) / rect.width) * canvas.width;
      runtime.mouseY = ((event.clientY - rect.top) / rect.height) * canvas.height;
    };
    runtime.frame = requestAnimationFrame((tick) => loop(tick, runtime, ctx));
    ctx.setRuntime(runtime);
    this.renderShipAsset(cfg);
    this.renderAssets('targets-box', cfg.targets || [], true);
    this.renderAssets('obstacles-box', cfg.obstacles || [], false);
  },
  drawIdle(ctx) {
    const canvas = document.getElementById('game-shell-canvas');
    if (!canvas) return;
    const context = canvas.getContext('2d');
    context.fillStyle = '#081122';
    context.fillRect(0, 0, canvas.width, canvas.height);
    const profile = ctx.getGraphicsProfile();
    for (let i = 0; i < profile.idleStars; i += 1) {
      drawStar(context, Math.random() * canvas.width, Math.random() * canvas.height, 1 + Math.random() * 1.8);
    }
  },
  resume(ctx, runtime) {
    runtime.lastAt = performance.now();
    runtime.frame = requestAnimationFrame((tick) => loop(tick, runtime, ctx));
  },
  onGraphicsChanged(ctx, runtime) {
    runtime.graphics = ctx.getGraphicsProfile();
    runtime.stars = createStars(runtime.canvas, runtime.graphics.stars);
  },
  cleanup(runtime) {
    if (runtime?.canvas) {
      runtime.canvas.onmousemove = null;
    }
  },
  renderAssets(id, items, isTarget) {
    const box = document.getElementById(id);
    if (!box) return;
    box.innerHTML = items.map((item) => `
      <div class="asset-row">
        <div class="asset-preview">${renderAssetPreview(item, isTarget)}</div>
        <div>
          <div class="fw-semibold">${item.name}</div>
          <div class="small text-muted">${isTarget ? `${item.points} points • HP ${item.health} • Spawn ${item.spawnWeight}` : `Damage ${item.damage}`}</div>
          <div class="tiny text-muted">${isTarget ? `iconUrl: ${item.iconUrl || '(add icon URL in backend)'}` : `asset: ${item.imageUrl || item.iconUrl || '(add image/icon URL in backend)'}`}</div>
        </div>
      </div>
    `).join('');
  },
  renderShipAsset(cfg) {
    const box = document.getElementById('ship-box');
    if (!box) return;
    const shipAssetUrl = cfg.shipAssetUrl || '';
    box.innerHTML = `
      <div class="asset-row">
        <div class="asset-preview">${shipAssetUrl ? `<img src="${shipAssetUrl}" alt="Ship" class="asset-preview-image" />` : 'SHIP'}</div>
        <div>
          <div class="fw-semibold">Player ship</div>
          <div class="small text-muted">Free movement in the whole arena</div>
          <div class="tiny text-muted">asset: ${shipAssetUrl || '(add ship asset in backend config)'}</div>
        </div>
      </div>
    `;
  },
  preloadAssets(ctx, cfg) {
    const urls = [
      cfg.shipAssetUrl,
      ...(cfg.targets || []).map((item) => item.iconUrl).filter(Boolean),
      ...(cfg.obstacles || []).flatMap((item) => [item.imageUrl, item.iconUrl]).filter(Boolean)
    ];
    urls.forEach((url) => {
      if (!url || ctx.assetCache.has(url)) return;
      const image = new Image();
      ctx.assetCache.set(url, { status: 'loading', image });
      image.onload = () => ctx.assetCache.set(url, { status: 'loaded', image });
      image.onerror = () => ctx.assetCache.set(url, { status: 'error', image: null });
      image.src = url;
    });
  }
};

function loop(now, runtime, ctx) {
  if (!runtime.running || runtime.paused) return;
  const dt = (now - runtime.lastAt) / 1000;
  runtime.lastAt = now;
  moveShip(runtime);
  updateStars(runtime, dt);
  if (now - runtime.lastBullet >= (runtime.cfg.bulletIntervalMs || 180)) fire(runtime, now);
  if (now - runtime.lastEnemy >= (runtime.cfg.targetSpawnIntervalMs || 700)) spawnEnemy(runtime, now);
  if (now - runtime.lastObstacle >= (runtime.cfg.obstacleSpawnIntervalMs || 1800)) spawnObstacle(runtime, now);
  updateObjects(runtime, dt);
  collide(runtime, now, ctx);
  draw(runtime, ctx);
  ctx.syncMetrics();
  if (runtime.lives <= 0) {
    ctx.stopGame(false);
    return;
  }
  runtime.frame = requestAnimationFrame((tick) => loop(tick, runtime, ctx));
}

function moveShip(runtime) {
  runtime.ship.x += (runtime.mouseX - runtime.ship.x) * 0.18;
  runtime.ship.y += (runtime.mouseY - runtime.ship.y) * 0.18;
  runtime.ship.x = clamp(runtime.ship.x, 22, runtime.canvas.width - 22);
  runtime.ship.y = clamp(runtime.ship.y, 27, runtime.canvas.height - 27);
}

function updateStars(runtime, dt) {
  runtime.stars.forEach((star) => {
    star.y += star.v * dt;
    if (star.y > runtime.canvas.height) {
      star.y = -2;
      star.x = Math.random() * runtime.canvas.width;
    }
  });
}

function fire(runtime, now) {
  runtime.lastBullet = now;
  runtime.bullets.push({ x: runtime.ship.x, y: runtime.ship.y - 25, width: 6, height: 18, speed: 700 });
}

function spawnEnemy(runtime, now) {
  runtime.lastEnemy = now;
  const defs = runtime.cfg.targets || [];
  const def = pickWeightedTarget(defs);
  if (!def) return;
  const size = Math.round(34 * (def.sizeMultiplier || 1));
  runtime.enemies.push({
    x: 40 + Math.random() * 820,
    y: -24,
    width: size,
    height: size,
    speed: 130 + Math.random() * 80,
    points: def.points,
    label: def.name,
    code: def.code,
    health: def.health || 1,
    maxHealth: def.health || 1,
    imageKey: def.iconUrl || ''
  });
}

function spawnObstacle(runtime, now) {
  runtime.lastObstacle = now;
  const defs = runtime.cfg.obstacles || [];
  const def = defs[Math.floor(Math.random() * defs.length)];
  if (!def) return;
  runtime.obstacles.push({
    x: 50 + Math.random() * 800,
    y: -40,
    width: def.code === 'planet' ? 64 : 46,
    height: def.code === 'planet' ? 64 : 46,
    speed: def.code === 'planet' ? 120 : 180,
    damage: def.damage || 1,
    code: def.code,
    imageKey: def.imageUrl || def.iconUrl || ''
  });
}

function updateObjects(runtime, dt) {
  runtime.bullets.forEach((bullet) => { bullet.y -= bullet.speed * dt; });
  runtime.enemies.forEach((enemy) => { enemy.y += enemy.speed * dt; });
  runtime.obstacles.forEach((obstacle) => {
    obstacle.y += obstacle.speed * dt;
    obstacle.x += Math.sin(obstacle.y / 35) * dt * (obstacle.code === 'planet' ? 45 : 70);
  });
  runtime.particles.forEach((particle) => {
    particle.y += particle.vy * dt;
    particle.x += particle.vx * dt;
    particle.life -= dt;
  });
  runtime.bullets = runtime.bullets.filter((bullet) => bullet.y > -30);
  runtime.enemies = runtime.enemies.filter((enemy) => enemy.y < runtime.canvas.height + 40);
  runtime.obstacles = runtime.obstacles.filter((obstacle) => obstacle.y < runtime.canvas.height + 70);
  runtime.particles = runtime.particles.filter((particle) => particle.life > 0);
}

function collide(runtime, now, ctx) {
  for (let i = runtime.bullets.length - 1; i >= 0; i -= 1) {
    for (let j = runtime.enemies.length - 1; j >= 0; j -= 1) {
      if (hit(runtime.bullets[i], runtime.enemies[j])) {
        runtime.bullets.splice(i, 1);
        runtime.enemies[j].health -= 1;
        spawnBurst(runtime, runtime.enemies[j].x, runtime.enemies[j].y, COLORS[runtime.enemies[j].code] || '#fff', runtime.graphics.hitBurst, ctx.getGraphicsProfile());
        if (runtime.enemies[j].health <= 0) {
          runtime.score += runtime.enemies[j].points;
          runtime.destroyed += 1;
          runtime.gemsEarned = Math.floor(runtime.score / (runtime.cfg.gemThresholdScore || 1000));
          spawnBurst(runtime, runtime.enemies[j].x, runtime.enemies[j].y, COLORS[runtime.enemies[j].code] || '#fff', runtime.graphics.killBurst, ctx.getGraphicsProfile());
          runtime.enemies.splice(j, 1);
        }
        break;
      }
    }
  }
  if (now < runtime.invulnerableUntil) return;
  for (let i = runtime.enemies.length - 1; i >= 0; i -= 1) {
    if (hit(runtime.ship, runtime.enemies[i])) {
      runtime.hits += 1;
      runtime.lives -= 1;
      runtime.invulnerableUntil = now + 1200;
      spawnBurst(runtime, runtime.enemies[i].x, runtime.enemies[i].y, COLORS[runtime.enemies[i].code] || '#fff', runtime.graphics.obstacleBurst, ctx.getGraphicsProfile());
      runtime.enemies.splice(i, 1);
      break;
    }
  }
  if (now < runtime.invulnerableUntil) return;
  for (let i = runtime.obstacles.length - 1; i >= 0; i -= 1) {
    if (hit(runtime.ship, runtime.obstacles[i])) {
      runtime.hits += 1;
      runtime.lives -= runtime.obstacles[i].damage;
      runtime.invulnerableUntil = now + 1200;
      spawnBurst(runtime, runtime.obstacles[i].x, runtime.obstacles[i].y, COLORS[runtime.obstacles[i].code] || '#fff', runtime.graphics.obstacleBurst, ctx.getGraphicsProfile());
      runtime.obstacles.splice(i, 1);
      break;
    }
  }
}

function draw(runtime, ctx) {
  const { ctx: context, canvas } = runtime;
  context.fillStyle = runtime.backgroundGradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  runtime.stars.forEach((star) => drawStar(context, star.x, star.y, star.s));
  runtime.bullets.forEach((bullet) => { context.fillStyle = '#7af8ff'; context.fillRect(bullet.x - 3, bullet.y - 9, 6, 18); });
  runtime.enemies.forEach((enemy) => drawEntity(runtime, enemy, COLORS[enemy.code] || '#6ee7ff', enemy.code.slice(-1), ctx.assetCache));
  runtime.obstacles.forEach((obstacle) => drawEntity(runtime, obstacle, COLORS[obstacle.code] || '#ddd', obstacle.code === 'planet' ? 'P' : 'A', ctx.assetCache));
  runtime.particles.forEach((particle) => {
    context.globalAlpha = Math.max(0, particle.life);
    context.fillStyle = particle.color;
    if (runtime.graphics.shadowBlur > 0) {
      context.shadowBlur = runtime.graphics.shadowBlur;
      context.shadowColor = particle.color;
    }
    context.beginPath();
    context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;
    context.globalAlpha = 1;
  });
  const flicker = performance.now() < runtime.invulnerableUntil && Math.floor(performance.now() / 90) % 2 === 0;
  if (!flicker) drawShip(runtime, ctx.assetCache);
}

function drawEntity(runtime, entity, color, label, assetCache) {
  const loadedImage = entity.imageKey ? assetCache.get(entity.imageKey) : null;
  if (loadedImage?.status === 'loaded') {
    runtime.ctx.drawImage(loadedImage.image, entity.x - entity.width / 2, entity.y - entity.height / 2, entity.width, entity.height);
    if (typeof entity.health === 'number' && entity.maxHealth > 1) drawHealthBar(runtime, entity);
    return;
  }
  drawFallbackCircle(runtime, entity.x, entity.y, entity.width / 2, color, label);
  if (typeof entity.health === 'number' && entity.maxHealth > 1) drawHealthBar(runtime, entity);
}

function drawFallbackCircle(runtime, x, y, radius, color, label) {
  runtime.ctx.fillStyle = color;
  runtime.ctx.beginPath();
  runtime.ctx.arc(x, y, radius, 0, Math.PI * 2);
  runtime.ctx.fill();
  runtime.ctx.fillStyle = '#07111f';
  runtime.ctx.font = 'bold 14px sans-serif';
  runtime.ctx.textAlign = 'center';
  runtime.ctx.fillText(label, x, y + 4);
}

function drawHealthBar(runtime, entity) {
  const barWidth = entity.width;
  const x = entity.x - barWidth / 2;
  const y = entity.y - entity.height / 2 - 10;
  const ratio = clamp(entity.health / entity.maxHealth, 0, 1);
  runtime.ctx.fillStyle = 'rgba(3, 9, 20, 0.65)';
  runtime.ctx.fillRect(x, y, barWidth, 5);
  runtime.ctx.fillStyle = ratio > 0.5 ? '#4ade80' : ratio > 0.25 ? '#facc15' : '#fb7185';
  runtime.ctx.fillRect(x, y, barWidth * ratio, 5);
}

function drawShip(runtime, assetCache) {
  const { ctx, ship } = runtime;
  const loadedImage = runtime.cfg.shipAssetUrl ? assetCache.get(runtime.cfg.shipAssetUrl) : null;
  const bobOffset = Math.sin(performance.now() / 120) * 3;
  const tilt = clamp((runtime.mouseX - ship.x) / 100, -0.35, 0.35);
  ctx.save();
  ctx.translate(ship.x, ship.y + bobOffset);
  ctx.rotate(tilt);
  const flameHeight = 14 + Math.sin(performance.now() / 70) * 4;
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.moveTo(-6, ship.height / 3);
  ctx.lineTo(0, ship.height / 3 + flameHeight);
  ctx.lineTo(6, ship.height / 3);
  ctx.closePath();
  ctx.fill();
  if (loadedImage?.status === 'loaded') {
    ctx.drawImage(loadedImage.image, -ship.width / 2, -ship.height / 2, ship.width, ship.height);
  } else {
    ctx.fillStyle = '#81f0ff';
    ctx.beginPath();
    ctx.moveTo(0, -ship.height / 2);
    ctx.lineTo(ship.width / 2, ship.height / 2);
    ctx.lineTo(0, ship.height / 4);
    ctx.lineTo(-ship.width / 2, ship.height / 2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function createStars(canvas, count) {
  return Array.from({ length: count }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    s: 1 + Math.random() * 1.8,
    v: 18 + Math.random() * 30
  }));
}

function drawStar(ctx, x, y, radius) {
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function renderAssetPreview(item, isTarget) {
  const assetUrl = isTarget ? (item.iconUrl || '') : (item.imageUrl || item.iconUrl || '');
  if (assetUrl) {
    return `<img src="${assetUrl}" alt="${item.name}" class="asset-preview-image" />`;
  }
  return (item.code || '?').toUpperCase();
}

function spawnBurst(runtime, x, y, color, count, profile) {
  for (let i = 0; i < count; i += 1) {
    runtime.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * profile.particleVelocity,
      vy: (Math.random() - 0.5) * profile.particleVelocity,
      size: profile.particleSizeMin + Math.random() * profile.particleSizeRange,
      color,
      life: profile.particleLifeMin + Math.random() * profile.particleLifeRange
    });
  }
}

function pickWeightedTarget(defs) {
  if (!defs.length) return null;
  const total = defs.reduce((sum, item) => sum + (item.spawnWeight || 1), 0);
  let cursor = Math.random() * total;
  for (const item of defs) {
    cursor -= item.spawnWeight || 1;
    if (cursor <= 0) return item;
  }
  return defs[defs.length - 1];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hit(left, right) {
  return Math.abs(left.x - right.x) * 2 < (left.width + right.width)
    && Math.abs(left.y - right.y) * 2 < (left.height + right.height);
}
