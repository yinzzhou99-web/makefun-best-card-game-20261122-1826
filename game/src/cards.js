// Card definitions for Ember Duel: every card is original, with a cost, a
// suit (element), and either creature stats or a spell effect.

export const SUITS = {
  flame: { symbol: '♥', label: 'Flame' },
  ember: { symbol: '♦', label: 'Ember' },
  stone: { symbol: '♠', label: 'Stone' },
  gale: { symbol: '♣', label: 'Gale' },
};

// kw: guard = must be attacked first; swift = may attack the turn it is played.
export const CARDS = [
  { id: 'pup',    name: 'Cinder Pup',   cost: 1, type: 'creature', atk: 2, hp: 1, suit: 'flame', art: '♥', text: 'A spark with teeth.' },
  { id: 'imp',    name: 'Spark Imp',    cost: 1, type: 'creature', atk: 1, hp: 2, suit: 'ember', art: '♦', kw: ['swift'], text: 'Swift: strikes at once.' },
  { id: 'hound',  name: 'Ash Hound',    cost: 2, type: 'creature', atk: 3, hp: 2, suit: 'flame', art: '♥', text: 'It hunts the dying light.' },
  { id: 'guard',  name: 'Ember Guard',  cost: 2, type: 'creature', atk: 1, hp: 4, suit: 'stone', art: '♠', kw: ['guard'], text: 'Guard: foes must face it first.' },
  { id: 'sprite', name: 'Flame Sprite', cost: 2, type: 'creature', atk: 2, hp: 2, suit: 'gale',  art: '♣', kw: ['swift'], text: 'Swift: strikes at once.' },
  { id: 'golem',  name: 'Coal Golem',   cost: 3, type: 'creature', atk: 3, hp: 4, suit: 'stone', art: '♠', kw: ['guard'], text: 'Guard: foes must face it first.' },
  { id: 'falcon', name: 'Blaze Falcon', cost: 3, type: 'creature', atk: 4, hp: 2, suit: 'ember', art: '♦', kw: ['swift'], text: 'Swift: strikes at once.' },
  { id: 'brute',  name: 'Magma Brute',  cost: 4, type: 'creature', atk: 5, hp: 4, suit: 'flame', art: '♥', text: 'It drinks the mountain.' },
  { id: 'phoenix',name: 'Phoenix Chick',cost: 4, type: 'creature', atk: 3, hp: 5, suit: 'gale',  art: '♣', text: 'Small now. Not for long.' },
  { id: 'drake',  name: 'Inferno Drake',cost: 6, type: 'creature', atk: 7, hp: 6, suit: 'flame', art: '♥', text: 'The sky itself catches fire.' },
  { id: 'fireball', name: 'Fireball',   cost: 2, type: 'spell', suit: 'flame', art: '♥', effect: 'damage3', text: 'Deal 3 damage to any target.' },
  { id: 'mend',   name: 'Mend Flames',  cost: 2, type: 'spell', suit: 'gale',  art: '♣', effect: 'heal5',   text: 'Restore 5 life to your hero.' },
  { id: 'kindle', name: 'Kindle',       cost: 2, type: 'spell', suit: 'ember', art: '♦', effect: 'draw2',   text: 'Draw 2 cards.' },
  { id: 'wave',   name: 'Ember Wave',   cost: 3, type: 'spell', suit: 'stone', art: '♠', effect: 'damage2all', text: 'Deal 2 damage to all enemy creatures.' },
];

export function cardById(id) {
  return CARDS.find((c) => c.id === id);
}

// A deck is two copies of every card: 28 cards. Shuffled with the given rng.
export function buildDeck(rng) {
  const deck = [];
  for (const card of CARDS) deck.push(card.id, card.id);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// Tiny seeded rng (mulberry32) so staged screenshot scenes are deterministic.
export function seededRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
