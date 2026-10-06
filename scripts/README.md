# Commit Street

The engine behind the `$VJK` stock on my GitHub profile. Plain Node (20+), no dependencies.

```
vjk.config.json          symbol, prices, circuit, market hours: every tunable lives here
scripts/
  tick.js                one market tick: stats → bells → orders → SVGs → README
  settle.js              comments receipts on order issues and closes them (after the push)
  preview.js             replays fake trading into ./preview to eyeball the design
  readme.template.md     edit this, not README.md (it's regenerated every tick)
  lib/engine.js          the market as a pure state machine
  lib/render/            one file per SVG panel, dark + light
  fonts/                 JetBrains Mono + a Noto ₹ glyph, subset to a few KB each
data/market.json         the ledger (prices, holders, orders); its git history is the audit log
data/stats.json          the GitHub numbers the fair value is computed from
.github/workflows/market.yml
```

## Run it locally

```sh
npm test                       # rules, rendering and the tick end to end
node scripts/preview.js --shots  # fake traders → preview/dark.html, light.html (+ PNGs via Chrome)
node scripts/tick.js           # a real tick against public GitHub data (no token needed)
```

## Fork it for your own profile

1. Copy `scripts/`, `.github/`, `package.json` and `vjk.config.json` into your `<username>/<username>` repo.
2. In `vjk.config.json`, set `login`, `repo`, `displayName` and `symbol` (and set `baseline30` to roughly your usual 30-day contribution count). Change the `'VJK'` in the workflow's `if:` to your symbol too.
3. Adjust `scripts/readme.template.md` if you want text around the panels.
4. Delete `data/` (yours is created on the first tick), push, then run the workflow once from the Actions tab.
5. Optional: add a `PROFILE_TOKEN` secret (fine-grained, read-only) to count private contributions.
