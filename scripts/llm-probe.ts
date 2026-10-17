// Live check: which model in the chain answers right now. Usage: npx tsx scripts/llm-probe.ts
import { chat } from "../src/server/llm";

chat([{ role: "user", content: "Reply with the single word OK." }]).then(
  (r) => console.log("used", `${r.used.provider}:${r.used.model}`, "reply", r.text.trim(), "skipped", r.skipped),
  (e) => {
    console.error(e.message);
    process.exit(1);
  },
);
