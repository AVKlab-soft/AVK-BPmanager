import { useCallback, useEffect, useRef, useState } from "react";
import type { WorkspaceMeta } from "./types";
import { ToastProvider, useToast } from "./components/Toasts";
import EntryScreen from "./components/EntryScreen";
import Board from "./components/Board";
import type { Backend } from "./lib/storage";
import {
  backendLabel,
  connectFolderBackend,
  createProject,
  deleteProject,
  detectBackend,
  listProjects,
} from "./lib/storage";

type Stage =
  | { s: "detecting" }
  | { s: "need-folder" }
  | { s: "none" }
  | { s: "ready"; backend: Backend };

function Shell() {
  const [stage, setStage] = useState<Stage>({ s: "detecting" });
  const [projects, setProjects] = useState<WorkspaceMeta[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [openFolder, setOpenFolder] = useState<string | null>(null);
  const toast = useToast();
  const stageRef = useRef(stage);
  stageRef.current = stage;

  const refresh = useCallback(
    async (b: Backend) => {
      setLoadingList(true);
      try {
        setProjects(await listProjects(b));
      } catch {
        toast("err", "Не удалось прочитать список проектов");
      } finally {
        setLoadingList(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      const b = await detectBackend();
      if (!alive) return;
      if (b === "none") return setStage({ s: "none" });
      if (b === "need-folder") return setStage({ s: "need-folder" });
      setStage({ s: "ready", backend: b });
      void refresh(b);
    })();
    return () => {
      alive = false;
    };
  }, [refresh]);

  const connectFolder = useCallback(async () => {
    const b = await connectFolderBackend();
    if (!b || b.kind !== "fs") return;
    setStage({ s: "ready", backend: b });
    toast("ok", `Папка «${b.root.name}» подключена — данные будут в подпапке data`);
    void refresh(b);
  }, [refresh, toast]);

  const create = useCallback(
    async (name: string) => {
      const st = stageRef.current;
      if (st.s !== "ready") return;
      try {
        const { folder } = await createProject(st.backend, name);
        toast("ok", `Проект «${name}» создан на диске`);
        setOpenFolder(folder);
      } catch {
        toast("err", "Не удалось создать проект — проверьте доступ к папке");
      }
    },
    [toast],
  );

  const remove = useCallback(
    async (folder: string) => {
      const st = stageRef.current;
      if (st.s !== "ready") return;
      try {
        await deleteProject(st.backend, folder);
        toast("info", "Проект удалён с диска");
      } catch {
        toast("err", "Не удалось удалить проект");
      }
      void refresh(st.backend);
    },
    [refresh, toast],
  );

  const back = useCallback(() => {
    setOpenFolder(null);
    const st = stageRef.current;
    if (st.s === "ready") void refresh(st.backend);
  }, [refresh]);

  const openProject = openFolder ? (projects.find((p) => p.id === openFolder) ?? null) : null;

  if (stage.s === "ready" && openFolder) {
    return (
      <Board
        key={openFolder}
        backend={stage.backend}
        folder={openFolder}
        initialName={openProject?.name ?? openFolder}
        storageLabel={backendLabel(stage.backend)}
        onBack={back}
      />
    );
  }

  return (
    <EntryScreen
      mode={stage.s === "ready" ? "ready" : stage.s}
      backendInfo={stage.s === "ready" ? backendLabel(stage.backend) : null}
      projects={projects}
      loading={loadingList}
      onConnect={() => void connectFolder()}
      onOpen={setOpenFolder}
      onCreate={(n) => void create(n)}
      onDelete={(f) => void remove(f)}
    />
  );
}

export default function App() {
  return (
    <ToastProvider>
      <Shell />
    </ToastProvider>
  );
}
