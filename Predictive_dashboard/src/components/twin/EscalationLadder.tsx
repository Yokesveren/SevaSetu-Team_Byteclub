import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { reduction, villageRisk } from "@/lib/sim";
import { t } from "@/lib/i18n";
import { useTwin } from "@/store/twinStore";

const STEPS = [
  { en: "ASHA flag", hi: "आशा संकेत" },
  { en: "PHC doctor review", hi: "PHC डॉक्टर समीक्षा" },
  { en: "District Health Officer review", hi: "ज़िला स्वास्थ्य अधिकारी समीक्षा" },
  { en: "District Magistrate decision", hi: "ज़िलाधिकारी निर्णय" },
  { en: "Rapid Response Team", hi: "त्वरित प्रतिक्रिया दल" },
];

export function EscalationLadder() {
  const day = useTwin((s) => s.day), disease = useTwin((s) => s.disease), iv = useTwin((s) => s.interventions), lang = useTwin((s) => s.lang);
  const r = villageRisk(disease, day, reduction(disease, iv));
  const cur = r < 25 ? 0 : r < 50 ? 1 : r < 80 ? 2 : 3;
  return (
    <div className="glass p-4" data-tour="ladder">
      <div className="mb-2 flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground">
        {t("ladder", lang)}
        <Tooltip>
          <TooltipTrigger aria-label="About escalation"><Info className="h-3.5 w-3.5" /></TooltipTrigger>
          <TooltipContent className="max-w-[220px]">{t("ladderTip", lang)}</TooltipContent>
        </Tooltip>
      </div>
      <ol className="space-y-1.5">
        {STEPS.map((s, i) => (
          <li key={s.en} className="flex items-center gap-2 text-xs" aria-current={i === cur ? "step" : undefined}>
            <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full font-mono text-[10px] transition ${i < cur ? "bg-india-green text-primary-foreground" : i === cur ? "anim-cta bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{i < cur ? "✓" : i + 1}</span>
            <span className={i === cur ? "font-semibold text-foreground" : i < cur ? "text-foreground" : "text-muted-foreground"}>{lang === "hi" ? s.hi : s.en}</span>
            {i === cur && <span className="ml-auto rounded bg-primary/15 px-1.5 text-[10px] text-primary">current</span>}
          </li>
        ))}
      </ol>
      <p className="mt-2 text-[10px] text-muted-foreground">{t("ladderTip", lang)}</p>
    </div>
  );
}
