/** Contract versions are decimal integer strings ('1','2',…). */
export function isValidVersion(s: string): boolean {
  return /^[0-9]+$/.test(s);
}

/** Highest version both sides support; null if disjoint or any candidate is malformed. */
export function negotiateVersion(hostVersions: string[], mine: string[]): string | null {
  const set = new Set(mine.filter(isValidVersion));
  const common = hostVersions.filter((v) => isValidVersion(v) && set.has(v));
  if (common.length === 0) return null;
  return common.sort((a, b) => Number(b) - Number(a))[0];
}
