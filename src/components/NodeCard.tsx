import { memo } from "react";
import type { PointerEvent as RPointerEvent } from "react";
import type { NodeData } from "../types";
import { NODE_H, NODE_W, PORT_Y, TYPE_META } from "../types";
import { IconClipboard, IconCopy, IconSend, IconX } from "./icons";

interface Props {
  node: NodeData;
  selected: boolean;
  flash: boolean;
  resizing: boolean;
  onText: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onCopy: (node: NodeData) => void;
  onNodePointerDown: (id: string, e: RPointerEvent) => void;
  onOutDown: (id: string, e: RPointerEvent) => void;
  onInClick: (id: string, sx: number, sy: number) => void;
  onAssemble: (id: string) => void;
  onPaste: (id: string) => void;
  onResizeStart: (id: string, e: RPointerEvent) => void;
  onResizeReset: (id: string) => void;
}

function NodeCard({
  node,
  selected,
  flash,
  resizing,
  onText,
  onDelete,
  onCopy,
  onNodePointerDown,
  onOutDown,
  onInClick,
  onAssemble,
  onPaste,
  onResizeStart,
  onResizeReset,
}: Props) {
  const meta = TYPE_META[node.type];
  const w = node.w ?? NODE_W;
  const h = node.h ?? NODE_H;

  return (
    <div
      data-node={node.id}
      className="absolute group anim-node"
      style={{ left: node.x, top: node.y, width: w, height: h }}
    >
      {/* входная точка */}
      <button
        data-port-in={node.id}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => onInClick(node.id, e.clientX, e.clientY)}
        className="port-pulse absolute z-20 w-4 h-4 rounded-full border-2 bg-abyss transition-transform hover:scale-125 cursor-crosshair"
        style={{ left: -8, top: PORT_Y - 8, borderColor: meta.color, color: meta.color }}
        title="Вход: клик — создать ноду рядом · либо протяните связь с выхода другой ноды"
      />
      {/* выходная точка */}
      <button
        data-port-out={node.id}
        onPointerDown={(e) => {
          e.stopPropagation();
          onOutDown(node.id, e);
        }}
        className="port-pulse absolute z-20 w-4 h-4 rounded-full border-2 bg-abyss transition-transform hover:scale-125 cursor-crosshair"
        style={{ left: w - 8, top: PORT_Y - 8, borderColor: meta.color, color: meta.color }}
        title="Выход: потяните к входной точке другой ноды"
      />

      {/* карточка */}
      <div
        onPointerDown={(e) => onNodePointerDown(node.id, e)}
        className={`h-full flex flex-col rounded-lg border bg-panel overflow-hidden cursor-grab active:cursor-grabbing transition-shadow ${
          flash ? "flash-ring" : ""
        }`}
        style={{
          borderLeft: `3px solid ${meta.color}`,
          borderColor: selected ? meta.color : undefined,
          boxShadow: selected
            ? `0 0 0 1px ${meta.color}66, 0 18px 44px -16px rgba(0,0,0,0.75)`
            : "0 10px 30px -14px rgba(0,0,0,0.65)",
        }}
      >
        {/* шапка */}
        <div
          className="shrink-0 flex items-center gap-2 pl-3 pr-2 border-b border-line/60"
          style={{ height: PORT_Y }}
        >
          <span
            className="w-7 h-7 shrink-0 rounded-md grid place-items-center"
            style={{ background: `${meta.color}1c`, color: meta.color }}
          >
            {node.type === "question" && <IconSend className="w-4 h-4" />}
            {node.type === "system" && (
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M4 7h16M4 12h16M4 17h16" />
                <circle cx="9" cy="7" r="2" fill="currentColor" stroke="none" />
                <circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" />
                <circle cx="7" cy="17" r="2" fill="currentColor" stroke="none" />
              </svg>
            )}
            {node.type === "context" && (
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3.5l8 4-8 4-8-4z" />
                <path d="M4 12.2l8 4 8-4" />
                <path d="M4 16.6l8 4 8-4" />
              </svg>
            )}
            {node.type === "prompt" && (
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
                <path d="M7.5 9.5l3 2.8-3 2.8M12.5 15.5h4" />
              </svg>
            )}
            {node.type === "answer" && <IconClipboard className="w-4 h-4" />}
            {node.type === "note" && (
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 5l4.5 4.5L8.5 20H4v-4.5z" />
                <path d="M12.5 7l4.5 4.5" />
              </svg>
            )}
          </span>
          <span
            className="font-display font-medium text-[9.5px] tracking-[0.14em] uppercase leading-none truncate"
            style={{ color: meta.color }}
          >
            {meta.label}
          </span>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onDelete(node.id)}
            className="ml-auto p-1.5 rounded-md text-dim opacity-0 group-hover:opacity-100 hover:text-ans hover:bg-ans/10 transition"
            title="Удалить ноду (Del)"
          >
            <IconX className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* текст — прокручивается внутри ноды */}
        <textarea
          value={node.text}
          onChange={(e) => onText(node.id, e.target.value)}
          onPointerDown={(e) => e.stopPropagation()}
          placeholder={meta.placeholder}
          spellCheck={false}
          className="flex-1 min-h-0 w-full bg-transparent resize-none outline-none overflow-y-auto text-[13px] leading-relaxed px-3 py-2.5 text-fg placeholder:text-dim/70 select-text"
        />

        {/* подвал */}
        <div className="shrink-0 flex items-center gap-1.5 border-t border-line/60 px-3 py-2">
          <span className="font-mono text-[10px] text-dim tabular-nums">{node.text.length} симв.</span>
          <span className="ml-auto flex items-center gap-1.5">
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onCopy(node)}
              className="p-1.5 rounded-md text-dim hover:text-fg hover:bg-panel2 transition"
              title="Копировать текст ноды"
            >
              <IconCopy className="w-3.5 h-3.5" />
            </button>
            {node.type === "question" && (
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onAssemble(node.id)}
                className="inline-flex items-center gap-1.5 bg-q text-[#241a02] text-[11px] font-bold rounded-md px-2.5 py-1.5 hover:brightness-110 active:scale-95 transition"
                title="Собрать промпт из связанных нод и скопировать в буфер"
              >
                <IconSend className="w-3.5 h-3.5" />
                Собрать промпт
              </button>
            )}
            {node.type === "answer" && (
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onPaste(node.id)}
                className="inline-flex items-center gap-1.5 border border-ans/45 text-ans text-[11px] font-semibold rounded-md px-2.5 py-1.5 hover:bg-ans/10 active:scale-95 transition"
                title="Вставить ответ нейросети из буфера обмена"
              >
                <IconClipboard className="w-3.5 h-3.5" />
                Вставить ответ
              </button>
            )}
          </span>
        </div>
      </div>

      {/* уголок изменения размера */}
      <div
        data-resize={node.id}
        onPointerDown={(e) => {
          e.stopPropagation();
          onResizeStart(node.id, e);
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onResizeReset(node.id);
        }}
        className="absolute z-20 w-[18px] h-[18px] grid place-items-center rounded cursor-nwse-resize text-dim transition-colors"
        style={{ right: -2, bottom: -2, color: resizing ? meta.color : undefined }}
        title="Потянуть — изменить размер · двойной клик — стандартный размер"
      >
        <svg viewBox="0 0 14 14" className="w-[13px] h-[13px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <path d="M12.5 5l-7.5 7.5" />
          <path d="M12.5 9.5L9 13" />
        </svg>
      </div>

      {/* индикатор размера при изменении */}
      {resizing && (
        <div className="absolute -top-7 right-0 z-30 font-mono text-[10px] text-fg bg-panel2 border border-line2 rounded px-1.5 py-0.5 pointer-events-none tabular-nums anim-pop">
          {w}×{h}
        </div>
      )}
    </div>
  );
}

export default memo(NodeCard);
