<p align="center">{{panel:ticker}}</p>

<p align="center">{{panel:quote}}</p>

<p align="center">{{panel:chart}}</p>

<p align="center">{{buttons}}</p>

<p align="center"><sub>Buttons open a pre-filled issue. Hit <b>Create</b> to place your order.</sub></p>

<p align="center">{{panel:book}}</p>

<p align="center">{{panel:fundamentals}}</p>

<details>
<summary><b>How does this market work?</b></summary>
<br>
<ul>
<li><b>My commits set the fair value.</b> At every closing bell, ${{symbol}} moves {{pull}}% of the way toward a fair value computed from my last 30 days of GitHub contributions: {{listing}} at {{baseline}} contributions, scaling with the square root. If I stop shipping, the stock bleeds.</li>
<li><b>You move it during the day.</b> Every share you buy pushes the price up {{impact}}%, every share you sell pushes it down. You pay the price <i>after</i> your own impact, so a pump-and-dump always loses money.</li>
<li><b>Circuit limits.</b> The price can't move more than ±{{circuit}}% from the previous close. Hit the upper circuit and buying stops for the day, just like on Dalal Street.</li>
<li><b>Market hours.</b> {{open}}–{{close}} IST, Monday to Friday. Orders placed outside hours are after-market orders (AMOs) that fill at the next opening bell. Close your issue to cancel one.</li>
<li><b>Dividends.</b> Every pull request of mine that gets merged pays {{dividend}} per share to everyone holding ${{symbol}}.</li>
<li><b>Fair play.</b> One order every {{cooldownMinutes}} minutes, {{maxQty}} shares max. Bots and insiders (me) can't trade.</li>
<li><b>Under the hood.</b> No servers. A GitHub Actions workflow wakes up for the opening bell, the closing bell and every new order issue, runs the market engine, redraws these SVGs and commits them. The full ledger is <a href="data/market.json"><code>data/market.json</code></a> and its git history.</li>
</ul>
</details>

<p align="center">{{panel:footer}}</p>

{{coffee}}
