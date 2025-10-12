#!/usr/bin/env node

/**
 * CodeLens - Real-time File Monitoring with Beautiful Terminal UI
 * Made with <3 by Antonin Nvh (https://olive.click)
 * License: MIT
 */

const blessed = require('blessed');
const contrib = require('blessed-contrib');
const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');
const diff = require('diff');
const simpleGit = require('simple-git');
const chalk = require('chalk');

// File cache to track changes
const fileCache = new Map();
const modifications = [];
let selectedIndex = 0;
let ignoreList = new Set();

// Create screen
const screen = blessed.screen({
  smartCSR: true,
  title: 'CodeLens - Real-time File Monitor',
  fullUnicode: true,
});

// Create grid layout
const grid = new contrib.grid({ rows: 12, cols: 12, screen: screen });

// Title box with animated indicator
const titleBox = grid.set(0, 0, 1, 12, blessed.box, {
  content: '{center}{bold}CodeLens{/bold} - Real-time File Monitoring{/center}',
  tags: true,
  style: {
    fg: 'cyan',
    bold: true,
    border: {
      fg: 'cyan'
    }
  },
  border: {
    type: 'line'
  }
});

// Stats boxes
const statsGrid = {
  modified: grid.set(1, 0, 2, 3, blessed.box, {
    label: ' Modified Files ',
    content: '{center}{bold}0{/bold}{/center}',
    tags: true,
    style: {
      fg: 'green',
      border: { fg: 'green' }
    },
    border: { type: 'line' }
  }),

  added: grid.set(1, 3, 2, 3, blessed.box, {
    label: ' Lines Added ',
    content: '{center}{bold}+0{/bold}{/center}',
    tags: true,
    style: {
      fg: 'blue',
      border: { fg: 'blue' }
    },
    border: { type: 'line' }
  }),

  deleted: grid.set(1, 6, 2, 3, blessed.box, {
    label: ' Lines Deleted ',
    content: '{center}{bold}-0{/bold}{/center}',
    tags: true,
    style: {
      fg: 'red',
      border: { fg: 'red' }
    },
    border: { type: 'line' }
  }),

  watching: grid.set(1, 9, 2, 3, blessed.box, {
    label: ' Status ',
    content: '{center}{green-fg}{bold}● WATCHING{/bold}{/green-fg}{/center}',
    tags: true,
    style: {
      fg: 'yellow',
      border: { fg: 'yellow' }
    },
    border: { type: 'line' }
  })
};

// File list
const fileList = grid.set(3, 0, 5, 6, blessed.list, {
  label: ' Recent Changes (↑↓ Navigate, Enter: View, I: Ignore, A: Accept) ',
  keys: true,
  vi: true,
  mouse: true,
  tags: true,
  style: {
    fg: 'white',
    selected: {
      bg: 'blue',
      fg: 'white',
      bold: true
    },
    border: { fg: 'cyan' }
  },
  border: { type: 'line' },
  scrollbar: {
    ch: '█',
    style: {
      fg: 'cyan'
    }
  }
});

// Diff viewer
const diffViewer = grid.set(3, 6, 5, 6, blessed.box, {
  label: ' Diff Preview ',
  scrollable: true,
  alwaysScroll: true,
  keys: true,
  vi: true,
  mouse: true,
  tags: true,
  style: {
    fg: 'white',
    border: { fg: 'magenta' }
  },
  border: { type: 'line' },
  scrollbar: {
    ch: '█',
    style: {
      fg: 'magenta'
    }
  }
});

// Log viewer
const logViewer = grid.set(8, 0, 3, 12, blessed.log, {
  label: ' Activity Log ',
  tags: true,
  style: {
    fg: 'white',
    border: { fg: 'yellow' }
  },
  border: { type: 'line' },
  scrollback: 100,
  scrollbar: {
    ch: '█',
    style: {
      fg: 'yellow'
    }
  }
});

// Copyright footer
const footerBox = grid.set(11, 0, 1, 12, blessed.box, {
  content: '{center}Made with {red-fg}♥{/red-fg} by {cyan-fg}{bold}Antonin Nvh{/bold}{/cyan-fg} {gray-fg}|{/gray-fg} {blue-fg}https://olive.click{/blue-fg}{/center}',
  tags: true,
  style: {
    fg: 'white',
    bg: 'transparent'
  }
});

