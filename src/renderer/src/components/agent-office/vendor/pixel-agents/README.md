# pixel-agents (vendored)

Office engine and art from [pixel-agents](https://github.com/pixel-agents-hq/pixel-agents),
MIT licensed (see `LICENSE`, Copyright (c) 2026 Pablo De Lucca).

- Source commit: `b1bafd02896d90d83457266575a1e8e5011ce997` (v1.5.0, 2026-10-16)
- Folder layout mirrors the upstream repo so relative imports stay untouched.

## What was copied

- `webview-ui/src/office/`: engine (state, characters, renderer), layout, sprites, floor and wall
  tiles, colorize. Left out: the layout editor, `components/` (React canvas tied to the VS Code
  transport), `engine/gameLoop.ts`, `engine/existingAgents.ts` and the barrel `index.ts` files.
- `webview-ui/src/constants.ts` and `webview-ui/src/components/ui/types.ts`.
- `core/src/paletteUtils.ts` and the pure parts of `core/src/assets/` (manifest flattening, types,
  color and size constants). The Node loaders (`fs`, `pngjs`) were not copied: Orca decodes the
  same PNGs from a canvas in `../../office-sprite-decoding.ts`.
- `webview-ui/public/assets/`: furniture, floors, walls, characters and carpets. The characters are
  based on JIK-A-4's Metro City pack (CC0).

## Local changes

None. Files are byte-for-byte copies of the source commit. This folder is excluded from Orca's
lint and formatter (`.oxlintrc.json`, `.oxfmtrc.json`) so upstream files can be refreshed as-is.
