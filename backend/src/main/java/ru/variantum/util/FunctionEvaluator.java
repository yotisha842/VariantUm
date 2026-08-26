package ru.variantum.util;

import org.springframework.stereotype.Component;

/**
 * Потокобезопасный вычислитель математических выражений.
 * Поддерживает: x, числа, +, -, *, /, ^, sin, cos, tan, sqrt, abs, ln, log, exp, pi, e.
 * Использует recursive descent parsing.
 */
@Component
public class FunctionEvaluator {

    public double evaluate(String expression, double x) {
        if (expression == null || expression.isBlank() || expression.length() > 500) throw new IllegalArgumentException("Invalid expression length");
        String expr = expression.trim()
                .replace(" ", "")
                .replace("π", "pi")
                .replace("**", "^")
                .replaceAll("\\bMath\\.", "").replaceAll("\\bPI\\b", "pi").replaceAll("\\bE\\b", "e");
        return new Parser(expr, x).parseAll();
    }

    public boolean isValid(String expression) {
        try {
            evaluate(expression, 0.0);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    // ─── Внутренний парсер (один экземпляр на вызов — потокобезопасно) ─────────

    private static class Parser {
        private final String expr;
        private final double x;
        private int pos;
        private int depth;

        Parser(String expr, double x) {
            this.expr = expr;
            this.x = x;
            this.pos = 0;
        }

        double parseAll() {
            double value = parseExpr();
            if (pos != expr.length()) throw new IllegalArgumentException("Unexpected expression suffix");
            return Double.isFinite(value) ? value : Double.NaN;
        }

        double parseExpr() {
            double result = parseTerm();
            while (pos < expr.length()) {
                char c = expr.charAt(pos);
                if (c == '+') { pos++; result += parseTerm(); }
                else if (c == '-') { pos++; result -= parseTerm(); }
                else break;
            }
            return result;
        }

        private double parseTerm() {
            double result = parseUnary();
            while (pos < expr.length()) {
                char c = expr.charAt(pos);
                if (c == '*') { pos++; result *= parseUnary(); }
                else if (c == '/') { pos++; double d = parseUnary(); result = d == 0 ? Double.NaN : result / d; }
                else break;
            }
            return result;
        }

        // Унарный минус имеет МЕНЬШИЙ приоритет чем ^, поэтому -x^2 = -(x^2), а не (-x)^2
        private double parseUnary() {
            if (pos < expr.length() && expr.charAt(pos) == '-') { pos++; return -parseUnary(); }
            if (pos < expr.length() && expr.charAt(pos) == '+') { pos++; return parseUnary(); }
            return parsePower();
        }

        private double parsePower() {
            double base = parsePrimary();
            if (pos < expr.length() && expr.charAt(pos) == '^') {
                pos++;
                double exp = parseUnary(); // правоассоциативно: -2^3 = -(2^3)
                return Math.pow(base, exp);
            }
            return base;
        }

        private double parsePrimary() {
            if (++depth > 64) throw new IllegalArgumentException("Expression nesting limit");
            try {
            if (pos >= expr.length()) throw new IllegalArgumentException("Incomplete expression");
            char c = expr.charAt(pos);

            if (c == '(') {
                pos++;
                double val = parseExpr();
                if (pos >= expr.length() || expr.charAt(pos) != ')') throw new IllegalArgumentException("Missing closing parenthesis");
                pos++;
                return val;
            }

            if (Character.isDigit(c) || c == '.') {
                int start = pos;
                var number = java.util.regex.Pattern.compile("(?:[0-9]+(?:\\.[0-9]*)?|\\.[0-9]+)(?:[eE][+-]?[0-9]+)?").matcher(expr.substring(start));
                if (!number.lookingAt()) throw new IllegalArgumentException("Invalid number");
                pos += number.end();
                double value = Double.parseDouble(number.group());
                if (!Double.isFinite(value)) throw new IllegalArgumentException("Invalid number");
                return value;
            }

            if (Character.isLetter(c)) {
                int start = pos;
                while (pos < expr.length() && Character.isLetterOrDigit(expr.charAt(pos))) pos++;
                String name = expr.substring(start, pos);
                return switch (name) {
                    // Физические переменные — псевдонимы x (генерируются GigaChat для физики)
                    case "x", "t", "v", "a", "s", "T", "F", "I", "U", "R", "P", "Q",
                         "V", "m", "n", "k", "h", "c", "p", "W", "r", "l", "q" -> x;
                    case "pi" -> Math.PI;
                    case "e" -> Math.E;
                    case "sin" -> Math.sin(parseParenArg());
                    case "cos" -> Math.cos(parseParenArg());
                    case "tan" -> Math.tan(parseParenArg());
                    case "sqrt" -> { double v = parseParenArg(); yield v < 0 ? Double.NaN : Math.sqrt(v); }
                    case "abs" -> Math.abs(parseParenArg());
                    case "ln" -> { double v = parseParenArg(); yield v <= 0 ? Double.NaN : Math.log(v); }
                    case "log", "log10", "lg" -> Math.log10(parseParenArg());
                    case "asin" -> Math.asin(parseParenArg());
                    case "acos" -> Math.acos(parseParenArg());
                    case "atan" -> Math.atan(parseParenArg());
                    case "tg" -> Math.tan(parseParenArg());
                    case "exp" -> Math.exp(parseParenArg());
                    default -> throw new IllegalArgumentException("Unknown function: " + name);
                };
            }

            throw new IllegalArgumentException("Unexpected char: " + c);
            } finally { depth--; }
        }

        private double parseParenArg() {
            if (pos < expr.length() && expr.charAt(pos) == '(') {
                pos++;
                double val = parseExpr();
                if (pos >= expr.length() || expr.charAt(pos) != ')') throw new IllegalArgumentException("Missing closing parenthesis");
                pos++;
                return val;
            }
            throw new IllegalArgumentException("Function argument requires parentheses");
        }
    }
}
