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

import { Plugin } from "esbuild"
import { Exception, compile } from "sass"

/* ----------------------------------------------------------------------------
 * Plugin
 * ------------------------------------------------------------------------- */

/**
 * Style plugin for esbuild
 *
 * In 2023, esbuild ships most of the functionality we need, including support
 * for CSS modules - the only thing we need to do is to compile SCSS to CSS.
 */
export const StylePlugin: Plugin = {
  name: "squidfunk/style",
  setup(build) {

    // Compile SCSS (modules) to CSS
    build.onLoad({ filter: /\.scss$/ }, args => {
      const loader = /\.module\.scss$/i.test(args.path)
        ? "local-css"
        : "css"

      // Try to compile file and return result
      try {
        const { css: contents, loadedUrls } = compile(args.path)
        return {
          loader,
          watchFiles: loadedUrls.map(({ pathname }) => pathname),
          contents
        }

      // Catch and report errors
      } catch (err) {
        if (!(err instanceof Exception))
          throw err

        // Transform error for better output
        const { sassMessage: text, span } = err
        return {
          watchFiles: [span.url!.pathname],
          errors: [
            {
              text: text.replace(/\.$/, ""),
              location: {
                file: span.url!.pathname,
                lineText: span.context,
                line: 1 + span.start.line,
                column: span.start.column,
                length: span.end.offset - span.start.offset
              }
            }
          ]
        }
      }
    })
  }
}
