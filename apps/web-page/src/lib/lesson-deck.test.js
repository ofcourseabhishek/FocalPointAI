import assert from 'node:assert/strict';
import test from 'node:test';

import { lessonDeck } from './lesson-deck.js';

const lesson = (id, reason) => ({ id, url: `https://www.youtube.com/watch?v=${id.padEnd(11, 'x')}`, title: id, learning_goal: id, reason });
const area = (label, score, group = 'Lighting') => ({ id: `${group}-${label}`, label, area: group, score });
const categories = [{ id: 'focus', label: 'Focus', score: 40 }, { id: 'color', label: 'Color', score: 70 }, { id: 'light', label: 'Lighting', score: 80 }, { id: 'composition', label: 'Composition', score: 90 }];

test('always at least four cards, real lessons first', () => {
  const deck = lessonDeck({ lessons: [lesson('a', 'Brightness is low'), lesson('b', 'Focus')], weak: [], categories });
  assert.equal(deck.length, 4);
  assert.deepEqual(deck.slice(0, 2).map((card) => card.id), ['a', 'b']);
  assert.ok(deck.slice(2).every((card) => card.isSearch));
  assert.equal(deck[0].priority_label, 'Most recommended');
});

test('one card per weak area when there are more than four', () => {
  const weak = ['Details', 'Brightness', 'Saturation', 'Shadows', 'Wow Factor', 'Warmth'].map((label, i) => area(label, 20 + i));
  const deck = lessonDeck({ lessons: [lesson('a', 'Brightness is low')], weak, categories });
  assert.equal(deck.length, 6);
  // Brightness is named by the real lesson, so it gets no extra search card.
  const searches = deck.filter((card) => card.isSearch).map((card) => card.learning_goal);
  assert.ok(!searches.includes('Improve your brightness'));
  assert.ok(searches.includes('Improve your details'));
});

test('no duplicate cards', () => {
  const deck = lessonDeck({ lessons: [lesson('a', 'x'), lesson('a', 'x')], weak: [area('Focus', 30, 'Focus')], categories });
  assert.equal(new Set(deck.map((card) => card.url)).size, deck.length);
});

test('stops at real lessons when they already fill the deck', () => {
  const deck = lessonDeck({ lessons: ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => lesson(id, 'x')), weak: [area('Details', 10)], categories });
  assert.equal(deck.length, 4);
  assert.ok(deck.every((card) => !card.isSearch));
});
