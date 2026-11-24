import { useEffect, useState } from "react";
import { PageBand } from "../../components/PageBand";
import {
  subscribeLedger,
  subscribeOps,
  type DDLedger,
  type DDOp,
} from "../../lib/deadDropFirebase";
import { formatHLC } from "../../lib/deadDropEngine";

const ITEMS = ["water", "blanket", "boat", "medkit", "food"] as const;
const ACCOUNTS = ["pool:A", "dev:A1", "dev:B1", "dev:C1"] as const;

function KindBadge({ kind }: { kind: string }) {
  const styles: Record<string, string> = {
    MINT: "bg-emerald-100 text-emerald-700 border-emerald-200",
    MOVE: "bg-amber-100 text-amber-700 border-amber-200",
    SET:  "bg-blue-100 text-blue-700 border-blue-200",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase border tracking-wide ${styles[kind] ?? "bg-gray-100 text-gray-700"}`}>
      {kind}
    </span>
  );
}

export default function SupplyLedger() {
  const [ledger, setLedger] = useState<DDLedger[]>([]);
  const [ops, setOps] = useState<DDOp[]>([]);

  useEffect(() => {
    const unsubs = [
      subscribeLedger(setLedger),
      subscribeOps(setOps),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const ledgerMap = Object.fromEntries(ledger.map((l) => [l.account, l.balances]));
  const mintOps = ops.filter((o) => o.kind === "MINT");
  const moveOps = ops.filter((o) => o.kind === "MOVE");

  // Compute totals for a row
  const rowTotal = (item: string) =>
    ACCOUNTS.reduce((sum, acc) => sum + (ledgerMap[acc]?.[item] ?? 0), 0);

  return (
    <div>
      <PageBand
        tone="night"
        title="Supply Ledger"
        subtitle={`${mintOps.length} MINT · ${moveOps.length} MOVE ops`}
      />

      <div className="p-6 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "MINT Ops", value: mintOps.length, color: "#10B981" },
            { label: "MOVE Ops", value: moveOps.length, color: "#F59E0B" },
            { label: "Accounts", value: ACCOUNTS.length, color: "#3B82F6" },
          ].map((c) => (
            <div key={c.label} className="rounded-2xl border border-[#e3eaf0] bg-white p-5">
              <p className="text-xs font-bold tracking-widest uppercase" style={{ color: c.color }}>
                {c.label}
              </p>
              <p className="text-3xl font-black text-[#0b2a3c] mt-1">{c.value}</p>
            </div>
          ))}
        </div>

        {/* Balance Matrix Table */}
        <div className="rounded-2xl border border-[#e3eaf0] bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-[#e3eaf0]">
            <h2 className="text-sm font-black uppercase tracking-widest text-[#0b2a3c]">
              Account Balance Matrix
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#f7fbff] border-b border-[#e3eaf0]">
                  <th className="text-left px-5 py-3 text-xs font-black uppercase tracking-widest text-[#56636b]">
                    Item
                  </th>
                  {ACCOUNTS.map((acc) => (
                    <th key={acc} className="text-right px-4 py-3 text-xs font-black uppercase tracking-widest text-[#56636b]">
                      {acc}
                    </th>
                  ))}
                  <th className="text-right px-5 py-3 text-xs font-black uppercase tracking-widest text-[#0b2a3c]">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f5fa]">
                {ITEMS.map((item) => {
                  const total = rowTotal(item);
                  return (
                    <tr key={item} className="hover:bg-[#fafcff] transition-colors">
                      <td className="px-5 py-3 font-bold capitalize text-[#0b2a3c]">{item}</td>
                      {ACCOUNTS.map((acc) => {
                        const bal = ledgerMap[acc]?.[item] ?? 0;
                        const isLow = bal < 5 && bal >= 0;
                        const isNeg = bal < 0;
                        return (
                          <td
                            key={acc}
                            className={`px-4 py-3 text-right font-mono font-bold ${
                              isNeg
                                ? "text-red-700 bg-red-50"
                                : isLow
                                ? "text-amber-700 bg-amber-50"
                                : "text-[#0b2a3c]"
                            }`}
                          >
                            {bal}
                            {isNeg && " ⚠"}
                            {isLow && !isNeg && " ↓"}
                          </td>
                        );
                      })}
                      <td className="px-5 py-3 text-right font-mono font-black text-[#0b7a75]">
                        {total}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 bg-[#f7fbff] border-t border-[#e3eaf0]">
            <p className="text-xs text-[#56636b]">
              <span className="text-amber-600 font-bold">↓ Low stock</span> ({"<"} 5 units) ·{" "}
              <span className="text-red-600 font-bold">⚠ Overspend</span> (negative balance)
            </p>
          </div>
        </div>

        {/* Transaction Log */}
        <div className="rounded-2xl border border-[#e3eaf0] bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-[#e3eaf0]">
            <h2 className="text-sm font-black uppercase tracking-widest text-[#0b2a3c]">
              MINT & MOVE Transaction Log
            </h2>
          </div>
          <div className="divide-y divide-[#f0f5fa]">
            {[...mintOps, ...moveOps]
              .sort((a, b) => b.hlc - a.hlc)
              .slice(0, 20)
              .map((op) => (
                <div key={op.opId} className="px-5 py-3 flex items-center gap-3">
                  <KindBadge kind={op.kind} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#0b2a3c] truncate">{op.body}</p>
                    <p className="text-[10px] text-[#7a98a8] font-mono mt-0.5">
                      {op.dev} · seq {op.seq} · {formatHLC(op.hlc)}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-[#b4b4b4]">#{op.opId}</span>
                </div>
              ))}
            {mintOps.length + moveOps.length === 0 && (
              <p className="px-5 py-6 text-sm text-[#56636b] text-center">
                No MINT/MOVE ops yet — seed demo data from Command Center
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
