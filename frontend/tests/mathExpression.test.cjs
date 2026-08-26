const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exportsObject = {};
const source = fs.readFileSync('src/utils/mathExpression.ts', 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
vm.runInNewContext(compiled, { exports: exportsObject });
const { compileExpression, evaluateExpression } = exportsObject;

test('mathematical precedence, aliases and decimal exponents', () => {
  for (const [expression, x, expected] of [['-x^2', 3, -9], ['2^3^2', 0, 512], ['sin(pi/2)', 0, 1], ['Math.sqrt(t^2)', 3, 3], ['1e-3+x', 2, 2.001], ['log(100)', 0, 2]]) {
    assert.ok(Math.abs(compileExpression(expression)(x) - expected) < 1e-10, expression);
  }
});

test('code, property access and incomplete expressions are rejected', () => {
  for (const expression of ['globalThis.alert(1)', 'x.constructor', 'fetch("/api")', 'x;1', '1+', 'sin(x', 'x x', '('.repeat(65) + '1' + ')'.repeat(65)]) {
    assert.throws(() => compileExpression(expression), undefined, expression);
  }
});

test('undefined graph points become gaps', () => {
  assert.ok(Number.isNaN(evaluateExpression('1/x', 0)));
  assert.ok(Number.isNaN(evaluateExpression('sqrt(-1)', 0)));
  assert.ok(Number.isNaN(evaluateExpression('invalid', 0)));
});
