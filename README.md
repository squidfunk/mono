# Mono repository utilities

This repository provides a collection of tools optimized for handling mono
repositories. They reflect the workflows and standards I, @squidfunk, apply to
my TypeScript projects, including those in organizations I own.

- In order to use these tools, download them from GitHub Packages.
- For adjustments, please fork this repository and tailor it to your preferences.

## Installation

Create an `.npmrc` file in the root of your repository:

```
@squidfunk:registry=https://npm.pkg.github.com
```

Install the packages you need:

``` sh
npm install @squidfunk/mono-chance
npm install @squidfunk/mono-commit-convention
npm install @squidfunk/mono-commit-parser
npm install @squidfunk/mono-changelog
npm install @squidfunk/mono-esbuild
npm install @squidfunk/mono-karma
npm install @squidfunk/mono-jasmine
npm install @squidfunk/mono-optimize
npm install @squidfunk/mono-serve
npm install @squidfunk/mono-transform
npm install @squidfunk/eslint-config
npm install @squidfunk/stylelint-config
```

## License

__MIT License__

Copyright (c) 2912-2023 Martin Donath

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to
deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NON-INFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
IN THE SOFTWARE.
