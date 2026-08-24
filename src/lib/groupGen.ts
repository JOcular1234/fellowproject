import { LEVEL_ORDER, type FellowLevel, type Fellow } from './types';

export interface GeneratedGroup {
  level: FellowLevel;
  groupNumber: number;
  name: string;
  members: Fellow[];
}

export interface GroupStats {
  count: number;
  avgLessons: number;
  avgRanking: number;
}

export function calcStats(members: Fellow[]): GroupStats {
  if (members.length === 0) return { count: 0, avgLessons: 0, avgRanking: 0 };
  const sumL = members.reduce((s, m) => s + m.lessons_completed, 0);
  const sumR = members.reduce((s, m) => s + m.ranking, 0);
  return {
    count: members.length,
    avgLessons: Math.round((sumL / members.length) * 10) / 10,
    avgRanking: Math.round((sumR / members.length) * 10) / 10,
  };
}

/**
 * Given N fellows and a target group size (5 or 6), determine how many groups
 * are needed and how to distribute fellows so groups are as close to the
 * target size as possible.
 * Returns an array of sizes (e.g. [5, 6] for 11 fellows with size 5).
 */
export function calcGroupSizes(total: number, target: number): number[] {
  if (total <= 0) return [];
  const numGroups = Math.max(1, Math.round(total / target));
  const base = Math.floor(total / numGroups);
  let remainder = total - base * numGroups;
  const sizes: number[] = [];
  for (let i = 0; i < numGroups; i++) {
    let size = base;
    if (remainder > 0) {
      size++;
      remainder--;
    }
    sizes.push(size);
  }
  return sizes.sort((a, b) => a - b);
}

/**
 * Balanced + Random grouping algorithm.
 *
 * 1. Shuffle fellows within the level (randomization).
 * 2. Sort by a composite score (lessons as primary, ranking as secondary).
 * 3. Use "snake draft" distribution: assign fellows to groups in order,
 *    reversing group order each round so that group 1 gets the best fellow,
 *    group N gets the second-best, group N gets the third-best, group 1 gets
 *    the fourth, etc. This balances overall strength across groups.
 *
 * The shuffle ensures each regeneration produces a different arrangement,
 * while the snake draft ensures balance.
 */
export function generateGroupsForLevel(
  fellows: Fellow[],
  level: FellowLevel,
  targetSize: number
): GeneratedGroup[] {
  // Filter to this level
  const levelFellows = fellows.filter((f) => f.level === level);
  if (levelFellows.length === 0) return [];

  // Shuffle for randomization
  const shuffled = [...levelFellows];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Sort by composite score: lessons_completed primary (desc), ranking secondary (asc — lower rank = better)
  shuffled.sort((a, b) => {
    if (b.lessons_completed !== a.lessons_completed) {
      return b.lessons_completed - a.lessons_completed;
    }
    return a.ranking - b.ranking;
  });

  const sizes = calcGroupSizes(shuffled.length, targetSize);
  const numGroups = sizes.length;

  // Create empty buckets
  const buckets: Fellow[][] = Array.from({ length: numGroups }, () => []);

  // Snake draft: distribute fellows to balance strength
  let forward = true;
  let idx = 0;
  for (let round = 0; idx < shuffled.length; round++) {
    const groupIndices = forward
      ? Array.from({ length: numGroups }, (_, i) => i)
      : Array.from({ length: numGroups }, (_, i) => numGroups - 1 - i);

    for (const gi of groupIndices) {
      if (idx >= shuffled.length) break;
      if (buckets[gi].length < sizes[gi]) {
        buckets[gi].push(shuffled[idx]);
        idx++;
      }
    }
    forward = !forward;
  }

  return buckets.map((members, i) => ({
    level,
    groupNumber: i + 1,
    name: '',
    members,
  }));
}

export function generateAllGroups(
  fellows: Fellow[],
  targetSize: number
): GeneratedGroup[] {
  const allGroups: GeneratedGroup[] = [];

  for (const level of LEVEL_ORDER) {
    const levelGroups = generateGroupsForLevel(fellows, level, targetSize);
    levelGroups.forEach((g, i) => {
      g.groupNumber = i + 1;
    });
    allGroups.push(...levelGroups);
  }

  return allGroups;
}

/**
 * Suggest a level based on lessons_completed.
 * Assumes lessons_completed ranges roughly 0-50+.
 * These thresholds are adjustable by the admin.
 */
export function suggestLevel(lessonsCompleted: number): FellowLevel {
  if (lessonsCompleted >= 40) return 'ADVANCED';
  if (lessonsCompleted >= 30) return 'UPPER_INTERMEDIATE';
  if (lessonsCompleted >= 20) return 'INTERMEDIATE';
  if (lessonsCompleted >= 10) return 'DEVELOPING';
  return 'BEGINNER';
}
