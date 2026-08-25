import type React from "react";
import type { NodeType } from "../types";
import { PALETTE_ORDER, TYPE_META } from "../types";
import { TypeIcon } from "./icons";

interface Props {
  onDragStart: (type: NodeType, e: React.PointerEvent) => void;
}

export default function Palette({ onDragStart }: Props) {
  return (
    <aside className="w-[248px] shrink-0 border-l border-line bg-panel flex flex-col min-h-0 select-none">
      <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-line/70">
        <h3 className="font-display font-medium text-[11px] tracking-[0.16em] uppercase text-mut">Элементы</h3>
        <span className="font-mono text-[10px] text-dim">{PALETTE_ORDER.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {PALETTE_ORDER.map((t) => {
          const meta = TYPE_META[t];
          return (
            <div
              key={t}
              onPointerDown={(e) => onDragStart(t, e)}
              className="group flex items-center gap-3 border border-line bg-panel2 rounded-md p-2.5 cursor-grab active:cursor-grabbing hover:border-line2 hover:-translate-y-[2px] hover:shadow-[0_10px_26px_-14px_rgba(0,0,0,0.9)] transition-all"
              style={{ touchAction: "none" }}
              title="Перетащите на доску или просто кликните"
            >
              <span
                className="w-9 h-9 shrink-0 rounded-md grid place-items-center transition-transform group-hover:scale-105"
                style={{ background: `${meta.color}1c`, color: meta.color }}
              >
                <TypeIcon type={t} className="w-[18px] h-[18px]" />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold leading-tight">{meta.label}</span>
                <span className="block text-[10.5px] text-dim leading-tight mt-0.5">{meta.hint}</span>
              </span>
              <span
                className="ml-auto w-1.5 h-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: meta.color }}
              />
            </div>
          );
        })}
      </div>

      <div className="border-t border-line/70 px-4 py-3 space-y-1.5">
        <p className="text-[10.5px] text-dim leading-relaxed">
          Перетащите ноду на доску — или кликните, чтобы добавить в центр.
        </p>
        <div className="flex flex-wrap gap-1.5 font-mono text-[10px] text-dim">
          <span className="border border-line rounded px-1.5 py-0.5">Del — удалить</span>
          <span className="border border-line rounded px-1.5 py-0.5">Esc — отмена</span>
          <span className="border border-line rounded px-1.5 py-0.5">клик по входу → связь</span>
        </div>
      </div>
    </aside>
  );
}
