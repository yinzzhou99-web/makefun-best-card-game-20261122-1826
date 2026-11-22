// Game state and rules for Ember Duel. Pure logic: no DOM here, so the AI
// and the screenshot stager can drive the same rules as the player.

import { buildDeck, cardById, seededRng } from './cards.js';

export const MAX_HP = 30;
export const MAX_HAND = 7;
export const MAX_BOARD = 5;

export function makeSide(rng) {
  return {
    hp: MAX_HP, mana: 0, maxMana: 0,
    deck: buildDeck(rng), hand: [], board: [], fatigue: 0,
  };
}

export function newGame(seed = (Date.now() % 2147483647)) {
  const rng = seededRng(seed);
  const state = {
    seed,
    phase: 'title', // title | play | win | loss
    turn: 0,
    active: 'player',
    player: makeSide(rng),
    enemy: makeSide(rng),
    log: [],
    winner: null,
    stats: { turns: 0, cardsPlayed: 0, damageDealt: 0 },
    selected: null, // { kind: 'hand', index } | { kind: 'board', index } | null
  };
  return state;
}

export function addLog(state, html) {
  state.log.unshift(html);
  if (state.log.length > 40) state.log.length = 40;
}

export function drawCard(state, side) {
  const s = state[side];
  if (s.deck.length === 0) {
    s.fatigue += 1;
    damageHero(state, side, s.fatigue, 'fatigue');
    addLog(state, `<b>${nameOf(side)}</b> draws from an empty deck and takes <b>${s.fatigue}</b> fatigue.`);
    return;
  }
  const id = s.deck.pop();
  if (s.hand.length >= MAX_HAND) {
    addLog(state, `<b>${nameOf(side)}</b>'s hand is full — <b>${cardById(id).name}</b> burns away.`);
    return;
  }
  s.hand.push(id);
}

export function nameOf(side) {
  return side === 'player' ? 'You' : 'Ash Baron';
}

export function startDuel(state) {
  state.phase = 'play';
  state.turn = 1;
  state.active = 'player';
  for (let i = 0; i < 3; i++) {
    drawCard(state, 'player');
    drawCard(state, 'enemy');
  }
  beginTurn(state, 'player');
  addLog(state, 'The duel begins. <b>Your turn</b> — play a card or end the turn.');
}

export function beginTurn(state, side) {
  const s = state[side];
  s.maxMana = Math.min(10, s.maxMana + 1);
  s.mana = s.maxMana;
  for (const c of s.board) c.canAttack = true;
  drawCard(state, side);
  if (state.phase !== 'play') return;
  state.active = side;
  state.selected = null;
  if (side === 'player') {
    state.stats.turns += 1;
    addLog(state, `<b>Turn ${state.turn}</b> — you have <b>${s.mana}</b> mana.`);
  }
}

export function endTurn(state) {
  if (state.phase !== 'play' || state.active !== 'player') return false;
  state.turn += 1;
  beginTurn(state, 'enemy');
  return true;
}

export function enemyTurnDone(state) {
  if (state.phase !== 'play') return;
  state.turn += 1;
  beginTurn(state, 'player');
}

export function canPlay(state, side, handIndex) {
  const s = state[side];
  const card = cardById(s.hand[handIndex]);
  if (!card) return false;
  if (card.cost > s.mana) return false;
  if (card.type === 'creature' && s.board.length >= MAX_BOARD) return false;
  return true;
}

function hasGuard(state, side) {
  return state[side].board.some((c) => (c.kw || []).includes('guard'));
}

export function legalTargets(state, side, handIndex) {
  // Returns 'any' | 'enemy-creature' | 'enemy-hero' | 'self' | 'none' for a spell,
  // or 'none' for a creature (no target needed).
  const card = cardById(state[side].hand[handIndex]);
  if (!card || card.type !== 'spell') return 'none';
  if (card.effect === 'damage3') return 'any';
  if (card.effect === 'damage2all') return 'none';
  if (card.effect === 'heal5' || card.effect === 'draw2') return 'self';
  return 'none';
}

// target: { side: 'player'|'enemy', kind: 'hero'|'board', index? } | null
export function playCard(state, side, handIndex, target = null) {
  const s = state[side];
  const foe = side === 'player' ? 'enemy' : 'player';
  const card = cardById(s.hand[handIndex]);
  if (!card || !canPlay(state, side, handIndex)) return false;
  s.hand.splice(handIndex, 1);
  s.mana -= card.cost;
  state.stats.cardsPlayed += 1;
  if (card.type === 'creature') {
    s.board.push({
      id: card.id, atk: card.atk, hp: card.hp, maxHp: card.hp,
      kw: card.kw || [], canAttack: (card.kw || []).includes('swift'),
    });
    addLog(state, `<b>${nameOf(side)}</b> summons <b>${card.name}</b> (${card.atk}/${card.hp}).`);
  } else {
    castSpell(state, side, foe, card, target);
  }
  state.selected = null;
  checkEnd(state);
  return true;
}

