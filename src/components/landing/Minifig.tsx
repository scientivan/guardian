
import { LocalizedText, LocalizedElement } from "@/components/i18n/LocaleProvider";
// Front view of a blocky, toy-like figure: the same people who sit in the office in the hero.
// Plain SVG; size and background come from `className` (use a square tile, e.g. "h-12 w-12 rounded-xl bg-mist").

export type Look = { skin: string; hair: string; hijab?: boolean; shirt: string };

export function Minifig({ skin, hair, hijab = false, shirt, className = "h-10 w-10", label }: Look & { className?: string; label?: string }) {
  return (
    <LocalizedElement as="svg" viewBox="0 0 48 48" className={className} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <path d="M9 48 12.6 37.2Q13.4 34.5 16.2 34.5H31.8Q34.6 34.5 35.4 37.2L39 48Z" fill={shirt} />
      <rect x={20} y={30} width={8} height={5.5} fill={skin} />
      <rect x={20} y={30} width={8} height={5.5} fill="#000" fillOpacity={0.14} />
      <LocalizedText>{hijab ? (
        <>
          <path d="M8.5 48Q9 37 14.5 33.5V19Q14.5 6.5 24 6.5T33.5 19V33.5Q39 37 39.5 48Z" fill={hair} />
          <rect x={15.8} y={12.5} width={16.4} height={18} rx={6.5} fill={skin} />
        </>
      ) : (
        <>
          <rect x={13} y={9} width={22} height={23} rx={6.5} fill={skin} />
          <path d="M12 19V14.5Q12 7 19.5 7H28.5Q36 7 36 14.5V19Q33.5 13.2 28 13.2H20Q14.5 13.2 12 19Z" fill={hair} />
        </>
      )}</LocalizedText>
      <circle cx={20.2} cy={21.2} r={1.6} fill="#202121" />
      <circle cx={27.8} cy={21.2} r={1.6} fill="#202121" />
      <path d="M20.6 25.6Q24 28.4 27.4 25.6" fill="none" stroke="#202121" strokeWidth={1.5} strokeLinecap="round" />
    </LocalizedElement>
  );
}
