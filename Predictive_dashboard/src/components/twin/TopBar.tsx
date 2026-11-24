import { Moon, Sun, Presentation, Compass, FlaskConical, ShieldAlert } from "lucide-react";
import type { Disease } from "@/data/twin";
import { t } from "@/lib/i18n";
import { useTwin, type LayerId } from "@/store/twinStore";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

const LAYERS: LayerId[] = ["risk", "cases", "water", "vector", "connectivity", "vulnerability", "mobility", "asha"];
const DISEASES: Disease[] = ["dengue", "diarrhoeal", "ili", "malaria"];

export function SimBadge() {
  const lang = useTwin((s) => s.lang);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary" role="note">
      <ShieldAlert className="h-3.5 w-3.5" aria-hidden />{t("badge", lang)}
    </span>
  );
}

export function TopBar() {
  const { disease, layers, lang, theme, presenter, set, toggleLayer } = useTwin();
  return (
    <header className="glass flex flex-wrap items-center gap-2 px-3 py-2">
      <div className="mr-2 flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-lg font-bold text-primary-foreground" style={{ background: "linear-gradient(135deg, var(--saffron), var(--india-green))" }} aria-hidden>से</div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-foreground">SevaSetu <span className="text-muted-foreground">सेवासेतु</span></div>
          <div className="text-[11px] text-muted-foreground">{t("title", lang)} · {t("village", lang)}</div>
        </div>
      </div>
      <div className="flex overflow-hidden rounded-lg border border-border" role="radiogroup" aria-label="Disease scenario">
        {DISEASES.map((d) => (
          <button key={d} role="radio" aria-checked={disease === d} onClick={() => set({ disease: d, selected: null, highlight: [] })}
            className={`px-2.5 py-1.5 text-xs transition ${disease === d ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}>{t(d, lang)}</button>
        ))}
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="secondary" size="sm" data-tour="layers">{t("layers", lang)} · <span className="font-mono">{layers.length}</span></Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2">
          {LAYERS.map((l) => (
            <label key={l} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent">
              <Checkbox checked={layers.includes(l)} onCheckedChange={() => toggleLayer(l)} />{t(l, lang)}
            </label>
          ))}
        </PopoverContent>
      </Popover>
      <Button size="sm" className="anim-cta" onClick={() => set({ simOpen: true })} data-tour="test"><FlaskConical className="mr-1 h-4 w-4" />{t("test", lang)}</Button>
      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        <SimBadge />
        <Button size="sm" variant="ghost" onClick={() => set({ lang: lang === "en" ? "hi" : "en" })} aria-label="Toggle language">{lang === "en" ? "हिं" : "EN"}</Button>
        <Button size="icon" variant="ghost" onClick={() => set({ theme: theme === "dark" ? "light" : "dark" })} aria-label="Toggle theme">{theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</Button>
        <Button size="sm" variant="ghost" onClick={() => set({ tourStep: 0 })}><Compass className="mr-1 h-4 w-4" />{t("tour", lang)}</Button>
        <Button size="sm" variant={presenter ? "default" : "ghost"} onClick={() => set({ presenter: !presenter })} aria-pressed={presenter} title="Shortcut: P"><Presentation className="mr-1 h-4 w-4" />{t("presenter", lang)}</Button>
      </div>
    </header>
  );
}
