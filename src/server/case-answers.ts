import { z } from "zod";
import type { CareCase } from "@/lib/workspace";
import { money } from "@/lib/format";
import type { Action } from "./agent";

// Answers for the "Ask" buttons next to bill and payment information. The question is about one
// thing on screen, so the answer is written by code from the case's own computed facts: every
// number comes from the comparator, the bill items or the ledger, never from a model.

export const AskContext = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("estimate") }),
  z.object({ kind: z.literal("breakdown"), category: z.string().max(40).optional() }),
  z.object({ kind: z.literal("line"), index: z.number().int().min(0).max(200) }),
  z.object({ kind: z.literal("question"), index: z.number().int().min(0).max(200) }),
  z.object({ kind: z.literal("request"), requestId: z.string().max(100) }),
  z.object({ kind: z.literal("refund") }),
  z.object({ kind: z.literal("bill"), documentId: z.string().max(100) }),
]);
export type AskContext = z.infer<typeof AskContext>;

const CATEGORY: Record<string, string> = { procedure: "operation and anaesthesia", room: "room and daily care", drug: "medicines", lab: "laboratory and imaging", consumable: "consumables", other: "other items" };
const LINE_TYPE = {
  arithmetic_fact: "This is calculated by Guardian from the bill lines, not guessed by AI.",
  stated_in_document: "This reason is written in the hospital’s own documents.",
  unknown_ask_hospital: "The documents don’t say why, so this is a question for the hospital, not an accusation.",
} as const;
const QUESTION_KIND: Record<string, string> = {
  duplicate: "The same item appears more than once on the bill. It may have been done twice, or billed twice by mistake.",
  basic_item_billed: "These are basic items that many hospitals include in the room fee. Billing them separately is worth asking about.",
  above_reference: "The price is above an indicative reference price. That is a reason to ask, never proof of overcharging.",
  models_disagree: "Two independent AI readers read this item differently, so a person should check it with the hospital.",
};

type Answer = { reply: string; actions: Action[] };