// Help menu
let helpVisible = false;
const helpBox = blessed.box({
  top: 'center',
  left: 'center',
  width: '60%',
  height: '60%',
  label: ' Help (Press ? again to close) ',
  content: `
{bold}Keyboard Shortcuts:{/bold}

  {cyan-fg}↑/k{/cyan-fg}         - Move up in file list
  {cyan-fg}↓/j{/cyan-fg}         - Move down in file list
  {cyan-fg}Enter{/cyan-fg}       - View detailed diff
  {cyan-fg}i{/cyan-fg}           - Ignore selected file
  {cyan-fg}a{/cyan-fg}           - Accept/restore selected file
  {cyan-fg}c{/cyan-fg}           - Clear all changes
  {cyan-fg}r{/cyan-fg}           - Refresh view
  {cyan-fg}?{/cyan-fg}           - Toggle this help
  {cyan-fg}q/Ctrl+C{/cyan-fg}    - Quit

{bold}File Status Indicators:{/bold}

  {green-fg}●{/green-fg}           - Modified (tracked changes)
  {red-fg}●{/red-fg}           - Ignored (won't show in list)
  {blue-fg}+{/blue-fg}           - Lines added
  {red-fg}-{/red-fg}           - Lines deleted
  {yellow-fg}~{/yellow-fg}           - Lines changed

{bold}Features:{/bold}

  • Real-time file monitoring
  • Colorful diff visualization
  • Git-aware change detection
  • Smart filtering (node_modules, etc.)
  • Interactive accept/ignore controls
`,
  tags: true,
  border: {
    type: 'line',
    fg: 'green'
  },
  style: {
    fg: 'white',
    border: { fg: 'green' }
  },
  hidden: true
});

screen.append(helpBox);

// Stats tracking
let stats = {
  modified: 0,
  linesAdded: 0,
  linesDeleted: 0
};

// Initialize Git
const git = simpleGit(process.cwd());
let isGitRepo = false;

git.checkIsRepo()
  .then(result => {
    isGitRepo = result;
    if (isGitRepo) {
      addLog('{green-fg}Git repository detected{/green-fg}');
    } else {
      addLog('{yellow-fg}Not a git repository - using file snapshots{/yellow-fg}');
    }
  })
  .catch(() => {
    isGitRepo = false;
  });

// Watch patterns - watch current directory
const watchPatterns = '.';

const ignorePatterns = [
  '**/node_modules/**',
  '**/vendor/**',
  '**/.git/**',
  '**/dist/**',
  '**/build/**',
  '**/var/cache/**',
  '**/var/log/**',
  '**/*.min.js',
  '**/*.map',
  '**/*.lock'
];

// Allowed extensions
const allowedExtensions = ['.js', '.jsx', '.ts', '.tsx', '.php', '.twig', '.css', '.scss', '.html', '.json', '.yaml', '.yml', '.md'];

// Initialize watcher
const watcher = chokidar.watch(watchPatterns, {
  ignored: ignorePatterns,
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 300,
    pollInterval: 100
  }
});

