import { Component, useCallback, useState } from "react";
import type { ErrorInfo, ReactNode } from "react";
import type { WorkspaceMeta } from "./types";
import { deleteWorkspace, loadMetas, persistDoc, seedIfEmpty, uid, upsertMeta } from "./lib/store";
import { ToastProvider, useToast } from "./components/Toasts";
import EntryScreen from "./components/EntryScreen";
import Board from "./components/Board";
import { LogoMark } from "./components/icons";

function Shell() {
  const [metas, setMetas] = useState<WorkspaceMeta[]>(() => seedIfEmpty());
  const [openId, setOpenId] = useState<string | null>(null);
  const toast = useToast();

  const create = useCallback(
    (name: string) => {
      const id = uid();
      persistDoc(id, { name, nodes: [], edges: [], updatedAt: Date.now() });
      upsertMeta({ id, name, updatedAt: Date.now(), nodeCount: 0 });
      setMetas(loadMetas());
      setOpenId(id);
      toast("ok", `Пространство «${name}» создано`);
    },
    [toast],
  );

  const remove = useCallback(
    (id: string) => {
      deleteWorkspace(id);
      setMetas(loadMetas());
      toast("info", "Пространство удалено");
    },
    [toast],
  );

  const back = useCallback(() => {
    setMetas(loadMetas());
    setOpenId(null);
  }, []);

  const open = metas.find((m) => m.id === openId) ?? null;

  if (open) {
    return <Board key={open.id} wsId={open.id} initialName={open.name} onBack={back} />;
  }
  return <EntryScreen metas={metas} onOpen={setOpenId} onCreate={create} onDelete={remove} />;
}

/** Чтобы ошибка в рантайме показывалась сообщением, а не белым экраном. */
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Узел: ошибка интерфейса", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-abyss text-fg flex items-center justify-center p-6">
          <div className="max-w-md w-full border border-line bg-panel rounded-lg p-7 anim-pop">
            <div className="flex items-center gap-3">
              <LogoMark className="w-9 h-9" />
              <div>
                <div className="font-display font-bold text-lg leading-tight">Что-то развязалось</div>
                <div className="font-mono text-[11px] text-dim">внутренняя ошибка «Узла»</div>
              </div>
            </div>
            <pre className="mt-5 text-[11.5px] leading-relaxed text-mut bg-deep border border-line rounded-md p-3.5 overflow-x-auto whitespace-pre-wrap">
              {String(this.state.error?.message ?? this.state.error)}
            </pre>
            <p className="mt-4 text-[12.5px] text-dim leading-relaxed">
              Данные досок хранятся в localStorage браузера и не пострадали. Перезагрузите страницу — если ошибка
              повторяется, откройте приложение в другом браузере и напишите, что вывела эта плашка.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-5 w-full bg-q text-[#241a02] font-semibold text-[13px] rounded-md px-4 py-2.5 hover:brightness-110 active:scale-[0.98] transition"
            >
              Перезагрузить страницу
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </ErrorBoundary>
  );
}
