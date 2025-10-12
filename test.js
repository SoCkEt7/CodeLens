const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('Running CodeLens tests...\n');

// Test 1: Check if index.js exists
const indexPath = path.join(__dirname, 'index.js');
if (fs.existsSync(indexPath)) {
  console.log('✓ index.js exists');
} else {
  console.error('✗ index.js not found');
  process.exit(1);
}

// Test 2: Check if file is executable
const stats = fs.statSync(indexPath);
const isExecutable = !!(stats.mode & 0o111);
if (isExecutable) {
  console.log('✓ index.js is executable');
} else {
  console.error('✗ index.js is not executable');
  process.exit(1);
}

// Test 3: Check dependencies
const requiredDeps = ['blessed', 'blessed-contrib', 'chokidar', 'diff', 'simple-git', 'chalk'];
let allDepsFound = true;
requiredDeps.forEach(dep => {
  try {
    require.resolve(dep);
    console.log(`✓ ${dep} is installed`);
  } catch (e) {
    console.error(`✗ ${dep} is missing`);
    allDepsFound = false;
  }
});

if (!allDepsFound) {
  console.error('\n✗ Some dependencies are missing. Run: pnpm install');
  process.exit(1);
}

// Test 4: Check shebang
const content = fs.readFileSync(indexPath, 'utf8');
if (content.startsWith('#!/usr/bin/env node')) {
  console.log('✓ Correct shebang found');
} else {
  console.error('✗ Missing or incorrect shebang');
  process.exit(1);
}

console.log('\n✓ All tests passed!');
console.log('\nTo run CodeLens:');
console.log('  codelens           (if globally installed)');
console.log('  node index.js      (run locally)');
console.log('\nNote: CodeLens requires a TTY terminal to display the UI.');
console.log('Use Ctrl+C or "q" to quit when running.');
