/** Append a suggestion; no-op when already present. Returns a new array. */
export function addSuggestion(suggestions: string[], s: string): string[] {
  return suggestions.includes(s) ? suggestions.slice() : [...suggestions, s];
}

/** Remove a suggestion by value. */
export function removeSuggestion(suggestions: string[], s: string): string[] {
  return suggestions.filter((x) => x !== s);
}
