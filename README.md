# CodeLens

[![Crates.io](https://img.shields.io/crates/v/codelens.svg)](https://crates.io/crates/codelens)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

CodeLens is a high-performance, real-time file monitoring tool with a beautiful terminal user interface (TUI). Designed to help developers track file changes, visualize diffs, and view codebase activity without leaving the terminal.

Created with ❤️ by **Antonin Nivoche** ([Website](https://olive.click) | [Email](mailto:antonin.niv@gmail.com) | [LinkedIn](https://www.linkedin.com/in/antonin-nvh/)).

Written entirely in **Rust**, it offers zero-lag async file watching, smart filtering, and rich colored terminal rendering.

## 🚀 Features

- **Real-Time Monitoring**: Instantly detects and reacts to file modifications, creations, and deletions using `notify`.
- **Beautiful TUI**: Powered by `ratatui` and `crossterm` for a sleek, responsive, and robust grid-based layout.
- **Rich Diff Visualization**: Computes additions and deletions under the hood using `similar` and displays clear, colored inline diffs.
- **Smart Filtering**: Automatically ignores common build artifacts (e.g., `node_modules`, `target/`, `.git/`) and respects your `.gitignore` rules.
- **Initial Scan**: Automatically scans your project on startup to show existing files and their current state.
- **Binary Support**: Detects non-text files and shows them with a `[BIN]` tag.
- **Atomic Save Support**: Correctly handles editors that save files via temporary renames.
- **Interactive Controls**: Navigate through changes, ignore specific files, or clear your history all via keyboard shortcuts.
- **Activity Log**: Maintains a scrolling chronological log of all application and filesystem events.

## 📦 Installation

To install `codelens`, you need to have [Rust and Cargo](https://rustup.rs/) installed.

### From Source
```bash
git clone https://github.com/socket7/codelens.git
cd codelens
cargo install --path .
```

## 🎮 Usage

Run `codelens` in the root of the project you want to monitor:

```bash
codelens [OPTIONS] [PATH]
```

The application will immediately start monitoring the current directory (and its subdirectories).

### Options

| Flag | Description |
| --- | --- |
| `--all` | Track all files (disables node_modules, .git, and .gitignore filters) |
| `--no-ignore` | Disable .gitignore filtering |
| `--max-size <BYTES>` | Set maximum file size in bytes (default: 1MB) |
| `--help` | Display help message |

### Keyboard Shortcuts

| Key | Action |
| --- | --- |
| `↑` / `k` | Move up in the file list |
| `↓` / `j` | Move down in the file list |
| `i` | Ignore the currently selected file (hides it from the view) |
| `c` | Clear the current change history |
| `?` | Toggle the Help menu |
| `q` / `Ctrl+C` | Quit CodeLens |

## 🏗️ Architecture

CodeLens uses a clean, async-driven architecture optimized for low-latency terminal rendering:
- **`tokio`**: Powers the underlying asynchronous event loop and background threads.
- **`mpsc` Channels**: Ensures thread-safe, decoupled communication between the background file watcher, keyboard event poller, and the main UI loop.
- **`notify`**: Leverages native OS filesystem events (e.g., `inotify`, `fsevents`) instead of expensive continuous polling.
- **`similar`**: Provides fast, accurate text diffing algorithm for inline UI updates.
- **`ratatui`**: Drives the modular component-based widget rendering (Stats, Lists, Layouts).

## 📄 License

This project is open-source and available under the **MIT License**. See the `LICENSE` file for more details.

---

**CodeLens** - A beautiful terminal UI for real-time file monitoring
**CodeLens** - Une interface terminal élégante pour la surveillance de fichiers en temps réel

© 2026 Antonin Nivoche. All rights reserved. | Tous droits réservés.
