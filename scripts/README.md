# Commit City and Commit Street

The engine behind my GitHub profile: Commit City on top, and the `$VJK` stock market under it.
Plain Node (20+), no dependencies.

```
vjk.config.json          every tunable: the market's symbol, prices and hours, the city's growth rules
scripts/
  tick.js                one tick: stats → bells → orders → SVGs → README
  settle.js              comments receipts on order issues and closes them (after the push)
  preview.js             replays fake trading into ./preview to eyeball the design
  readme.template.md     edit this, not README.md (it's regenerated every tick)
  lib/engine.js          the market as a pure state machine
  lib/city/growth.js     how many buildings, trees and extras a contribution total buys
  lib/render/            one file per SVG panel, dark + light
  lib/render/city/       Commit City's layers: sky, skyline, buildings, Soudha, street, traffic
  fonts/                 JetBrains Mono, a Noto ₹ glyph and the city's Kannada signs, subset small
data/market.json         the ledger (prices, holders, orders); its git history is the audit log
data/stats.json          the GitHub (and DEV) numbers everything is drawn from
data/city.json           the highest all-time contribution total seen, so the city never shrinks
.github/workflows/market.yml
```

## How the city grows

Everything comes from `data/stats.json`. All-time contributions buy buildings: the first costs
`buildingBase` (25), each one after costs `buildingStep` (5) more, up to `maxBuildings`. Each
building is a public repo, busiest first. The darshini, autos, BMTC buses and banner planes open
up at the `unlock` totals, there's a tree per `treeEvery` contributions, and Commit Soudha goes up
between `soudha.start` and `soudha.done`. The light follows `market.utcOffsetMinutes` (IST): dawn
05:30, day 07:00, dusk 17:45, night 19:00. The workflow has a cron for each.

Kannada text is drawn with a subset font that only has the glyphs of the strings in
`lib/render/kannada.js`. To add a sign, add its string there, rebuild the subset from Noto Sans
Kannada (wght 700) with fontTools, and measure its width in a browser.

## Run it locally

```sh
npm test                       # rules, rendering and the tick end to end
node scripts/preview.js --shots  # fake traders → preview/dark.html, light.html (+ PNGs via Chrome)
node scripts/preview.js --phases # also preview/phases.html: Commit City at dawn, day, dusk and night
node scripts/tick.js           # a real tick against public GitHub data (no token needed)
```

## Fork it for your own profile

1. Copy `scripts/`, `.github/`, `package.json` and `vjk.config.json` into your `<username>/<username>` repo.
2. In `vjk.config.json`, set `login`, `repo`, `displayName` and `symbol` (and set `baseline30` to roughly your usual 30-day contribution count). Change the `'VJK'` in the workflow's `if:` to your symbol too. Set `devUsername` for banner planes, or remove it.
3. Adjust `scripts/readme.template.md` if you want different text around the panels.
4. Delete `data/` (yours is created on the first tick), push, then run the workflow once from the Actions tab.
5. Optional: add a `PROFILE_TOKEN` secret (fine-grained, read-only) to count private contributions.
