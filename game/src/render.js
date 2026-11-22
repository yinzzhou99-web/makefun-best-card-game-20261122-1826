// DOM rendering for Ember Duel. Rebuilds the table from state on every change;
// selection and targeting classes are added by input.js after each render.

import { SUITS, cardById } from './cards.js';
import { endText } from './state.js';

const $ = (id) => document.getElementById(id);

export function cardElement(card, opts = {}) {
  const el = document.createElement('div');
  el.className = `card ${card.suit} ${card.type === 'spell' ? 'spell' : ''}`;
  if (opts.playable) el.classList.add('playable');
  if (opts.selected) el.classList.add('selected');
  if (opts.canAttack) el.classList.add('can-attack');
  if (opts.exhausted) el.classList.add('exhausted');
  if (opts.targetable) el.classList.add('targetable');
  const suit = SUITS[card.suit];
  const kw = (card.kw || []).join(' · ').toUpperCase();
  el.innerHTML =
    `<span class="cost">${card.cost}</span>` +
    `<span class="suit" title="${suit.label}">${suit.symbol}</span>` +
    `<span class="name">${card.name}</span>` +
    `<span class="art">${card.art}</span>` +
    (kw ? `<span class="kw">${kw}</span>` : '') +
    `<span class="text">${card.text}</span>` +
    (card.type === 'creature'
      ? `<span class="atk">${card.atk}</span><span class="hp">${card.hp}</span>`
      : '');
  return el;
}

export function boardCardElement(c, opts = {}) {
  const card = cardById(c.id);
  const el = cardElement({ ...card, atk: c.atk, hp: c.hp }, opts);
  el.dataset.boardIndex = opts.index;
  el.dataset.side = opts.side;
  return el;
}

export function render(state) {
  // Heroes
  $('player-hp').textContent = state.player.hp;
  $('enemy-hp').textContent = state.enemy.hp;
  $('player-mana').textContent = `${state.player.mana} / ${state.player.maxMana}`;
  $('enemy-mana').textContent = `${state.enemy.mana} / ${state.enemy.maxMana}`;
  $('player-deck').textContent = state.player.deck.length;
  $('enemy-deck').textContent = state.enemy.deck.length;

  // Enemy hand: card backs only — the Baron's hand stays hidden.
  const eh = $('enemy-hand');
  eh.innerHTML = '';
  for (let i = 0; i < state.enemy.hand.length; i++) {
    const back = document.createElement('div');
    back.className = 'card-back';
    eh.appendChild(back);
  }

  // Boards
  renderBoard($('enemy-board'), state, 'enemy');
  renderBoard($('player-board'), state, 'player');

  // Player hand
  const ph = $('player-hand');
  ph.innerHTML = '';
  state.player.hand.forEach((id, i) => {
    const card = cardById(id);
    const el = cardElement(card, {
      playable: state.phase === 'play' && state.active === 'player',
      selected: state.selected && state.selected.kind === 'hand' && state.selected.index === i,
    });
    el.dataset.handIndex = i;
    ph.appendChild(el);
  });

  // Turn banner + end turn button
  const banner = $('turn-banner');
  if (state.phase === 'play') {
    banner.textContent = state.active === 'player' ? '▶ Your turn — play a card' : '… Ash Baron is thinking';
  } else {
    banner.textContent = '';
  }
  $('end-turn').disabled = !(state.phase === 'play' && state.active === 'player');

  // Log (newest first)
  $('game-log').innerHTML = state.log.slice(0, 3).map((l) => `<div>${l}</div>`).join('');
}

function renderBoard(container, state, side) {
  container.innerHTML = '';
  const isPlayer = side === 'player';
  state[side].board.forEach((c, i) => {
    const el = boardCardElement(c, {
      side,
      index: i,
      canAttack: isPlayer && state.phase === 'play' && state.active === 'player' && c.canAttack,
      exhausted: isPlayer && !c.canAttack,
      selected: state.selected && state.selected.kind === 'board' && state.selected.side === side && state.selected.index === i,
    });
    container.appendChild(el);
  });
}

export function showScreen(name) {
  for (const id of ['title-screen', 'table-screen', 'end-screen']) {
    $(id).classList.toggle('hidden', id !== name);
  }
}

export function showEnd(state) {
  const win = state.phase === 'win';
  const text = endText(state);
  const title = $('end-title');
  title.textContent = text.title;
  title.className = win ? 'win' : 'lose';
  $('end-text').textContent = text.text;
  $('end-stats').textContent = text.stats;
  showScreen('end-screen');
}

// A floating "-3" over an element, for damage feedback.
export function floatNumber(text, targetEl, heal = false) {
  const r = targetEl.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'float-dmg' + (heal ? ' float-heal' : '');
  el.textContent = text;
  el.style.left = `${r.left + r.width / 2 - 14}px`;
  el.style.top = `${r.top - 6}px`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1050);
}