function castSpell(state, side, foe, card, target) {
  const me = nameOf(side);
  if (card.effect === 'damage3') {
    const t = target || { side: foe, kind: 'hero' };
    addLog(state, `<b>${me}</b> hurls <b>Fireball</b> for 3 damage.`);
    damageTarget(state, t, 3, side);
  } else if (card.effect === 'heal5') {
    const s = state[side];
    const healed = Math.min(5, MAX_HP - s.hp);
    s.hp += healed;
    addLog(state, `<b>${me}</b> mends the flames and restores <b>${healed}</b> life.`);
  } else if (card.effect === 'draw2') {
    addLog(state, `<b>${me}</b> kindles insight and draws 2 cards.`);
    drawCard(state, side);
    drawCard(state, side);
  } else if (card.effect === 'damage2all') {
    addLog(state, `<b>${me}</b> unleashes an <b>Ember Wave</b> over the enemy board.`);
    const board = state[foe].board;
    for (const c of [...board]) damageCreature(state, foe, board.indexOf(c), 2, side);
  }
}

export function damageTarget(state, target, amount, bySide) {
  if (target.kind === 'hero') {
    damageHero(state, target.side, amount, bySide);
  } else {
    damageCreature(state, target.side, target.index, amount, bySide);
  }
  checkEnd(state);
}

export function damageHero(state, side, amount, bySide) {
  const s = state[side];
  s.hp = Math.max(0, s.hp - amount);
  if (bySide === 'player') state.stats.damageDealt += amount;
}

export function damageCreature(state, side, index, amount, bySide) {
  const board = state[side].board;
  const c = board[index];
  if (!c) return;
  c.hp -= amount;
  if (bySide === 'player' && side === 'enemy') state.stats.damageDealt += amount;
  if (c.hp <= 0) {
    board.splice(index, 1);
    addLog(state, `<b>${cardById(c.id).name}</b> crumbles to ash.`);
  }
}

// Attack with a board creature. target: { side, kind: 'hero'|'board', index? }
export function attack(state, side, boardIndex, target) {
  const s = state[side];
  const foe = side === 'player' ? 'enemy' : 'player';
  const attacker = s.board[boardIndex];
  if (!attacker || !attacker.canAttack) return false;
  if (state.phase !== 'play') return false;
  if (target.kind === 'board') {
    const guard = hasGuard(state, foe);
    const victim = state[foe].board[target.index];
    if (!victim) return false;
    if (guard && !(victim.kw || []).includes('guard')) return false;
    attacker.canAttack = false;
    const atk = attacker.atk;
    const back = victim.atk;
    addLog(state, `<b>${cardById(attacker.id).name}</b> strikes <b>${cardById(victim.id).name}</b> (${atk} vs ${back}).`);
    damageCreature(state, foe, target.index, atk, side);
    // The victim strikes back only if it survived.
    if (state[foe].board.includes(victim)) damageCreature(state, side, boardIndex, back, foe);
  } else {
    if (hasGuard(state, foe)) return false;
    attacker.canAttack = false;
    addLog(state, `<b>${cardById(attacker.id).name}</b> hits <b>${nameOf(foe)}</b> for ${attacker.atk}.`);
    damageHero(state, foe, attacker.atk, side);
  }
  state.selected = null;
  checkEnd(state);
  return true;
}

export function attackableTargets(state, side) {
  const foe = side === 'player' ? 'enemy' : 'player';
  const targets = [];
  if (!hasGuard(state, foe)) targets.push({ side: foe, kind: 'hero' });
  state[foe].board.forEach((c, i) => {
    if (!hasGuard(state, foe) || (c.kw || []).includes('guard')) {
      targets.push({ side: foe, kind: 'board', index: i });
    }
  });
  return targets;
}

export function checkEnd(state) {
  if (state.phase !== 'play') return;
  if (state.enemy.hp <= 0) {
    state.phase = 'win';
    state.winner = 'player';
    addLog(state, '<b>The Ash Baron falls. Victory is yours!</b>');
  } else if (state.player.hp <= 0) {
    state.phase = 'loss';
    state.winner = 'enemy';
    addLog(state, '<b>Your embers fade. The Baron stands.</b>');
  }
}

export function endText(state) {
  if (state.phase === 'win') {
    return {
      title: 'VICTORY',
      text: 'The Ash Baron falls — your embers burn brightest.',
      stats: `Won in ${state.stats.turns} turns · ${state.stats.cardsPlayed} cards played · ${state.stats.damageDealt} damage dealt.`,
    };
  }
  return {
    title: 'DEFEAT',
    text: 'Your embers fade — the Ash Baron stands over the ashes.',
    stats: `Survived ${state.stats.turns} turns · ${state.stats.cardsPlayed} cards played · ${state.stats.damageDealt} damage dealt.`,
  };
}