export function answerAbout(view: CareCase, context: AskContext): Answer {
  const e = view.explanation;
  const c = view.case;
  const payer = c.me.role === "payer";
  const items = (ids: string[]) => ids.map(id => view.items[id]).filter(Boolean)
    .map(i => `${i.id} ${i.description}: ${i.qty} × ${money(i.unitPrice, e?.currency ?? c.currency)} = ${money(i.lineTotal ?? i.qty * i.unitPrice, e?.currency ?? c.currency)}`);
  const explain: Action[] = e ? [{ type: "explain_bill", documentId: e.documentId }] : [];
  const noBill = { reply: "There is no explained bill yet. Upload the hospital’s estimate and a bill first, then I can explain each part.", actions: [] };

  switch (context.kind) {
    case "estimate": {
      if (!e) return noBill;
      const over = e.total - e.estimate.high;
      const causes = e.lines.filter(l => l.type === "arithmetic_fact" && l.amount !== undefined);
      const parts = [
        `The estimate was ${money(e.estimate.low, e.currency)} to ${money(e.estimate.high, e.currency)} for a ${e.estimate.assumedStayDays}-day stay. The bill so far is ${money(e.total, e.currency)}${e.actualStayDays ? ` after ${e.actualStayDays} days` : ""}.`,
        over > 0 ? `That is ${money(over, e.currency)} above the top of the estimate.` : e.total < e.estimate.low ? `That is ${money(e.estimate.low - e.total, e.currency)} below the estimate.` : "That is inside the estimated range.",
        causes.length ? `The biggest calculated reasons: ${causes.slice(0, 3).map(l => `${l.text.replace(/[.,]?\s*$/, "")} (+${money(l.amount!, e.currency)})`).join("; ")}.` : "",
        "Open Bill Review for every reason with the bill lines it comes from.",
      ];
      return { reply: parts.filter(Boolean).join(" "), actions: explain };
    }
    case "breakdown": {
      if (!e) return noBill;
      const cats = Object.entries(e.byCategory).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
      if (context.category && e.byCategory[context.category] !== undefined) {
        const v = e.byCategory[context.category];
        const top = Object.values(view.items).filter(i => i.category === context.category).sort((a, b) => (b.lineTotal ?? 0) - (a.lineTotal ?? 0)).slice(0, 3);
        return { reply: [`${CATEGORY[context.category] ?? context.category} is ${money(v, e.currency)}, ${Math.round((v / Math.max(e.total, 1)) * 100)}% of the bill.`, !payer && top.length ? `The largest lines: ${top.map(i => `${i.description} ${money(i.lineTotal ?? i.qty * i.unitPrice, e.currency)}`).join("; ")}.` : ""].filter(Boolean).join(" "), actions: explain };
      }
      return { reply: `The bill of ${money(e.total, e.currency)} splits into: ${cats.map(([k, v]) => `${CATEGORY[k] ?? k} ${money(v, e.currency)} (${Math.round((v / Math.max(e.total, 1)) * 100)}%)`).join(", ")}. ${cats[0] ? `The largest part is ${CATEGORY[cats[0][0]] ?? cats[0][0]}.` : ""}`, actions: explain };
    }
    case "line": {
      const l = e?.lines[context.index];
      if (!e || !l) return noBill;
      const cited = payer ? [] : items(l.itemIds);
      return { reply: [`“${l.text}${l.amount !== undefined ? ` ${money(l.amount, e.currency)}` : ""}”`, LINE_TYPE[l.type], cited.length ? `It comes from these bill lines: ${cited.join("; ")}.` : `It cites bill lines ${l.itemIds.join(", ")}.`, l.type === "unknown_ask_hospital" ? "You can copy the questions for the hospital from Bill Review." : ""].filter(Boolean).join(" "), actions: explain };
    }
    case "question": {
      const q = e?.questions[context.index];
      if (!e || !q) return noBill;
      const cited = payer ? [] : items(q.itemIds);
      return { reply: [`Question for the hospital: “${q.text}”`, QUESTION_KIND[q.kind] ?? "", cited.length ? `Bill lines involved: ${cited.join("; ")}.` : "", "Ask the hospital’s billing office through its official channel and keep their answer with the case."].filter(Boolean).join(" "), actions: [...explain, ...(c.hospital.officialChannel.startsWith("https://") ? [{ type: "ask_hospital", channel: c.hospital.officialChannel } as Action] : [])] };
    }
    case "request": {
      const r = view.requests.find(r => r.id === context.requestId);
      if (!r) return { reply: "That payment request isn’t in this case any more.", actions: [] };
      const mine = r.approvals.find(a => a.memberId === c.me.id && a.status === "approved");
      return { reply: [`“${r.purpose}” asks for ${money(r.amount, r.currency)} for ${r.payeeName}. ${money(r.approved, r.currency)} is approved, ${money(r.remaining, r.currency)} is still missing, and its status is ${r.status}.`, "Nothing is charged until the approvals cover the full amount and the owner confirms. Then each approved share is charged separately, straight to the hospital’s verified account.", mine ? `You approved ${money(mine.amount, r.currency)}; you can withdraw it while the request is pending.` : c.me.role === "payer" ? "You can pledge any amount up to your share limit and the remaining balance." : ""].filter(Boolean).join(" "), actions: c.me.role === "payer" && r.status === "pending" ? [{ type: "request_approval", requestId: r.id }] : [] };
    }
    case "bill": {
      const d = view.documents.find(x => x.id === context.documentId);
      if (!d) return { reply: "I can’t find that bill in this case.", actions: [] };
      if (d.status !== "parsed") return { reply: `${d.title} couldn’t be read${d.reason ? `: ${d.reason}` : ""}. Upload a clearer copy and I can explain it.`, actions: [] };
      const cur = c.currency, est = view.documents.filter(x => x.type === "estimate" && x.estimate).at(-1)?.estimate;
      const newer = view.documents.some(x => x.type === "final" && x.status === "parsed" && x.id !== d.id) && d.type !== "final";
      const parts = [
        `${d.title} is ${d.type === "final" ? "the final bill" : "an interim bill"}${d.total !== null ? ` for ${money(d.total, cur)}` : ""}${d.items ? `, with ${d.items} lines` : ""}.`,
        est && d.total !== null ? (d.total > est.high ? `That is ${money(d.total - est.high, cur)} above the top of the estimate (${money(est.low, cur)}–${money(est.high, cur)}).` : d.total < est.low ? `That is ${money(est.low - d.total, cur)} below the estimate.` : "That is inside the estimated range.") : "",
        newer ? "The final bill replaces it, so payments follow the final bill." : "",
        e?.documentId === d.id ? `The calculated reasons: ${e.lines.filter(l => l.type === "arithmetic_fact").slice(0, 3).map(l => l.text.replace(/[.,]?\s*$/, "")).join("; ")}.${!payer && e.questions.length ? ` ${e.questions.length} things are worth asking the hospital, listed in Bill Review.` : ""}` : "",
      ];
      return { reply: parts.filter(Boolean).join(" "), actions: [] };
    }
    case "refund": {
      const f = view.refunds;
      if (!f) return { reply: "There is no refund yet. Once the final bill is reconciled and it is lower than the deposits paid, the difference is split in proportion to what each person paid.", actions: [{ type: "track_refund" }] };
      const mine = f.items.find(i => i.memberId === c.me.id);
      return { reply: [`Deposits paid were ${money(f.deposits, f.currency)} and the final bill is ${money(f.finalBill, f.currency)}, so ${money(f.totalRefund, f.currency)} comes back.`, "Each person gets a share in proportion to what they paid, and the hospital pays it back to them.", mine ? `Your share is ${money(mine.amount, f.currency)}, status ${mine.status}${mine.overdue ? ", overdue" : ""}.` : ""].filter(Boolean).join(" "), actions: [{ type: "track_refund" }] };
    }
  }
}
