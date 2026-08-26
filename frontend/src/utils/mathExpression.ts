type Expression = (x: number) => number;
const variables = new Set('x t v a s T F I U R P Q V m n k h c p W r l q'.split(' '));
const functions: Record<string, (value: number) => number> = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan, sqrt: Math.sqrt, abs: Math.abs,
  ln: Math.log, log: Math.log10, log10: Math.log10, lg: Math.log10, exp: Math.exp,
  asin: Math.asin, acos: Math.acos, atan: Math.atan, tg: Math.tan,
};

/** Compile the supported math grammar once; never interpret JavaScript from an LLM or user. */
export function compileExpression(input: string): Expression {
  if (!input || input.length > 500) throw new Error('Invalid expression length');
  const text = input.replace(/\bMath\./g, '').replace(/\bPI\b|π/g, 'pi').replace(/\bE\b/g, 'e').replace(/\*\*/g, '^');
  let position = 0;
  let depth = 0;
  const take = (token: string) => {
    while (/\s/.test(text[position] ?? '') && position < text.length) position++;
    if (!text.startsWith(token, position)) return false;
    position += token.length;
    return true;
  };
  const fail = (): never => { throw new Error('Invalid mathematical expression'); };
  function primary(): Expression {
    if (++depth > 64) return fail();
    let result: Expression;
    if (take('(')) {
      result = expression();
      if (!take(')')) return fail();
    } else {
      take(''); // Skip whitespace.
      const number = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/.exec(text.slice(position));
      const name = /^[a-zA-Z][a-zA-Z0-9]*/.exec(text.slice(position));
      if (number) {
        position += number[0].length;
        const value = Number(number[0]);
        if (!Number.isFinite(value)) return fail();
        result = () => value;
      } else if (name) {
        position += name[0].length;
        const key = name[0];
        if (variables.has(key)) result = x => x;
        else if (key === 'pi' || key === 'e') result = () => key === 'pi' ? Math.PI : Math.E;
        else if (Object.hasOwn(functions, key) && take('(')) {
          const argument = expression();
          if (!take(')')) return fail();
          result = x => functions[key](argument(x));
        } else return fail();
      } else return fail();
    }
    depth--;
    return result;
  }
  function power(): Expression {
    const base = primary();
    if (!take('^')) return base;
    const exponent = unary();
    return x => Math.pow(base(x), exponent(x));
  }
  function unary(): Expression {
    if (take('-')) { const value = unary(); return x => -value(x); }
    if (take('+')) return unary();
    return power();
  }
  function term(): Expression {
    let result = unary();
    while (true) {
      const left = result;
      if (take('*')) { const right = unary(); result = x => left(x) * right(x); }
      else if (take('/')) { const right = unary(); result = x => left(x) / right(x); }
      else return result;
    }
  }
  function expression(): Expression {
    let result = term();
    while (true) {
      const left = result;
      if (take('+')) { const right = term(); result = x => left(x) + right(x); }
      else if (take('-')) { const right = term(); result = x => left(x) - right(x); }
      else return result;
    }
  }
  const evaluate = expression();
  take('');
  if (position !== text.length) return fail();
  return x => { const result = evaluate(x); return Number.isFinite(result) ? result : NaN; };
}

export function evaluateExpression(expression: string, x: number): number {
  try { return compileExpression(expression)(x); }
  catch { return NaN; }
}
