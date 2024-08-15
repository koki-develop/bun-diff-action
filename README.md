# bun-diff-action

[![GitHub Release](https://img.shields.io/github/v/release/koki-develop/bun-diff-action)](https://github.com/koki-develop/bun-diff-action/releases/latest)
[![CI](https://img.shields.io/github/actions/workflow/status/koki-develop/bun-diff-action/ci.yml?branch=main&logo=github&style=flat&label=ci)](https://github.com/koki-develop/bun-diff-action/actions/workflows/ci.yml)
[![Build](https://img.shields.io/github/actions/workflow/status/koki-develop/bun-diff-action/build.yml?branch=main&logo=github&style=flat&label=build)](https://github.com/koki-develop/bun-diff-action/actions/workflows/build.yml)

Create a comment with the diff of the `bun.lockb` file.

![](./assets/screenshot.png)

## Usage

```yaml
on:
  pull_request:

jobs:
  bun-diff:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # Important for the diff to work
      - uses: oven-sh/setup-bun@v2
      - uses: koki-develop/bun-diff-action@v1
        with:
          token: ${{ github.token }}
```

## LICENSE

[MIT](./LICENSE)
