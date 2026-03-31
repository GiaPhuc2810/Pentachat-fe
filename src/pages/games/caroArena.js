import { GAME_MODES } from './gameModes.js';

const CARO_REWARDS = {
  easy: 100,
  normal: 300,
  hard: 500
};

const LABELS = {
  easy: 'De',
  normal: 'Binh thuong',
  hard: 'Kho'
};

export const caroArenaModule = {
  mode: GAME_MODES.CARO,
  getShellEyebrow() {
    return 'Dau Co Caro';
  },
  getTitleDescription(game) {
    return game?.description || 'Danh caro voi bot 3 cap do. Thang van se nhan diem va co the doi diem sang gem.';
  },
  getMetricLabels() {
    return {
      score: 'Diem van',
      lives: 'Do kho',
      destroyed: 'Van thang',
      hits: 'Nuoc di',
      gemsEarned: 'Diem game',
      walletGems: 'Gem hien co'
    };
  },
  getStageContent() {
    return {
      title: 'Ban Co Caro',
      description: 'Choi voi bot 3 do kho. Thang van: de 100, binh thuong 300, kho 500 diem.'
    };
  },
  getPanelContent(caroSetup = { difficulty: 'normal' }, pointWallet = { availablePoints: 0 }) {
    return {
      firstTitle: 'Muc tieu',
      secondTitle: 'Do kho',
      thirdTitle: 'Diem game',
      firstBody: '<div class="small text-muted">Xep 5 quan lien tiep theo hang, cot hoac duong cheo de danh bai bot.</div>',
      secondBody: `<div class="small text-muted">Che do hien tai: <strong>${LABELS[caroSetup.difficulty] || LABELS.normal}</strong>. Thuong thang: <strong>${CARO_REWARDS[caroSetup.difficulty] || CARO_REWARDS.normal}</strong> diem.</div>`,
      thirdBody: `<div class="small text-muted">Diem co the doi: <strong>${pointWallet.availablePoints || 0}</strong>. 1000 diem = 1 gem.</div>`
    };
  },
  getSettingsMeta(caroSetup = { difficulty: 'normal' }) {
    return {
      title: 'Cau hinh Caro',
      primaryActionLabel: 'Do kho',
      primaryActionValue: LABELS[caroSetup.difficulty] || LABELS.normal
    };
  },
  start(ctx, cfg) {
    const runtime = {
      mode: GAME_MODES.CARO,
      cfg,
      running: true,
      paused: false,
      submitted: false,
      score: 0,
      lives: 0,
      destroyed: 0,
      hits: 0,
      gemsEarned: ctx.getPointWallet?.()?.availablePoints || 0,
      startedAt: performance.now(),
      timer: window.setInterval(() => ctx.syncMetrics(), 1000),
      caro: createCaroState(ctx, cfg)
    };

    ctx.setRuntime(runtime);
    ctx.syncMetrics();
    renderCaroBoard(runtime, ctx);
  },
  resume() {},
  onGraphicsChanged() {},
  cleanup() {}
};

function createCaroState(ctx, cfg) {
  const boardSize = cfg.boardSize || 15;
  const difficulty = ctx.getCaroSetup?.()?.difficulty || 'normal';
  return {
    boardSize,
    difficulty,
    board: Array.from({ length: boardSize }, () => Array(boardSize).fill('')),
    currentTurn: 'X',
    humanMark: 'X',
    botMark: 'O',
    locked: false,
    ended: false,
    winner: '',
    message: `Ban di truoc. Do kho ${LABELS[difficulty]}.`
  };
}

