import AuthService from '../../services/auth.service.js';
import { GAME_MODES } from './gameModes.js';

const STARTING_STACK = 100;
const ANTE = 10;
const MIN_RAISE = 10;
const MAX_RAISE = 5000;
const PLAYER_POSITIONS = ['top-left', 'top-right', 'right', 'bottom'];

export const pokerRoyaleModule = {
  mode: GAME_MODES.POKER,
  getShellEyebrow() {
    return 'Ban Poker';
  },
  getTitleDescription(game) {
    return game?.description || 'Vao ban, dat cuoc va cho showdown o cuoi van.';
  },
  getMetricLabels() {
    return {
      score: 'Tien',
      lives: 'Cho ngoi',
      destroyed: 'Van thang',
      hits: 'Van da choi',
      gemsEarned: 'Gem nhan',
      walletGems: 'Gem hien co'
    };
  },
  getStageContent() {
    return {
      title: 'Ban Poker Royale',
      description: 'Nhin tu ghe cua ban, mo flop-turn-river va ra quyet dinh to, theo hay bo.'
    };
  },
  getPanelContent(pokerSetup) {
    return {
      firstTitle: 'Ban',
      secondTitle: 'Cho ngoi',
      thirdTitle: 'Bots',
      firstBody: '<div class="small text-muted">Ban choi theo kieu hold&apos;em: mo 3 la, toi la 4, toi la 5 roi moi showdown.</div>',
      secondBody: `<div class="small text-muted">Ban luon ngoi o vi tri duoi cung. So cho hien tai: <strong>${pokerSetup.totalPlayers}</strong>.</div>`,
      thirdBody: `<div class="small text-muted">Bot se ngoi cac ghe con lai. So bot hien tai: <strong>${pokerSetup.botCount}</strong>.</div>`
    };
  },
  getSettingsMeta() {
    return {
      title: 'Cau hinh ban',
      primaryActionLabel: 'Dat cuoc',
      primaryActionValue: 'Bo / Theo / To'
    };
  },
  start(ctx, cfg) {
    const session = AuthService.getSession();
    const participantNames = cfg.pokerParticipants?.length ? cfg.pokerParticipants : (ctx.getPokerRoom?.()?.members || []);
    const configuredBots = Number.isFinite(cfg.pokerBotCount) ? cfg.pokerBotCount : ctx.getPokerSetup().botCount;
    const remotePlayers = participantNames
      .filter((participant) => String(participant.userId) !== String(session.userId))
      .slice(0, PLAYER_POSITIONS.length - 1)
      .map((participant, index) => createPlayer(`user-${participant.userId}`, participant.username, 'bot', PLAYER_POSITIONS[index], STARTING_STACK));
    const availableBotSlots = Math.max(0, PLAYER_POSITIONS.length - 1 - remotePlayers.length);
    const botNames = (cfg.defaultBotNames || ['Nova Bot', 'Orion Bot', 'Luna Bot']).slice(0, Math.min(configuredBots, availableBotSlots));
    const players = [
      createPlayer(`user-${session.userId}`, session.username, 'human', PLAYER_POSITIONS[3], Math.max(0, ctx.getPokerChipBank() || STARTING_STACK)),
      ...remotePlayers,
      ...botNames.map((name, index) => createPlayer(`bot-${index + 1}`, name, 'bot', PLAYER_POSITIONS[remotePlayers.length + index], STARTING_STACK))
    ];

    const runtime = {
      mode: GAME_MODES.POKER,
      cfg,
      running: true,
      paused: false,
      submitted: false,
      score: STARTING_STACK,
      lives: 0,
      destroyed: 0,
      hits: 0,
      gemsEarned: 0,
      startedAt: performance.now(),
      timer: window.setInterval(() => ctx.syncMetrics(), 1000),
      poker: {
        round: 1,
        totalPlayers: players.length,
        botCount: players.filter((player) => player.type === 'bot').length,
        handsWon: 0,
        handsPlayed: 0,
        players,
        deck: [],
        communityCards: [],
        revealedCommunityCount: 0,
        stage: 'waiting',
        stageLabel: 'San sang',
        activeRound: false,
        showdown: false,
        winners: [],
        winningLabel: '',
        pot: 0,
        currentBet: 0,
        raiseAmount: MIN_RAISE,
        message: 'Bam Bat dau van moi de dat tien ban dau va mo 3 la giua.',
        history: [],
        actionEffects: [],
        userId: `user-${session.userId}`
      }
    };

    ctx.setRuntime(runtime);
    syncRuntimeScore(runtime);
    ctx.syncMetrics();
    renderPokerTable(runtime, ctx);
  },
  resume() {},
  onGraphicsChanged() {},
  cleanup(runtime, ctx) {
    const user = runtime?.poker?.players?.find((player) => player.id === runtime.poker.userId);
    if (user) {
      ctx.setPokerChipBank(user.stack);
    }
  }
};

