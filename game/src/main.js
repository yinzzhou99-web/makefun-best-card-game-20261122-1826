// Ember Duel bootstrap: wires state, rendering, input and the AI together,
// and stages screenshot scenes when ?shot= is given.

import { runEnemyTurn } from './ai.js';
import { bindInput, markTargets } from './input.js';
import { floatNumber, render, showEnd, showScreen } from './render.js';
import { stageShot } from './shots.js';
import { endTurn, enemyTurnDone, newGame, startDuel } from './state.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const shot = params.get('shot');

let state = newGame();
let aiRunning = false;

function refresh() {
  const prevPlayerHp = state._shownPlayerHp ?? state.player.hp;
  const prevEnemyHp = state._shownEnemyHp ?? state.enemy.hp;
  render(state);
  markTargets(state);
  if (state.player.hp < prevPlayerHp) {
    floatNumber(`-${prevPlayerHp - state.player.hp}`, $('player-hero'));
    $('player-hero').classList.add('hurt');
    setTimeout(() => $('player-hero').classList.remove('hurt'), 320);
  }
  if (state.enemy.hp < prevEnemyHp) {
    floatNumber(`-${prevEnemyHp - state.enemy.hp}`, $('enemy-hero'));
    $('enemy-hero').classList.add('hurt');
    setTimeout(() => $('enemy-hero').classList.remove('hurt'), 320);
  }
  if (state.player.hp > prevPlayerHp) floatNumber(`+${state.player.hp - prevPlayerHp}`, $('player-hero'), true);
  state._shownPlayerHp = state.player.hp;
  state._shownEnemyHp = state.enemy.hp;

  if (state.phase === 'win' || state.phase === 'loss') {
    showEnd(state);
    return;
  }
  if (state.phase === 'play' && state.active === 'enemy' && !aiRunning) {
    aiRunning = true;
    runEnemyTurn(state, refresh).then(() => {
      aiRunning = false;
      if (state.phase === 'play') {
        enemyTurnDone(state);
        refresh();
      }
    });
  }
}

function beginNewDuel() {
  state = newGame();
  startDuel(state);
  aiRunning = false;
  showScreen('table-screen');
  refresh();
}

$('play-button').addEventListener('click', beginNewDuel);
$('again-button').addEventListener('click', () => {
  showScreen('title-screen');
  state = newGame();
  refresh();
});
$('end-turn').addEventListener('click', () => {
  if (state.phase === 'play' && state.active === 'player') {
    state.selected = null;
    if (endTurn(state)) refresh();
  }
});

bindInput(() => state, refresh);

if (shot) {
  // Screenshot staging: render a fixed scene of the real game.
  state = stageShot(shot);
  if (state.phase === 'title') {
    showScreen('title-screen');
  } else if (state.phase === 'play') {
    showScreen('table-screen');
    render(state);
    markTargets(state);
  } else {
    showEnd(state);
  }
} else {
  showScreen('title-screen');
  render(state);
}
