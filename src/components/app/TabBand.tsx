import { AGENTS, type AgentId } from "@/components/landing/agents";
import { Minifig } from "@/components/landing/Minifig";

/**
 * The title band of a screen: edge to edge, the same dark blue as "Upload a bill", white serif
 * title, and the whole agent team standing on its bottom edge. The agents in `working` hop once
 * when the screen opens. `inner` sets the width and padding so the title lines up with the content.
 */
export function TabBand({ title, working = [], inner = "px-4 sm:px-6 lg:px-8", compact = false }: { title: string; working?: AgentId[]; inner?: string; compact?: boolean }) {
  return (
    <div className="relative overflow-hidden bg-serpent-dark">
      <div className={`relative flex items-end justify-between gap-6 pt-8 ${inner}`}>
        <h1 className={`shrink-0 whitespace-nowrap pb-7 font-serif leading-none text-white ${compact ? "text-4xl sm:text-[2.75rem]" : "text-4xl sm:text-5xl"}`}>{title}</h1>
        <ul className="flex shrink-0 items-end" aria-label="The agent team">
          {AGENTS.map((a, i) => {
            const on = working.includes(a.id);
            return (
              <li
                key={`${title}-${a.id}`}
                title={a.name}
                className={`${on ? "hop" : ""} ${i > 2 && !on ? "hidden md:block" : ""}`}
                style={on ? { animationDelay: `${150 + working.indexOf(a.id) * 120}ms` } : undefined}
              >
                <Minifig skin={a.skin} hair={a.hair} hijab={a.hijab} shirt={a.color} label={a.name} className={`-mb-px ${compact ? "h-11 w-11 sm:h-12 sm:w-12" : "h-14 w-14 sm:h-16 sm:w-16"}`} />
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
