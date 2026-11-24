import { motion } from "motion/react";

export type BandTone = "ward" | "linen" | "mint" | "teal" | "night" | "sand";

const TONES: Record<BandTone, { bg: string; ink: string; soft: string; border: string }> = {
  ward:  { bg: "#dcecf7", ink: "#0b2a3c", soft: "#2d4a58", border: "#b8d4ea" },
  linen: { bg: "#edf3f8", ink: "#0b2a3c", soft: "#3e5566", border: "#d1dde8" },
  mint:  { bg: "#9fe5cf", ink: "#0b2a3c", soft: "#164e3f", border: "#6cd4b0" },
  teal:  { bg: "#0b7a75", ink: "#ffffff", soft: "#c9ece6", border: "#0a6b67" },
  night: { bg: "#0b2a3c", ink: "#f2f2f2", soft: "#b4b4b4", border: "#1c4460" },
  sand:  { bg: "#f0f5fa", ink: "#0b2a3c", soft: "#56636b", border: "#d8e3ec" },
};

interface PageBandProps {
  tone: BandTone;
  title: string;
  subtitle?: string;
  lead?: React.ReactNode;
  aside?: React.ReactNode;
  badge?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Full-width chapter header in the Byteclub design language:
 * big uppercase title with spring slide-up, one soft lead line, optional aside.
 */
export function PageBand({ tone, title, subtitle, lead, aside, badge, children }: PageBandProps) {
  const t = TONES[tone];
  return (
    <section
      className="relative overflow-hidden px-6 pb-6 pt-7 sm:px-8 sm:pt-8"
      style={{ background: t.bg, color: t.ink, ["--band-soft" as string]: t.soft }}
    >
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div className="min-w-0">
          {badge && <div className="mb-2">{badge}</div>}
          {/* Title: big uppercase black */}
          <h1
            className="overflow-hidden"
            style={{
              fontSize: "clamp(1.75rem, 1.2rem + 2.5vw, 3.5rem)",
              fontWeight: 900,
              lineHeight: 0.9,
              letterSpacing: "-0.04em",
              textTransform: "uppercase",
            }}
          >
            <motion.span
              className="block"
              initial={{ y: "105%" }}
              animate={{ y: "0%" }}
              transition={{ type: "spring", stiffness: 180, damping: 22 }}
            >
              {title}
            </motion.span>
          </h1>

          {subtitle && (
            <motion.p
              className="mt-1 text-sm font-bold tracking-wide uppercase opacity-60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ delay: 0.1 }}
            >
              {subtitle}
            </motion.p>
          )}

          {lead && (
            <motion.div
              className="mt-2.5 max-w-[56ch] text-[15px] leading-snug"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, type: "spring", stiffness: 180, damping: 22 }}
            >
              {lead}
            </motion.div>
          )}
        </div>

        {aside && (
          <div className="text-sm shrink-0" style={{ color: t.soft }}>
            {aside}
          </div>
        )}
      </div>

      {children && (
        <motion.div
          className="mt-5"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, type: "spring", stiffness: 180, damping: 22 }}
        >
          {children}
        </motion.div>
      )}
    </section>
  );
}

/** Large display number with label — use inside a PageBand children */
export function BandFigure({
  label,
  value,
  unit,
  note,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  note?: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-sm" style={{ color: "var(--band-soft)" }}>
        {label}
      </dt>
      <dd
        className="mt-1 flex items-baseline gap-2 font-black leading-none tabular-nums"
        style={{ fontSize: "clamp(2rem, 1.4rem + 1.6vw, 3rem)", letterSpacing: "-0.04em" }}
      >
        {value}
        {unit && <span className="text-base font-bold tracking-normal">{unit}</span>}
        {note && <span className="text-sm font-bold tracking-normal underline decoration-2 underline-offset-4">{note}</span>}
      </dd>
    </div>
  );
}

/** Triage band status chip */
export function BandChip({
  band,
  provisional,
  size = "sm",
}: {
  band: "red" | "yellow" | "green";
  provisional?: boolean;
  size?: "sm" | "lg";
}) {
  const BANDS = {
    red:    { label: "Emergency now", icon: "◆", cls: "bg-[#c4242a] text-white border-[#c4242a]" },
    yellow: { label: "Priority",      icon: "▲", cls: "bg-[#fff1c2] text-[#5c3d00] border-[#d9a400]" },
    green:  { label: "Routine",       icon: "●", cls: "bg-[#dcf5e4] text-[#0d3b1e] border-[#5fb47f]" },
  };
  const b = BANDS[band];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-bold whitespace-nowrap ${b.cls} ${
        size === "lg" ? "px-3 py-1 text-base" : "px-2 py-px text-xs"
      } ${provisional ? "border-dashed" : "border-transparent"}`}
    >
      <span aria-hidden>{b.icon}</span>
      {b.label}
      {provisional && <span className="font-normal opacity-75"> · unconfirmed</span>}
    </span>
  );
}
