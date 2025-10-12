#!/usr/bin/env node

/**
 * Test script to verify CodeLens monitoring
 * This creates a test file, waits, then modifies it to test the monitoring
 */

const fs = require('fs');
const path = require('path');

const testFile = path.join(__dirname, 'test-file.txt');

console.log('Creating test file...');
fs.writeFileSync(testFile, 'Initial content\nLine 2\nLine 3\n');

setTimeout(() => {
  console.log('Modifying test file...');
  fs.writeFileSync(testFile, 'Modified content\nLine 2 changed\nLine 3\nNew Line 4\n');
}, 2000);

setTimeout(() => {
  console.log('Test complete! Check CodeLens for changes.');
  console.log('Cleaning up...');
  fs.unlinkSync(testFile);
  process.exit(0);
}, 4000);
