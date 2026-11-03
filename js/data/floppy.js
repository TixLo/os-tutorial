// The files on the OS's floppy image from day 18 on, and where they sit in memory. The
// IPL copies the first 10 cylinders of the disk to 0x8000 (day 3), so byte n of the disk
// is at 0x8000 + n:
//   FAT          disk 0x0200 → 0x08200
//   root dir     disk 0x2600 → 0x0A600 (224 entries of 32 bytes)
//   cluster c    disk 0x3E00 + c × 512 → 0x0BE00 + c × 512 (clusters start at 2)
// Sizes and clusters are for this site's disk; the book's disk holds other files.

export const DISK_BASE = 0x8000;
export const FAT_ADDR = DISK_BASE + 0x0200;
export const ROOT_ADDR = DISK_BASE + 0x2600;
export const clusterAddr = (cluster) => DISK_BASE + 0x3E00 + cluster * 512;

export const HELLO_TEXT = 'Hello, this file is on the floppy disk.\n';

// name, ext, attribute, first cluster, size; files later days add are marked with `from`
export const FILES = Object.freeze([
  { name: 'KERNEL', ext: 'SYS', attr: 0x20, cluster: 2, size: 15672 },
  { name: 'IPL', ext: 'ASM', attr: 0x20, cluster: 33, size: 1872 },
  { name: 'HELLO', ext: 'TXT', attr: 0x20, cluster: 37, size: HELLO_TEXT.length },
  { name: 'HLT', ext: 'APP', attr: 0x20, cluster: 38, size: 3, from: 19 },
  { name: 'HELLO', ext: 'APP', attr: 0x20, cluster: 39, size: 29, from: 20 },
  { name: 'CRACK', ext: 'APP', attr: 0x20, cluster: 40, size: 20, from: 21 },
  { name: 'HELLO2', ext: 'APP', attr: 0x20, cluster: 41, size: 120, from: 22 },
  { name: 'BUG', ext: 'APP', attr: 0x20, cluster: 42, size: 96, from: 22 },
  { name: 'BUG2', ext: 'APP', attr: 0x20, cluster: 44, size: 44, from: 22 },
  { name: 'WINHELO', ext: 'APP', attr: 0x20, cluster: 43, size: 190, from: 22 },
]);

export const filesOnDay = (day) => FILES.filter((file) => !file.from || file.from <= day);

const pad = (text, width) => text.padEnd(width, ' ');
const bytesOf = (text) => [...text].map((ch) => ch.charCodeAt(0));
const le16 = (value) => [value & 0xFF, (value >> 8) & 0xFF];
const le32 = (value) => [...le16(value & 0xFFFF), ...le16(value >>> 16)];

// One 32-byte root directory entry
export function dirEntry({ name, ext, attr, cluster, size }) {
  return [
    ...bytesOf(pad(name, 8)), ...bytesOf(pad(ext, 3)), attr,
    ...new Array(10).fill(0),
    ...le16(0x6000), ...le16(0x5C61),   // time and date (an arbitrary example)
    ...le16(cluster), ...le32(size),
  ];
}

// The root directory as a memory write
export const rootDirWrite = (day) => ({
  start: ROOT_ADDR, end: ROOT_ADDR + 224 * 32 - 1, fill: 0,
  data: [[ROOT_ADDR, filesOnDay(day).flatMap(dirEntry)]],
});

// The console's dir listing
export const dirLines = (day) =>
  filesOnDay(day).map((file) => `${pad(file.name, 8)}.${pad(file.ext, 3)} ${String(file.size).padStart(7)}`);

// The FAT: one 12-bit entry per cluster, the number of the file's next cluster, or 0xFFF
// at the end of a file. Entries 0 and 1 are reserved (0xFF0 = a 1.44 MB floppy).
export function fatEntries(day) {
  const fat = [0xFF0, 0xFFF];
  for (const file of filesOnDay(day)) {
    const count = Math.max(1, Math.ceil(file.size / 512));
    for (let i = 0; i < count; i++) {
      fat[file.cluster + i] = i === count - 1 ? 0xFFF : file.cluster + i + 1;
    }
  }
  return Array.from({ length: fat.length }, (_, i) => fat[i] || 0);
}

// Two 12-bit entries packed into three bytes, low nibble first
export function packFat(entries) {
  const bytes = [];
  for (let i = 0; i < entries.length; i += 2) {
    const a = entries[i];
    const b = entries[i + 1] || 0;
    bytes.push(a & 0xFF, ((a >> 8) & 0x0F) | ((b & 0x0F) << 4), (b >> 4) & 0xFF);
  }
  return bytes;
}

export const fatWrite = (day) => ({
  start: FAT_ADDR, end: FAT_ADDR + 9 * 512 - 1, fill: 0,
  data: [[FAT_ADDR, packFat(fatEntries(day))]],
});

// A file's contents as a memory write, at its first cluster
export const fileWrite = (file, bytes) => ({
  start: clusterAddr(file.cluster), end: clusterAddr(file.cluster) + Math.max(1, Math.ceil(file.size / 512)) * 512 - 1,
  fill: 0, data: [[clusterAddr(file.cluster), bytes]],
});
export const textBytes = (text) => [...text].map((ch) => ch.charCodeAt(0));
