// Demo file for CodeLens testing - MODIFIED
function calculateSum(a, b) {
  // Added validation
  if (typeof a !== 'number' || typeof b !== 'number') {
    throw new Error('Arguments must be numbers');
  }
  return a + b;
}

function calculateProduct(a, b) {
  return a * b;
}

function calculateDivision(a, b) {
  if (b === 0) throw new Error('Division by zero');
  return a / b;
}

module.exports = { calculateSum, calculateProduct, calculateDivision };
