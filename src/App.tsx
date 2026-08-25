import { useCallback, useState } from "react";
import type { WorkspaceMeta } from "./types";
import { deleteWorkspace, loadMetas, persistDoc, seedIfEmpty, uid, upsertMeta } from "./lib/store";
import { ToastProvider, useToast } from "./components/Toasts";
import EntryScreen from "./components/EntryScreen";
import Board from "./components/Board";

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

export default function App() {
  return (
    <ToastProvider>
      <Shell />
    </ToastProvider>
  );
}
