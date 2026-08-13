/**
 * A small expression parser for plotting: "sin(x)/x" -> a function of x.
 *
 * Written rather than installed. The repo has no evaluator (katex only draws,
 * mathlive only takes input) and the plotting decision in tasks/todo.md is to
 * add no new library. It is also deliberately not `eval` or `new Function`:
 * these expressions come from lesson content that teachers type, so handing
 * them to the JS engine would turn a maths field into script execution.
 *
 * Grammar, lowest precedence first:
 *
 *   expr    := term (('+' | '-') term)*
 *   term    := unary (('*' | '/') unary)*
 *   unary   := '-' unary | power
 *   power   := atom ('^' unary)?          // right-associative: 2^3^2 = 512
 *   atom    := number | constant | 'x' | func '(' expr ')' | '(' expr ')'
 *
 * Evaluation returns NaN wherever the function is undefined (log of a
 * negative, 1/0, sqrt of a negative). Callers are expected to treat NaN as
 * "no point here" rather than as an error — that is what puts a break in the
 * curve at an asymptote instead of a line across the screen.
 */

export type Node =
  | { kind: "num"; value: number }
  | { kind: "var" }
  | { kind: "neg"; operand: Node }
  | { kind: "bin"; op: "+" | "-" | "*" | "/" | "^"; left: Node; right: Node }
  | { kind: "call"; fn: keyof typeof FUNCTIONS; arg: Node };

export class ExpressionError extends Error {}

const FUNCTIONS = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  sqrt: Math.sqrt,
  abs: Math.abs,
  exp: Math.exp,
  ln: Math.log,
  log: Math.log10,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
} as const;

const CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  e: Math.E,
};

export const SUPPORTED_FUNCTIONS = Object.keys(FUNCTIONS);

// ─── tokenizer ──────────────────────────────────────────────────────

type Token =
  | { type: "num"; value: number }
  | { type: "name"; value: string }
  | { type: "op"; value: string };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const ch = input[i];

    if (ch === " " || ch === "\t") {
      i++;
      continue;
    }

    if (ch >= "0" && ch <= "9") {
      let j = i;
      while (j < input.length && /[0-9]/.test(input[j])) j++;
      if (input[j] === ".") {
        j++;
        while (j < input.length && /[0-9]/.test(input[j])) j++;
      }
      tokens.push({ type: "num", value: Number(input.slice(i, j)) });
      i = j;
      continue;
    }

    // A bare ".5" is common enough in a maths field to be worth accepting.
    if (ch === "." && /[0-9]/.test(input[i + 1] ?? "")) {
      let j = i + 1;
      while (j < input.length && /[0-9]/.test(input[j])) j++;
      tokens.push({ type: "num", value: Number(input.slice(i, j)) });
      i = j;
      continue;
    }

    if (/[a-zA-Z]/.test(ch)) {
      let j = i;
      while (j < input.length && /[a-zA-Z0-9]/.test(input[j])) j++;
      tokens.push({ type: "name", value: input.slice(i, j).toLowerCase() });
      i = j;
      continue;
    }

    if ("+-*/^()".includes(ch)) {
      tokens.push({ type: "op", value: ch });
      i++;
      continue;
    }

    throw new ExpressionError(`Unexpected character "${ch}"`);
  }

  return tokens;
}

// ─── parser ─────────────────────────────────────────────────────────

/**
 * Parses an expression in one variable. Throws ExpressionError on anything it
 * cannot read, so an editor can show the reason rather than an empty plot.
 */
