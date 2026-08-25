import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";
import { IconAlert, IconCheck, IconInfo } from "./icons";

export type ToastKind = "ok" | "info" | "err";

interface Toast {
  id: number;
  kind: ToastKind;
  text: string;
}

type PushFn = (kind: ToastKind, text: string) => void;

const ToastCtx = createContext<PushFn>(() => undefined);

export function useToast(): PushFn {
  return useContext(ToastCtx);
}

const KIND_STYLE: Record<ToastKind, { color: string; Icon: typeof IconCheck }> = {
  ok: { color: "#3ed598", Icon: IconCheck },
  info: { color: "#57b6f5", Icon: IconInfo },
  err: { color: "#f0705a", Icon: IconAlert },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<Toast[]>([]);
  const counter = useRef(0);

  const push = useCallback<PushFn>((kind, text) => {
    const id = ++counter.current;
    setList((l) => [...l.slice(-3), { id, kind, text }]);
    window.setTimeout(() => {
      setList((l) => l.filter((t) => t.id !== id));
    }, 3600);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed left-5 bottom-5 z-[130] flex flex-col gap-2 pointer-events-none">
        {list.map((t) => {
          const { color, Icon } = KIND_STYLE[t.kind];
          return (
            <div
              key={t.id}
              className="anim-toast pointer-events-auto flex items-center gap-2.5 rounded-md border border-line bg-panel2 px-3.5 py-2.5 shadow-[0_14px_38px_-12px_rgba(0,0,0,0.65)] min-w-[230px] max-w-[340px]"
            >
              <span className="shrink-0" style={{ color }}>
                <Icon className="w-4 h-4" />
              </span>
              <span className="text-[13px] leading-snug text-fg">{t.text}</span>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}
