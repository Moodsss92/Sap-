"use client";

import { MD_ETAT_LABEL, compareMd, type MasterData } from "@/lib/masterData";
import { TcodeBadge } from "../ui/Badges";

/** Tableau d'un type de master data : créées d'abord, puis par clé. */
export function MdTable({
  rows,
  stepLabel,
  onEdit,
  onOpenStep,
}: {
  rows: MasterData[];
  stepLabel: (id: string) => string | undefined;
  onEdit: (row: MasterData) => void;
  onOpenStep: (id: string) => void;
}) {
  const sorted = rows.slice().sort(compareMd);
  const th = "px-3 py-2 text-left text-[12px] font-semibold uppercase tracking-wide text-label3";
  return (
    <table className="w-full table-fixed border-collapse">
      <thead className="hairline-b">
        <tr>
          <th className={`${th} w-[130px] pl-4`}>Key</th>
          <th className={th}>Name / description</th>
          <th className={`${th} w-[100px]`}>Copied from</th>
          <th className={`${th} w-[190px]`}>Linked to</th>
          <th className={`${th} w-[96px]`}>T-code</th>
          <th className={`${th} w-[90px]`}>Created by</th>
          <th className={`${th} w-[90px]`}>Status</th>
          <th className={`${th} w-[70px] pr-4`}>
            <span className="sr-only">Actions</span>
          </th>
        </tr>
      </thead>
      <tbody className="[&>tr+tr]:hairline-t">
        {sorted.map((r) => {
          const step = r.step_id ? stepLabel(r.step_id) : undefined;
          return (
            <tr key={r.id} className="align-top">
              <td className="py-2.5 pl-4 pr-3">
                {r.cle ? (
                  <span className="break-words font-mono text-[13.5px] font-semibold text-blue">{r.cle}</span>
                ) : (
                  <span className="text-[13px] italic text-label3">to be defined</span>
                )}
              </td>
              <td className="px-3 py-2.5 text-[14px]">
                <span className="break-words">{r.nom || "—"}</span>
                {r.remarque && <span className="mt-0.5 block break-words text-[12.5px] text-label3">{r.remarque}</span>}
                {step && r.step_id && (
                  <button type="button" onClick={() => onOpenStep(r.step_id!)} className="mt-0.5 block text-left text-[12.5px] text-blue hover:underline">
                    Journal: {step}
                  </button>
                )}
              </td>
              <td className="break-words px-3 py-2.5 text-[13px] text-label3">{r.ref || "—"}</td>
              <td className="break-words px-3 py-2.5 text-[13px]">{r.lien || "—"}</td>
              <td className="px-3 py-2.5">{r.tcode ? <TcodeBadge tcode={r.tcode} /> : <span className="text-label3">—</span>}</td>
              <td className="px-3 py-2.5 text-[13px]">{r.resp || <span className="text-label3">—</span>}</td>
              <td className="px-3 py-2.5">
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-[12px] font-semibold ${
                    r.etat === "cree" ? "bg-green/15 text-green" : "bg-gray/20 text-label3"
                  }`}
                >
                  {MD_ETAT_LABEL[r.etat]}
                </span>
              </td>
              <td className="py-2 pl-1 pr-4 text-right">
                <button type="button" onClick={() => onEdit(r)} className="btn-plain h-7 min-h-0 px-1 text-[13px]">
                  Edit
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
