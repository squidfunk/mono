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

import { closest, pathspec } from "@squidfunk/mono-resolve"

/* ----------------------------------------------------------------------------
 * Helper functions
 * ------------------------------------------------------------------------- */

/**
 * Resolve patterns from closest `.stylelintignore`
 *
 * @returns Ignore patterns
 */
function ignored(): string[] {
  const root = path.dirname(closest("lerna.json")!)
  return pathspec(".stylelintignore")
    .map(pattern => path.resolve(root, "**", pattern))
}

/**
 * Resolve SCSS file patterns
 *
 * @returns File patterns
 */
function files(): string[] {
  const root = path.dirname(closest("lerna.json")!)
  return [
    path.resolve(root, "**", "*.scss")
  ]
}

/* ----------------------------------------------------------------------------
 * Configuration
 * ------------------------------------------------------------------------- */

export = {
  ignoreFiles: ignored(),
  extends: [
    "stylelint-config-recess-order",
    "stylelint-config-recommended",
    "stylelint-config-standard",
    "stylelint-stylistic/config"
  ],
  rules: {
    "at-rule-empty-line-before": [
      "always",
      {
        "except": [
          "blockless-after-same-name-blockless",
          "first-nested"
        ],
        "ignore": [
          "after-comment"
        ],
        "ignoreAtRules": [
          "if",
          "else",
          "elseif"
        ]
      }
    ],
    "at-rule-no-unknown": null,
    "color-hex-length": "long",
    "color-named": "never",
    "comment-empty-line-before": [
      "always",
      {
        "ignore": [
          "stylelint-commands"
        ]
      }
    ],
    "custom-property-empty-line-before": null,
    "custom-property-pattern": "^[a-z][a-z0-9]*(-[a-z0-9]+)*$",
    "declaration-block-single-line-max-declarations": 0,
    "declaration-no-important": true,
    "font-family-name-quotes": "always-where-recommended",
    "font-weight-notation": "numeric",
    "function-url-no-scheme-relative": true,
    "function-url-quotes": "always",
    "keyframes-name-pattern": "^[a-z][a-z0-9]+([A-Za-z0-9])*$",
    "media-feature-name-no-unknown": null,
    "no-unknown-animations": true,
    "property-no-unknown": null,
    "property-no-vendor-prefix": [
      true,
      {
        "ignoreProperties": [
          "line-clamp",
          "box-orient"
        ]
      }
    ],
    "selector-class-pattern": [
      "^[a-z][a-z0-9]+([A-Za-z0-9])*$",
      {
        "resolveNestedSelectors": true
      }
    ],
    "selector-max-id": 0,
    "selector-max-type": 1,
    "selector-max-universal": 1,
    "selector-no-qualifying-type": true,
    "selector-pseudo-class-no-unknown": null,
    "selector-pseudo-element-no-unknown": null,
    "unit-allowed-list": [
      "%",
      "dppx",
      "deg",
      "em",
      "mm",
      "ms",
      "px",
      "vh",
      "vw"
    ],
    "value-no-vendor-prefix": true,

    // Plugin: stylelint-stylistic
    "stylistic/block-closing-brace-newline-after": [
      "always",
      {
        "ignoreAtRules": [
          "if",
          "else",
          "elseif"
        ]
      }
    ],
    "stylistic/no-empty-first-line": true,
    "stylistic/linebreaks": "unix",
    "stylistic/selector-max-empty-lines": 0,
    "stylistic/string-quotes": "double",
    "stylistic/unicode-bom": "never"
  },
  overrides: [
    {
      customSyntax: "postcss-scss",
      plugins: [
        "stylelint-scss"
      ],
      files: files(),
      rules: {

        // Plugin: stylelint-scss
        "scss/at-each-key-value-single-line": true,
        "scss/at-else-closing-brace-newline-after": "always-last-in-chain",
        "scss/at-extend-no-missing-placeholder": true,
        "scss/at-function-parentheses-space-before": "never",
        "scss/at-function-pattern": "^[a-z][a-z0-9]*(-[a-z0-9]+)*$",
        "scss/at-if-closing-brace-newline-after": "always-last-in-chain",
        "scss/at-if-no-null": true,
        "scss/at-import-no-partial-leading-underscore": true,
        "scss/at-import-partial-extension": "never",
        "scss/at-mixin-argumentless-call-parentheses": "always",
        "scss/at-mixin-parentheses-space-before": "never",
        "scss/at-mixin-pattern": "^[a-z][a-z0-9]*(-[a-z0-9]+)*$",
        "scss/at-rule-conditional-no-parentheses": true,
        "scss/comment-no-empty": true,
        "scss/comment-no-loud": true,
        "scss/declaration-nested-properties": "never",
        "scss/dimension-no-non-numeric-values": true,
        "scss/dollar-variable-colon-newline-after": "always-multi-line",
        "scss/dollar-variable-colon-space-after": "always-single-line",
        "scss/dollar-variable-colon-space-before": "never",
        "scss/dollar-variable-default": [
          true,
          {
            "ignore": "local"
          }
        ],
        "scss/dollar-variable-first-in-block": [
          true,
          {
            "ignore": ["comments"],
            "except": ["function"]
          }
        ],
        "scss/dollar-variable-no-missing-interpolation": true,
        "scss/dollar-variable-pattern": "^[a-z][a-z0-9]*(-[a-z0-9]+)*$",
        "scss/double-slash-comment-whitespace-inside": "always",
        "scss/no-dollar-variables": true,
        "scss/no-global-function-names": true,
        "scss/no-duplicate-dollar-variables": true,
        "scss/no-duplicate-mixins": true,
        "scss/operator-no-unspaced": true,
        "scss/partial-no-import": true,
        "scss/percent-placeholder-pattern": "^[a-z][a-z0-9]*(-[a-z0-9]+)*$",
        "scss/selector-no-redundant-nesting-selector": true
      }
    }
  ]
}
