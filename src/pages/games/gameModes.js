export const GAME_MODES = {
  COSMIC: 'cosmic',
  POKER: 'poker',
  CARO: 'caro',
  COMING_SOON: 'coming_soon'
};

export function resolveGameMode(gameOrName) {
  const source = typeof gameOrName === 'string' ? gameOrName : gameOrName?.name;
  const normalized = (source || '').toLowerCase();
  if (normalized.includes('cosmic')) return GAME_MODES.COSMIC;
  if (normalized.includes('poker')) return GAME_MODES.POKER;
  if (normalized.includes('caro')) return GAME_MODES.CARO;
  return GAME_MODES.COMING_SOON;
}

export function badge(name = '') {
  const normalized = name.toLowerCase();
  if (normalized.includes('cosmic')) return 'CS';
  if (normalized.includes('poker')) return 'PK';
  if (normalized.includes('caro')) return 'XO';
  return 'GM';
}
