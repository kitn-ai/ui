// WHAT IS A STRING: the ONE masker that decides, for every guard that has to tell code from
// prose. Extracted from lint-dangling-imports.mjs, which needed it first and needed it subtly
// (see the statement-position note at its call site), so that a second guard can reuse it rather
// than grow a second opinion about where a template literal ends. Two implementations of "what is
// a string" drift, and the drift is invisible right up to the first file that trips the wrong one.
//
// The consumers today: lint-dangling-imports.mjs (which specifiers are STATEMENTS, not emitted
// code or expected text) and lib/block-compile-cells.mjs (whether TypeScript survived the strip
// out of the emitted .js, where the false positive was a `: string)` inside a guide's prose fence).

/**
 * Mask everything that is not code: comment bodies and string/template literal bodies. Returns a
 * Uint8Array where 1 = masked. A match whose `import`/`export` keyword starts in a masked region
 * is emitted code or expected text, not a statement.
 *
 * `stack` holds the MODE to return to, innermost last: `${` pushes `'template'` (the enclosing
 * template's body is where the interpolation ends, at its matching `}`), and a backtick starting
 * a template pushes `'code'`. That is what makes a nested template inside an interpolation work,
 * and it makes "the innermost frame is `'template'`" exactly the test for "this `}` closes an
 * interpolation".
 */
export function maskCode(text) {
  const mask = new Uint8Array(text.length);
  const n = text.length;
  const stack = [];
  let mode = 'code';
  let brace = 0;
  let i = 0;
  const pop = () => {
    mode = stack.pop() ?? 'code';
  };
  while (i < n) {
    const c = text[i];
    if (mode === 'template') {
      if (c === '\\') {
        mask[i] = 1;
        if (i + 1 < n) mask[i + 1] = 1;
        i += 2;
        continue;
      }
      if (c === '`') {
        mask[i] = 1;
        pop();
        i += 1;
        continue;
      }
      if (c === '$' && text[i + 1] === '{') {
        mask[i] = 1;
        mask[i + 1] = 1;
        stack.push('template');
        mode = 'code';
        brace = 0;
        i += 2;
        continue;
      }
      mask[i] = 1;
      i += 1;
      continue;
    }
    // mode === 'code'
    if (c === '{') {
      brace += 1;
      i += 1;
      continue;
    }
    if (c === '}') {
      if (brace > 0) {
        brace -= 1;
        i += 1;
        continue;
      }
      if (stack[stack.length - 1] === 'template') {
        mask[i] = 1;
        pop();
        i += 1;
        continue;
      }
      i += 1;
      continue;
    }
    if (c === '`') {
      mask[i] = 1;
      stack.push('code');
      mode = 'template';
      i += 1;
      continue;
    }
    if (c === '/' && text[i + 1] === '/') {
      const end = text.indexOf('\n', i);
      const stop = end === -1 ? n : end;
      for (let k = i; k < stop; k += 1) mask[k] = 1;
      i = stop;
      continue;
    }
    if (c === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      const stop = end === -1 ? n : end + 2;
      for (let k = i; k < stop; k += 1) mask[k] = 1;
      i = stop;
      continue;
    }
    if (c === "'" || c === '"') {
      let k = i + 1;
      while (k < n) {
        if (text[k] === '\\') {
          k += 2;
          continue;
        }
        if (text[k] === c || text[k] === '\n') break;
        k += 1;
      }
      const stop = Math.min(k + 1, n);
      for (let j = i; j < stop; j += 1) mask[j] = 1;
      i = stop;
      continue;
    }
    i += 1;
  }
  return mask;
}

/**
 * The same mask applied to the TEXT, for a guard that tests with a regex rather than by offset:
 * every masked character becomes a single space, so a pattern matches code and never a string
 * body or a comment. NEWLINES SURVIVE, and so does every offset, so a line-anchored pattern and
 * line numbers in a report stay honest -- masking a string's interior must not join two lines of
 * code into one where a `^` would then match something that is not at the start of a line.
 */
export function maskedCode(text) {
  const mask = maskCode(text);
  let out = '';
  let run = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (mask[i] === 0) continue;
    out += text.slice(run, i) + (text[i] === '\n' ? '\n' : ' ');
    run = i + 1;
  }
  return out + text.slice(run);
}
