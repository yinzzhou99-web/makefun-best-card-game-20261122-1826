// Staged scenes for screenshots: deterministic states of the real game,
// rendered by the game's own code, so each screenshot is a genuine render.
// ?shot=title | play | win | loss

import { cardById } from './cards.js';
import { MAX_HP, newGame, startDuel } from './state.js';

function creature(id, hpLoss = 0) {
  const card = cardById(id);
  return {
    id, atk: card.atk, hp: card.hp - hpLoss, maxHp: card.hp,
    kw: card.kw || [], canAttack: true,
  };
}

export function stageShot(name) {
  const state = newGame(20261122);
  if (name === 'title') {
    state.phase = 'title';
    return state;
  }
  startDuel(state);
  if (name === 'play') {
    // A rich mid-game: both boards populated, full hands, mana spent.
    state.player.maxMana = 6; state.player.mana = 3;
    state.enemy.maxMana = 6; state.enemy.mana = 2;
    state.player.hp = 24; state.enemy.hp = 19;
    state.turn = 5;
    state.player.board = [creature('golem'), creature('falcon'), creature('hound', 1)];
    state.enemy.board = [creature('guard'), creature('brute', 2)];
    state.player.hand = ['drake', 'fireball', 'mend', 'hound', 'sprite', 'kindle'];
    state.enemy.hand = ['pup', 'imp', 'golem'];
    state.player.deck = state.player.deck.slice(0, 12);
    state.enemy.deck = state.enemy.deck.slice(0, 14);
    state.log = [
      '<b>Magma Brute</b> hits <b>You</b> for 5.',
      '<b>You</b> summon <b>Blaze Falcon</b> (4/2).',
      '<b>Turn 5</b> — you have <b>6</b> mana.',
    ];
    return state;
  }
  if (name === 'win') {
    state.phase = 'win';
    state.winner = 'player';
    state.enemy.hp = 0;
    state.player.hp = 12;
    state.stats = { turns: 8, cardsPlayed: 17, damageDealt: 34 };
    return state;
  }
  // loss
  state.phase = 'loss';
  state.winner = 'enemy';
  state.player.hp = 0;
  state.enemy.hp = 9;
  state.stats = { turns: 9, cardsPlayed: 15, damageDealt: 21 };
  return state;
}

export { MAX_HP };
