# @mvila/tsconfig

Shared TypeScript config used by mvila's projects.

## Installation

```bash
npm install @mvila/tsconfig --save-dev
```

## Usage

`tsconfig.json`

```json
{
  "extends": "@mvila/tsconfig",
  "include": ["src/**/*"],
  "compilerOptions": {
    "outDir": "dist/node-cjs"
  }
}
```

## License

MIT
