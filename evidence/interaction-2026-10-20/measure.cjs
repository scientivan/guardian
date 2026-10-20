/* eslint-disable @typescript-eslint/no-require-imports -- plain Node script run outside the app */
// Interaction count through the real web UI (TASKS 6.7, rubric I3): for each task, how many user
// turns (a click, a typed value or a chosen file that the person must make) and agent turns (a
// response the product shows: answer, quote, dialog, status) it takes on a fresh demo account.
// Switching "Viewing as" stands in for another person signing in and is not counted.
//
//   npm run dev   (in another terminal)
//   node evidence/interaction-2026-10-20/measure.cjs
//
// Writes turns.json and screenshots next to this file. Uses the Playwright install at
// /opt/node-tools (set PLAYWRIGHT to override).

const { chromium } = require(process.env.PLAYWRIGHT ?? "/opt/node-tools/node_modules/playwright");
const fs = require("node:fs");
const path = require("node:path");
const OUT = __dirname;
const BASE = process.env.BASE_URL ?? "http://localhost:3000";

const tasks = [];
let current;
const task = (id, name, who) => { current = { id, name, who, user: [], agent: [] }; tasks.push(current); };
const user = async (label, fn) => { current.user.push(label); await fn(); };
const agent = async (label, wait) => { await wait(); current.agent.push(label); };
const shot = (p, name) => p.screenshot({ path: path.join(OUT, `${name}.png`) });

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  p.on("pageerror", e => errors.push(e.message));
  await p.goto(`${BASE}/login`, { timeout: 180000 });
  await p.getByRole("button", { name: "Use demo account" }).click();
  await p.waitForURL("**/projects", { timeout: 180000 });
  await p.goto(`${BASE}/case/C1`, { timeout: 180000 });
  await p.waitForSelector("text=Bill Review", { timeout: 60000 });
  const viewAs = async name => { await p.getByRole("combobox", { name: "Viewing as" }).click(); await p.getByRole("option", { name: new RegExp(name) }).click(); await p.waitForTimeout(1500); };
  const dismissReceipt = async () => { const d = p.getByRole("button", { name: "Done" }); if (await d.isVisible().catch(() => false)) await d.click(); };

  task("D2–D3", "Understand why the bill is higher than the estimate", "Owner");
  await user("Open Bill Review", () => p.getByRole("link", { name: "Bill Review" }).first().click());
  await agent("Estimate vs bill, cost breakdown, cited reasons and hospital questions shown", () => p.waitForSelector("text=Estimate vs. Bill", { timeout: 60000 }));
  await shot(p, "bill-review");
  await user("Ask “Why is it different?”", () => p.getByRole("button", { name: /Why is the bill different/ }).click());
  await agent("Case Assistant answers with the numbers", () => p.waitForTimeout(2500));
  await shot(p, "assistant-answer");
  await p.getByRole("button", { name: "Close the assistant" }).click(); // closing a window is not a turn

  task("D4a", "Ask the family for an emergency guarantee", "Owner");
  await user("Open Pledges", () => p.getByRole("link", { name: "Pledges" }).first().click());
  await p.waitForSelector("text=Payment Requests", { timeout: 60000 });
  await user("Choose “Emergency guarantee”", () => p.getByRole("radio", { name: "Emergency guarantee" }).click());
  await user("Type the amount from the hospital's letter", () => p.locator("#request-amount").fill("1000"));
  await user("Click “Ask for …”", () => p.getByRole("button", { name: /Create request|Ask for/ }).click());
  await agent("Request card with stages, expiry and payee shown", () => p.waitForSelector("text=Requested", { timeout: 60000 }));

  task("D4b", "Pledge my share (each payer)", "Payer");
  await viewAs("Adi");
  await dismissReceipt();
  await user("Open Pledges", () => p.getByRole("link", { name: "Pledges" }).first().click());
  await agent("Request, own currency and FX quote shown (amount prefilled with what is missing)", () => p.waitForSelector("text=You pay", { timeout: 60000 }));
  await user("Click “Pledge …”", () => p.getByRole("button", { name: /^Pledge / }).click());
  await agent("Sandbox checkout: share, rate, fee, card, “not charged now”", () => p.waitForSelector("text=Authorize pledge", { timeout: 30000 }));
  await shot(p, "pledge-checkout");
  await user("Click “Authorize pledge”", () => p.getByRole("button", { name: "Authorize pledge" }).click());
  await agent("Pledge recorded, request covered", () => p.waitForSelector("text=Withdraw", { timeout: 60000 }));

  task("D4c", "Pay the covered request", "Owner");
  await viewAs("Rina");
  await user("Open Pledges (request already selected)", () => p.getByRole("link", { name: "Pledges" }).first().click());
  await agent("“Review payment” enabled beside the total", () => p.waitForSelector("text=Review payment", { timeout: 60000 }));
  await shot(p, "request-card");
  await user("Click “Review payment”", () => p.getByRole("button", { name: "Review payment" }).click());
  await agent("Confirmation: amount, hospital, account", () => p.waitForSelector("text=Confirm and pay", { timeout: 30000 }));
  await user("Click “Confirm and pay approved shares”", () => p.getByRole("button", { name: /Confirm and pay/ }).click());
  await agent("Paid; receipt per share", () => p.waitForSelector("text=Receipt", { timeout: 60000 }));
  await dismissReceipt();

  task("D5", "Work out refunds after the final bill", "Owner");
  await user("Open Refund Tracking", () => p.getByRole("link", { name: /Refund Tracking/ }).first().click());
  const reconcile = p.getByRole("button", { name: "Reconcile final bill" });
  if (await reconcile.isVisible({ timeout: 15000 }).catch(() => false)) {
    await user("Click “Reconcile final bill”", () => reconcile.click());
    await agent("Refund per person shown", () => p.waitForSelector("text=Refund per Person", { timeout: 60000 }));
  } else await agent("Refund per person already shown", () => p.waitForSelector("text=Refund per Person", { timeout: 60000 }));
  await shot(p, "refunds");

  task("Close", "Close the case and keep the records", "Owner");
  await user("Open Close and Records", () => p.getByRole("link", { name: "Close and Records" }).first().click());
  await agent("Checklist: what still blocks closing", () => p.waitForSelector("text=End This Care Case", { timeout: 60000 }));
  await shot(p, "closing-checklist");

  await p.getByRole("link", { name: "Case History" }).first().click();
  await p.waitForSelector("text=Recent Activity", { timeout: 60000 }).catch(() => {});
  await p.waitForTimeout(1000);
  await shot(p, "case-history");

  const result = {
    runAt: new Date().toISOString(), base: BASE, pageErrors: errors,
    note: "User turn = a click, typed value or file the person must provide. Agent turn = a response the product shows. Switching the demo viewer is not counted.",
    tasks: tasks.map(t => ({ id: t.id, name: t.name, who: t.who, userTurns: t.user.length, agentTurns: t.agent.length, user: t.user, agent: t.agent })),
  };
  fs.writeFileSync(path.join(OUT, "turns.json"), JSON.stringify(result, null, 2));
  for (const t of result.tasks) console.log(`${t.id.padEnd(6)} user ${t.userTurns} · agent ${t.agentTurns} · ${t.name}`);
  console.log("page errors:", errors.length);
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
