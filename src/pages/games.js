import { renderNavbar, initNavbar } from '../components/navbar.js';
import { renderSidebar, initSidebar, addSidebarStyles } from '../components/sidebar.js';
import GameService from '../services/game.service.js';
import WalletService from '../services/wallet.service.js';
import AuthService from '../services/auth.service.js';
import FriendService from '../services/friend.service.js';
import websocketService from '../services/websocket.service.js';
import router from '../router.js';
import { GAME_MODES, resolveGameMode, badge } from './games/gameModes.js';
import { cosmicSentinelModule } from './games/cosmicSentinel.js';
import { pokerRoyaleModule } from './games/pokerRoyale.js';
import { caroArenaModule } from './games/caroArena.js';

let games = [];
let selectedGameId = null;
let leaderboard = [];
let runtime = null;
let walletGems = 0;
const assetCache = new Map();
const colors = { mob1: '#6ee7ff', mob2: '#fda4af', mob3: '#fcd34d', asteroid: '#a78bfa', planet: '#fb923c' };
const GRAPHICS_STORAGE_KEY = 'pentachat.graphics.quality';
const POKER_CHIP_BANK_KEY = 'pentachat.poker.chips';
const graphicsProfiles = {
  low: { label: 'Low', stars: 24, idleStars: 18, hitBurst: 2, killBurst: 5, obstacleBurst: 5, particleVelocity: 115, particleSizeMin: 1.2, particleSizeRange: 1.4, particleLifeMin: 0.22, particleLifeRange: 0.12, shadowBlur: 0 },
  medium: { label: 'Medium', stars: 48, idleStars: 42, hitBurst: 3, killBurst: 8, obstacleBurst: 8, particleVelocity: 150, particleSizeMin: 1.5, particleSizeRange: 2.2, particleLifeMin: 0.35, particleLifeRange: 0.2, shadowBlur: 10 },
  high: { label: 'High', stars: 72, idleStars: 64, hitBurst: 5, killBurst: 12, obstacleBurst: 12, particleVelocity: 190, particleSizeMin: 1.8, particleSizeRange: 2.8, particleLifeMin: 0.45, particleLifeRange: 0.28, shadowBlur: 16 }
};
let currentGraphicsQuality = localStorage.getItem(GRAPHICS_STORAGE_KEY) || 'medium';
let pokerSetup = { totalPlayers: 4, botCount: 3 };
let pokerChipBank = Number(localStorage.getItem(POKER_CHIP_BANK_KEY) || 100);
let pokerFriends = [];
let pokerPendingInvites = [];
let pokerRoom = null;
let pokerLobbyBotCount = 0;
let pokerInviteTopic = null;
let pokerRoomTopic = null;
let caroSetup = { difficulty: 'normal' };
let pointWallet = { totalPoints: 0, availablePoints: 0, totalGemsConverted: 0, exchangeThreshold: 1000 };
const gameModules = {
  [GAME_MODES.COSMIC]: cosmicSentinelModule,
  [GAME_MODES.POKER]: pokerRoyaleModule,
  [GAME_MODES.CARO]: caroArenaModule
};

export async function renderGames() {
  const app = document.getElementById('app');
  if (!AuthService.getSession()) {
    router.navigate('/login');
    return;
  }

  stopRuntimeInternal({ submit: false, returnToTitle: false, closeShell: true });
  addSidebarStyles();
  app.innerHTML = `
    ${renderNavbar()}${renderSidebar()}
    <div class="main-content">
      <button class="btn btn-outline-primary d-lg-none mb-3" id="mobile-menu-btn"><i class="bi bi-list"></i> Menu</button>
      <div class="d-flex justify-content-between align-items-end flex-wrap gap-3 mb-4">
        <div>
          <h2 class="mb-1"><i class="bi bi-rocket-takeoff me-2"></i>Game Center</h2>
          <p class="text-muted mb-0">Space shooter with start game, submit score, and leaderboard by identity.</p>
        </div>
        <div class="badge text-bg-light border">Pilot: ${AuthService.getSession().username}</div>
      </div>
      <div id="alert-container"></div>
      <div class="row g-4">
        <div class="col-xl-4">
          <div class="card h-100"><div class="card-body">
            <h5 class="mb-3">Games</h5>
            <div id="games-list" class="game-list"><div class="text-muted small">Loading games...</div></div>
          </div></div>
        </div>
        <div class="col-xl-8">
          <div class="card mb-4"><div class="card-body">
            <div class="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-3">
              <div>
                <div class="text-muted text-uppercase small">Selected</div>
                <h3 id="game-name" class="mb-1">Choose a game</h3>
                <p id="game-desc" class="text-muted mb-0">Game details will appear here.</p>
              </div>
              <div class="d-flex gap-2">
                <button id="start-btn" class="btn btn-primary" disabled><i class="bi bi-play-fill me-2"></i>Choi</button>
                <button id="stop-btn" class="btn btn-outline-secondary" disabled><i class="bi bi-stop-fill me-2"></i>Stop</button>
              </div>
            </div>
            <div class="row g-3 mb-3">
              <div class="col-6 col-lg"><div class="metric"><span id="score-label">Score</span><strong id="score-value">0</strong></div></div>
              <div class="col-6 col-lg"><div class="metric"><span id="lives-label">Lives</span><strong id="lives-value">3</strong></div></div>
              <div class="col-6 col-lg"><div class="metric"><span id="destroyed-label">Destroyed</span><strong id="destroyed-value">0</strong></div></div>
              <div class="col-6 col-lg"><div class="metric"><span id="hits-label">Hits</span><strong id="hits-value">0</strong></div></div>
              <div class="col-6 col-lg"><div class="metric"><span id="gems-earned-label">Gems Earned</span><strong id="gems-earned-value">0</strong></div></div>
              <div class="col-6 col-lg"><div class="metric"><span id="wallet-gems-label">Wallet Gems</span><strong id="wallet-gems-value">0</strong></div></div>
            </div>
            <div class="stage-wrap mb-3">
              <div class="stage-placeholder">
                <h5 id="stage-placeholder-title" class="mb-2">Gameplay Window</h5>
                <p id="stage-placeholder-desc" class="text-muted mb-0">Press <strong>Choi</strong> to open the centered game screen.</p>
              </div>
            </div>
            <div class="row g-3">
              <div class="col-lg-4"><div class="subcard"><h6 id="ship-box-title">Ship</h6><div id="ship-box" class="asset-list text-muted small">Start a run to load ship config.</div></div></div>
              <div class="col-lg-4"><div class="subcard"><h6 id="targets-box-title">Targets</h6><div id="targets-box" class="asset-list text-muted small">Start a run to load target config.</div></div></div>
              <div class="col-lg-4"><div class="subcard"><h6 id="obstacles-box-title">Obstacles</h6><div id="obstacles-box" class="asset-list text-muted small">Start a run to load obstacle config.</div></div></div>
            </div>
          </div></div>
          <div class="card"><div class="card-body">
            <h5 class="mb-3">Leaderboard</h5>
            <div id="leaderboard-box" class="text-muted small">Choose a game to load leaderboard.</div>
          </div></div>
        </div>
      </div>
    </div>
    <div id="game-shell" class="game-shell-backdrop" style="display:none;">
      <div class="game-shell-panel">
        <div class="game-shell-stage">
          <div class="game-hud" id="game-hud">
            <div class="game-hud__chip">Score: <strong id="hud-score">0</strong></div>
            <div class="game-hud__chip">Time: <strong id="hud-time">00:00</strong></div>
            <div class="game-hud__chip game-hud__chip--lives"><span class="game-hud__icon">❤</span><strong id="hud-lives">3</strong></div>
          </div>
          <canvas id="game-shell-canvas" width="960" height="540"></canvas>
          <div id="game-shell-content" class="game-shell-content" style="display:none;"></div>
          <div id="game-shell-overlay" class="game-shell-overlay">
            <div id="game-shell-menu" class="game-shell-menu"></div>
          </div>
        </div>
      </div>
    </div>
  `;
  initNavbar();
  initSidebar();
  injectStyles();
  drawIdle();
  document.getElementById('start-btn').addEventListener('click', openGameShell);
  document.getElementById('stop-btn').addEventListener('click', () => exitGameplayToTitle(true));
  document.getElementById('game-shell').addEventListener('click', (event) => {
    if (event.target.id === 'game-shell' && !runtime?.running && !runtime?.paused) {
      closeGameShell();
    }
  });
  window.removeEventListener('keydown', handleGameKeydown);
  window.addEventListener('keydown', handleGameKeydown);
  await loadWalletGems();
  await loadGames();
}

async function loadPointWallet() {
  const session = AuthService.getSession();
  if (!session) return;
  try {
    const response = await GameService.getPointWallet(session.userId);
    pointWallet = response?.data || pointWallet;
  } catch {
    pointWallet = { totalPoints: 0, availablePoints: 0, totalGemsConverted: 0, exchangeThreshold: 1000 };
  }
}

async function loadGames() {
  try {
    const res = await GameService.getGameList();
    games = res.data || [];
    renderGamesList();
    const preferred = games.find((g) => g.name?.toLowerCase().includes('cosmic')) || games[0];
    if (preferred) await selectGame(preferred.id);
  } catch (error) {
    showAlert(error.message || 'Cannot load games.', 'danger');
  }
}

async function loadWalletGems() {
  try {
    const session = AuthService.getSession();
    const res = await WalletService.getBalance(session.userId);
    walletGems = res?.data?.balance || 0;
  } catch {
    walletGems = 0;
  }
  const walletElement = document.getElementById('wallet-gems-value');
  if (walletElement) {
    walletElement.textContent = formatGemValue(walletGems);
  }
}

function renderGamesList() {
  const box = document.getElementById('games-list');
  box.innerHTML = games.map((game) => `
    <button class="game-item ${game.id === selectedGameId ? 'active' : ''}" data-game-id="${game.id}">
      <div class="badge-icon">${badge(game.name)}</div>
      <div><div class="fw-semibold">${game.name}</div><div class="small text-muted">${game.description || 'No description yet.'}</div></div>
    </button>
  `).join('') || '<div class="text-muted small">No games yet.</div>';
  box.querySelectorAll('[data-game-id]').forEach((el) => el.addEventListener('click', async () => selectGame(Number(el.dataset.gameId))));
}

async function selectGame(gameId) {
  selectedGameId = gameId;
  stopRuntimeInternal({ submit: false, returnToTitle: false, closeShell: true });
  resetMetrics();
  closeGameShell();
  renderGamesList();
  const game = games.find((item) => item.id === gameId);
  document.getElementById('game-name').textContent = game?.name || 'Unknown game';
  document.getElementById('game-desc').textContent = game?.description || 'No description yet.';
  document.getElementById('start-btn').disabled = !game;
  document.getElementById('stop-btn').disabled = true;
  if (resolveGameMode(game) === GAME_MODES.CARO) {
    await loadPointWallet();
  }
  updateSelectedGamePanels(game);
  await loadLeaderboard(gameId);
}

function openGameShell() {
  if (!selectedGameId) return;
  const game = getSelectedGame();
  const gameModule = getGameModule(game);
  if (!game) return;
  document.getElementById('game-shell').style.display = 'flex';
  setShellSurface(resolveGameMode(game));
  showGameShellMenu('title');
  gameModule?.drawIdle?.(createGameRuntimeContext());
}

function closeGameShell() {
  const shell = document.getElementById('game-shell');
  if (shell) {
    shell.style.display = 'none';
  }
}

function getGraphicsProfile() {
  return graphicsProfiles[currentGraphicsQuality] || graphicsProfiles.medium;
}

function getSelectedGame() {
  return games.find((item) => item.id === selectedGameId) || null;
}