function createPlayer(id, name, type, seat, stack = STARTING_STACK) {
  return {
    id,
    name,
    type,
    seat,
    stack,
    cards: [],
    folded: false,
    currentBet: 0,
    totalCommitted: 0,
    result: null
  };
}

function renderPokerTable(runtime, ctx) {
  const content = document.getElementById('game-shell-content');
  if (!content || !runtime?.poker) return;

  const poker = runtime.poker;
  const user = getUserPlayer(runtime);
  const activePlayers = poker.players.filter((player) => !player.folded && player.stack >= 0);
  const callAmount = Math.max(0, poker.currentBet - user.currentBet);
  const availableRaise = Math.max(0, user.stack + user.currentBet);
  const sliderMin = availableRaise > 0 ? Math.min(MIN_RAISE, availableRaise) : 0;
  const sliderMax = availableRaise > 0 ? Math.min(MAX_RAISE, availableRaise) : 0;
  const sliderStep = sliderMax > 0 && sliderMax < 10 ? 1 : 10;
  poker.raiseAmount = Math.max(sliderMin, Math.min(poker.raiseAmount, sliderMax));
  const canAct = poker.activeRound && !poker.showdown && !user.folded && activePlayers.length > 1 && user.stack > 0;
  const canCall = poker.activeRound && !poker.showdown && !user.folded && activePlayers.length > 1 && (callAmount === 0 || user.stack > 0);
  const canRaise = canAct && user.stack > Math.max(0, poker.currentBet - user.currentBet);
  const callLabel = callAmount > 0
    ? (callAmount >= user.stack ? `Theo Tat tay $${user.stack}` : `Theo $${Math.min(callAmount, user.stack)}`)
    : 'Theo';
  const raiseLabel = sliderMax > 0 && poker.raiseAmount >= sliderMax && user.stack > 0 ? 'Tat tay' : `$${poker.raiseAmount}`;
  const visibleCommunity = poker.communityCards.slice(0, poker.revealedCommunityCount);

  content.innerHTML = `
    <div class="poker-table-view">
      <div class="poker-topbar">
        <div>
          <div class="poker-table-header__eyebrow">Poker Royale</div>
          <h3 class="mb-1">Van ${poker.round}</h3>
          <p class="mb-0 text-muted">${poker.message}</p>
        </div>
        <div class="poker-status">
          <div class="poker-status__item"><span>Vong</span><strong>${poker.stageLabel}</strong></div>
          <div class="poker-status__item"><span>Pot</span><strong>$${poker.pot}</strong></div>
          <div class="poker-status__item"><span>Tien cua ban</span><strong>$${user.stack}</strong></div>
        </div>
      </div>

      <div class="poker-table-felt poker-table-felt--perspective">
        <div class="poker-pot">$${poker.pot}</div>

        <div class="poker-community">
          ${visibleCommunity.map((card) => renderPokerCard(card, false)).join('')}
          ${Array.from({ length: Math.max(0, 5 - visibleCommunity.length) }, () => '<div class="poker-card poker-card--slot"></div>').join('')}
        </div>

        ${poker.players.filter((player) => player.type === 'bot').map((player) => renderOpponentSeat(player, poker)).join('')}

        <div class="poker-player-seat">
          ${renderWinnerEffects(user.id, poker)}
          <div class="poker-seat-label poker-seat-label--you">
            <span class="poker-seat-label__chips">$${user.stack}</span>
            <strong>You</strong>
          </div>
          ${renderWinningHandLabel(user, poker)}
          <div class="poker-cards poker-cards--player">
            ${user.cards.map((card) => renderPokerCard(card, false)).join('')}
          </div>
          <div class="poker-seat-bet">${user.folded ? 'Bo bai' : user.currentBet > 0 ? `Da dat $${user.currentBet}` : user.stack === 0 ? 'Tat tay' : 'Dang theo'}</div>
          ${renderChipStack(user.currentBet)}
          ${renderActionEffects(user.id, poker)}
        </div>
      </div>

      <div class="poker-controls">
        <div class="poker-controls__left">
          <div class="poker-slider-row">
            <label for="poker-raise-range">So tien to</label>
            <input id="poker-raise-range" type="range" min="${sliderMin}" max="${sliderMax}" step="${sliderStep}" value="${poker.raiseAmount}" ${canRaise ? '' : 'disabled'}>
            <strong id="poker-raise-value">${raiseLabel}</strong>
          </div>
          <div class="small text-muted">Moi nguoi bat dau voi $${STARTING_STACK}. Thanh keo luon bi gioi han theo so tien con lai.</div>
        </div>
        <div class="poker-controls__right">
          ${!poker.activeRound ? '<button class="btn btn-primary" id="poker-deal-btn">Bat dau van moi</button>' : ''}
          ${poker.activeRound ? `<button class="btn btn-outline-danger" id="poker-fold-btn" ${canAct ? '' : 'disabled'}>Bo</button>` : ''}
          ${poker.activeRound ? `<button class="btn btn-outline-light" id="poker-call-btn" ${canCall ? '' : 'disabled'}>${callLabel}</button>` : ''}
          ${poker.activeRound ? `<button class="btn btn-warning" id="poker-raise-btn" ${canRaise ? '' : 'disabled'}>To ${raiseLabel}</button>` : ''}
          ${poker.showdown || isHandFinished(runtime) ? '<button class="btn btn-primary" id="poker-next-btn">Bat dau van moi</button>' : ''}
          <button class="btn btn-outline-light" id="poker-cashout-btn">Thoat ban</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('poker-raise-range')?.addEventListener('input', (event) => {
    poker.raiseAmount = Number(event.target.value);
    document.getElementById('poker-raise-value').textContent = sliderMax > 0 && poker.raiseAmount >= sliderMax ? 'Tat tay' : `$${poker.raiseAmount}`;
  });
  document.getElementById('poker-deal-btn')?.addEventListener('click', () => dealNewHand(runtime, ctx));
  document.getElementById('poker-fold-btn')?.addEventListener('click', () => handleUserAction(runtime, ctx, 'fold'));
  document.getElementById('poker-call-btn')?.addEventListener('click', () => handleUserAction(runtime, ctx, 'call'));
  document.getElementById('poker-raise-btn')?.addEventListener('click', () => handleUserAction(runtime, ctx, 'raise'));
  document.getElementById('poker-next-btn')?.addEventListener('click', () => prepareNextHand(runtime, ctx));
  document.getElementById('poker-cashout-btn')?.addEventListener('click', () => ctx.exitGameplayToTitle(true));
}

function renderOpponentSeat(player, poker) {
  const showdownReveal = poker.showdown && !player.folded;
  return `
    <div class="poker-opponent-seat poker-opponent-seat--${player.seat} ${player.folded ? 'is-folded' : ''}">
      ${renderWinnerEffects(player.id, poker)}
      <div class="poker-seat-label">
        <span class="poker-seat-label__chips">$${player.stack}</span>
        <strong>${player.name}</strong>
      </div>
      ${renderWinningHandLabel(player, poker)}
      <div class="poker-cards poker-cards--opponent">
        ${(player.cards.length ? player.cards : [{ hidden: true }, { hidden: true }]).map((card) => renderPokerCard(card, !showdownReveal)).join('')}
      </div>
      <div class="poker-seat-bet">${player.folded ? 'Bo bai' : player.currentBet > 0 ? `Da dat $${player.currentBet}` : player.stack === 0 ? 'Tat tay' : 'Dang doi'}</div>
      ${renderChipStack(player.currentBet)}
      ${renderActionEffects(player.id, poker)}
    </div>
  `;
}

function renderChipStack(amount) {
  if (!amount) return '';
  return `
    <div class="poker-chip-stack">
      <span class="poker-chip poker-chip--blue"></span>
      <span class="poker-chip poker-chip--gold"></span>
      <span class="poker-chip poker-chip--red"></span>
      <strong>$${amount}</strong>
    </div>
  `;
}

function renderActionEffects(playerId, poker) {
  const effects = poker.actionEffects.filter((effect) => effect.playerId === playerId);
  return effects.map((effect) => `
    <div class="poker-action-fx poker-action-fx--${effect.type}">
      <strong>${effect.label}</strong>
      ${effect.amount ? `<span>${effect.amount}</span>` : ''}
    </div>
  `).join('');
}

function renderWinningHandLabel(player, poker) {
  if (!poker.winners.includes(player.id) || !player.result?.label) return '';
  return `<div class="poker-winning-hand">${player.result.label}</div>`;
}

function renderWinnerEffects(playerId, poker) {
  if (!poker.winners.includes(playerId)) return '';
  return `
    <div class="poker-winner-crown">👑</div>
    <div class="poker-fireworks">
      <span class="poker-firework poker-firework--a"></span>
      <span class="poker-firework poker-firework--b"></span>
      <span class="poker-firework poker-firework--c"></span>
    </div>
  `;
}

function renderPokerCard(card, hidden) {
  if (hidden || card?.hidden) {
    return '<div class="poker-card poker-card--back"></div>';
  }
  const symbol = suitSymbol(card.suit);
  const isRed = card.suit === 'H' || card.suit === 'D';
  return `<div class="poker-card ${isRed ? 'is-red' : ''}"><span>${card.rank}</span><small>${symbol}</small></div>`;
}

function dealNewHand(runtime, ctx) {
  const poker = runtime.poker;
  poker.deck = shuffleDeck(buildDeck());
  poker.communityCards = poker.deck.splice(0, 5);
  poker.revealedCommunityCount = 3;
  poker.stage = 'flop';
  poker.stageLabel = 'Mo 3 la';
  poker.activeRound = true;
  poker.showdown = false;
  poker.winners = [];
  poker.winningLabel = '';
  poker.currentBet = 0;
  poker.history = [];
  poker.players = poker.players
    .filter((player) => player.stack > 0)
    .map((player) => ({
      ...player,
      cards: poker.deck.splice(0, 2),
      folded: false,
      currentBet: 0,
      totalCommitted: 0,
      result: null
    }));

  poker.totalPlayers = poker.players.length;
  poker.botCount = poker.players.filter((player) => player.type === 'bot').length;
  poker.players.forEach((player) => commitChips(player, ANTE, poker));
  poker.message = `Da mo 3 la giua. Pot hien tai la $${poker.pot}. Ban co the bo, theo hoac to.`;
  poker.handsPlayed += 1;
  syncRuntimeScore(runtime);
  ctx.syncMetrics();
  renderPokerTable(runtime, ctx);
}

function handleUserAction(runtime, ctx, action) {
  const poker = runtime.poker;
  const user = getUserPlayer(runtime);
  if (!poker.activeRound || poker.showdown || user.folded) return;

  if (action === 'fold') {
    user.folded = true;
    poker.message = 'Ban da bo bai.';
  } else if (action === 'call') {
    const amount = Math.max(0, poker.currentBet - user.currentBet);
    commitChips(user, amount, poker);
    poker.message = amount > 0 ? `Ban theo $${amount}.` : 'Ban check.';
  } else if (action === 'raise') {
    if (user.stack <= 0) {
      poker.message = 'Ban da tat tay, khong the to them.';
      renderPokerTable(runtime, ctx);
      return;
    }
    const desired = Math.max(MIN_RAISE, poker.raiseAmount);
    const targetBet = Math.min(user.stack + user.currentBet, Math.max(poker.currentBet, desired));
    const needed = Math.max(0, targetBet - user.currentBet);
    commitChips(user, needed, poker);
    poker.currentBet = Math.max(poker.currentBet, user.currentBet);
    poker.message = user.stack === 0 ? `Ban tat tay voi $${user.currentBet}.` : `Ban to len $${user.currentBet}.`;
  }

  if (countActivePlayers(runtime) <= 1) {
    finishByFold(runtime, ctx);
    return;
  }

  runBotResponses(runtime);

  if (countActivePlayers(runtime) <= 1) {
    finishByFold(runtime, ctx);
    return;
  }

  advanceStageOrShowdown(runtime);
  syncRuntimeScore(runtime);
  ctx.syncMetrics();
  renderPokerTable(runtime, ctx);
}

function runBotResponses(runtime) {
  const poker = runtime.poker;
  const visibleCommunity = poker.communityCards.slice(0, poker.revealedCommunityCount);

  poker.players.filter((player) => player.type === 'bot' && !player.folded).forEach((bot) => {
    if (bot.stack <= 0) return;
    const strength = evaluateVisibleStrength(bot.cards, visibleCommunity);
    const amountToCall = Math.max(0, poker.currentBet - bot.currentBet);
    const pressure = amountToCall / Math.max(1, bot.stack + bot.currentBet);

    if (amountToCall > 0 && strength <= 2 && pressure > 0.45 && Math.random() < 0.7) {
      bot.folded = true;
      return;
    }

    if (amountToCall > 0) {
      commitChips(bot, amountToCall, poker);
      return;
    }

    if (strength >= 5 && bot.stack > MIN_RAISE && Math.random() < 0.4) {
      const raiseTo = Math.min(bot.stack + bot.currentBet, Math.max(MIN_RAISE, poker.currentBet + MIN_RAISE));
      const needed = Math.max(0, raiseTo - bot.currentBet);
      commitChips(bot, needed, poker);
      poker.currentBet = Math.max(poker.currentBet, bot.currentBet);
      return;
    }

    if (strength <= 1 && Math.random() < 0.25) {
      bot.folded = true;
    }
  });
}

function advanceStageOrShowdown(runtime) {
  const poker = runtime.poker;
  resetStageBets(poker.players);

  if (poker.revealedCommunityCount === 3) {
    poker.revealedCommunityCount = 4;
    poker.stage = 'turn';
    poker.stageLabel = 'La thu 4';
    poker.currentBet = 0;
    poker.message = 'Da mo la thu 4. Tiep tuc bo, theo hoac to.';
    return;
  }

  if (poker.revealedCommunityCount === 4) {
    poker.revealedCommunityCount = 5;
    poker.stage = 'river';
    poker.stageLabel = 'La thu 5';
    poker.currentBet = 0;
    poker.message = 'Da mo la thu 5. Day la vong dat cuoc cuoi cung.';
    return;
  }

  revealShowdown(runtime);
}

function revealShowdown(runtime) {
  const poker = runtime.poker;
  poker.showdown = true;
  poker.activeRound = false;
  poker.stage = 'showdown';
  poker.stageLabel = 'Show bai';

  const contenders = poker.players.filter((player) => !player.folded);
  const ranked = contenders.map((player) => ({
    ...player,
    result: evaluateBestHand([...player.cards, ...poker.communityCards])
  }));
  ranked.sort((left, right) => comparePokerResults(right.result, left.result));

  const best = ranked[0].result;
  const winners = ranked.filter((player) => comparePokerResults(player.result, best) === 0);
  const share = Math.floor(poker.pot / winners.length);

  winners.forEach((winner) => {
    const actual = poker.players.find((player) => player.id === winner.id);
    actual.stack += share;
    actual.result = winner.result;
  });
  poker.players.filter((player) => !player.folded && !player.result).forEach((player) => {
    player.result = ranked.find((item) => item.id === player.id)?.result || null;
  });

  poker.winners = winners.map((player) => player.id);
  poker.winningLabel = winners.map((player) => player.name).join(', ');
  poker.message = `${poker.winningLabel} thang pot voi bo ${best.label}.`;
  poker.pot = 0;

  const userWon = winners.some((player) => player.id === poker.userId);
  if (userWon) {
    runtime.destroyed += 1;
    poker.handsWon += 1;
  }
  syncRuntimeScore(runtime);
  runtime.gemsEarned = Math.floor(runtime.score / (runtime.cfg.gemThresholdScore || 1000));
}

function finishByFold(runtime, ctx) {
  const poker = runtime.poker;
  poker.showdown = false;
  poker.activeRound = false;
  poker.stage = 'finished';
  poker.stageLabel = 'Thang do bo bai';
  const winner = poker.players.find((player) => !player.folded);
  if (winner) {
    winner.stack += poker.pot;
    poker.winners = [winner.id];
    poker.winningLabel = winner.name;
    poker.message = `${winner.name} thang vi tat ca doi thu da bo bai.`;
    if (winner.id === poker.userId) {
      runtime.destroyed += 1;
      poker.handsWon += 1;
    }
  }
  poker.pot = 0;
  syncRuntimeScore(runtime);
  runtime.gemsEarned = Math.floor(runtime.score / (runtime.cfg.gemThresholdScore || 1000));
  ctx.syncMetrics();
  renderPokerTable(runtime, ctx);
}

function prepareNextHand(runtime, ctx) {
  const poker = runtime.poker;
  poker.round += 1;
  poker.activeRound = false;
  poker.showdown = false;
  poker.winners = [];
  poker.winningLabel = '';
  poker.stage = 'waiting';
  poker.stageLabel = 'San sang';
  poker.pot = 0;
  poker.currentBet = 0;
  poker.communityCards = [];
  poker.revealedCommunityCount = 0;
  poker.players = poker.players
    .filter((player) => player.stack > 0)
    .map((player) => ({
      ...player,
      cards: [],
      folded: false,
      currentBet: 0,
      totalCommitted: 0,
      result: null
    }));
  poker.totalPlayers = poker.players.length;
  poker.botCount = poker.players.filter((player) => player.type === 'bot').length;
  poker.message = poker.players.length > 1
    ? 'Bam Bat dau van moi de vao van tiep theo.'
    : 'Chi con 1 nguoi con tien. Ban co the thoat ban.';
  syncRuntimeScore(runtime);
  ctx.syncMetrics();
  renderPokerTable(runtime, ctx);
}

function commitChips(player, amount, poker) {
  const actual = Math.max(0, Math.min(amount, player.stack));
  player.stack -= actual;
  player.currentBet += actual;
  player.totalCommitted += actual;
  poker.pot += actual;
  return actual;
}

function resetStageBets(players) {
  players.forEach((player) => {
    player.currentBet = 0;
  });
}

function syncRuntimeScore(runtime) {
  runtime.score = getUserPlayer(runtime)?.stack || 0;
  runtime.hits = runtime.poker.handsPlayed;
}

function getUserPlayer(runtime) {
  return runtime.poker.players.find((player) => player.id === runtime.poker.userId);
}

function countActivePlayers(runtime) {
  return runtime.poker.players.filter((player) => !player.folded).length;
}

function isHandFinished(runtime) {
  return !runtime.poker.activeRound;
}

function evaluateVisibleStrength(holeCards, communityCards) {
  const cards = [...holeCards, ...communityCards];
  if (cards.length < 5) {
    const values = holeCards.map((card) => card.value).sort((a, b) => b - a);
    if (values[0] === values[1]) return 3;
    if (values[0] >= 12 || values[1] >= 12) return 2;
    return 1;
  }
  return evaluateBestHand(cards).rank;
}

function evaluateBestHand(cards) {
  const combos = combinations(cards, 5);
  return combos
    .map((combo) => evaluateFiveCardHand(combo))
    .sort((left, right) => comparePokerResults(right, left))[0];
}

function combinations(items, size, start = 0, prefix = [], result = []) {
  if (prefix.length === size) {
    result.push(prefix);
    return result;
  }
  for (let i = start; i <= items.length - (size - prefix.length); i += 1) {
    combinations(items, size, i + 1, [...prefix, items[i]], result);
  }
  return result;
}

function evaluateFiveCardHand(cards) {
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

  if (isStraight && isFlush) {
    return { rank: 9, label: straightHigh === 14 ? 'Royal Flush' : 'Straight Flush', tie: [straightHigh] };
  }
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
  if (groups[0][1] === 2) return { rank: 2, label: 'One Pair', tie: [groups[0][0], ...groups.slice(1).map(([value]) => value).sort((a, b) => b - a)] };
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

function buildDeck() {
  const suits = ['S', 'H', 'D', 'C'];
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

function suitSymbol(suit) {
  if (suit === 'H') return '&hearts;';
  if (suit === 'D') return '&diams;';
  if (suit === 'C') return '&clubs;';
  return '&spades;';
}
