export const XP_PER_MESSAGE = 5;
export const XP_PER_LEVEL = 100;

export function computeLevel(xp: number): number {
  return 1 + Math.floor(xp / XP_PER_LEVEL);
}
