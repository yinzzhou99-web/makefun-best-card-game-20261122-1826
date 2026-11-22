// The Ash Baron's brain: a readable heuristic opponent. It plays what it can
// afford, spends burn spells on lethal or on the biggest threat, heals when
// low, and attacks — preferring lethal, then guards, then the hero.

import { cardById } from './cards.js';
import { attack, attackableTargets, canPlay, playCard } from './state.js';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runEnemyTurn(state, onUpdate) {
  await sleep(650);
  if (state.phase !== 'play') return;
  const foe = state.enemy;

  // 1. Play creatures: biggest first, while affordable and board has room.
  let played = true;
  while (played && state.phase === 'play') {
    played = false;
    const order = foe.hand
      .map((id, i) => ({ id, i, card: cardById(id) }))
      .filter((e) => e.card.type === 'creature' && canPlay(state, 'enemy', e.i))
      .sort((a, b) => b.card.cost - a.card.cost || b.card.atk - a.card.atk);
    if (order.length > 0) {
      playCard(state, 'enemy', order[0].i);
      played = true;
      onUpdate();
      await sleep(500);
    }
  }

  // 2. Spells: Fireball goes face when it kills, else at the biggest creature;
  // Mend when hurt; Kindle when the hand is small; Wave when the board is wide.
  let cast = true;
  while (cast && state.phase === 'play') {
    cast = false;
    for (let i = 0; i < foe.hand.length; i++) {
      const card = cardById(foe.hand[i]);
      if (!card || card.type !== 'spell') continue;
      let target = null;
      let use = false;
      if (card.effect === 'damage3') {
        if (state.player.hp <= 3) { target = { side: 'player', kind: 'hero' }; use = true; }
        else if (state.player.board.length > 0) {
          let best = -1; let bestAtk = 0;
          state.player.board.forEach((c, j) => { if (c.atk > bestAtk) { bestAtk = c.atk; best = j; } });
          if (best >= 0 && bestAtk >= 3) { target = { side: 'player', kind: 'board', index: best }; use = true; }
        }
      } else if (card.effect === 'heal5') {
        if (foe.hp <= 20) use = true;
      } else if (card.effect === 'draw2') {
        if (foe.hand.length <= 3) use = true;
      } else if (card.effect === 'damage2all') {
        if (state.player.board.length >= 2) use = true;
      }
      if (use && canPlay(state, 'enemy', i)) {
        playCard(state, 'enemy', i, target);
        cast = true;
        onUpdate();
        await sleep(500);
        break;
      }
    }
  }

  // 3. Attack with every ready creature: lethal first, then guards, then face.
  for (let i = 0; i < foe.board.length && state.phase === 'play'; i++) {
    const c = foe.board[i];
    if (!c || !c.canAttack) continue;
    const targets = attackableTargets(state, 'enemy');
    if (targets.length === 0) continue;
    const heroTotal = foe.board.filter((x) => x.canAttack).reduce((s, x) => s + x.atk, 0);
    let pick = null;
    const heroTarget = targets.find((t) => t.kind === 'hero');
    if (heroTarget && state.player.hp <= heroTotal) pick = heroTarget;
    if (!pick) {
      const guards = targets.filter((t) => t.kind === 'board');
      if (guards.length > 0) {
        guards.sort((a, b) => state.player.board[b.index].atk - state.player.board[a.index].atk);
        pick = guards[0];
      } else if (heroTarget) {
        pick = heroTarget;
      }
    }
    if (pick) {
      attack(state, 'enemy', i, pick);
      onUpdate();
      await sleep(550);
    }
  }
}
