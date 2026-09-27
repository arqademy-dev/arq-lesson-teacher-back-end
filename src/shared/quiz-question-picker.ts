// Picks `requestedSize` questions from `pool`, split as evenly as possible across
// `topicIds` (the topics that week covers), instead of pooling everything together
// and randomly slicing — which could starve or zero-out a topic by pure luck.
//
// Algorithm:
//   1. base = floor(requestedSize / topicCount); the first `remainder` topics
//      (requestedSize % topicCount) get one extra — so the totals always sum
//      to requestedSize when enough questions exist.
//   2. Each topic's own pool is shuffled, then its target slice is taken.
//   3. If a topic doesn't have enough to fill its target, the shortfall is
//      backfilled round-robin from whichever OTHER topics still have leftover
//      questions — so a shortfall in one topic doesn't just get dropped, it's
//      spread across the rest.
//   4. If the grand total available is still less than requestedSize, you get
//      everything available — this never throws, it just loads "the little
//      there is."
//   5. Final order is reshuffled so the quiz doesn't visibly group by topic.

export type QuizPoolItem = { topicId: string };

export function pickQuizQuestions<T extends QuizPoolItem>(
  topicIds: string[],
  pool: T[],
  requestedSize: number
): T[] {
  if (requestedSize <= 0 || topicIds.length === 0) return [];

  const byTopic = new Map<string, T[]>();
  for (const id of topicIds) byTopic.set(id, []);
  for (const q of pool) {
    if (byTopic.has(q.topicId)) byTopic.get(q.topicId)!.push(q);
  }
  for (const [id, list] of byTopic) byTopic.set(id, shuffle(list));

  const n = topicIds.length;
  const base = Math.floor(requestedSize / n);
  const remainder = requestedSize % n;

  const chosen: T[] = [];
  const leftoverByTopic = new Map<string, T[]>();

  topicIds.forEach((id, i) => {
    const target = base + (i < remainder ? 1 : 0);
    const list = byTopic.get(id) ?? [];
    chosen.push(...list.slice(0, target));
    leftoverByTopic.set(id, list.slice(target));
  });

  let short = requestedSize - chosen.length;
  if (short > 0) {
    let ring = topicIds.filter((id) => (leftoverByTopic.get(id)?.length ?? 0) > 0);
    let i = 0;
    while (short > 0 && ring.length > 0) {
      const id = ring[i % ring.length];
      const list = leftoverByTopic.get(id)!;
      const next = list.shift();
      if (next) {
        chosen.push(next);
        short--;
      }
      if (list.length === 0) {
        ring = ring.filter((x) => x !== id); // don't advance i — next item slides into this slot
      } else {
        i++;
      }
    }
  }

  return shuffle(chosen);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}