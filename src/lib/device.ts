// Sant på en dator med mus eller styrplatta, falskt på en pekskärm.
// Används för att inte öppna mobilens tangentbord av sig självt, eftersom det täcker halva skärmen.
export function hasFinePointer(): boolean {
  return window.matchMedia('(pointer: fine)').matches
}
