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
  Bundle,
  EmitFlags,
  EnumDeclaration,
  Expression,
  ModuleKind,
  Node,
  NodeFlags,
  SourceFile,
  SyntaxKind,
  TransformationContext,
  Transformer,
  factory as _,
  getModifiers,
  isEnumDeclaration,
  isExpressionStatement,
  isSourceFile,
  isVariableStatement,
  setEmitFlags,
  visitEachChild
} from "typescript"

import { Value, evaluate } from "../evaluate"

/* ----------------------------------------------------------------------------
 * Functions
 * ------------------------------------------------------------------------- */

/**
 * Create an enum transformer
 *
 * This functions returns a transformer which converts perserved `const enum`
 * declarations in source files from IIFEs to simple objects, allowing for
 * tree-shaking when bundling. Preservation of `const enum` declarations is
 * essential to allow for using the faster transpilation API during testing.
 *
 * @see https://bit.ly/3vkaqAx - Original source
 *
 * @template T - Node type
 *
 * @param context - Context
 *
 * @returns Transformer
 */
export function transformEnum<T extends Bundle | SourceFile>(
  context: TransformationContext
): Transformer<T> {
  const options = context.getCompilerOptions()

  // Return transformer
  return file => {

    /**
     * Replace function
     *
     * @param node - Node
     *
     * @returns Node
     */
    function replace(node: EnumDeclaration): Node {
      let last: Value = -1

      // Create property assignments from enum members
      const properties = node.members.map(member => {
        let expr: Expression
        let next: Value

        // Handle enum values with initializers
        if (typeof member.initializer !== "undefined") {
          next = evaluate(member.initializer)
          if (typeof next === "number") {
            expr = _.createNumericLiteral(next)
          } else if (typeof next === "string") {
            expr = _.createStringLiteral(next)
          }

        // Handle enum values without initializers
        } else if (typeof last === "number") {
          expr = _.createNumericLiteral(next = last + 1)
        }

        // Update last seen value and return assignment
        last = next!
        return _.createPropertyAssignment(
          setEmitFlags(member.name, EmitFlags.NoComments),
          expr!
        )
      })

      // Emit according to module kind
      const modifiers = getModifiers(node)!
      switch (options.module) {

        // Module kind: CommonJS
        case ModuleKind.CommonJS:
          let expr = _.createBinaryExpression(
            node.name,
            _.createToken(SyntaxKind.EqualsToken),
            _.createObjectLiteralExpression(properties, true)
          )

          // If enum is exported, wrap in export assignment
          if (modifiers.find(({ kind }) => kind === SyntaxKind.ExportKeyword))
            expr = _.createBinaryExpression(
              _.createPropertyAccessExpression(
                _.createIdentifier("exports"),
                node.name
              ),
              _.createToken(SyntaxKind.EqualsToken),
              expr
            )

          // Return expression statement
          return _.createExpressionStatement(expr)

        // Module kind: ES module
        case ModuleKind.ES2015:
        case ModuleKind.ES2020:
        case ModuleKind.ES2022:
        case ModuleKind.ESNext:
          return _.createVariableStatement(
            modifiers.filter(({ kind }) => kind !== SyntaxKind.ConstKeyword),
            _.createVariableDeclarationList([
              _.createVariableDeclaration(
                node.name,
                undefined,
                undefined,
                _.createObjectLiteralExpression(properties, true)
              )
            ], NodeFlags.Const)
          )

        // All other module kinds are not supported
        default:
          throw new Error(`Unsupported "module" value: "${
            ModuleKind[options.module!].toLowerCase()
          }"`)
      }
    }

    /**
     * Visitor function
     *
     * @param node - Node
     *
     * @returns Node
     */
    function visitor(node: Node): Node {
      // @ts-expect-error - use TypeScript's internal API
      const enumeration = node.original || node
      if (isEnumDeclaration(enumeration)) {

        // Skip non-const enums
        const modifiers = enumeration.modifiers
        if (modifiers?.every(({ kind }) => kind !== SyntaxKind.ConstKeyword))
          return visitEachChild(node, visitor, context)

        // Handle variable statement
        if (isVariableStatement(node))
          if (options.module !== ModuleKind.CommonJS)
            return _.createEmptyStatement()

        // Handle expression statement
        if (isExpressionStatement(node))
          return replace(enumeration)
      }

      // Handle everything else
      return visitEachChild(node, visitor, context)
    }

    // Transform source file
    if (isSourceFile(file)) {
      return visitor(file) as T

    // Transform bundle
    } else {
      return _.createBundle(
        file.sourceFiles.map(visitor) as SourceFile[]
      ) as T
    }
  }
}
