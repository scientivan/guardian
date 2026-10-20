import { FAMILY } from "@/components/landing/agents";
import { Building } from "@/components/landing/icons";
import { Minifig, type Look } from "@/components/landing/Minifig";

// Case members drawn as the same toy figures as the agents. The mosque fund is an organisation, so it gets a building.

const BY_NAME = Object.fromEntries(FAMILY.map((p) => [p.name, p])) as Record<string, Look & { name: string }>;

const LOOKS: Record<string, Look | null> = {
  M_OWNER: BY_NAME.Rina,
  M_JKT: BY_NAME.Adi,
  M_KL: BY_NAME.Sari,
  M_DXB: BY_NAME.Fajar,
  M_COMP: { skin: "#e3b48c", hair: "#5d4a5a", hijab: true, shirt: "#91999c" },
  PATIENT: { skin: "#c99a74", hair: "#9a9a9a", shirt: "#abc1cf" },
  M_MOSQUE: null,
};

export function MemberAvatar({ id, className = "h-10 w-10 rounded-xl" }: { id: string; className?: string }) {
  const look = LOOKS[id];
  if (!look) {
    return (
      <span className={`grid shrink-0 place-items-center bg-chocolate/12 text-chocolate ${className}`}>
        <Building className="h-1/2 w-1/2" />
      </span>
    );
  }
  return <Minifig {...look} className={`shrink-0 bg-mist ${className}`} />;
}
