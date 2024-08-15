# ts-action-template

[![GitHub Release](https://img.shields.io/github/v/release/koki-develop/ts-action-template)](https://github.com/koki-develop/ts-action-template/releases/latest)
[![CI](https://img.shields.io/github/actions/workflow/status/koki-develop/ts-action-template/ci.yml?branch=main&logo=github&style=flat&label=ci)](https://github.com/koki-develop/ts-action-template/actions/workflows/ci.yml)
[![Build](https://img.shields.io/github/actions/workflow/status/koki-develop/ts-action-template/build.yml?branch=main&logo=github&style=flat&label=build)](https://github.com/koki-develop/ts-action-template/actions/workflows/build.yml)

This is a template for creating GitHub Actions in TypeScript.

## Requirements

[Bun](https://bun.sh/) is required.

## Getting Started

1. Click the `Use this template` button to create a new repository.  
2. Move to `Settings` > `Actions` > `General` and enable `Allow GitHub Actions to create and approve pull requests`.

## Development

Install dependencies with `bun install`.

```console
$ bun install
```

Edit [`action.yml`](./action.yml) to set up the action.  
Edit [`src/main.ts`](./src/main.ts) to implement the action.

## Test

Run `bun run test` to test the action. The testing framework is [Vitest](https://vitest.dev/).

```console
$ bun run test
```

## Release

Run `bun run build` to build the source code. The built code will be output to the `dist/` directory. Commit the content of this directory.

```console
$ bun run build
$ git add dist
$ git commit -m "Build"
```

Create a tag in semver format.
> [!NOTE]
> The major version tag (e.g. `v1`) is created automatically by GitHub Actions.  
> See: [`.github/workflows/major-version-sync.yml`](./.github/workflows/major-version-sync.yml)

```console
$ git tag v1.0.0
$ git push origin v1.0.0
```

Create a release on GitHub as needed.

## LICENSE

[MIT](./LICENSE)