// Helper functions
function getFileType(filePath) {
  const ext = path.extname(filePath);
  const typeMap = {
    '.js': { label: 'JS', color: 'yellow' },
    '.jsx': { label: 'JSX', color: 'cyan' },
    '.ts': { label: 'TS', color: 'blue' },
    '.tsx': { label: 'TSX', color: 'cyan' },
    '.php': { label: 'PHP', color: 'magenta' },
    '.twig': { label: 'TWIG', color: 'green' },
    '.css': { label: 'CSS', color: 'blue' },
    '.scss': { label: 'SCSS', color: 'magenta' },
    '.html': { label: 'HTML', color: 'red' },
    '.json': { label: 'JSON', color: 'yellow' },
    '.yaml': { label: 'YAML', color: 'red' },
    '.yml': { label: 'YML', color: 'red' },
    '.md': { label: 'MD', color: 'white' }
  };
  return typeMap[ext] || { label: 'FILE', color: 'white' };
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function addLog(message) {
  const timestamp = new Date().toLocaleTimeString();
  logViewer.log(`{gray-fg}[${timestamp}]{/gray-fg} ${message}`);
}

function updateStats() {
  stats.modified = modifications.filter(m => !ignoreList.has(m.path)).length;
  stats.linesAdded = modifications.reduce((sum, m) => sum + (m.added || 0), 0);
  stats.linesDeleted = modifications.reduce((sum, m) => sum + (m.deleted || 0), 0);

  statsGrid.modified.setContent(`{center}{bold}{green-fg}${stats.modified}{/green-fg}{/bold}{/center}`);
  statsGrid.added.setContent(`{center}{bold}{blue-fg}+${stats.linesAdded}{/blue-fg}{/bold}{/center}`);
  statsGrid.deleted.setContent(`{center}{bold}{red-fg}-${stats.linesDeleted}{/red-fg}{/bold}{/center}`);

  screen.render();
}

function generateDiff(filePath, oldContent, newContent) {
  const patches = diff.createPatch(filePath, oldContent, newContent);
  const lines = patches.split('\n');

  let coloredDiff = '';
  let added = 0;
  let deleted = 0;

  lines.forEach((line, idx) => {
    if (idx < 4) return; // Skip header

    if (line.startsWith('+') && !line.startsWith('+++')) {
      coloredDiff += `{green-fg}${line}{/green-fg}\n`;
      added++;
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      coloredDiff += `{red-fg}${line}{/red-fg}\n`;
      deleted++;
    } else if (line.startsWith('@@')) {
      coloredDiff += `{cyan-fg}{bold}${line}{/bold}{/cyan-fg}\n`;
    } else {
      coloredDiff += `{gray-fg}${line}{/gray-fg}\n`;
    }
  });

  return { coloredDiff, added, deleted };
}

function updateFileList() {
  const items = modifications
    .filter(m => !ignoreList.has(m.path))
    .map(m => {
      const type = getFileType(m.path);
      const time = new Date(m.timestamp).toLocaleTimeString();
      const status = m.ignored ? '{red-fg}●{/red-fg}' : '{green-fg}●{/green-fg}';
      const changes = `{blue-fg}+${m.added || 0}{/blue-fg} {red-fg}-${m.deleted || 0}{/red-fg}`;

      // Build type label with proper color tags
      let typeLabel = '';
      switch(type.color) {
        case 'yellow': typeLabel = `{yellow-fg}[${type.label}]{/yellow-fg}`; break;
        case 'cyan': typeLabel = `{cyan-fg}[${type.label}]{/cyan-fg}`; break;
        case 'blue': typeLabel = `{blue-fg}[${type.label}]{/blue-fg}`; break;
        case 'magenta': typeLabel = `{magenta-fg}[${type.label}]{/magenta-fg}`; break;
        case 'green': typeLabel = `{green-fg}[${type.label}]{/green-fg}`; break;
        case 'red': typeLabel = `{red-fg}[${type.label}]{/red-fg}`; break;
        default: typeLabel = `[${type.label}]`;
      }

      return `${status} ${typeLabel} ${time} ${changes} ${m.path}`;
    });

  fileList.setItems(items);
  if (selectedIndex >= items.length) {
    selectedIndex = Math.max(0, items.length - 1);
  }
  fileList.select(selectedIndex);
  screen.render();
}

function updateDiffView() {
  if (modifications.length === 0) {
    diffViewer.setContent('{center}{gray-fg}No changes to display{/gray-fg}{/center}');
    screen.render();
    return;
  }

  const visibleMods = modifications.filter(m => !ignoreList.has(m.path));
  if (selectedIndex >= visibleMods.length || selectedIndex < 0) {
    diffViewer.setContent('{center}{gray-fg}Select a file to view diff{/gray-fg}{/center}');
    screen.render();
    return;
  }

  const mod = visibleMods[selectedIndex];
  const type = getFileType(mod.path);

  // Build file path with proper color tags
  let filePath = '';
  switch(type.color) {
    case 'yellow': filePath = `{bold}{yellow-fg}${mod.path}{/yellow-fg}{/bold}`; break;
    case 'cyan': filePath = `{bold}{cyan-fg}${mod.path}{/cyan-fg}{/bold}`; break;
    case 'blue': filePath = `{bold}{blue-fg}${mod.path}{/blue-fg}{/bold}`; break;
    case 'magenta': filePath = `{bold}{magenta-fg}${mod.path}{/magenta-fg}{/bold}`; break;
    case 'green': filePath = `{bold}{green-fg}${mod.path}{/green-fg}{/bold}`; break;
    case 'red': filePath = `{bold}{red-fg}${mod.path}{/red-fg}{/bold}`; break;
    default: filePath = `{bold}${mod.path}{/bold}`;
  }

  let content = `${filePath}\n`;
  content += `{gray-fg}Modified: ${new Date(mod.timestamp).toLocaleString()}{/gray-fg}\n`;
  content += `{gray-fg}Size: ${formatFileSize(mod.size)}{/gray-fg}\n\n`;
  content += mod.coloredDiff || '{gray-fg}No diff available{/gray-fg}';

  diffViewer.setContent(content);
  screen.render();
}

async function handleFileChange(filePath) {
  if (ignoreList.has(filePath)) return;

  // Check if file extension is allowed
  const ext = path.extname(filePath);
  if (!allowedExtensions.includes(ext)) return;

  try {
    const fullPath = path.resolve(filePath);
    const newContent = fs.readFileSync(fullPath, 'utf8');
    const stats = fs.statSync(fullPath);
    const oldContent = fileCache.get(filePath) || '';

    const { coloredDiff, added, deleted } = generateDiff(filePath, oldContent, newContent);

    // Update or add modification
    const existingIndex = modifications.findIndex(m => m.path === filePath);
    const modification = {
      path: filePath,
      timestamp: Date.now(),
      size: stats.size,
      added,
      deleted,
      coloredDiff,
      oldContent,
      newContent
    };

    if (existingIndex !== -1) {
      modifications[existingIndex] = modification;
    } else {
      modifications.unshift(modification);
    }

    // Keep only last 50 modifications
    if (modifications.length > 50) {
      modifications.pop();
    }

    fileCache.set(filePath, newContent);

    const type = getFileType(filePath);

    // Build log message with proper color tags
    let logColor = '';
    switch(type.color) {
      case 'yellow': logColor = `{yellow-fg}Modified:{/yellow-fg}`; break;
      case 'cyan': logColor = `{cyan-fg}Modified:{/cyan-fg}`; break;
      case 'blue': logColor = `{blue-fg}Modified:{/blue-fg}`; break;
      case 'magenta': logColor = `{magenta-fg}Modified:{/magenta-fg}`; break;
      case 'green': logColor = `{green-fg}Modified:{/green-fg}`; break;
      case 'red': logColor = `{red-fg}Modified:{/red-fg}`; break;
      default: logColor = 'Modified:';
    }

    addLog(`${logColor} ${filePath} {blue-fg}+${added}{/blue-fg} {red-fg}-${deleted}{/red-fg}`);

    updateStats();
    updateFileList();
    updateDiffView();

  } catch (error) {
    addLog(`{red-fg}Error processing ${filePath}: ${error.message}{/red-fg}`);
  }
}

// Watch events
watcher
  .on('change', handleFileChange)
  .on('add', handleFileChange)
  .on('ready', () => {
    addLog('{green-fg}{bold}Watcher ready - monitoring files...{/bold}{/green-fg}');
  })
  .on('error', error => {
    addLog(`{red-fg}Watcher error: ${error}{/red-fg}`);
  });

// Keyboard controls
fileList.key(['up', 'k'], () => {
  selectedIndex = Math.max(0, selectedIndex - 1);
  fileList.select(selectedIndex);
  updateDiffView();
});

fileList.key(['down', 'j'], () => {
  const visibleCount = modifications.filter(m => !ignoreList.has(m.path)).length;
  selectedIndex = Math.min(visibleCount - 1, selectedIndex + 1);
  fileList.select(selectedIndex);
  updateDiffView();
});

fileList.on('select', (item, index) => {
  selectedIndex = index;
  updateDiffView();
});

screen.key(['i'], () => {
  const visibleMods = modifications.filter(m => !ignoreList.has(m.path));
  if (selectedIndex >= 0 && selectedIndex < visibleMods.length) {
    const mod = visibleMods[selectedIndex];
    ignoreList.add(mod.path);
    addLog(`{red-fg}Ignored:{/red-fg} ${mod.path}`);
    updateStats();
    updateFileList();
    updateDiffView();
  }
});

screen.key(['a'], () => {
  const visibleMods = modifications.filter(m => !ignoreList.has(m.path));
  if (selectedIndex >= 0 && selectedIndex < visibleMods.length) {
    const mod = visibleMods[selectedIndex];
    if (ignoreList.has(mod.path)) {
      ignoreList.delete(mod.path);
      addLog(`{green-fg}Accepted:{/green-fg} ${mod.path}`);
      updateStats();
      updateFileList();
      updateDiffView();
    }
  }
});

screen.key(['c'], () => {
  modifications.length = 0;
  ignoreList.clear();
  fileCache.clear();
  selectedIndex = 0;
  addLog('{yellow-fg}Cleared all changes{/yellow-fg}');
  updateStats();
  updateFileList();
  updateDiffView();
});

screen.key(['r'], () => {
  addLog('{cyan-fg}Refreshing view...{/cyan-fg}');
  updateStats();
  updateFileList();
  updateDiffView();
});

screen.key(['?'], () => {
  helpVisible = !helpVisible;
  if (helpVisible) {
    helpBox.show();
  } else {
    helpBox.hide();
  }
  screen.render();
});

screen.key(['q', 'C-c'], () => {
  watcher.close();
  process.exit(0);
});

// Focus management
fileList.focus();

// Initial render
addLog('{cyan-fg}{bold}CodeLens started{/bold}{/cyan-fg}');
addLog(`{gray-fg}Watching directory: ${process.cwd()}{/gray-fg}`);
addLog(`{gray-fg}Press ? for help{/gray-fg}`);

screen.render();

// Animate title
let animFrame = 0;
const animChars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
setInterval(() => {
  const spinner = animChars[animFrame % animChars.length];
  const statusText = modifications.length > 0 ?
    `{green-fg}${spinner}{/green-fg} Monitoring` :
    `{yellow-fg}${spinner}{/yellow-fg} Waiting`;
  titleBox.setContent(`{center}{bold}CodeLens{/bold} - Real-time File Monitoring ${statusText}{/center}`);
  screen.render();
  animFrame++;
}, 80);
