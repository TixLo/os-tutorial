// Step states are patches: each step lists only what changes, merged onto the step before.

// Merge a patch onto a state. Plain objects merge one level deep; arrays and values replace.
export function mergeState(base, patch) {
  const next = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    const isPlainObject = value !== null && typeof value === 'object' && !Array.isArray(value);
    next[key] = isPlainObject ? { ...base[key], ...value } : value;
  }
  return next;
}

// The full state at every step
export function buildStates(steps) {
  const states = [];
  let state = {};
  for (const step of steps) {
    state = mergeState(state, step.state);
    states.push(state);
  }
  return states;
}

// The full state after a chapter's last step, to start the next chapter from
export function finalState(steps) {
  return buildStates(steps).at(-1);
}
