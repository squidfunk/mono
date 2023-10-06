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

import * as path from "node:path"
import {
  Bundle,
  Node,
  SourceFile,
  SyntaxKind,
  TransformationContext,
  Transformer,
  factory as _,
  isCallExpression,
  isExportDeclaration,
  isIdentifier,
  isImportDeclaration,
  isImportTypeNode,
  isSourceFile,
  isStringLiteral,
  isStringLiteralLike,
  visitEachChild
} from "typescript"

import { resolver } from "../resolver"

/* ----------------------------------------------------------------------------
 * Functions
 * ------------------------------------------------------------------------- */

/**
 * Create a path transformer
 *
 * @template T - Node type
 *
 * @param context - Context
 *
 * @returns Transformer
 */
export function transformPath<T extends Bundle | SourceFile>(
  context: TransformationContext
): Transformer<T> {
  const options = context.getCompilerOptions()
  const resolve = resolver(options)

  // Return transformer
  return file => {

    /**
     * Replace function
     *
     * @param node - Node
     *
     * @returns Node
     */
    function replace(node: Node): Node {

      // Handle module paths
      if (isStringLiteral(node)) {
        const { fileName } = file as SourceFile
        return _.createStringLiteral(
          resolve(path.dirname(fileName), node.text)
        )
      }

      // Handle everything else
      return visitEachChild(node, replace, context)
    }

    /**
     * Visitor function
     *
     * @param node - Node
     *
     * @returns Node
     */
    function visitor(node: Node): Node {

      // Handle import and require call expressions
      if (isCallExpression(node)) {
        const [spec] = node.arguments
        if (spec && isStringLiteralLike(spec)) {
          const expr = node.expression

          // Handle import call expression
          if (expr.kind === SyntaxKind.ImportKeyword)
            return visitEachChild(node, replace, context)

          // Handle require call expression
          if (isIdentifier(expr) && expr.escapedText === "require")
            return visitEachChild(node, replace, context)
        }
      }

      // Handle import and export declarations
      if (isImportDeclaration(node) || isExportDeclaration(node)) {
        const spec = node.moduleSpecifier
        if (spec && isStringLiteral(spec))
          return visitEachChild(node, replace, context)
      }

      // Handle import declarations for types
      if (isImportTypeNode(node))
        return visitEachChild(node, replace, context)

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
