import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// Directory containing the source videos
const VIDEO_DIR = path.resolve(process.argv[2] || "./videos");
// Directory where merged videos will be written
const OUTPUT_DIR = path.resolve(process.argv[3] || "./merged");
// Milliseconds in two hours
const THRESHOLD_MS = 2 * 60 * 60 * 1000;

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Extract a timestamp of the form YYYY‑MM‑DD_HH_MM_SS (flexible separators)
 * from *anywhere* inside the filename. Examples it should parse:
 *   cam_2025-03-15T14-00-32_record.mp4
 *   20250315_140032_clip.mp4
 *   foo‑2025_03_15‑14_00_32‑bar.mp4
 *
 * Allowed separators between components:  -, _, ., T, or nothing.
 *
 * @param {string} filename – basename including extension
 * @returns {Date|null}
 */
function parseTimestamp(filename) {
  // Look for YYYY sep MM sep DD <optional non‑digit> HH sep mm sep ss
  const re = /(\d{4})[\-_.]?(\d{2})[\-_.]?(\d{2})[^\d]?(\d{2})[\-_.]?(\d{2})[\-_.]?(\d{2})/;
  const m = filename.match(re);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  // Build ISO string and treat as UTC to keep ordering consistent
  return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}Z`);
}

/** Gather and sort the .mp4 files by their embedded timestamps */
const files = fs
  .readdirSync(VIDEO_DIR)
  .filter((f) => f.toLowerCase().endsWith(".mp4"))
  .map((f) => ({ file: f, date: parseTimestamp(f) }))
  .filter(({ date }) => date instanceof Date && !isNaN(date))
  .sort((a, b) => a.date - b.date);

if (!files.length) {
  console.error(`No mp4 files with parsable timestamps found in ${VIDEO_DIR}`);
  process.exit(1);
}

/** Group consecutive videos that are within the threshold */
const groups = [];
let current = [];
for (const item of files) {
  if (!current.length) {
    current.push(item);
    continue;
  }
  const diff = item.date - current[current.length - 1].date;
  if (diff <= THRESHOLD_MS) {
    current.push(item);
  } else {
    groups.push(current);
    current = [item];
  }
}
if (current.length) groups.push(current);

/**
 * Merge or copy a group of videos.
 */
function mergeGroup(group) {
  if (group.length === 1) {
    const src = path.join(VIDEO_DIR, group[0].file);
    const dest = path.join(OUTPUT_DIR, group[0].file);
    fs.copyFileSync(src, dest);
    console.log(`Copied single video → ${dest}`);
    return;
  }

  // Absolute paths so ffmpeg can locate files no matter where the list file sits
  const listPath = path.join(
    OUTPUT_DIR,
    `concat_${Date.now()}_${Math.random().toString(36).slice(2)}.txt`
  );
  const listContent = group
    .map(({ file }) => `file '${path.resolve(VIDEO_DIR, file).replace(/'/g, "'\\''")}'`)
    .join("\n");
  fs.writeFileSync(listPath, listContent);

  const format = (d) => d.toISOString().replace(/[:-]/g, "").replace("T", "_").slice(0, 15);
  const start = format(group[0].date);
  const end = format(group[group.length - 1].date);
  const outputFile = path.join(OUTPUT_DIR, `merged_${start}_to_${end}.mp4`);

  try {
    execSync(`ffmpeg -y -f concat -safe 0 -i "${listPath}" -c copy "${outputFile}"`, {
      stdio: "inherit",
    });
    console.log(`Merged ${group.length} videos → ${outputFile}`);
  } catch (err) {
    console.error("❌  ffmpeg merge failed", err);
  } finally {
    fs.unlinkSync(listPath);
  }
}

console.log(`Found ${files.length} videos → ${groups.length} group(s) to process.`);
for (const group of groups) mergeGroup(group);
console.log("Done ✔️");
