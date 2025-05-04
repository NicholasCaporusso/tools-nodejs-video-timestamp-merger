# Timestamp-based Video Merger

A **Node.js** utility that scans a folder full of MP4 clips, detects the embedded timestamps in their filenames (anywhere in the name, using the pattern **YYYY‑MM‑DD HH mm ss** with flexible separators), groups clips that were recorded within **two hours** of each other, and concatenates the groups into lossless MP4 files using **FFmpeg**.

---

## Features

* **Flexible filename parsing** – Works with any filename that contains a timestamp like `2025-04-04_13-05-45` or `cam20250404T130545`. Separators (`-`, `_`, `.`, or none) are all accepted.
* **Automatic grouping** – Consecutive clips within a **configurable time window** (default ≤ 2 h) are merged; singletons are simply copied.
* **Lossless merging** – Uses FFmpeg’s concat demuxer to copy streams without re‑encoding.
* **Configurable** – Change the time window or output paths with command‑line arguments or a quick edit.

---

## Prerequisites

| Tool    | Tested Version | Notes                                  |
| ------- | -------------- | -------------------------------------- |
| Node.js | ≥ 18.x         | ECMAScript Modules & optional chaining |
| FFmpeg  | ≥ 4.2          | Must be in your `PATH`                 |

---

## Installation

```bash
# 1 ‑ Download or clone the repo
$ git clone https://github.com/yourname/video-merger.git
$ cd video-merger

# 2 ‑ Install Node dependencies (none right now, but keeps things tidy)
$ npm install
```

---

## Usage

### Quick start (defaults)

```bash
# Put your source clips in ./videos
$ node index.js
```

* Reads from **./videos**
* Writes merged files to **./merged**

### Custom folders

```bash
$ node index.js /path/to/input /path/to/output
```

### Example output

```
./merged/
├── merged_20250404_130545_to_20250404_143212.mp4
├── merged_20250404_160012_to_20250404_170045.mp4
└── cam-2025-04-04_18-30-00.mp4 (single clip, copied)
```

---

## Configuration

* **Adjust the grouping window** – Change the `THRESHOLD_MS` constant in `index.js` (milliseconds) **or** modify the script to accept a CLI flag such as `--interval` for runtime flexibility.
* **Different extensions** – Replace the `.mp4` filter in the file scan section.
* **Re‑encode instead of copy** – Replace `-c copy` with your preferred encoding flags.

---

## How it works

1. **Scan** – Reads all `.mp4` files in the input directory.
2. **Parse** – Extracts the first timestamp that matches the regex for `YYYY‑MM‑DD HH mm ss`.
3. **Sort & group** – Orders clips chronologically and chunks consecutive clips within the 2‑hour window.
4. **Merge / copy** – For each group:

   * Single clip → copied to the output directory.
   * Multiple clips → writes an FFmpeg concat list and runs:

     ```bash
     ffmpeg -y -f concat -safe 0 -i list.txt -c copy merged.mp4
     ```
5. **Clean up** – Removes the temporary concat list.

---

## Troubleshooting

| Issue                                                             | Solution                                                                                                              |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| “No MP4 files with parsable timestamps”                           | Check that your filenames include the timestamp pattern and have the `.mp4` extension.                                |
| FFmpeg complains about *invalid data found when processing input* | Ensure all clips share the same codecs and container parameters; lossless concat works only with homogeneous streams. |
| Time‑zone discrepancies                                           | The script treats all timestamps as **UTC** for sorting consistency. This normally won’t affect ordering.             |

---

## Contributing

Pull requests and suggestions are welcome! Feel free to open an issue for bugs, feature ideas, or improvements.

---

## License

MIT © 2025 Your Name
