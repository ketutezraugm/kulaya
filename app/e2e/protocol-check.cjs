// Protocol site smoke: overview numbers, red-team "compromised model" run (no LLM needed), nav and old-URL redirects.
const { chromium } = require("playwright-core");
const { BASE } = require("./lib.cjs");
let fails = 0;
const check = (n, ok, x = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${n}${x ? "  " + x : ""}`); if (!ok) fails++; };
(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  p.on("pageerror", (e) => console.log("PAGE ERROR:", e.message.slice(0, 160)));
  await p.goto(`${BASE}/protocol`, { waitUntil: "load" });
  await p.getByTestId("live-numbers").waitFor();
  await p.waitForFunction(() => !document.querySelector("[data-testid=live-numbers]")?.textContent?.includes("…"), null, { timeout: 30000 });
  check("overview shows live numbers", true, (await p.getByTestId("live-numbers").innerText()).replace(/\n/g, " ").slice(0, 120));
  check("overview states the honest limits", /not QRIS/.test(await p.getByTestId("honest-limits").innerText()));

  await p.goto(`${BASE}/protocol/redteam`, { waitUntil: "load" });
  await p.getByTestId("mode-raw").click();
  await p.getByTestId("raw-principal").fill("1000000000");
  await p.getByTestId("run-attack").click();
  await p.getByTestId("rt-result").waitFor({ timeout: 60000 });
  const txt = await p.getByTestId("rt-result").innerText();
  check("compromised model asking Rp 1 miliar is stopped by a gate", /BLOCKED|REVERTED/.test(txt), txt.replace(/\n/g, " ").slice(0, 160));
  await p.getByTestId("skip-policy").check();
  await p.getByTestId("run-attack").click();
  await p.waitForFunction(() => /REVERTED/.test(document.querySelector("[data-testid=rt-result]")?.textContent || ""), null, { timeout: 60000 });
  check("with the policy layer off, the contract alone reverts it", true);

  for (const [path, text] of [["/protocol/agent", "AI agent identity"], ["/protocol/pool", "Lending pool"], ["/protocol/contracts", "Contracts & verification"], ["/protocol/gasless", "Gasless & relayer"], ["/protocol/docs", "Run it yourself"]]) {
    await p.goto(`${BASE}${path}`, { waitUntil: "load" });
    await p.getByRole("heading", { name: text }).waitFor({ timeout: 30000 });
    check(`${path} renders`, true);
  }
  for (const [from, to] of [["/redteam", "/protocol/redteam"], ["/agent", "/protocol/agent"], ["/pool", "/protocol/pool"], ["/dashboard", "/toko"], ["/onboard?code=abc", "/mulai?code=abc"]]) {
    const r = await fetch(`${BASE}${from}`, { redirect: "manual" });
    check(`${from} redirects to ${to}`, r.status === 308 && (r.headers.get("location") || "").endsWith(to), `${r.status} ${r.headers.get("location")}`);
  }
  await b.close();
  console.log(`\n${fails === 0 ? "ALL PASSED" : fails + " FAILED"}`);
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.log("TEST ERROR:", e.message.slice(0, 300)); process.exit(1); });
