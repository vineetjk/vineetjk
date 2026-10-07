<p align="center">{{panel:city}}</p>

{{lights}}

{{flights}}

<details>
<summary>How Commit City works</summary>
<br>
<p>Everything in this city comes from my GitHub activity, and it grows as I commit. The first building cost {{cityFirst}} contributions and each one after costs {{cityStep}} more, so it filled in quickly at first and grows slower now. It never shrinks.</p>
<p>Each building is one of my public repos. Repos I pushed to in the last four months are glass towers, the ones from the last two years are apartment blocks, and older ones are tile-roof houses. The more I committed to a repo this year, the taller it is.</p>
<p>The metro is my contribution graph: one coach per week and one window per day, lit on days I committed. The street under each coach is as busy as that week was. BMTC buses are pull requests merged this year, with the repo and PR number on the side, and the planes carry my DEV posts.</p>
<p>Commit Soudha, the town hall, starts going up at {{soudhaStart}} contributions and opens at {{soudhaDone}}. There's a new tree for every {{treeEvery}}.</p>
<p>The sky follows the time in Bengaluru. A GitHub Action redraws the city a few times a day, so there's no server and nothing to update by hand.</p>
</details>

<p align="center">{{panel:sign}}</p>

<p align="center">{{panel:ticker}}</p>

<p align="center">{{panel:quote}}</p>

<p align="center">{{panel:chart}}</p>

<p align="center">{{buttons}}</p>

<p align="center"><sub>Buttons open a pre-filled issue. Hit <b>Create</b> to place your order.</sub></p>

<p align="center">{{panel:book}}</p>

<p align="center">{{panel:fundamentals}}</p>

<details>
<summary>How does this work?</summary>
<br>
<p>The price follows my GitHub activity. A normal month for me is around {{baseline}} contributions, and that's worth {{listing}} a share. If I stop coding for a month, that drops to half. When the market closes each day, the price moves {{pull}}% of the way toward whatever my last 30 days say it's worth.</p>
<p>During the day you move it. Every share bought pushes it up {{impact}}%, every share sold pushes it down, and you pay the price after your own push. So buying and selling straight away loses you a little.</p>
<p>It can't go more than {{circuit}}% above or below the previous close. Once it hits that limit, buying (or selling, if it's falling) stops until the next day.</p>
<p>The market is open {{open}} to {{close}} IST, Monday to Friday. Orders placed outside those hours wait for the next morning. Close your issue if you change your mind.</p>
<p>You start with {{startingCash}} of play money. Up to {{maxQty}} shares per order.{{cooldown}} Whenever one of my pull requests gets merged, everyone holding shares gets {{dividend}} per share. I can't buy my own stock.</p>
<p>There's no server behind this. A GitHub Action runs at the open, at the close and whenever someone places an order, then redraws these images. Every trade is in <a href="data/market.json">data/market.json</a>.</p>
</details>

<p align="center">{{panel:footer}}</p>

{{coffee}}

{{views}}
