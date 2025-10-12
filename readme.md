# CodeLens

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v14+-green.svg)](https://nodejs.org/)
[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/yourusername/codelens)

**CodeLens** is a powerful real-time file monitoring utility with a beautiful terminal UI, providing immediate visibility into file changes with colorful diffs, deltas, and interactive controls. Track modifications as they happen with an elegant interface designed for developers.

## Features

- **Beautiful Terminal UI** - Rich, colorful interface with glassomorphic design
- **Real-time Diff Visualization** - See exactly what changed with color-coded diffs
- **Delta Tracking** - Track lines added/deleted with visual indicators
- **Interactive Menu** - Ignore/accept files with keyboard shortcuts
- **Smart Filtering** - Automatically ignores node_modules, vendor, dist, etc.
- **File Type Icons** - Automatic categorization (JS, PHP, CSS, etc.)
- **Git Integration** - Git-aware change detection when in a repository
- **Activity Log** - See all file changes in real-time
- **Statistics Dashboard** - Live stats for modified files and line changes
- **Animated Status** - Smooth animations and loading indicators

## Requirements

- Node.js v14 or higher
- pnpm (will be installed automatically if missing)
- Terminal with 256 color support
- Git (optional, for enhanced diff features)

## Installation

### Quick Install

```bash
# Clone this repository
git clone https://github.com/yourusername/codelens.git

# Navigate to the CodeLens directory
cd codelens

# Run the installation script
./install.sh
```

The installer will:
1. Check for Node.js and pnpm
2. Install dependencies
3. Link CodeLens globally
4. Make it available as `codelens` command

### Local Development

To run without installing:

```bash
cd codelens
pnpm install
node index.js
```

## Usage

After installation, navigate to any project directory and run:

```bash
cd /path/to/your/project
codelens
```

### Interface Overview

```
┌─────────────────────────────────────────────────────────────┐
│              CodeLens - Real-time File Monitoring            │
├────────────┬────────────┬────────────┬────────────┐
│ Modified   │ Lines      │ Lines      │ Status     │
│ Files: 5   │ Added: +42 │ Deleted: 8 │ ● WATCHING │
├────────────┴────────────┴────────────┴────────────┤
│ Recent Changes          │ Diff Preview            │
│ ● [JS] 14:30 +5 -2      │ + Added lines (green)   │
│ ● [PHP] 14:28 +12 -3    │ - Deleted lines (red)   │
│ ● [CSS] 14:25 +8 -1     │ ~ Changed context       │
├─────────────────────────┴─────────────────────────┤
│ Activity Log                                      │
│ [14:30:15] Modified: src/app.js +5 -2            │
│ [14:28:42] Modified: index.php +12 -3            │
└───────────────────────────────────────────────────┘
```

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `↑` / `k` | Move up in file list |
| `↓` / `j` | Move down in file list |
| `Enter` | View detailed diff |
| `i` | Ignore selected file |
| `a` | Accept/restore file |
| `c` | Clear all changes |
| `r` | Refresh view |
| `?` | Toggle help menu |
| `q` / `Ctrl+C` | Quit |

### Features in Detail

**Color-coded Diffs:**
- Green lines = Added
- Red lines = Deleted
- Cyan headers = Change context
- Gray lines = Unchanged context

**File Status:**
- Green ● = Active/tracked
- Red ● = Ignored
- Blue +N = Lines added
- Red -N = Lines deleted

## Customization

You can customize CodeLens by editing `index.js`:

- **Watch patterns**: Modify `watchPatterns` array to add/remove file types
- **Ignore patterns**: Update `ignorePatterns` to exclude specific directories
- **Colors**: Change the color scheme in the UI components
- **Stats display**: Adjust the stats grid layout
- **Max modifications**: Change the history limit (default: 50 files)

Example customization:

```javascript
// Add new file types to watch
const watchPatterns = [
  '**/*.{js,jsx,ts,tsx,php,twig,css,scss,html,json,yaml,yml,md}',
  '**/*.{py,rb,go,rs}',  // Add Python, Ruby, Go, Rust
];

// Add custom ignore patterns
const ignorePatterns = [
  '**/node_modules/**',
  '**/vendor/**',
  '**/my-custom-dir/**',  // Your custom exclusion
];
```

## Uninstallation

To remove CodeLens from your system:

```bash
# Using the install script
./install.sh remove

# Or manually
cd /path/to/codelens
pnpm unlink --global
```

## Contributing

Contributions are welcome! Here's how you can contribute:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature-name`
5. Open a pull request

## Troubleshooting

**Q: CodeLens doesn't show any files**
A: Make sure you're in a directory with files that match the watch patterns. Check the activity log for errors.

**Q: Colors don't display properly**
A: Ensure your terminal supports 256 colors. Try a modern terminal like iTerm2, Alacritty, or Windows Terminal.

**Q: High CPU usage**
A: CodeLens watches many files. You can reduce load by adding more patterns to `ignorePatterns`.

**Q: Git diff not working**
A: CodeLens falls back to file snapshots if not in a git repo. This is normal behavior.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Credits / Crédits

**EN:** Made with ♥ by [Antonin Nvh](https://olive.click)
**FR:** Créé avec ♥ par [Antonin Nvh](https://olive.click)

---

**CodeLens** - A beautiful terminal UI for real-time file monitoring
**CodeLens** - Une interface terminal élégante pour la surveillance de fichiers en temps réel

© 2025 Antonin Nvh. All rights reserved. | Tous droits réservés.
