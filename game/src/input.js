// Mouse and keyboard input for Ember Duel. Owns the selection state machine:
// pick a hand card (or a ready creature), then pick a target for it.
// getState is a getter because the main module replaces the state on a new duel.

import { cardById } from './cards.js';
import {
  attack, attackableTargets, canPlay, endTurn, legalTargets, playCard,
} from './state.js';

const $ = (id) => document.getElementById(id);

export function bindInput(getState, refresh) {
  document.addEventListener('click', (ev) => {
    const state = getState();
    if (state.phase !== 'play' || state.active !== 'player') return;
    const handEl = ev.target.closest('[data-hand-index]');
    if (handEl) {
      clickHandCard(state, Number(handEl.dataset.handIndex), refresh);
      return;
    }
    const boardEl = ev.target.closest('[data-board-index]');
    if (boardEl) {
      clickBoardCard(state, boardEl.dataset.side, Number(boardEl.dataset.boardIndex), refresh);
      return;
    }
    if (ev.target.closest('#enemy-hero')) {
      clickHeroTarget(state, 'enemy', refresh);
      return;
    }
    if (ev.target.closest('#player-hero')) {
      clickHeroTarget(state, 'player', refresh);
      return;
    }
    if (ev.target.closest('#end-turn')) {
      state.selected = null;
      if (endTurn(state)) refresh();
    }
  });

  document.addEventListener('keydown', (ev) => {
    const state = getState();
    if (state.phase !== 'play') return;
    if (ev.key === 'Escape') {
      state.selected = null;
      refresh();
      return;
    }
    if (state.active !== 'player') return;
    if (ev.key === ' ' || ev.key === 'Enter') {
      ev.preventDefault();
      state.selected = null;
      if (endTurn(state)) refresh();
      return;
    }
    const n = Number(ev.key);
    if (n >= 1 && n <= 7) {
      clickHandCard(state, n - 1, refresh);
    }
  });
}

function clickHandCard(state, index, refresh) {
  const card = cardById(state.player.hand[index]);
  if (!card) return;
  // Tapping the selected card again cancels the selection.
  if (state.selected && state.selected.kind === 'hand' && state.selected.index === index) {
    state.selected = null;
    refresh();
    return;
  }
  if (!canPlay(state, 'player', index)) {
    state.selected = null;
    refresh();
    return;
  }
  if (card.type === 'creature') {
    if (playCard(state, 'player', index)) refresh();
    return;
  }
  const need = legalTargets(state, 'player', index);
  if (need === 'none' || need === 'self') {
    if (playCard(state, 'player', index)) refresh();
    return;
  }
  // Spell needs a target: select it and wait for a target click.
  state.selected = { kind: 'hand', index };
  refresh();
}

function clickBoardCard(state, side, index, refresh) {
  const sel = state.selected;
  // A selected spell or attacker targets this creature.
  if (sel) {
    if (sel.kind === 'hand') {
      const target = { side, kind: 'board', index };
      if (playCard(state, 'player', sel.index, target)) refresh();
      else { state.selected = null; refresh(); }
      return;
    }
    if (sel.kind === 'board' && sel.side === 'player') {
      if (attack(state, 'player', sel.index, { side, kind: 'board', index })) refresh();
      else { state.selected = null; refresh(); }
      return;
    }
  }
  // Otherwise, select one of your own ready creatures as the attacker.
  if (side === 'player') {
    const c = state.player.board[index];
    if (c && c.canAttack) {
      state.selected = { kind: 'board', side: 'player', index };
      refresh();
    }
  }
}

function clickHeroTarget(state, side, refresh) {
  const sel = state.selected;
  if (!sel) return;
  if (sel.kind === 'hand') {
    const target = { side, kind: 'hero' };
    if (playCard(state, 'player', sel.index, target)) refresh();
    else { state.selected = null; refresh(); }
    return;
  }
  if (sel.kind === 'board' && sel.side === 'player') {
    if (attack(state, 'player', sel.index, { side, kind: 'hero' })) refresh();
    else { state.selected = null; refresh(); }
  }
}

// After every render, outline the legal targets of the current selection.
export function markTargets(state) {
  const sel = state.selected;
  if (!sel) return;
  if (sel.kind === 'hand') {
    const need = legalTargets(state, 'player', sel.index);
    if (need === 'any') {
      $('enemy-hero').classList.add('targetable');
      document.querySelectorAll('#enemy-board .card').forEach((el) => el.classList.add('targetable'));
    }
    return;
  }
  if (sel.kind === 'board' && sel.side === 'player') {
    for (const t of attackableTargets(state, 'player')) {
      if (t.kind === 'hero') {
        $(t.side === 'enemy' ? 'enemy-hero' : 'player-hero').classList.add('targetable');
      } else {
        const el = document.querySelector(`#${t.side}-board .card[data-board-index="${t.index}"]`);
        if (el) el.classList.add('targetable');
      }
    }
  }
}
