// The deck always has at least this many cards, and one per area under the weak-area cutoff
// when there are more of those.
export const MIN_LESSONS = 4;

export const youtubeSearch = (query) => `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

const lessonText = (lesson) => [lesson.title, lesson.learning_goal, lesson.reason, lesson.category, ...(lesson.helps_with || [])]
  .filter(Boolean).join(' ').toLowerCase();

const searchCard = ({ key, topic, area, reason }) => ({
  id: `search-${key}`,
  url: youtubeSearch(`${topic} photography tutorial`),
  learning_goal: `Improve your ${topic.toLowerCase()}`,
  reason,
  helps_with: [area],
  isSearch: true,
});

/**
 * Real YouTube searches for this photo's weak spots: detected mistakes first, then its
 * lowest-scoring categories. Never invented videos.
 */
export function searchRecommendations(mistakes = [], categories = []) {
  const picks = mistakes.map((mistake) => ({
    key: mistake.id,
    topic: mistake.metricLabel || mistake.categoryLabel,
    area: mistake.categoryLabel,
    reason: mistake.diagnosis,
  }));
  const weakest = categories.filter((category) => category.score != null).sort((a, b) => a.score - b.score);
  for (const [rank, category] of weakest.entries()) {
    if (picks.some((pick) => pick.area === category.label)) continue;
    const reason = rank === 0
      ? `${category.label} scored ${category.score}/100, this frame's lowest.`
      : `${category.label} scored ${category.score}/100.`;
    picks.push({ key: category.id, topic: category.label, area: category.label, reason });
  }
  return picks.map(searchCard);
}

/**
 * The lesson deck: max(MIN_LESSONS, number of weak areas) cards. Real lessons come first; when
 * there are not enough, search cards fill in, first for weak areas no lesson already names, then
 * from searchRecommendations. Cards are unique by URL, and each carries its priority label.
 */
export function lessonDeck({ lessons = [], weak = [], mistakes = [], categories = [] }) {
  const target = Math.max(MIN_LESSONS, weak.length);
  const deck = [];
  const seen = new Set();
  const add = (card) => {
    if (deck.length >= target || !card.url || seen.has(card.url)) return;
    seen.add(card.url);
    deck.push(card);
  };
  lessons.forEach(add);
  const covered = deck.map(lessonText).join(' ');
  weak
    .filter((area) => !covered.includes(area.label.toLowerCase()))
    .map((area) => searchCard({ key: area.id, topic: area.label, area: area.area, reason: `${area.label} scored ${area.score}/100.` }))
    .forEach(add);
  searchRecommendations(mistakes, categories).forEach(add);
  return deck.map((card, index) => ({
    ...card,
    priority_label: index === 0 ? 'Most recommended' : card.priority_label || 'Then explore',
  }));
}
