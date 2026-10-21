// Helpers for writing small programs as data: each line lists its source text and the
// bytes it assembles to, and assemble() works out every line's address.

// Bytes of a db directive: numbers and strings (one byte per character)
export const db = (...values) =>
  values.flatMap((v) => (typeof v === 'string' ? [...v].map((c) => c.charCodeAt(0)) : [v]));

// 16- and 32-bit values, stored low byte first
export const dw = (value) => [value & 0xFF, (value >>> 8) & 0xFF];
export const dd = (value) => [...dw(value & 0xFFFF), ...dw(value >>> 16)];

// Lines are { source, bytes, comment }, { label }, { heading } for a comment line that
// introduces a section, or { source, fillTo, comment } for padding with zeros up to an
// address. Returns { origin, size, lines, labels } with an
// address on every line.
export function assemble(origin, lines) {
  let address = origin;
  const labels = {};
  const placed = lines.map((line) => {
    if (line.label || line.heading) {
      if (line.label) labels[line.label] = address;
      return { ...line, address };
    }
    const bytes = line.fillTo !== undefined ? new Array(line.fillTo - address).fill(0) : line.bytes;
    const placedLine = { ...line, address, bytes };
    address += bytes.length;
    return placedLine;
  });
  return { origin, size: address - origin, lines: placed, labels };
}

// The program's bytes as memory write data: [[address, bytes], ...]
export function programData(program) {
  return program.lines.filter((line) => line.bytes).map((line) => [line.address, line.bytes]);
}

// The program as a plain source file: labels at the left, instructions indented, and
// comments lined up after them
export function sourceText(program, { header = [], column = 32 } = {}) {
  const lines = header.map((text) => `; ${text}`);
  if (header.length) lines.push('');
  for (const line of program.lines) {
    if (line.heading) {
      lines.push('', `; ${line.heading}`);
      continue;
    }
    if (line.label) {
      lines.push('', `${line.label}:`);
      continue;
    }
    const code = `        ${line.source}`;
    if (!line.comment) {
      lines.push(code);
    } else if (code.length < column) {
      lines.push(`${code.padEnd(column)}; ${line.comment}`);
    } else {
      lines.push(`        ; ${line.comment}`, code);  // too long to share a line
    }
  }
  return lines.join('\n');
}