export function parseExpression(input: string): Node {
  const tokens = tokenize(input);
  let pos = 0;

  const peek = () => tokens[pos];
  const eat = (value: string) => {
    const t = peek();
    if (t && t.type === "op" && t.value === value) {
      pos++;
      return true;
    }
    return false;
  };

  /** True where an implicit '*' belongs: "2x", "3(x+1)", "2sin(x)". */
  const startsAnAtom = () => {
    const t = peek();
    if (!t) return false;
    return t.type === "num" || t.type === "name" || (t.type === "op" && t.value === "(");
  };

  function parseExpr(): Node {
    let left = parseTerm();
    for (;;) {
      if (eat("+")) left = { kind: "bin", op: "+", left, right: parseTerm() };
      else if (eat("-")) left = { kind: "bin", op: "-", left, right: parseTerm() };
      else return left;
    }
  }

  function parseTerm(): Node {
    let left = parseUnary();
    for (;;) {
      if (eat("*")) left = { kind: "bin", op: "*", left, right: parseUnary() };
      else if (eat("/")) left = { kind: "bin", op: "/", left, right: parseUnary() };
      else if (startsAnAtom()) {
        // Implicit multiplication. Without it "2x" is a syntax error, and a
        // teacher writing maths types "2x" far more often than "2*x".
        left = { kind: "bin", op: "*", left, right: parseUnary() };
      } else return left;
    }
  }

  function parseUnary(): Node {
    if (eat("-")) return { kind: "neg", operand: parseUnary() };
    if (eat("+")) return parseUnary();
    return parsePower();
  }

  function parsePower(): Node {
    const base = parseAtom();
    // Right-associative, and the exponent may itself be signed: x^-2.
    if (eat("^")) return { kind: "bin", op: "^", left: base, right: parseUnary() };
    return base;
  }

  function parseAtom(): Node {
    const t = peek();
    if (!t) throw new ExpressionError("Expression ends early");

    if (t.type === "num") {
      pos++;
      return { kind: "num", value: t.value };
    }

    if (t.type === "name") {
      pos++;
      const name = t.value;

      if (name in FUNCTIONS) {
        if (!eat("(")) throw new ExpressionError(`"${name}" needs brackets, as in ${name}(x)`);
        const arg = parseExpr();
        if (!eat(")")) throw new ExpressionError(`Missing ")" after ${name}(`);
        return { kind: "call", fn: name as keyof typeof FUNCTIONS, arg };
      }

      if (name === "x") return { kind: "var" };
      if (name in CONSTANTS) return { kind: "num", value: CONSTANTS[name] };

      throw new ExpressionError(`Unknown name "${name}"`);
    }

    if (t.value === "(") {
      pos++;
      const inner = parseExpr();
      if (!eat(")")) throw new ExpressionError('Missing ")"');
      return inner;
    }

    throw new ExpressionError(`Unexpected "${t.value}"`);
  }

  const ast = parseExpr();
  if (pos < tokens.length) {
    const rest = tokens[pos];
    throw new ExpressionError(`Unexpected "${rest.value}" after the expression`);
  }
  return ast;
}

// ─── evaluation ─────────────────────────────────────────────────────

/** Value of the parsed expression at x. NaN where undefined. */
export function evaluate(node: Node, x: number): number {
  switch (node.kind) {
    case "num":
      return node.value;
    case "var":
      return x;
    case "neg":
      return -evaluate(node.operand, x);
    case "call":
      return FUNCTIONS[node.fn](evaluate(node.arg, x));
    case "bin": {
      const a = evaluate(node.left, x);
      const b = evaluate(node.right, x);
      switch (node.op) {
        case "+":
          return a + b;
        case "-":
          return a - b;
        case "*":
          return a * b;
        // Not Infinity: a vertical jump to Infinity would be drawn as a line
        // straight up the plot. NaN breaks the curve instead.
        case "/":
          return b === 0 ? NaN : a / b;
        case "^":
          return Math.pow(a, b);
      }
    }
  }
}

/**
 * Text in, a function of x out. Throws ExpressionError if the text does not
 * parse, so callers can show the reason once instead of rendering nothing.
 */
export function compileExpression(input: string): (x: number) => number {
  const ast = parseExpression(input);
  return (x: number) => evaluate(ast, x);
}
