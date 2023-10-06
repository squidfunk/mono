/*
 * Copyright (c) 2019-2023 Martin Donath <martin.donath@squidfunk.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NON-INFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

import {
  Expression,
  SyntaxKind,
  isBinaryExpression,
  isIdentifier,
  isNumericLiteral,
  isParenthesizedExpression,
  isPlusToken,
  isPrefixUnaryExpression,
  isStringLiteralLike
} from "typescript"

/* ----------------------------------------------------------------------------
 * Types
 * ------------------------------------------------------------------------- */

/**
 * Evaluated value
 */
export type Value = string | number

/* ----------------------------------------------------------------------------
 * Functions
 * ------------------------------------------------------------------------- */

/**
 * Evaluate an enum expression
 *
 * @see https://bit.ly/3Kmjklf - Original source
 *
 * @param expr - Expression
 * @param cache - Evaluation cache
 *
 * @returns Evaluated value
 */
export function evaluate(
  expr: Expression, cache = new Map<string, Value>()
): Value {

  // Handle prefix unary expressions
  if (isPrefixUnaryExpression(expr)) {
    const value = evaluate(expr.operand, cache)
    if (typeof value === "number") {
      switch (expr.operator) {
        case SyntaxKind.PlusToken:
          return value
        case SyntaxKind.MinusToken:
          return -value
        case SyntaxKind.TildeToken:
          return ~value
      }
    }

  // Handle binary expressions
  } else if (isBinaryExpression(expr)) {
    const a = evaluate(expr.left, cache)
    const b = evaluate(expr.right, cache)

    // Handle number operators
    if (typeof a === "number" && typeof b === "number") {
      switch (expr.operatorToken.kind) {
        case SyntaxKind.BarToken:
          return a | b
        case SyntaxKind.AmpersandToken:
          return a & b
        case SyntaxKind.GreaterThanGreaterThanToken:
          return a >> b
        case SyntaxKind.GreaterThanGreaterThanGreaterThanToken:
          return a >>> b
        case SyntaxKind.LessThanLessThanToken:
          return a << b
        case SyntaxKind.CaretToken:
          return a ^ b
        case SyntaxKind.AsteriskToken:
          return a * b
        case SyntaxKind.SlashToken:
          return a / b
        case SyntaxKind.PlusToken:
          return a + b
        case SyntaxKind.MinusToken:
          return a - b
        case SyntaxKind.PercentToken:
          return a % b
        case SyntaxKind.AsteriskAsteriskToken:
          return a ** b
      }

    // Handle string operators
    } else if (
      typeof a === "string" && typeof b === "string" &&
      isPlusToken(expr.operatorToken)
    ) {
      return a + b
    }

  // Handle string literals
  } else if (isStringLiteralLike(expr)) {
    return expr.text

  // Handle number literals
  } else if (isNumericLiteral(expr)) {
    return +expr.text

  // Handle parenthesized expressions
  } else if (isParenthesizedExpression(expr)) {
    return evaluate(expr.expression, cache)

  // Handle identifiers
  } else if (isIdentifier(expr)) {
    return cache.get(expr.text)!
  }

  // Handle invalid enum values
  throw new Error(`Invalid enum value: ${expr.getText()}`)
}