function renderCaroBoard(runtime, ctx) {
  const content = document.getElementById('game-shell-content');
  if (!content || !runtime?.caro) return;

  const caro = runtime.caro;
  const pointWallet = ctx.getPointWallet?.() || { availablePoints: 0 };
  const reward = CARO_REWARDS[caro.difficulty] || 0;

  content.innerHTML = `
    <div class="caro-view">
      <div class="caro-topbar">
        <div>
          <div class="poker-table-header__eyebrow">Co Caro</div>
          <h3 class="mb-1">Danh voi bot</h3>
          <p class="mb-0 text-muted">${caro.message}</p>
        </div>
        <div class="poker-status">
          <div class="poker-status__item"><span>Do kho</span><strong>${LABELS[caro.difficulty]}</strong></div>
          <div class="poker-status__item"><span>Thuong thang</span><strong>${reward}</strong></div>
          <div class="poker-status__item"><span>Diem co the doi</span><strong>${pointWallet.availablePoints || 0}</strong></div>
        </div>
      </div>
      <div class="caro-board-wrap">
        <div class="caro-board" style="grid-template-columns: repeat(${caro.boardSize}, minmax(0, 1fr));">
          ${caro.board.flatMap((row, rowIndex) => row.map((cell, colIndex) => `
            <button class="caro-cell ${cell ? `is-${cell.toLowerCase()}` : ''}" data-caro-row="${rowIndex}" data-caro-col="${colIndex}" ${cell || caro.locked || caro.ended ? 'disabled' : ''}>
              ${cell || ''}
            </button>
          `)).join('')}
        </div>
      </div>
      <div class="caro-controls">
        <div class="small text-muted">Thang de nhan diem. Diem duoc luu theo tai khoan va co the doi sang gem trong menu.</div>
        <div class="game-shell-menu__actions">
          <button class="btn btn-primary" id="caro-new-match-btn">Van moi</button>
          <button class="btn btn-outline-light" id="caro-exit-btn">Ve menu</button>
        </div>
      </div>
    </div>
  `;

  content.querySelectorAll('[data-caro-row]').forEach((button) => {
    button.addEventListener('click', () => handleHumanMove(runtime, ctx, Number(button.dataset.caroRow), Number(button.dataset.caroCol)));
  });
  document.getElementById('caro-new-match-btn')?.addEventListener('click', () => {
    runtime.caro = createCaroState(ctx, runtime.cfg);
    runtime.score = 0;
    runtime.hits = 0;
    ctx.syncMetrics();
    renderCaroBoard(runtime, ctx);
  });
  document.getElementById('caro-exit-btn')?.addEventListener('click', () => ctx.exitGameplayToTitle(runtime.submitted));
}

function handleHumanMove(runtime, ctx, row, col) {
  const caro = runtime.caro;
  if (caro.ended || caro.locked || caro.board[row][col]) return;

  caro.board[row][col] = caro.humanMark;
  runtime.hits += 1;

  if (isWinningMove(caro.board, row, col, caro.humanMark)) {
    finishMatch(runtime, ctx, 'win');
    return;
  }

  if (isBoardFull(caro.board)) {
    finishMatch(runtime, ctx, 'draw');
    return;
  }

  caro.locked = true;
  caro.message = 'Bot dang suy nghi...';
  renderCaroBoard(runtime, ctx);

  window.setTimeout(() => {
    const move = pickBotMove(caro.board, caro.difficulty, caro.botMark, caro.humanMark);
    if (move) {
      caro.board[move.row][move.col] = caro.botMark;
      if (isWinningMove(caro.board, move.row, move.col, caro.botMark)) {
        finishMatch(runtime, ctx, 'lose');
        return;
      }
    }

    if (isBoardFull(caro.board)) {
      finishMatch(runtime, ctx, 'draw');
      return;
    }

    caro.locked = false;
    caro.message = 'Den luot ban.';
    renderCaroBoard(runtime, ctx);
  }, caro.difficulty === 'hard' ? 220 : 140);
}

function finishMatch(runtime, ctx, result) {
  const caro = runtime.caro;
  caro.ended = true;
  caro.locked = true;
  runtime.destroyed += result === 'win' ? 1 : 0;
  runtime.score = result === 'win' ? (CARO_REWARDS[caro.difficulty] || 0) : 0;
  caro.message = result === 'win'
    ? `Ban thang va nhan ${runtime.score} diem.`
    : result === 'lose'
      ? 'Bot thang van nay.'
      : 'Hoa co.';
  ctx.syncMetrics();
  renderCaroBoard(runtime, ctx);
  window.setTimeout(async () => {
    if (!runtime.submitted) {
      runtime.lives = result === 'win' ? 1 : 0;
      await ctx.stopGame(false);
      await ctx.refreshPointWallet?.();
    }
  }, 900);
}

