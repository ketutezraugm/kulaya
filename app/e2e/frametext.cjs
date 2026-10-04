// Dev helper: print the text of design frames. node e2e/frametext.cjs "<file>.dc.html" 7d 7e
const { chromium } = require("playwright-core");
const path = require("path");
(async () => {
  const [file, ...ids] = process.argv.slice(2);
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
  await p.goto("file:///" + path.join(process.cwd(), "assets", file).split(path.sep).join("/").replace(/ /g, "%20"));
  await p.waitForTimeout(3000);
  for (const id of ids) console.log("=====", id, "\n" + (await p.locator(`[id="${id}"]`).first().innerText()));
  await b.close();
})();