function getGameModule(game = getSelectedGame()) {
  return gameModules[resolveGameMode(game)] || null;
}

function createGameRuntimeContext() {
  return {
    assetCache,
    getGraphicsProfile,
    getPokerSetup: () => pokerSetup,
    getCaroSetup: () => caroSetup,
    getPokerChipBank: () => pokerChipBank,
    getPokerRoom: () => pokerRoom,
    getPointWallet: () => pointWallet,
    setPokerChipBank: (value) => {
      pokerChipBank = Math.max(0, Math.floor(Number(value) || 0));
      localStorage.setItem(POKER_CHIP_BANK_KEY, String(pokerChipBank));
      updateSelectedGamePanels();
    },
    refreshPointWallet: async () => {
      await loadPointWallet();
      updateSelectedGamePanels();
    },
    refreshWalletGems: loadWalletGems,
    setRuntime: (value) => { runtime = value; },
    syncMetrics,
    stopGame: (manual) => stopRuntime(manual),
    exitGameplayToTitle,
    onGraphicsChanged: (activeRuntime = runtime) => {
      const module = gameModules[activeRuntime?.mode];
      module?.onGraphicsChanged?.(createGameRuntimeContext(), activeRuntime);
    }
  };
}

function createStars(canvas, count) {
  return Array.from({ length: count }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    s: 1 + Math.random() * 1.8,
    v: 18 + Math.random() * 30
  }));
}

function applyGraphicsQuality(nextQuality) {
  if (!graphicsProfiles[nextQuality]) return;
  currentGraphicsQuality = nextQuality;
  localStorage.setItem(GRAPHICS_STORAGE_KEY, nextQuality);

  if (runtime) {
    createGameRuntimeContext().onGraphicsChanged(runtime);
  }

  if (!runtime?.running) {
    drawIdle();
  }
}

function setShellSurface(mode) {
  const canvas = document.getElementById('game-shell-canvas');
  const content = document.getElementById('game-shell-content');
  const hud = document.getElementById('game-hud');
  const livesChip = document.querySelector('.game-hud__chip--lives');
  if (!canvas || !content || !hud) return;

  const isCosmic = mode === 'cosmic' || mode === 'title';
  const isContentMode = mode === 'poker' || mode === 'caro';

  canvas.style.display = isCosmic ? 'block' : 'none';
  content.style.display = isContentMode ? 'block' : 'none';
  hud.style.display = mode === 'coming_soon' ? 'none' : 'flex';
  if (livesChip) {
    livesChip.style.display = mode === 'cosmic' ? 'flex' : 'none';
  }

  if (!isContentMode) {
    content.innerHTML = '';
  }
}

function updateSelectedGamePanels(game = getSelectedGame()) {
  const mode = resolveGameMode(game);
  const gameModule = getGameModule(game);
  const stageTitle = document.getElementById('stage-placeholder-title');
  const stageDesc = document.getElementById('stage-placeholder-desc');
  const box1Title = document.getElementById('ship-box-title');
  const box2Title = document.getElementById('targets-box-title');
  const box3Title = document.getElementById('obstacles-box-title');
  const box1 = document.getElementById('ship-box');
  const box2 = document.getElementById('targets-box');
  const box3 = document.getElementById('obstacles-box');
  const scoreLabel = document.getElementById('score-label');
  const livesLabel = document.getElementById('lives-label');
  const destroyedLabel = document.getElementById('destroyed-label');
  const hitsLabel = document.getElementById('hits-label');
  const gemsEarnedLabel = document.getElementById('gems-earned-label');
  const walletGemsLabel = document.getElementById('wallet-gems-label');

  if (!stageTitle || !stageDesc || !box1Title || !box2Title || !box3Title || !box1 || !box2 || !box3) return;

  if (gameModule) {
    const metricLabels = gameModule.getMetricLabels();
    const stageContent = gameModule.getStageContent();
    const panelContent = gameMode === GAME_MODES.POKER
      ? gameModule.getPanelContent(pokerSetup)
      : gameMode === GAME_MODES.CARO
        ? gameModule.getPanelContent(caroSetup, pointWallet)
        : gameModule.getPanelContent();

    scoreLabel.textContent = metricLabels.score;
    livesLabel.textContent = metricLabels.lives;
    destroyedLabel.textContent = metricLabels.destroyed;
    hitsLabel.textContent = metricLabels.hits;
    gemsEarnedLabel.textContent = metricLabels.gemsEarned;
    walletGemsLabel.textContent = metricLabels.walletGems;
    stageTitle.textContent = stageContent.title;
    stageDesc.innerHTML = stageContent.description;
    box1Title.textContent = panelContent.firstTitle;
    box2Title.textContent = panelContent.secondTitle;
    box3Title.textContent = panelContent.thirdTitle;
    box1.innerHTML = panelContent.firstBody;
    box2.innerHTML = panelContent.secondBody;
    box3.innerHTML = panelContent.thirdBody;
    return;
  }

  scoreLabel.textContent = 'Score';
  livesLabel.textContent = 'Status';
  destroyedLabel.textContent = 'Progress';
  hitsLabel.textContent = 'Queue';
  gemsEarnedLabel.textContent = 'Gems Earned';
  walletGemsLabel.textContent = 'Wallet Gems';
  stageTitle.textContent = 'Coming Soon';
  stageDesc.innerHTML = 'This game is listed in the center, but its playable frontend is not ready yet.';
  box1Title.textContent = 'Status';
  box2Title.textContent = 'Features';
  box3Title.textContent = 'Availability';
  box1.innerHTML = '<div class="small text-muted">This title is not wired into the playable shell yet.</div>';
  box2.innerHTML = '<div class="small text-muted">Game-specific screens will be added later.</div>';
  box3.innerHTML = '<div class="small text-muted">For now only Cosmic Sentinel and Poker Royale are playable.</div>';
}

