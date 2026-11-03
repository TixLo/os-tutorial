// Color palettes of the 256-color graphics mode. A pixel in video memory is a color
// number; the video card looks it up in its palette, a table of 256 red/green/blue
// entries. The card stores 6 bits per channel (0-63); here they are kept as 8-bit
// '#RRGGBB' strings for drawing.

const hex2 = (value) => value.toString(16).toUpperCase().padStart(2, '0');
const rgb6 = (r, g, b) => '#' + [r, g, b].map((v) => hex2(Math.round((v * 255) / 63))).join('');

// The first 16 entries a VGA card starts with: the old 16-color text-mode colors
const VGA_16 = Object.freeze([
  '#000000', '#0000AA', '#00AA00', '#00AAAA', '#AA0000', '#AA00AA', '#AA5500', '#AAAAAA',
  '#555555', '#5555FF', '#55FF55', '#55FFFF', '#FF5555', '#FF55FF', '#FFFF55', '#FFFFFF',
]);

// The rest of the power-on palette, approximately: 16 grays, then 24 hues at three
// brightness levels and three saturations, then black. Only the first 16 entries matter
// on this site.
function vgaRest() {
  const grays = [0, 5, 8, 11, 14, 17, 20, 24, 28, 32, 36, 40, 45, 50, 56, 63]
    .map((v) => rgb6(v, v, v));
  const hues = [];
  for (const [high, levels] of [[63, [0, 16, 31]], [28, [0, 7, 14]], [16, [0, 4, 8]]]) {
    for (const low of levels) {
      const mid = (step) => low + Math.round(((high - low) * step) / 4);
      // Walk the color wheel: blue, magenta, red, yellow, green, cyan, back to blue
      const ramp = [];
      for (let s = 0; s < 4; s++) ramp.push([mid(s), low, high]);
      for (let s = 4; s > 0; s--) ramp.push([high, low, mid(s)]);
      for (let s = 0; s < 4; s++) ramp.push([high, mid(s), low]);
      for (let s = 4; s > 0; s--) ramp.push([mid(s), high, low]);
      for (let s = 0; s < 4; s++) ramp.push([low, high, mid(s)]);
      for (let s = 4; s > 0; s--) ramp.push([low, mid(s), high]);
      hues.push(...ramp.map(([r, g, b]) => rgb6(r, g, b)));
    }
  }
  return [...grays, ...hues, ...new Array(8).fill('#000000')];
}

const VGA = Object.freeze([...VGA_16, ...vgaRest()]);

// The 16 colors the OS sets on day 4, by name. Each value is what the kernel writes,
// in 8-bit form; the kernel divides by 4 to fit the card's 6 bits.
export const OS_COLORS = Object.freeze([
  { name: 'Black',        rgb: '#000000' },
  { name: 'Red',          rgb: '#FF0000' },
  { name: 'Green',        rgb: '#00FF00' },
  { name: 'Yellow',       rgb: '#FFFF00' },
  { name: 'Blue',         rgb: '#0000FF' },
  { name: 'Magenta',      rgb: '#FF00FF' },
  { name: 'Cyan',         rgb: '#00FFFF' },
  { name: 'White',        rgb: '#FFFFFF' },
  { name: 'Light gray',   rgb: '#C6C6C6' },
  { name: 'Dark red',     rgb: '#840000' },
  { name: 'Dark green',   rgb: '#008400' },
  { name: 'Dark yellow',  rgb: '#848400' },
  { name: 'Dark blue',    rgb: '#000084' },
  { name: 'Dark magenta', rgb: '#840084' },
  { name: 'Teal',         rgb: '#008484' },
  { name: 'Dark gray',    rgb: '#848484' },
]);

// Color numbers by name, for drawing code in the step data
export const C = Object.freeze({
  black: 0, red: 1, green: 2, yellow: 3, blue: 4, magenta: 5, cyan: 6, white: 7,
  lightGray: 8, darkRed: 9, darkGreen: 10, darkYellow: 11, darkBlue: 12,
  darkMagenta: 13, teal: 14, darkGray: 15,
});

// The card's palette after the OS writes its 16 colors; entries 16-255 are left alone
const OS = Object.freeze([...OS_COLORS.map((color) => color.rgb), ...VGA.slice(16)]);

// Day 25: colors 16-231 become a 6 × 6 × 6 cube, each channel 0, 51, 102, ... 255:
// color 16 + r + g × 6 + b × 36
const hex8 = (value) => value.toString(16).toUpperCase().padStart(2, '0');
const CUBE = Array.from({ length: 216 }, (_, i) => {
  const r = i % 6;
  const g = Math.floor(i / 6) % 6;
  const b = Math.floor(i / 36);
  return '#' + [r, g, b].map((v) => hex8(v * 51)).join('');
});
const OS216 = Object.freeze([...OS.slice(0, 16), ...CUBE, ...OS.slice(232)]);

export const PALETTES = Object.freeze({ vga: VGA, os: OS, os216: OS216 });

// The color number of a cube color (each channel 0-5)
export const cube = (r, g, b) => 16 + r + g * 6 + b * 36;

// The 6-bit value the card stores for an 8-bit channel
export const to6bit = (value) => value >> 2;
