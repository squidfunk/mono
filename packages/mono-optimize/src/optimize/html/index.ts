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

import { Options, minify } from "html-minifier"

/* ----------------------------------------------------------------------------
 * Types
 * ------------------------------------------------------------------------- */

/**
 * Options
 */
export type HTMLOptions = Options

/* ------------------------------------------------------------------------- */

export namespace HTMLOptions {

  /**
   * Options for HTML to be consumed by browsers
   */
  export const BROWSER: HTMLOptions = {
    collapseBooleanAttributes: true,
    collapseWhitespace: true,
    includeAutoGeneratedTags: false,
    minifyCSS: true,
    minifyJS: true,
    removeComments: true,
    removeAttributeQuotes: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true
  }

  /**
   * Options for HTML to be consumed by mail clients
   */
  export const MAIL: HTMLOptions = {
    collapseWhitespace: true,
    minifyCSS: true,
    removeEmptyAttributes: true
  }
}

/* ----------------------------------------------------------------------------
 * Functions
 * ------------------------------------------------------------------------- */

/**
 * Optimize an HTML string
 *
 * @param data - Source string
 * @param options - Options
 *
 * @returns Source string
 */
export function optimizeHTML(
  data: string, options: HTMLOptions = HTMLOptions.BROWSER
): string {
  return minify(data, options)
}