function showGameShellMenu(mode) {
  const game = getSelectedGame();
  const gameMode = resolveGameMode(game);
  const gameModule = getGameModule(game);
  const menu = document.getElementById('game-shell-menu');
  const overlay = document.getElementById('game-shell-overlay');
  if (!menu || !overlay) return;

  overlay.style.display = 'flex';

  if (mode === 'title') {
    menu.innerHTML = `
      <div class="game-shell-menu__eyebrow">${gameModule?.getShellEyebrow() || 'Game Hub'}</div>
      <h2 class="mb-2">${game?.name || 'Game'}</h2>
      <p class="text-muted mb-4">${gameMode === GAME_MODES.COMING_SOON ? 'This game is listed, but its playable screen has not been built yet.' : (gameModule?.getTitleDescription(game) || game?.description || 'Prepare for launch.')}</p>
      ${gameMode === GAME_MODES.POKER ? `<div class="game-shell-balance-row"><span>Gem: <strong>${formatGemValue(walletGems)}</strong></span><span>Xu Poker: <strong>${pokerChipBank}</strong></span></div>` : ''}
      ${gameMode === GAME_MODES.CARO ? `<div class="game-shell-balance-row"><span>Gem: <strong>${formatGemValue(walletGems)}</strong></span><span>Diem Caro: <strong>${pointWallet.availablePoints || 0}</strong></span></div>` : ''}
      <div class="game-shell-menu__actions">
        <button class="btn btn-primary" id="shell-start-btn">${gameMode === GAME_MODES.COMING_SOON ? 'Preview' : 'Start'}</button>
        <button class="btn btn-outline-light" id="shell-settings-btn">Setting</button>
        ${gameMode === GAME_MODES.POKER ? '<button class="btn btn-outline-info" id="shell-friends-btn">Choi voi ban</button>' : ''}
        ${gameMode === GAME_MODES.POKER ? '<button class="btn btn-outline-warning" id="shell-exchange-btn">Doi Gem/Xu</button>' : ''}
        ${gameMode === GAME_MODES.CARO ? '<button class="btn btn-outline-warning" id="shell-point-exchange-btn">Doi diem/Gem</button>' : ''}
        <button class="btn btn-outline-light" id="shell-leaderboard-btn">Leaderboard</button>
        <button class="btn btn-outline-danger" id="shell-quit-btn">Quit</button>
      </div>
    `;
    document.getElementById('shell-start-btn').addEventListener('click', startGame);
    document.getElementById('shell-settings-btn').addEventListener('click', () => showGameShellMenu('settings'));
    document.getElementById('shell-friends-btn')?.addEventListener('click', openPokerFriendsMenu);
    document.getElementById('shell-exchange-btn')?.addEventListener('click', () => showGameShellMenu('exchange'));
    document.getElementById('shell-point-exchange-btn')?.addEventListener('click', () => showGameShellMenu('point-exchange'));
    document.getElementById('shell-leaderboard-btn').addEventListener('click', () => showGameShellMenu('leaderboard'));
    document.getElementById('shell-quit-btn').addEventListener('click', closeGameShell);
    return;
  }

  if (mode === 'pause') {
    menu.innerHTML = `
      <div class="game-shell-menu__eyebrow">Paused</div>
      <h2 class="mb-2">Game Menu</h2>
      <p class="text-muted mb-4">Nhan Esc de mo menu trong luc choi.</p>
      <div class="game-shell-menu__actions">
        <button class="btn btn-primary" id="shell-continue-btn">Tiep tuc</button>
        <button class="btn btn-outline-light" id="shell-settings-btn">Cai dat</button>
        <button class="btn btn-outline-danger" id="shell-exit-btn">Thoat game</button>
      </div>
    `;
    document.getElementById('shell-continue-btn').addEventListener('click', resumeGameplay);
    document.getElementById('shell-settings-btn').addEventListener('click', () => showGameShellMenu('settings'));
    document.getElementById('shell-exit-btn').addEventListener('click', () => exitGameplayToTitle(false));
    return;
  }

  if (mode === 'settings') {
    const settingsMeta = gameMode === GAME_MODES.CARO
      ? (gameModule?.getSettingsMeta(caroSetup) || { title: 'Control', primaryActionLabel: 'Mode', primaryActionValue: 'Standard' })
      : (gameModule?.getSettingsMeta() || { title: 'Control', primaryActionLabel: 'Mode', primaryActionValue: 'Standard' });
    menu.innerHTML = `
      <div class="game-shell-menu__eyebrow">Setting</div>
      <h2 class="mb-2">${settingsMeta.title}</h2>
      <div class="game-shell-settings">
        <div class="game-shell-setting-row"><span>Move</span><strong>Mouse</strong></div>
        <div class="game-shell-setting-row"><span>Pause</span><strong>Esc</strong></div>
        <div class="game-shell-setting-row"><span>${settingsMeta.primaryActionLabel}</span><strong>${settingsMeta.primaryActionValue}</strong></div>
        <div class="game-shell-setting-row game-shell-setting-row--stack">
          <span>Graphics</span>
          <div class="graphics-pills" id="graphics-pills">
            ${Object.entries(graphicsProfiles).map(([key, profile]) => `
              <button type="button" class="graphics-pill ${currentGraphicsQuality === key ? 'is-active' : ''}" data-graphics-quality="${key}">
                ${profile.label}
              </button>
            `).join('')}
          </div>
        </div>
        ${gameMode === GAME_MODES.POKER ? `
          <div class="game-shell-setting-row game-shell-setting-row--stack">
            <span>Seats</span>
            <div class="graphics-pills">
              ${[2, 3, 4].map((count) => `
                <button type="button" class="graphics-pill ${pokerSetup.totalPlayers === count ? 'is-active' : ''}" data-poker-seats="${count}">
                  ${count} seats
                </button>
              `).join('')}
            </div>
          </div>
          <div class="game-shell-setting-row game-shell-setting-row--stack">
            <span>Bots</span>
            <div class="graphics-pills">
              ${Array.from({ length: pokerSetup.totalPlayers }, (_, index) => index).map((count) => `
                <button type="button" class="graphics-pill ${pokerSetup.botCount === count ? 'is-active' : ''}" data-poker-bots="${count}">
                  ${count} bot
                </button>
              `).join('')}
            </div>
          </div>
        ` : ''}
        ${gameMode === GAME_MODES.CARO ? `
          <div class="game-shell-setting-row game-shell-setting-row--stack">
            <span>Do kho</span>
            <div class="graphics-pills">
              ${[
                ['easy', 'De'],
                ['normal', 'Binh thuong'],
                ['hard', 'Kho']
              ].map(([key, label]) => `
                <button type="button" class="graphics-pill ${caroSetup.difficulty === key ? 'is-active' : ''}" data-caro-difficulty="${key}">
                  ${label}
                </button>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
      <div class="game-shell-menu__actions mt-4">
        <button class="btn btn-outline-light" id="shell-back-btn">Quay lai</button>
      </div>
    `;
    document.querySelectorAll('[data-graphics-quality]').forEach((button) => {
      button.addEventListener('click', () => {
        applyGraphicsQuality(button.dataset.graphicsQuality);
        showGameShellMenu('settings');
      });
    });
    document.querySelectorAll('[data-poker-seats]').forEach((button) => {
      button.addEventListener('click', () => {
        pokerSetup.totalPlayers = Number(button.dataset.pokerSeats);
        pokerSetup.botCount = Math.min(pokerSetup.botCount, pokerSetup.totalPlayers - 1);
        updateSelectedGamePanels();
        showGameShellMenu('settings');
      });
    });
    document.querySelectorAll('[data-poker-bots]').forEach((button) => {
      button.addEventListener('click', () => {
        pokerSetup.botCount = Math.min(Number(button.dataset.pokerBots), pokerSetup.totalPlayers - 1);
        updateSelectedGamePanels();
        showGameShellMenu('settings');
      });
    });
    document.querySelectorAll('[data-caro-difficulty]').forEach((button) => {
      button.addEventListener('click', () => {
        caroSetup.difficulty = button.dataset.caroDifficulty;
        updateSelectedGamePanels();
        showGameShellMenu('settings');
      });
    });
    document.getElementById('shell-back-btn').addEventListener('click', () => {
      showGameShellMenu(runtime?.paused ? 'pause' : 'title');
    });
    return;
  }

  if (mode === 'exchange') {
    menu.innerHTML = `
      <div class="game-shell-menu__eyebrow">Poker Exchange</div>
      <h2 class="mb-2">Doi Gem va Xu</h2>
      <div class="game-shell-settings">
        <div class="game-shell-setting-row"><span>Gem hien co</span><strong>${formatGemValue(walletGems)}</strong></div>
        <div class="game-shell-setting-row"><span>Xu Poker</span><strong>${pokerChipBank}</strong></div>
        <div class="game-shell-setting-row game-shell-setting-row--stack">
          <span>Nap xu</span>
          <div class="graphics-pills">
            <button type="button" class="graphics-pill" data-exchange-action="gem_to_chip" data-exchange-amount="1">1 gem -> 10 xu</button>
            <button type="button" class="graphics-pill" data-exchange-action="gem_to_chip" data-exchange-amount="5">5 gem -> 50 xu</button>
            <button type="button" class="graphics-pill" data-exchange-action="gem_to_chip" data-exchange-amount="10">10 gem -> 100 xu</button>
          </div>
        </div>
        <div class="game-shell-setting-row game-shell-setting-row--stack">
          <span>Doi nguoc lai</span>
          <div class="graphics-pills">
            <button type="button" class="graphics-pill" data-exchange-action="chip_to_gem" data-exchange-amount="10">10 xu -> 1 gem</button>
            <button type="button" class="graphics-pill" data-exchange-action="chip_to_gem" data-exchange-amount="50">50 xu -> 5 gem</button>
            <button type="button" class="graphics-pill" data-exchange-action="chip_to_gem" data-exchange-amount="100">100 xu -> 10 gem</button>
          </div>
        </div>
      </div>
      <div class="game-shell-menu__actions mt-4">
        <button class="btn btn-outline-light" id="shell-back-btn">Quay lai</button>
      </div>
    `;
    document.querySelectorAll('[data-exchange-action]').forEach((button) => {
      button.addEventListener('click', async () => {
        await performPokerExchange(button.dataset.exchangeAction, Number(button.dataset.exchangeAmount));
        showGameShellMenu('exchange');
      });
    });
    document.getElementById('shell-back-btn').addEventListener('click', () => showGameShellMenu('title'));
    return;
  }

  if (mode === 'point-exchange') {
    menu.innerHTML = `
      <div class="game-shell-menu__eyebrow">Doi diem Caro</div>
      <h2 class="mb-2">Doi diem sang gem</h2>
      <div class="game-shell-settings">
        <div class="game-shell-setting-row"><span>Diem hien co</span><strong>${pointWallet.availablePoints || 0}</strong></div>
        <div class="game-shell-setting-row"><span>Tong diem da tich luy</span><strong>${pointWallet.totalPoints || 0}</strong></div>
        <div class="game-shell-setting-row"><span>Da doi thanh gem</span><strong>${pointWallet.totalGemsConverted || 0}</strong></div>
        <div class="game-shell-setting-row game-shell-setting-row--stack">
          <span>Chon moc doi</span>
          <div class="graphics-pills">
            ${[1000, 2000, 5000].map((points) => `
              <button type="button" class="graphics-pill" data-point-exchange="${points}" ${(pointWallet.availablePoints || 0) >= points ? '' : 'disabled'}>
                ${points} diem -> ${Math.floor(points / 1000)} gem
              </button>
            `).join('')}
          </div>
        </div>
      </div>
      <div class="game-shell-menu__actions mt-4">
        <button class="btn btn-outline-light" id="shell-back-btn">Quay lai</button>
      </div>
    `;
    document.querySelectorAll('[data-point-exchange]').forEach((button) => {
      button.addEventListener('click', async () => {
        await performPointExchange(Number(button.dataset.pointExchange));
        showGameShellMenu('point-exchange');
      });
    });
    document.getElementById('shell-back-btn').addEventListener('click', () => showGameShellMenu('title'));
    return;
  }

  if (mode === 'multiplayer') {
    const session = AuthService.getSession();
    const inviteRows = pokerPendingInvites.length ? pokerPendingInvites.map((invite) => `
      <div class="game-shell-setting-row game-shell-setting-row--stack">
        <div>
          <strong>${invite.inviterName}</strong>
          <div class="small text-muted">Phong #${invite.roomId} dang cho ban vao.</div>
        </div>
        <div class="game-shell-menu__actions">
          <button class="btn btn-sm btn-primary" data-poker-join-room="${invite.roomId}" data-poker-join-invite="${invite.inviteId}">Vao phong</button>
        </div>
      </div>
    `).join('') : '<div class="small text-muted">Chua co loi moi nao cho Poker.</div>';

    const friendRows = pokerFriends.length ? pokerFriends.map((friend) => `
      <div class="game-shell-leaderboard__row">
        <div>
          <strong>${friend.username}</strong>
          <div class="small text-muted">User ${friend.userId}</div>
        </div>
        <button class="btn btn-sm btn-outline-info" data-poker-invite="${friend.userId}">${pokerRoom ? 'Moi vao phong' : 'Tao phong va moi'}</button>
      </div>
    `).join('') : '<div class="small text-muted">Ban can co ban be de moi vao Poker.</div>';

    menu.innerHTML = `
      <div class="game-shell-menu__eyebrow">Poker Multiplayer</div>
      <h2 class="mb-2">Choi voi ban</h2>
      <p class="text-muted mb-4">Tao phong Poker, moi ban be va de tai khoan khac vao cung lobby truoc khi bat dau.</p>
      ${pokerRoom ? `<div class="game-shell-balance-row"><span>Phong hien tai: <strong>#${pokerRoom.roomId}</strong></span><span>Trang thai: <strong>${pokerRoom.status}</strong></span></div>` : ''}
      <div class="game-shell-settings">
        <div class="game-shell-setting-row game-shell-setting-row--stack">
          <span>Loi moi dang cho</span>
          <div class="game-shell-leaderboard">${inviteRows}</div>
        </div>
        <div class="game-shell-setting-row game-shell-setting-row--stack">
          <span>Ban be co the moi</span>
          <div class="game-shell-leaderboard">${friendRows}</div>
        </div>
      </div>
      <div class="game-shell-menu__actions mt-4">
        ${pokerRoom ? '<button class="btn btn-primary" id="shell-room-btn">Vao phong hien tai</button>' : '<button class="btn btn-primary" id="shell-create-room-btn">Tao phong moi</button>'}
        <button class="btn btn-outline-light" id="shell-refresh-mp-btn">Lam moi</button>
        <button class="btn btn-outline-light" id="shell-back-btn">Quay lai</button>
      </div>
    `;
    document.getElementById('shell-create-room-btn')?.addEventListener('click', createPokerRoomLobby);
    document.getElementById('shell-room-btn')?.addEventListener('click', () => showGameShellMenu('poker-room'));
    document.getElementById('shell-refresh-mp-btn')?.addEventListener('click', openPokerFriendsMenu);
    document.getElementById('shell-back-btn').addEventListener('click', () => showGameShellMenu('title'));
    document.querySelectorAll('[data-poker-invite]').forEach((button) => {
      button.addEventListener('click', () => invitePokerFriend(Number(button.dataset.pokerInvite)));
    });
    document.querySelectorAll('[data-poker-join-room]').forEach((button) => {
      button.addEventListener('click', () => joinPokerInvite(Number(button.dataset.pokerJoinRoom), Number(button.dataset.pokerJoinInvite)));
    });
    return;
  }

  if (mode === 'poker-room') {
    const session = AuthService.getSession();
    const isOwner = pokerRoom?.ownerId === session?.userId;
    const maxExtraBots = Math.max(0, (pokerRoom?.maxPlayers || 4) - (pokerRoom?.members?.length || 0));
    const invitedUserIds = new Set((pokerRoom?.pendingInvites || []).map((invite) => Number(invite.inviteeId)));
    const currentMemberIds = new Set((pokerRoom?.members || []).map((member) => Number(member.userId)));
    const roomInviteRows = pokerFriends
      .filter((friend) => !currentMemberIds.has(Number(friend.userId)) && !invitedUserIds.has(Number(friend.userId)))
      .map((friend) => `
        <div class="game-shell-leaderboard__row">
          <div>
            <strong>${friend.username}</strong>
            <div class="small text-muted">User ${friend.userId}</div>
          </div>
          <button class="btn btn-sm btn-outline-info" data-poker-invite="${friend.userId}" ${isOwner ? '' : 'disabled'}>Moi vao phong</button>
        </div>
      `).join('') || '<div class="small text-muted">Khong con ban nao de moi them.</div>';
    const memberRows = pokerRoom?.members?.length ? pokerRoom.members.map((member) => `
      <div class="game-shell-leaderboard__row">
        <div>
          <strong>${member.username}${member.owner ? ' (Chu phong)' : ''}</strong>
          <div class="small text-muted">${member.status}</div>
        </div>
        <span>${member.userId === session?.userId ? 'Ban' : 'Thanh vien'}</span>
      </div>
    `).join('') : '<div class="small text-muted">Phong chua co thanh vien.</div>';

    const pendingRows = pokerRoom?.pendingInvites?.length ? pokerRoom.pendingInvites.map((invite) => `
      <div class="game-shell-leaderboard__row">
        <div>
          <strong>${invite.inviterName}</strong>
          <div class="small text-muted">Dang moi User ${invite.inviteeId}</div>
        </div>
        <span>${invite.status}</span>
      </div>
    `).join('') : '<div class="small text-muted">Chua co loi moi nao dang cho.</div>';

    menu.innerHTML = `
      <div class="game-shell-menu__eyebrow">Poker Room</div>
      <h2 class="mb-2">Phong #${pokerRoom?.roomId || '-'}</h2>
      <p class="text-muted mb-4">Moi them ban, cho ho vao phong va dung tu day de bat dau lobby Poker chung.</p>
      <div class="game-shell-balance-row">
        <span>Chu phong: <strong>${pokerRoom?.ownerName || '-'}</strong></span>
        <span>Trang thai: <strong>${pokerRoom?.status || '-'}</strong></span>
        <span>Cho ngoi: <strong>${pokerRoom?.members?.length || 0}/${pokerRoom?.maxPlayers || 4}</strong></span>
        <span>Bot: <strong>${pokerLobbyBotCount}</strong></span>
      </div>
      <div class="game-shell-settings">
        <div class="game-shell-setting-row game-shell-setting-row--stack">
          <span>Thanh vien phong</span>
          <div class="game-shell-leaderboard">${memberRows}</div>
        </div>
        <div class="game-shell-setting-row game-shell-setting-row--stack">
          <span>Loi moi dang cho</span>
          <div class="game-shell-leaderboard">${pendingRows}</div>
        </div>
        <div class="game-shell-setting-row game-shell-setting-row--stack">
          <span>Moi ban vao phong</span>
          <div class="game-shell-leaderboard">${roomInviteRows}</div>
        </div>
        <div class="game-shell-setting-row game-shell-setting-row--stack">
          <span>Them bot khi thieu slot</span>
          <div class="graphics-pills">
            ${Array.from({ length: maxExtraBots + 1 }, (_, count) => `
              <button type="button" class="graphics-pill ${pokerLobbyBotCount === count ? 'is-active' : ''}" data-poker-room-bots="${count}" ${isOwner ? '' : 'disabled'}>
                ${count} bot
              </button>
            `).join('')}
          </div>
        </div>
      </div>
      <div class="game-shell-menu__actions mt-4">
        ${isOwner ? `<button class="btn btn-primary" id="shell-room-start-btn" ${((pokerRoom?.members?.length || 0) + pokerLobbyBotCount >= 2) ? '' : 'disabled'}>Vao ban choi</button>` : ''}
        <button class="btn btn-outline-light" id="shell-room-refresh-btn">Lam moi</button>
        <button class="btn btn-outline-danger" id="shell-room-leave-btn">${isOwner ? 'Dong phong' : 'Roi phong'}</button>
        <button class="btn btn-outline-light" id="shell-back-btn">Quay lai</button>
      </div>
    `;
    document.getElementById('shell-room-start-btn')?.addEventListener('click', startPokerRoomLobby);
    document.getElementById('shell-room-refresh-btn')?.addEventListener('click', refreshPokerRoom);
    document.getElementById('shell-room-leave-btn')?.addEventListener('click', leavePokerRoomLobby);
    document.getElementById('shell-back-btn')?.addEventListener('click', () => showGameShellMenu('multiplayer'));
    document.querySelectorAll('[data-poker-room-bots]').forEach((button) => {
      button.addEventListener('click', () => {
        pokerLobbyBotCount = Number(button.dataset.pokerRoomBots);
        showGameShellMenu('poker-room');
      });
    });
    document.querySelectorAll('[data-poker-invite]').forEach((button) => {
      button.addEventListener('click', () => invitePokerFriend(Number(button.dataset.pokerInvite)));
    });
    return;
  }

  if (mode === 'leaderboard') {
    menu.innerHTML = `
      <div class="game-shell-menu__eyebrow">Leaderboard</div>
      <h2 class="mb-3">Top Pilots</h2>
      <div class="game-shell-leaderboard">
        ${(leaderboard.length ? leaderboard.slice(0, 5).map((item) => `
          <div class="game-shell-leaderboard__row">
            <span>#${item.rank}</span>
            <strong>${item.username}</strong>
            <span>${item.score} pts</span>
          </div>
        `).join('') : '<div class="text-muted">Chua co diem nao.</div>')}
      </div>
      <div class="game-shell-menu__actions mt-4">
        <button class="btn btn-outline-light" id="shell-back-btn">Quay lai</button>
      </div>
    `;
    document.getElementById('shell-back-btn').addEventListener('click', () => showGameShellMenu('title'));
  }
}

async function loadLeaderboard(gameId) {
  try {
    const res = await GameService.getLeaderboard(gameId);
    leaderboard = res.data || [];
    const box = document.getElementById('leaderboard-box');
    box.innerHTML = leaderboard.length ? leaderboard.map((item) => `
      <div class="lb-row"><strong>#${item.rank}</strong><div><div class="fw-semibold">${item.username}</div><div class="small text-muted">User ${item.userId}</div></div><div class="text-end"><div class="fw-semibold">${item.score} pts</div><div class="small text-muted">${item.enemiesDestroyed} kills</div></div></div>
    `).join('') : '<div class="text-muted small">No scores yet for this game.</div>';
  } catch {
    document.getElementById('leaderboard-box').innerHTML = '<div class="text-danger small">Cannot load leaderboard.</div>';
  }
}

async function openPokerFriendsMenu() {
  try {
    await ensurePokerSocket();
    await Promise.all([loadPokerFriends(), loadPendingPokerInvites()]);
    if (pokerRoom?.roomId) {
      await refreshPokerRoom(false);
    }
    showGameShellMenu('multiplayer');
  } catch (error) {
    showAlert(error.message || 'Khong the mo khu choi voi ban.', 'danger');
  }
}

async function ensurePokerSocket() {
  const session = AuthService.getSession();
  if (!session) return;

  await websocketService.connect();
  const nextInviteTopic = `/topic/poker-invites.${session.userId}`;
  if (pokerInviteTopic !== nextInviteTopic) {
    if (pokerInviteTopic) {
      websocketService.unsubscribe(pokerInviteTopic);
    }
    websocketService.subscribe(nextInviteTopic, async () => {
      await loadPendingPokerInvites();
      showAlert('Ban vua nhan duoc loi moi Poker moi.', 'info');
      if (document.getElementById('game-shell')?.style.display === 'flex') {
        showGameShellMenu('multiplayer');
      }
    });
    pokerInviteTopic = nextInviteTopic;
  }
}

async function loadPokerFriends() {
  const session = AuthService.getSession();
  if (!session) {
    pokerFriends = [];
    return;
  }

  const response = await FriendService.getFriendsList(session.userId);
  const rows = response?.data || [];
  pokerFriends = rows
    .map((item) => normalizeFriend(item, session.userId))
    .filter(Boolean)
    .sort((left, right) => left.username.localeCompare(right.username));
}

function normalizeFriend(item, currentUserId) {
  const isOutgoing = Number(item.fromUserId) === Number(currentUserId);
  const userId = Number(isOutgoing ? item.toUserId : item.fromUserId);
  const username = (isOutgoing ? item.toUsername : item.fromUsername) || item.username || item.name;
  if (!userId || !username) return null;
  return { userId, username };
}

async function loadPendingPokerInvites() {
  const session = AuthService.getSession();
  const game = getSelectedGame();
  if (!session || !game) {
    pokerPendingInvites = [];
    return;
  }

  const response = await GameService.getPendingPokerInvites(game.id, session.userId);
  pokerPendingInvites = response?.data || [];
}

async function createPokerRoomLobby() {
  const game = getSelectedGame();
  if (!game) return;

  try {
    const response = await GameService.createPokerRoom(game.id);
    pokerRoom = response?.data || null;
    pokerLobbyBotCount = Math.max(0, (pokerRoom?.maxPlayers || 4) - (pokerRoom?.members?.length || 0));
    subscribeToPokerRoom(pokerRoom?.roomId);
    showAlert('Da tao phong Poker moi.', 'success');
    showGameShellMenu('poker-room');
  } catch (error) {
    showAlert(error.message || 'Khong the tao phong Poker.', 'danger');
  }
}

function subscribeToPokerRoom(roomId) {
  if (!roomId) return;
  const nextRoomTopic = `/topic/poker-room.${roomId}`;
  if (pokerRoomTopic && pokerRoomTopic !== nextRoomTopic) {
    websocketService.unsubscribe(pokerRoomTopic);
  }
  websocketService.subscribe(nextRoomTopic, (payload) => {
    if (payload?.status === 'CLOSED' && !payload?.members) {
      pokerRoom = null;
      if (pokerRoomTopic) {
        websocketService.unsubscribe(pokerRoomTopic);
        pokerRoomTopic = null;
      }
      showAlert('Phong Poker da dong.', 'warning');
      if (document.getElementById('game-shell')?.style.display === 'flex') {
        showGameShellMenu('multiplayer');
      }
      return;
    }

    pokerRoom = payload;
    const roomMembers = Array.isArray(pokerRoom?.members) ? pokerRoom.members.length : 0;
    const syncedBotCount = Number(pokerRoom?.botCount);
    if (Number.isFinite(syncedBotCount)) {
      pokerLobbyBotCount = syncedBotCount;
    } else {
      pokerLobbyBotCount = Math.max(0, Math.min(pokerLobbyBotCount, (pokerRoom?.maxPlayers || 4) - roomMembers));
    }
    if (pokerRoom?.status === 'READY' && !runtime) {
      startPokerMatchFromRoom();
      return;
    }
    if (document.getElementById('game-shell')?.style.display === 'flex') {
      showGameShellMenu('poker-room');
    }
  });
  pokerRoomTopic = nextRoomTopic;
}

async function refreshPokerRoom(showMenu = true) {
  const game = getSelectedGame();
  if (!game || !pokerRoom?.roomId) return;

  try {
    const response = await GameService.getPokerRoom(game.id, pokerRoom.roomId);
    pokerRoom = response?.data || null;
    pokerLobbyBotCount = Number.isFinite(Number(pokerRoom?.botCount))
      ? Number(pokerRoom.botCount)
      : Math.max(0, Math.min(pokerLobbyBotCount, (pokerRoom?.maxPlayers || 4) - (pokerRoom?.members?.length || 0)));
    subscribeToPokerRoom(pokerRoom?.roomId);
    if (showMenu) {
      showGameShellMenu('poker-room');
    }
  } catch (error) {
    showAlert(error.message || 'Khong the lam moi phong Poker.', 'warning');
  }
}

async function invitePokerFriend(friendUserId) {
  const game = getSelectedGame();
  if (!game) {
    return;
  }

  try {
    if (!pokerRoom?.roomId) {
      const roomResponse = await GameService.createPokerRoom(game.id);
      pokerRoom = roomResponse?.data || null;
      subscribeToPokerRoom(pokerRoom?.roomId);
    }
    const response = await GameService.invitePokerPlayer(game.id, pokerRoom.roomId, friendUserId);
    pokerRoom = response?.data || pokerRoom;
    showAlert('Da gui loi moi vao phong Poker.', 'success');
    showGameShellMenu('poker-room');
  } catch (error) {
    showAlert(error.message || 'Khong the gui loi moi Poker.', 'danger');
  }
}

async function joinPokerInvite(roomId, inviteId) {
  const game = getSelectedGame();
  if (!game) return;

  try {
    const response = await GameService.joinPokerRoom(game.id, roomId, inviteId);
    pokerRoom = response?.data || null;
    subscribeToPokerRoom(roomId);
    await loadPendingPokerInvites();
    showAlert('Ban da vao phong Poker.', 'success');
    showGameShellMenu('poker-room');
  } catch (error) {
    showAlert(error.message || 'Khong the vao phong Poker.', 'danger');
  }
}

async function leavePokerRoomLobby() {
  const game = getSelectedGame();
  if (!game || !pokerRoom?.roomId) {
    pokerRoom = null;
    showGameShellMenu('multiplayer');
    return;
  }

  try {
    await GameService.leavePokerRoom(game.id, pokerRoom.roomId);
    if (pokerRoomTopic) {
      websocketService.unsubscribe(pokerRoomTopic);
      pokerRoomTopic = null;
    }
    pokerRoom = null;
    await loadPendingPokerInvites();
    showAlert('Da roi phong Poker.', 'success');
    showGameShellMenu('multiplayer');
  } catch (error) {
    showAlert(error.message || 'Khong the roi phong Poker.', 'danger');
  }
}

async function startPokerRoomLobby() {
  const game = getSelectedGame();
  if (!game || !pokerRoom?.roomId) return;

  try {
    await refreshPokerRoom(false);
    if (((pokerRoom?.members?.length || 0) + pokerLobbyBotCount) < 2) {
      showAlert('Can it nhat 2 nguoi hoac them bot de vao ban.', 'warning');
      return;
    }
    const response = await GameService.startPokerRoom(game.id, pokerRoom.roomId, pokerLobbyBotCount);
    pokerRoom = response?.data || pokerRoom;
    await startPokerMatchFromRoom();
  } catch (error) {
    showAlert(error.message || 'Khong the bat dau lobby Poker.', 'danger');
  }
}

async function startPokerMatchFromRoom() {
  if (!selectedGameId || !pokerRoom) return;

  try {
    await refreshPokerRoom(false);
    document.getElementById('game-shell').style.display = 'flex';
    const res = await GameService.startSession(selectedGameId);
    const cfg = {
      ...(res.data || {}),
      pokerParticipants: pokerRoom.members || [],
      pokerBotCount: pokerLobbyBotCount,
      pokerRoomId: pokerRoom.roomId
    };
    const gameModule = gameModules[GAME_MODES.POKER];
    setShellSurface(GAME_MODES.POKER);
    gameModule.start(createGameRuntimeContext(), cfg);
    document.getElementById('start-btn').disabled = true;
    document.getElementById('stop-btn').disabled = false;
    document.getElementById('game-shell-overlay').style.display = 'none';
    updateSelectedGamePanels();
    showAlert(`Ban Poker da san sang voi ${cfg.pokerParticipants.length} nguoi choi va ${pokerLobbyBotCount} bot.`, 'success');
  } catch (error) {
    showAlert(error.message || 'Khong the vao van Poker tu phong.', 'danger');
    showGameShellMenu('poker-room');
  }
}

async function performPokerExchange(action, amount) {
  const session = AuthService.getSession();
  if (!session) return;

  try {
    if (action === 'gem_to_chip') {
      if (walletGems < amount) {
        showAlert('Khong du gem de doi xu.', 'warning');
        return;
      }
      await WalletService.withdraw(session.userId, amount);
      pokerChipBank += amount * 10;
      localStorage.setItem(POKER_CHIP_BANK_KEY, String(pokerChipBank));
      await loadWalletGems();
      updateSelectedGamePanels();
      showAlert(`Da doi ${amount} gem thanh ${amount * 10} xu Poker.`, 'success');
      return;
    }

    if (action === 'chip_to_gem') {
      if (pokerChipBank < amount) {
        showAlert('Khong du xu Poker de doi nguoc lai.', 'warning');
        return;
      }
      const gems = amount / 10;
      await WalletService.deposit(session.userId, gems);
      pokerChipBank -= amount;
      localStorage.setItem(POKER_CHIP_BANK_KEY, String(pokerChipBank));
      await loadWalletGems();
      updateSelectedGamePanels();
      showAlert(`Da doi ${amount} xu Poker thanh ${gems} gem.`, 'success');
    }
  } catch (error) {
    showAlert(error.message || 'Khong the doi gem/xu luc nay.', 'danger');
  }
}

async function performPointExchange(points) {
  const session = AuthService.getSession();
  if (!session) return;

  try {
    if ((pointWallet.availablePoints || 0) < points) {
      showAlert('Khong du diem de doi gem.', 'warning');
      return;
    }
    const response = await GameService.exchangePoints(session.userId, points);
    pointWallet = response?.data || pointWallet;
    await loadWalletGems();
    updateSelectedGamePanels();
    showAlert(`Da doi ${points} diem thanh ${Math.floor(points / 1000)} gem.`, 'success');
  } catch (error) {
    showAlert(error.message || 'Khong the doi diem luc nay.', 'danger');
  }
}

async function startGame() {
  if (!selectedGameId) return;
  try {
    document.getElementById('game-shell').style.display = 'flex';
    const res = await GameService.startSession(selectedGameId);
    const cfg = res.data;
    const mode = cfg.mode || resolveGameMode(cfg.gameName || getSelectedGame());
    const gameModule = gameModules[mode];

    if (gameModule) {
      setShellSurface(mode);
      gameModule.start(createGameRuntimeContext(), cfg);
      document.getElementById('start-btn').disabled = true;
      document.getElementById('stop-btn').disabled = false;
      document.getElementById('game-shell-overlay').style.display = 'none';
      updateSelectedGamePanels();
      showAlert(mode === GAME_MODES.POKER ? 'Poker table ready.' : 'Game started.', 'success');
      return;
    }

    setShellSurface(GAME_MODES.COMING_SOON);
    showGameShellMenu('title');
    showAlert(cfg.statusMessage || 'This game is not playable yet.', 'warning');
  } catch (error) {
    showAlert(error.message || 'Cannot start game.', 'danger');
  }
}

function initPokerRuntime(cfg) {
  const now = performance.now();
  runtime = {
    mode: 'poker',
    cfg,
    running: true,
    paused: false,
    submitted: false,
    score: 0,
    lives: 0,
    destroyed: 0,
    hits: 0,
    gemsEarned: 0,
    startedAt: now,
    timer: window.setInterval(() => syncMetrics(), 1000),
    poker: {
      round: 1,
      totalPlayers: pokerSetup.totalPlayers,
      botCount: pokerSetup.botCount,
      handsWon: 0,
      participants: buildPokerParticipants(cfg),
      showdown: false,
      message: 'Choose Deal Round to start the first hand.',
      winners: [],
      winningLabel: ''
    }
  };
  syncMetrics();
  renderPokerTable();
}

function buildPokerParticipants(cfg) {
  const session = AuthService.getSession();
  const participants = [
    { id: `user-${session.userId}`, name: session.username, type: 'human', cards: [], revealed: true, result: null }
  ];
  const botNames = (cfg.defaultBotNames || ['Nova Bot', 'Orion Bot', 'Luna Bot']).slice(0, pokerSetup.botCount);
  botNames.forEach((name, index) => {
    participants.push({ id: `bot-${index + 1}`, name, type: 'bot', cards: [], revealed: false, result: null });
  });
  return participants;
}

function renderPokerTable() {
  const content = document.getElementById('game-shell-content');
  if (!content || !runtime?.poker) return;

  const emptySeats = Math.max(0, runtime.poker.totalPlayers - runtime.poker.participants.length);
  content.innerHTML = `
    <div class="poker-table-wrap">
      <div class="poker-table-header">
        <div>
          <div class="poker-table-header__eyebrow">Poker Royale</div>
          <h3 class="mb-1">Round ${runtime.poker.round}</h3>
          <p class="mb-0 text-muted">${runtime.poker.message}</p>
        </div>
        <div class="poker-table-stats">
          <div class="poker-stat"><span>Seats</span><strong>${runtime.poker.totalPlayers}</strong></div>
          <div class="poker-stat"><span>Bots</span><strong>${runtime.poker.botCount}</strong></div>
          <div class="poker-stat"><span>Hands Won</span><strong>${runtime.poker.handsWon}</strong></div>
        </div>
      </div>
      <div class="poker-table-felt">
        ${runtime.poker.participants.map((player) => `
          <div class="poker-seat ${runtime.poker.winners.includes(player.id) ? 'is-winner' : ''}">
            <div class="poker-seat__name">${player.name}</div>
            <div class="poker-cards">
              ${(player.cards.length ? player.cards : Array.from({ length: 5 }, () => ({ hidden: true }))).map((card) => renderPokerCard(card, player.type !== 'human' && !runtime.poker.showdown)).join('')}
            </div>
            <div class="poker-seat__result">${player.result?.label || (player.type === 'human' ? 'Your hand' : runtime.poker.showdown ? 'Showdown' : 'Hidden hand')}</div>
          </div>
        `).join('')}
        ${Array.from({ length: emptySeats }, (_, index) => `
          <div class="poker-seat poker-seat--empty">
            <div class="poker-seat__name">Open Seat ${index + 1}</div>
            <div class="poker-seat__result">Add more human players later</div>
          </div>
        `).join('')}
      </div>
      <div class="poker-actions">
        ${!runtime.poker.activeRound ? '<button class="btn btn-primary" id="poker-deal-btn">Deal Round</button>' : ''}
        ${runtime.poker.activeRound && !runtime.poker.showdown ? '<button class="btn btn-warning" id="poker-showdown-btn">Reveal Showdown</button>' : ''}
        ${runtime.poker.showdown ? '<button class="btn btn-primary" id="poker-next-btn">Next Round</button>' : ''}
        <button class="btn btn-outline-light" id="poker-cashout-btn">Cash Out</button>
      </div>
    </div>
  `;

  document.getElementById('poker-deal-btn')?.addEventListener('click', dealPokerRound);
  document.getElementById('poker-showdown-btn')?.addEventListener('click', revealPokerShowdown);
  document.getElementById('poker-next-btn')?.addEventListener('click', startNextPokerRound);
  document.getElementById('poker-cashout-btn')?.addEventListener('click', () => exitGameplayToTitle(true));
}

function renderPokerCard(card, hidden) {
  if (hidden || card?.hidden) {
    return '<div class="poker-card poker-card--back"></div>';
  }
  const isRed = card.suit === '♥' || card.suit === '♦';
  return `<div class="poker-card ${isRed ? 'is-red' : ''}"><span>${card.rank}</span><small>${card.suit}</small></div>`;
}

function dealPokerRound() {
  if (!runtime?.poker) return;
  const deck = shuffleDeck(buildDeck());
  runtime.poker.activeRound = true;
  runtime.poker.showdown = false;
  runtime.poker.winners = [];
  runtime.poker.winningLabel = '';
  runtime.poker.message = 'Hands dealt. Reveal showdown when you are ready.';
  runtime.poker.participants = runtime.poker.participants.map((player) => ({
    ...player,
    cards: deck.splice(0, 5),
    revealed: player.type === 'human',
    result: null
  }));
  renderPokerTable();
}

function revealPokerShowdown() {
  if (!runtime?.poker?.activeRound || runtime.poker.showdown) return;
  runtime.poker.showdown = true;

  const ranked = runtime.poker.participants.map((player) => ({
    ...player,
    result: evaluatePokerHand(player.cards)
  }));
  ranked.sort((a, b) => comparePokerResults(b.result, a.result));
  const best = ranked[0].result;
  const winners = ranked.filter((player) => comparePokerResults(player.result, best) === 0);

  runtime.poker.participants = runtime.poker.participants.map((player) => {
    const rankedPlayer = ranked.find((item) => item.id === player.id);
    return { ...player, revealed: true, result: rankedPlayer.result };
  });
  runtime.poker.winners = winners.map((player) => player.id);
  runtime.poker.winningLabel = winners.map((player) => player.name).join(', ');
  runtime.poker.message = `${runtime.poker.winningLabel} win with ${best.label}.`;

  const humanWon = winners.some((player) => player.type === 'human');
  if (humanWon) {
    runtime.score += winners.length === 1 ? 300 : 180;
    runtime.destroyed += 1;
    runtime.poker.handsWon += 1;
  } else {
    runtime.score += 40;
  }
  runtime.gemsEarned = Math.floor(runtime.score / (runtime.cfg.gemThresholdScore || 1000));
  syncMetrics();
  renderPokerTable();
}

function startNextPokerRound() {
  if (!runtime?.poker) return;
  runtime.poker.round += 1;
  runtime.poker.activeRound = false;
  runtime.poker.showdown = false;
  runtime.poker.winners = [];
  runtime.poker.winningLabel = '';
  runtime.poker.message = 'Start the next hand when the table is ready.';
  runtime.poker.participants = runtime.poker.participants.map((player) => ({
    ...player,
    cards: [],
    revealed: player.type === 'human',
    result: null
  }));
  renderPokerTable();
}

function buildDeck() {
  const suits = ['♠', '♥', '♦', '♣'];
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  return suits.flatMap((suit) => ranks.map((rank, index) => ({ suit, rank, value: index + 2 })));
}

function shuffleDeck(deck) {
  const items = [...deck];
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function evaluatePokerHand(cards) {
  const values = [...cards].map((card) => card.value).sort((a, b) => b - a);
  const counts = values.reduce((map, value) => {
    map.set(value, (map.get(value) || 0) + 1);
    return map;
  }, new Map());
  const groups = [...counts.entries()].sort((a, b) => (b[1] - a[1]) || (b[0] - a[0]));
  const isFlush = cards.every((card) => card.suit === cards[0].suit);
  const uniqueAsc = [...new Set(values)].sort((a, b) => a - b);
  const straightHigh = getStraightHigh(uniqueAsc);
  const isStraight = straightHigh > 0;

  if (isStraight && isFlush) return { rank: 9, label: 'Straight Flush', tie: [straightHigh] };
  if (groups[0][1] === 4) return { rank: 8, label: 'Four of a Kind', tie: [groups[0][0], groups[1][0]] };
  if (groups[0][1] === 3 && groups[1][1] === 2) return { rank: 7, label: 'Full House', tie: [groups[0][0], groups[1][0]] };
  if (isFlush) return { rank: 6, label: 'Flush', tie: values };
  if (isStraight) return { rank: 5, label: 'Straight', tie: [straightHigh] };
  if (groups[0][1] === 3) return { rank: 4, label: 'Three of a Kind', tie: [groups[0][0], ...groups.slice(1).map(([value]) => value).sort((a, b) => b - a)] };
  if (groups[0][1] === 2 && groups[1][1] === 2) {
    const pairs = groups.filter(([, count]) => count === 2).map(([value]) => value).sort((a, b) => b - a);
    const kicker = groups.find(([, count]) => count === 1)?.[0] || 0;
    return { rank: 3, label: 'Two Pair', tie: [...pairs, kicker] };
  }
  if (groups[0][1] === 2) {
    const pair = groups[0][0];
    const kickers = groups.slice(1).map(([value]) => value).sort((a, b) => b - a);
    return { rank: 2, label: 'One Pair', tie: [pair, ...kickers] };
  }
  return { rank: 1, label: 'High Card', tie: values };
}

function getStraightHigh(uniqueAsc) {
  if (uniqueAsc.length !== 5) return 0;
  const wheel = [2, 3, 4, 5, 14];
  if (wheel.every((value, index) => uniqueAsc[index] === value)) return 5;
  for (let i = 1; i < uniqueAsc.length; i += 1) {
    if (uniqueAsc[i] !== uniqueAsc[0] + i) return 0;
  }
  return uniqueAsc[uniqueAsc.length - 1];
}

function comparePokerResults(left, right) {
  if (left.rank !== right.rank) return left.rank - right.rank;
  const length = Math.max(left.tie.length, right.tie.length);
  for (let i = 0; i < length; i += 1) {
    const diff = (left.tie[i] || 0) - (right.tie[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function initRuntime(cfg) {
  const canvas = document.getElementById('game-shell-canvas');
  const ctx = canvas.getContext('2d');
  const now = performance.now();
  runtime = {
    canvas, ctx, cfg, running: true, paused: false, submitted: false,
    score: 0, lives: cfg.initialLives || 3, destroyed: 0, hits: 0, gemsEarned: 0,
    ship: { x: canvas.width / 2, y: canvas.height - 56, width: 44, height: 54 }, mouseX: canvas.width / 2, mouseY: canvas.height - 56,
    bullets: [], enemies: [], obstacles: [], particles: [], stars: createStars(canvas, getGraphicsProfile().stars), graphics: getGraphicsProfile(),
    backgroundGradient: null,
    lastAt: now, lastBullet: now, lastEnemy: now, lastObstacle: now, invulnerableUntil: 0, startedAt: now
  };
  runtime.backgroundGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  runtime.backgroundGradient.addColorStop(0, '#040816');
  runtime.backgroundGradient.addColorStop(1, '#0d1731');
  canvas.onmousemove = (e) => {
    const r = canvas.getBoundingClientRect();
    runtime.mouseX = ((e.clientX - r.left) / r.width) * canvas.width;
    runtime.mouseY = ((e.clientY - r.top) / r.height) * canvas.height;
  };
  runtime.frame = requestAnimationFrame(loop);
}

function loop(now) {
  if (!runtime?.running || runtime?.paused) return;
  const dt = (now - runtime.lastAt) / 1000;
  runtime.lastAt = now;
  moveShip();
  updateStars(dt);
  if (now - runtime.lastBullet >= (runtime.cfg.bulletIntervalMs || 180)) fire(now);
  if (now - runtime.lastEnemy >= (runtime.cfg.targetSpawnIntervalMs || 700)) spawnEnemy(now);
  if (now - runtime.lastObstacle >= (runtime.cfg.obstacleSpawnIntervalMs || 1800)) spawnObstacle(now);
  updateObjects(dt);
  collide(now);
  draw();
  syncMetrics();
  if (runtime.lives <= 0) {
    stopRuntime(false);
    return;
  }
  runtime.frame = requestAnimationFrame(loop);
}

function moveShip() {
  runtime.ship.x += (runtime.mouseX - runtime.ship.x) * 0.18;
  runtime.ship.y += (runtime.mouseY - runtime.ship.y) * 0.18;
  runtime.ship.x = clamp(runtime.ship.x, 22, runtime.canvas.width - 22);
  runtime.ship.y = clamp(runtime.ship.y, 27, runtime.canvas.height - 27);
}

function updateStars(dt) {
  runtime.stars.forEach((star) => {
    star.y += star.v * dt;
    if (star.y > runtime.canvas.height) {
      star.y = -2;
      star.x = Math.random() * runtime.canvas.width;
    }
  });
}

function fire(now) {
  runtime.lastBullet = now;
  runtime.bullets.push({ x: runtime.ship.x, y: runtime.ship.y - 25, width: 6, height: 18, speed: 700 });
}

function spawnEnemy(now) {
  runtime.lastEnemy = now;
  const defs = runtime.cfg.targets || [];
  const def = pickWeightedTarget(defs);
  if (!def) return;
  const baseSize = 34;
  const sizeMultiplier = def.sizeMultiplier || 1;
  const size = Math.round(baseSize * sizeMultiplier);
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
    assetUrl: def.iconUrl || '',
    imageKey: def.iconUrl || ''
  });
}

function spawnObstacle(now) {
  runtime.lastObstacle = now;
  const defs = runtime.cfg.obstacles || [];
  const def = defs[Math.floor(Math.random() * defs.length)];
  if (!def) return;
  const size = def.code === 'planet' ? 64 : 46;
  const assetUrl = def.imageUrl || def.iconUrl || '';
  runtime.obstacles.push({
    x: 50 + Math.random() * 800,
    y: -40,
    width: size,
    height: size,
    speed: def.code === 'planet' ? 120 : 180,
    damage: def.damage || 1,
    code: def.code,
    assetUrl,
    imageKey: assetUrl
  });
}

function updateObjects(dt) {
  runtime.bullets.forEach((b) => { b.y -= b.speed * dt; });
  runtime.enemies.forEach((e) => { e.y += e.speed * dt; });
  runtime.obstacles.forEach((o) => {
    o.y += o.speed * dt;
    o.x += Math.sin(o.y / 35) * dt * (o.code === 'planet' ? 45 : 70);
  });
  runtime.particles.forEach((p) => {
    p.y += p.vy * dt;
    p.x += p.vx * dt;
    p.life -= dt;
  });
  runtime.bullets = runtime.bullets.filter((b) => b.y > -30);
  runtime.enemies = runtime.enemies.filter((e) => e.y < runtime.canvas.height + 40);
  runtime.obstacles = runtime.obstacles.filter((o) => o.y < runtime.canvas.height + 70);
  runtime.particles = runtime.particles.filter((p) => p.life > 0);
}

function collide(now) {
  for (let i = runtime.bullets.length - 1; i >= 0; i -= 1) {
    for (let j = runtime.enemies.length - 1; j >= 0; j -= 1) {
      if (hit(runtime.bullets[i], runtime.enemies[j])) {
        runtime.bullets.splice(i, 1);
        runtime.enemies[j].health -= 1;
        spawnBurst(runtime.enemies[j].x, runtime.enemies[j].y, colors[runtime.enemies[j].code] || '#fff', runtime.graphics.hitBurst);

        if (runtime.enemies[j].health <= 0) {
          runtime.score += runtime.enemies[j].points;
          runtime.destroyed += 1;
          runtime.gemsEarned = Math.floor(runtime.score / (runtime.cfg.gemThresholdScore || 1000));
          spawnBurst(runtime.enemies[j].x, runtime.enemies[j].y, colors[runtime.enemies[j].code] || '#fff', runtime.graphics.killBurst);
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
      spawnBurst(runtime.enemies[i].x, runtime.enemies[i].y, colors[runtime.enemies[i].code] || '#fff', runtime.graphics.obstacleBurst);
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
      spawnBurst(runtime.obstacles[i].x, runtime.obstacles[i].y, colors[runtime.obstacles[i].code] || '#fff', runtime.graphics.obstacleBurst);
      runtime.obstacles.splice(i, 1);
      break;
    }
  }
}

function draw() {
  const { ctx, canvas } = runtime;
  ctx.fillStyle = runtime.backgroundGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  runtime.stars.forEach((star) => { ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(star.x, star.y, star.s, 0, Math.PI * 2); ctx.fill(); });
  runtime.bullets.forEach((b) => { ctx.fillStyle = '#7af8ff'; ctx.fillRect(b.x - 3, b.y - 9, 6, 18); });
  runtime.enemies.forEach((e) => drawEntity(e, colors[e.code] || '#6ee7ff', e.code.slice(-1)));
  runtime.obstacles.forEach((o) => drawEntity(o, colors[o.code] || '#ddd', o.code === 'planet' ? 'P' : 'A'));
  runtime.particles.forEach((p) => {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    if (runtime.graphics.shadowBlur > 0) {
      ctx.shadowBlur = runtime.graphics.shadowBlur;
      ctx.shadowColor = p.color;
    }
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  });
  const flicker = performance.now() < runtime.invulnerableUntil && Math.floor(performance.now() / 90) % 2 === 0;
  if (!flicker) drawShip();
}

function drawEntity(entity, color, label) {
  const loadedImage = entity.imageKey ? assetCache.get(entity.imageKey) : null;
  if (loadedImage?.status === 'loaded') {
    runtime.ctx.drawImage(
      loadedImage.image,
      entity.x - entity.width / 2,
      entity.y - entity.height / 2,
      entity.width,
      entity.height
    );
    if (typeof entity.health === 'number' && typeof entity.maxHealth === 'number' && entity.maxHealth > 1) {
      drawHealthBar(entity);
    }
    return;
  }

  drawFallbackCircle(entity.x, entity.y, entity.width / 2, color, label);
  if (typeof entity.health === 'number' && typeof entity.maxHealth === 'number' && entity.maxHealth > 1) {
    drawHealthBar(entity);
  }
}

function drawFallbackCircle(x, y, radius, color, label) {
  const { ctx } = runtime;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#07111f';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, x, y + 4);
}

function drawHealthBar(entity) {
  const barWidth = entity.width;
  const barHeight = 5;
  const x = entity.x - barWidth / 2;
  const y = entity.y - entity.height / 2 - 10;
  const ratio = clamp(entity.health / entity.maxHealth, 0, 1);

  runtime.ctx.fillStyle = 'rgba(3, 9, 20, 0.65)';
  runtime.ctx.fillRect(x, y, barWidth, barHeight);
  runtime.ctx.fillStyle = ratio > 0.5 ? '#4ade80' : ratio > 0.25 ? '#facc15' : '#fb7185';
  runtime.ctx.fillRect(x, y, barWidth * ratio, barHeight);
}

function drawShip() {
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
    ctx.drawImage(
      loadedImage.image,
      -ship.width / 2,
      -ship.height / 2,
      ship.width,
      ship.height
    );
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

async function stopRuntime(manual) {
  return stopRuntimeInternal({ submit: !manual, returnToTitle: manual, closeShell: false, message: manual ? 'Run stopped.' : null });
}

async function stopRuntimeInternal(options = {}) {
  if (!runtime) return;
  const activeModule = gameModules[runtime.mode];
  runtime.running = false;
  if (runtime.frame) cancelAnimationFrame(runtime.frame);
  if (runtime.timer) window.clearInterval(runtime.timer);
  activeModule?.cleanup?.(runtime, createGameRuntimeContext());
  const ended = runtime;
  runtime = null;
  document.getElementById('start-btn').disabled = !selectedGameId;
  document.getElementById('stop-btn').disabled = true;
  try {
    if (options.submit && !ended.submitted) {
      ended.submitted = true;
      const response = await GameService.submitScore(ended.cfg.gameId, ended.cfg.sessionId, {
        score: ended.score,
        livesRemaining: Math.max(0, ended.lives),
        enemiesDestroyed: ended.destroyed,
        obstaclesHit: ended.hits,
        gameOver: true
      });
      const awardedGems = response?.data?.gemsAwarded ?? ended.gemsEarned;
      showAlert(`Run saved. You earned ${awardedGems} gem(s).`, 'success');
    }
  } catch (error) {
    showAlert(error.message || 'Cannot submit score.', 'warning');
  }
  await loadWalletGems();
  await loadLeaderboard(ended.cfg.gameId);

  if (options.closeShell) {
    closeGameShell();
    return;
  }

  showGameShellMenu('title');
  activeModule?.drawIdle?.(createGameRuntimeContext());
}

function pauseGameplay() {
  if (!runtime || runtime.paused) return;
  runtime.paused = true;
  cancelAnimationFrame(runtime.frame);
  showGameShellMenu('pause');
}

function resumeGameplay() {
  if (!runtime || !runtime.paused) return;
  const activeModule = gameModules[runtime.mode];
  runtime.paused = false;
  document.getElementById('game-shell-overlay').style.display = 'none';
  activeModule?.resume?.(createGameRuntimeContext(), runtime);
}

function exitGameplayToTitle(saveScore) {
  if (!runtime) {
    showGameShellMenu('title');
    return;
  }
  stopRuntimeInternal({ submit: saveScore, returnToTitle: true, closeShell: false });
}

function handleGameKeydown(event) {
  if (event.key !== 'Escape') return;
  const shellVisible = document.getElementById('game-shell')?.style.display === 'flex';
  if (!shellVisible) return;

  if (runtime?.running && !runtime?.paused) {
    event.preventDefault();
    pauseGameplay();
    return;
  }

  if (runtime?.paused) {
    event.preventDefault();
    resumeGameplay();
  }
}

function renderAssets(id, items, isTarget) {
  const box = document.getElementById(id);
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
}

function renderShipAsset(cfg) {
  const box = document.getElementById('ship-box');
  const shipAssetUrl = cfg.shipAssetUrl || '';
  box.innerHTML = `
    <div class="asset-row">
      <div class="asset-preview">${shipAssetUrl ? `<img src="${shipAssetUrl}" alt="Ship" class="asset-preview-image" />` : 'SHIP'}</div>
      <div>
        <div class="fw-semibold">Player ship</div>
        <div class="small text-muted">Free movement in the whole arena</div>
        <div class="tiny text-muted">asset: ${shipAssetUrl || '(add ship asset URL in backend GameService.DEFAULT_SHIP_ASSET_URL)'}</div>
      </div>
    </div>
  `;
}

function drawIdle() {
  const canvas = document.getElementById('game-shell-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#081122';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const profile = getGraphicsProfile();
  for (let i = 0; i < profile.idleStars; i += 1) drawStar(ctx, Math.random() * canvas.width, Math.random() * canvas.height, 1 + Math.random() * 1.8);
}

function drawStar(ctx, x, y, r) { ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
function renderAssetPreview(item, isTarget) {
  const assetUrl = isTarget ? (item.iconUrl || '') : (item.imageUrl || item.iconUrl || '');
  if (assetUrl) {
    return `<img src="${assetUrl}" alt="${item.name}" class="asset-preview-image" />`;
  }
  return (item.code || '?').toUpperCase();
}
function preloadAssets(cfg) {
  const urls = [
    cfg.shipAssetUrl,
    ...(cfg.targets || []).map((item) => item.iconUrl).filter(Boolean),
    ...(cfg.obstacles || []).flatMap((item) => [item.imageUrl, item.iconUrl]).filter(Boolean)
  ];

  urls.forEach((url) => {
    if (!url || assetCache.has(url)) return;

    const image = new Image();
    assetCache.set(url, { status: 'loading', image });
    image.onload = () => assetCache.set(url, { status: 'loaded', image });
    image.onerror = () => assetCache.set(url, { status: 'error', image: null });
    image.src = url;
  });
}
function spawnBurst(x, y, color, count = 8) {
  const profile = runtime?.graphics || getGraphicsProfile();
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
function resetMetrics() {
  const mode = resolveGameMode(getSelectedGame());
  ['score', 'destroyed', 'hits', 'gems-earned'].forEach((k) => document.getElementById(`${k}-value`).textContent = '0');
  document.getElementById('lives-value').textContent = mode === 'poker' ? String(pokerSetup.totalPlayers) : mode === 'caro' ? 'Binh thuong' : '3';
  document.getElementById('wallet-gems-value').textContent = formatGemValue(walletGems);
  document.getElementById('hud-score').textContent = '0';
  document.getElementById('hud-time').textContent = '00:00';
  document.getElementById('hud-lives').textContent = mode === 'cosmic' ? '3' : '0';
}
function syncMetrics() {
  const isPoker = runtime.mode === 'poker';
  const isCaro = runtime.mode === 'caro';
  document.getElementById('score-value').textContent = runtime.score;
  document.getElementById('lives-value').textContent = isPoker ? runtime.poker.totalPlayers : isCaro ? ({ easy: 'De', normal: 'Binh thuong', hard: 'Kho' }[runtime.caro.difficulty] || 'Binh thuong') : Math.max(0, runtime.lives);
  document.getElementById('destroyed-value').textContent = isPoker ? runtime.poker.handsWon : runtime.destroyed;
  document.getElementById('hits-value').textContent = isPoker ? Math.max(0, runtime.poker.round - 1) : runtime.hits;
  document.getElementById('gems-earned-value').textContent = isCaro ? (pointWallet.availablePoints || 0) : runtime.gemsEarned;
  document.getElementById('hud-score').textContent = runtime.score;
  document.getElementById('hud-time').textContent = formatElapsedTime((performance.now() - runtime.startedAt) / 1000);
  document.getElementById('hud-lives').textContent = Math.max(0, runtime.lives);
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
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function hit(a, b) { return Math.abs(a.x - b.x) * 2 < (a.width + b.width) && Math.abs(a.y - b.y) * 2 < (a.height + b.height); }
function showAlert(message, type) { const box = document.getElementById('alert-container'); if (!box) return; box.innerHTML = `<div class="alert alert-${type}">${message}</div>`; setTimeout(() => { if (box) box.innerHTML = ''; }, 3500); }
function formatGemValue(value) { return Number(value || 0).toFixed(0); }
function formatElapsedTime(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds || 0));
  const minutes = String(Math.floor(seconds / 60)).padStart(2, '0');
  const remain = String(seconds % 60).padStart(2, '0');
  return `${minutes}:${remain}`;
}

function injectStyles() {
  if (document.getElementById('games-styles')) return;
  const style = document.createElement('style');
  style.id = 'games-styles';
  style.textContent = `
    .game-list,.asset-list{display:grid;gap:.8rem}
    .game-item{display:grid;grid-template-columns:54px 1fr;gap:.8rem;width:100%;text-align:left;padding:.9rem;border:1px solid rgba(15,30,60,.1);border-radius:16px;background:#fff}
    .game-item.active,.game-item:hover{box-shadow:0 18px 36px rgba(10,28,68,.12);border-color:rgba(67,97,238,.35)}
    .badge-icon,.asset-preview{width:54px;height:54px;border-radius:16px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#1f6feb,#68d8ff);color:#fff;font-weight:700;overflow:hidden}
    .asset-preview-image{width:100%;height:100%;object-fit:cover}
    .metric{padding:1rem;border-radius:16px;background:#f5f8ff;border:1px solid rgba(40,68,138,.12);display:flex;flex-direction:column}
    .metric span{font-size:.78rem;text-transform:uppercase;color:#61708d}
    .metric strong{font-size:1.7rem;color:#132344}
    .stage-wrap{position:relative;border-radius:20px;overflow:hidden;background:#050816;border:1px solid rgba(15,30,60,.16);min-height:180px}
    .stage-placeholder{min-height:180px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:1.5rem;color:#fff;background:radial-gradient(circle at top,#19315f,#091223 70%)}
    .game-shell-backdrop{position:fixed;inset:0;z-index:1100;display:flex;align-items:center;justify-content:center;padding:2rem;background:rgba(4,10,24,.62);backdrop-filter:blur(4px)}
    .game-shell-panel{width:min(1320px,96vw);height:min(860px,92vh);background:#071120;border:1px solid rgba(255,255,255,.08);border-radius:28px;box-shadow:0 40px 80px rgba(2,6,16,.45);padding:1rem}
    .game-shell-stage{position:relative;width:100%;height:100%;border-radius:22px;overflow:hidden;background:#050816}
    .game-hud{position:absolute;top:16px;left:16px;z-index:3;display:flex;gap:.75rem}
    .game-hud__chip{background:rgba(5,12,28,.78);color:#fff;padding:.55rem .8rem;border-radius:999px;border:1px solid rgba(255,255,255,.12);font-size:.9rem}
    .game-hud__chip strong{margin-left:.35rem}
    .game-hud__chip--lives{color:#ffd5e4}
    .game-hud__icon{display:inline-flex;align-items:center;justify-content:center;font-size:1rem;line-height:1;text-shadow:0 0 10px rgba(255,91,145,.35)}
    #game-shell-canvas{width:100%;height:100%;display:block;cursor:crosshair}
    .game-shell-content{position:absolute;inset:0;overflow:auto;padding:2rem;background:radial-gradient(circle at top,#13325a 0,#0b1628 58%,#08101c 100%)}
    .game-shell-overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:2rem;background:rgba(4,10,24,.48)}
    .game-shell-menu{width:min(860px,100%);max-height:min(82vh,720px);overflow:auto;padding:1.4rem 1.6rem;border-radius:28px;background:linear-gradient(135deg,rgba(9,18,37,.96),rgba(18,35,70,.94));color:#fff;box-shadow:0 30px 60px rgba(0,0,0,.35);display:flex;flex-direction:column;gap:1rem}
    .game-shell-menu__eyebrow{letter-spacing:.18em;text-transform:uppercase;color:#89ddff;font-size:.75rem;margin-bottom:.75rem}
    .game-shell-menu h2{color:#dccbff;text-shadow:0 0 18px rgba(173,140,255,.24),0 0 36px rgba(111,211,255,.18);font-weight:800}
    .game-shell-menu p.text-muted{color:#c9d6f2 !important}
    .game-shell-balance-row{display:flex;gap:1rem;flex-wrap:wrap;margin:-.2rem 0 1rem;color:#dce8ff}
    .game-shell-balance-row strong{color:#fff}
    .game-shell-menu__actions{display:flex;gap:.85rem;flex-wrap:wrap;position:sticky;bottom:0;padding-top:.75rem;background:linear-gradient(180deg,rgba(9,18,37,0),rgba(9,18,37,.92) 24%)}
    .game-shell-settings,.game-shell-leaderboard{display:grid;gap:.7rem}
    .game-shell-setting-row,.game-shell-leaderboard__row{display:flex;justify-content:space-between;gap:1rem;padding:.9rem 1rem;border-radius:16px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08)}
    .game-shell-setting-row--stack{align-items:flex-start;flex-direction:column;padding:.75rem .9rem}
    .graphics-pills{display:flex;gap:.75rem;flex-wrap:wrap}
    .graphics-pill{border:1px solid rgba(137,221,255,.25);background:rgba(10,22,44,.72);color:#d6e7ff;padding:.55rem .95rem;border-radius:999px;transition:.2s ease}
    .graphics-pill:hover{border-color:rgba(137,221,255,.52);transform:translateY(-1px)}
    .graphics-pill.is-active{background:linear-gradient(135deg,#5ee7ff,#b495ff);color:#071120;border-color:transparent;font-weight:700;box-shadow:0 10px 24px rgba(120,174,255,.25)}
    .subcard{height:100%;padding:1rem;border-radius:16px;background:#f8fbff}
    .asset-row,.lb-row{display:grid;grid-template-columns:54px 1fr auto;gap:.8rem;align-items:center;padding:.85rem;border-radius:14px;background:#fff;border:1px solid rgba(15,30,60,.08)}
    .poker-table-view{display:grid;gap:1rem;min-height:100%}
    .poker-topbar{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start}
    .poker-table-header__eyebrow{letter-spacing:.18em;text-transform:uppercase;color:#9fdfff;font-size:.75rem;margin-bottom:.45rem}
    .poker-topbar h3{color:#fff}
    .poker-status{display:flex;gap:.8rem;flex-wrap:wrap}
    .poker-status__item{min-width:120px;padding:.8rem .9rem;border-radius:18px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.08);color:#d6e7ff;display:flex;flex-direction:column}
    .poker-status__item span{font-size:.72rem;text-transform:uppercase;color:#9bb4d9}
    .poker-status__item strong{font-size:1.2rem;color:#fff}
    .poker-table-felt--perspective{position:relative;min-height:560px;padding:1.5rem;border-radius:32px;background:radial-gradient(circle at top,#1f7a4c 0,#145536 48%,#0c3321 100%);border:1px solid rgba(255,255,255,.08);box-shadow:inset 0 0 0 1px rgba(255,255,255,.04),0 18px 40px rgba(0,0,0,.24)}
    .poker-pot{position:absolute;top:78px;left:50%;transform:translateX(-50%);padding:.5rem 1.2rem;border-radius:999px;background:rgba(3,8,16,.82);border:1px solid rgba(255,255,255,.14);color:#fff;font-size:2rem;font-weight:800;box-shadow:0 16px 36px rgba(0,0,0,.25)}
    .poker-community{position:absolute;top:170px;left:50%;transform:translateX(-50%);display:flex;gap:.6rem}
    .poker-opponent-seat,.poker-player-seat{position:absolute;display:grid;gap:.65rem;justify-items:center}
    .poker-opponent-seat--top-left{top:120px;left:42px}
    .poker-opponent-seat--top-right{top:120px;right:42px}
    .poker-opponent-seat--right{top:330px;right:52px}
    .poker-player-seat{left:50%;bottom:34px;transform:translateX(-50%)}
    .poker-seat-label{padding:.35rem .8rem;border-radius:12px;background:linear-gradient(180deg,#c21a1a,#781010);border:2px solid #3f0303;color:#fff;display:flex;gap:.55rem;align-items:center;box-shadow:0 10px 22px rgba(0,0,0,.22)}
    .poker-seat-label--you{background:linear-gradient(180deg,#d83517,#91120a)}
    .poker-seat-label__chips{font-size:.85rem;color:#ffe9a7}
    .poker-cards{display:flex;gap:.45rem}
    .poker-cards--opponent .poker-card{transform:rotate(-6deg)}
    .poker-cards--opponent .poker-card:last-child{transform:rotate(6deg);margin-left:-18px}
    .poker-cards--player .poker-card:first-child{transform:rotate(-9deg)}
    .poker-cards--player .poker-card:last-child{transform:rotate(9deg);margin-left:-10px}
    .poker-seat-bet{min-height:20px;font-size:.86rem;color:#e5edf9}
    .poker-opponent-seat.is-folded{opacity:.58}
    .poker-chip-stack{display:flex;align-items:center;gap:.35rem;padding:.3rem .6rem;border-radius:999px;background:rgba(4,10,18,.72);border:1px solid rgba(255,255,255,.1);color:#fff;box-shadow:0 10px 22px rgba(0,0,0,.2)}
    .poker-winning-hand{padding:.28rem .7rem;border-radius:999px;background:rgba(255,227,130,.16);border:1px solid rgba(255,227,130,.35);color:#ffe891;font-size:.8rem;font-weight:700;letter-spacing:.04em}
    .poker-winner-crown{position:absolute;top:-18px;right:-4px;padding:.2rem .45rem;border-radius:999px;background:linear-gradient(180deg,#ffe38b,#e5b52b);color:#3b2200;font-size:.62rem;font-weight:900;box-shadow:0 10px 24px rgba(255,215,86,.22)}
    .poker-fireworks{position:absolute;inset:-18px -16px auto auto;pointer-events:none}
    .poker-firework{position:absolute;width:14px;height:14px;border-radius:50%;opacity:.8;animation:pokerBurst 1s ease-out infinite}
    .poker-firework--a{top:18px;right:46px;background:#ff6b6b}
    .poker-firework--b{top:2px;right:18px;background:#ffd166;animation-delay:.2s}
    .poker-firework--c{top:34px;right:8px;background:#67e8f9;animation-delay:.4s}
    .poker-action-fx{position:absolute;top:-8px;left:50%;transform:translateX(-50%);display:grid;justify-items:center;gap:.1rem;padding:.4rem .65rem;border-radius:14px;background:rgba(5,12,24,.82);border:1px solid rgba(255,255,255,.14);color:#fff;animation:pokerFloat 900ms ease-out forwards;box-shadow:0 12px 28px rgba(0,0,0,.22)}
    .poker-action-fx strong{font-size:.82rem}
    .poker-action-fx span{font-size:.76rem;color:#d3e5ff}
    .poker-action-fx--raise{border-color:rgba(255,209,102,.42);color:#ffe08a}
    .poker-action-fx--call{border-color:rgba(103,232,249,.42)}
    .poker-action-fx--fold{border-color:rgba(251,113,133,.42);color:#ffb4c4}
    .poker-chip{width:16px;height:16px;border-radius:50%;display:inline-block;border:2px solid rgba(255,255,255,.75);box-shadow:0 2px 0 rgba(0,0,0,.2)}
    .poker-chip--blue{background:#2b6dff}
    .poker-chip--gold{background:#f4c542}
    .poker-chip--red{background:#df3d3d}
    .poker-card{width:68px;height:96px;border-radius:14px;background:#f8fbff;color:#132344;border:1px solid rgba(19,35,68,.16);display:flex;flex-direction:column;justify-content:space-between;padding:.45rem .5rem;font-weight:700;box-shadow:0 10px 24px rgba(3,7,16,.18)}
    .poker-card small{font-size:1.1rem;line-height:1}
    .poker-card.is-red{color:#d64045}
    .poker-card--back{background:linear-gradient(135deg,#0d2140,#183868);border-color:rgba(180,214,255,.24);position:relative;overflow:hidden}
    .poker-card--back::after{content:'';position:absolute;inset:8px;border-radius:10px;border:1px solid rgba(255,255,255,.28);background:repeating-linear-gradient(45deg,rgba(255,255,255,.08) 0 6px,rgba(255,255,255,0) 6px 12px)}
    .poker-card--slot{background:rgba(255,255,255,.06);border:1px dashed rgba(255,255,255,.18);box-shadow:none}
    .poker-controls{display:flex;justify-content:space-between;gap:1rem;align-items:flex-end}
    .poker-controls__left{flex:1;display:grid;gap:.5rem}
    .poker-controls__right{display:flex;gap:.8rem;flex-wrap:wrap;justify-content:flex-end}
    .poker-slider-row{display:grid;grid-template-columns:auto 1fr auto;gap:.85rem;align-items:center;padding:.85rem 1rem;border-radius:18px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.08);color:#e3edff}
    .poker-slider-row input{width:100%}
    .caro-view{display:grid;gap:1rem;min-height:100%}
    .caro-topbar{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start}
    .caro-board-wrap{padding:1rem;border-radius:28px;background:linear-gradient(180deg,#f3d9aa,#dfb26b);box-shadow:inset 0 0 0 2px rgba(83,45,7,.22)}
    .caro-board{display:grid;gap:2px;background:#7a4b1e;padding:2px;border-radius:18px}
    .caro-cell{aspect-ratio:1/1;border:none;border-radius:6px;background:#f9e6bd;color:#3a1f03;font-weight:800;font-size:clamp(.8rem,1.3vw,1.15rem);display:flex;align-items:center;justify-content:center;transition:.15s ease}
    .caro-cell:hover:not(:disabled){background:#fff3d2;transform:translateY(-1px)}
    .caro-cell.is-x{color:#dc2626;background:#fff1df}
    .caro-cell.is-o{color:#1d4ed8;background:#eef5ff}
    .caro-controls{display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap}
    @keyframes pokerFloat{0%{opacity:0;transform:translate(-50%,12px) scale(.92)}20%{opacity:1}100%{opacity:0;transform:translate(-50%,-42px) scale(1.04)}}
    @keyframes pokerBurst{0%{transform:scale(.5);opacity:0}25%{opacity:1}100%{transform:translateY(-18px) scale(1.45);opacity:0}}
    .tiny{font-size:.75rem}
    @media(max-width:991px){.lb-row,.asset-row,.game-shell-menu__actions,.game-shell-setting-row,.game-shell-leaderboard__row{grid-template-columns:1fr;display:grid}.game-shell-panel{width:96vw;height:92vh;padding:.6rem}.game-shell-menu{padding:1rem;max-height:84vh}.game-hud{flex-direction:column;gap:.5rem}.game-shell-content{padding:1rem}.poker-topbar,.poker-status,.poker-controls,.poker-controls__right{display:grid}.poker-table-felt--perspective{min-height:700px}.poker-community{top:200px;transform:translateX(-50%) scale(.86)}.poker-pot{top:112px;font-size:1.5rem}.poker-opponent-seat--top-left{top:74px;left:18px}.poker-opponent-seat--top-right{top:74px;right:18px}.poker-opponent-seat--right{top:304px;right:12px}.poker-player-seat{bottom:22px}.poker-card{width:58px;height:84px}}
  `;
  document.head.appendChild(style);
}