function pickBotMove(board, difficulty, botMark, humanMark) {
  const candidates = getCandidateMoves(board);
  if (!candidates.length) {
    return { row: Math.floor(board.length / 2), col: Math.floor(board.length / 2) };
  }

  if (difficulty === 'easy') {
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  const immediateWin = candidates.find((move) => wouldWin(board, move, botMark));
  if (immediateWin) return immediateWin;

  const immediateBlock = candidates.find((move) => wouldWin(board, move, humanMark));
  if (immediateBlock) return immediateBlock;

  const scored = candidates.map((move) => ({
    move,
    score: scoreMove(board, move, botMark, humanMark, difficulty === 'hard')
  })).sort((left, right) => right.score - left.score);

  if (difficulty === 'normal') {
    const top = scored.slice(0, Math.min(3, scored.length));
    return top[Math.floor(Math.random() * top.length)].move;
  }

  return scored[0].move;
}

function getCandidateMoves(board) {
  const moves = [];
  const occupied = [];
  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board.length; col += 1) {
      if (board[row][col]) occupied.push({ row, col });
    }
  }

  if (!occupied.length) {
    return [{ row: Math.floor(board.length / 2), col: Math.floor(board.length / 2) }];
  }

  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board.length; col += 1) {
      if (board[row][col]) continue;
      if (hasNeighbor(board, row, col, 2)) {
        moves.push({ row, col });
      }
    }
  }
  return moves;
}

function hasNeighbor(board, row, col, distance) {
  for (let r = Math.max(0, row - distance); r <= Math.min(board.length - 1, row + distance); r += 1) {
    for (let c = Math.max(0, col - distance); c <= Math.min(board.length - 1, col + distance); c += 1) {
      if (board[r][c]) return true;
    }
  }
  return false;
}

function wouldWin(board, move, mark) {
  board[move.row][move.col] = mark;
  const won = isWinningMove(board, move.row, move.col, mark);
  board[move.row][move.col] = '';
  return won;
}

function scoreMove(board, move, botMark, humanMark, hardMode) {
  const attack = evaluateAt(board, move, botMark);
  const defend = evaluateAt(board, move, humanMark);
  const center = 14 - (Math.abs(move.row - Math.floor(board.length / 2)) + Math.abs(move.col - Math.floor(board.length / 2)));
  return attack * (hardMode ? 1.35 : 1.1) + defend * (hardMode ? 1.25 : 1.05) + center;
}

function evaluateAt(board, move, mark) {
  const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
  return directions.reduce((best, [dr, dc]) => {
    const count = 1 + countDirection(board, move.row, move.col, dr, dc, mark) + countDirection(board, move.row, move.col, -dr, -dc, mark);
    const openEnds = countOpenEnds(board, move.row, move.col, dr, dc, mark) + countOpenEnds(board, move.row, move.col, -dr, -dc, mark);
    return Math.max(best, count * count * 12 + openEnds * 6);
  }, 0);
}

function countDirection(board, row, col, dr, dc, mark) {
  let count = 0;
  let r = row + dr;
  let c = col + dc;
  while (board[r]?.[c] === mark) {
    count += 1;
    r += dr;
    c += dc;
  }
  return count;
}

function countOpenEnds(board, row, col, dr, dc, mark) {
  let r = row + dr;
  let c = col + dc;
  while (board[r]?.[c] === mark) {
    r += dr;
    c += dc;
  }
  return board[r]?.[c] === '' ? 1 : 0;
}

function isWinningMove(board, row, col, mark) {
  const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
  return directions.some(([dr, dc]) => {
    const count = 1 + countDirection(board, row, col, dr, dc, mark) + countDirection(board, row, col, -dr, -dc, mark);
    return count >= 5;
  });
}

function isBoardFull(board) {
  return board.every((row) => row.every(Boolean));
}
