import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as RPointerEvent } from "react";
import type { EdgeData, NodeData, NodeType, WorkspaceDoc } from "../types";
import { NODE_W, PORT_Y, QUICK_TYPES, TYPE_META } from "../types";
import { loadDoc, persistDoc, uid, upsertMeta } from "../lib/store";
import { buildPrompt } from "../lib/prompt";
import { copyText, downloadMarkdown, fsSupported, pickDirectory, syncToDirectory } from "../lib/fsdir";
import { useToast } from "./Toasts";
import NodeCard from "./NodeCard";
import Palette from "./Palette";
import {
  IconBack,
  IconDownload,
  IconFit,
  IconFolder,
  IconMinus,
  IconPlus,
  IconTrash,
  IconX,
  LogoMark,
  TypeIcon,
} from "./icons";

interface Cam {
  x: number;
  y: number;
  z: number;
}

interface Props {
  wsId: string;
  initialName: string;
  onBack: () => void;
}

type Interaction =
  | { mode: "pan"; sx: number; sy: number; cx: number; cy: number }
  | { mode: "node"; id: string; dx: number; dy: number }
  | { mode: "palette"; type: NodeType; moved: boolean; sx: number; sy: number };

const MIN_Z = 0.35;
const MAX_Z = 2.5;

function edgePath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = Math.max(44, Math.min(150, Math.abs(x2 - x1) / 2));
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

export default function Board({ wsId, initialName, onBack }: Props) {
  const toast = useToast();

  const [doc, setDoc] = useState<WorkspaceDoc>(
    () => loadDoc(wsId) ?? { name: initialName, nodes: [], edges: [], updatedAt: Date.now() },
  );
  const [cam, setCam] = useState<Cam>({ x: 140, y: 110, z: 1 });
  const [sel, setSel] = useState<{ kind: "node" | "edge"; id: string } | null>(null);
  const [pending, setPending] = useState<{ from: string; x: number; y: number } | null>(null);
  const [quick, setQuick] = useState<{ nodeId: string; sx: number; sy: number } | null>(null);
  const [ghost, setGhost] = useState<{ type: NodeType } | null>(null);
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");
  const [dirName, setDirName] = useState<string | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const ghostElRef = useRef<HTMLDivElement>(null);
  const interRef = useRef<Interaction | null>(null);
  const dirHandleRef = useRef<FileSystemDirectoryHandle | null>(null);
  const suppressQuickRef = useRef(false);

  const docRef = useRef(doc);
  const camRef = useRef(cam);
  const pendingRef = useRef(pending);
  useEffect(() => {
    docRef.current = doc;
  }, [doc]);
  useEffect(() => {
    camRef.current = cam;
  }, [cam]);
  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  const screenToWorld = useCallback((clientX: number, clientY: number) => {
    const r = wrapRef.current?.getBoundingClientRect();
    const c = camRef.current;
    if (!r) return { x: 0, y: 0 };
    return { x: (clientX - r.left - c.x) / c.z, y: (clientY - r.top - c.y) / c.z };
  }, []);

  /* ---------- изменения документа ---------- */

  const mutate = useCallback((fn: (d: WorkspaceDoc) => WorkspaceDoc) => {
    setDoc((d) => ({ ...fn(d), updatedAt: Date.now() }));
  }, []);

  const addNode = useCallback(
    (type: NodeType, x: number, y: number, text = ""): string => {
      const id = uid();
      mutate((d) => ({ ...d, nodes: [...d.nodes, { id, type, x: Math.round(x), y: Math.round(y), text }] }));
      setSel({ kind: "node", id });
      return id;
    },
    [mutate],
  );

  const addEdge = useCallback(
    (from: string, to: string) => {
      mutate((d) => {
        if (from === to || d.edges.some((e) => e.from === from && e.to === to)) return d;
        return { ...d, edges: [...d.edges, { id: uid(), from, to }] };
      });
    },
    [mutate],
  );

  const deleteNode = useCallback(
    (id: string) => {
      mutate((d) => ({
        ...d,
        nodes: d.nodes.filter((n) => n.id !== id),
        edges: d.edges.filter((e) => e.from !== id && e.to !== id),
      }));
      setSel((s) => (s && s.kind === "node" && s.id === id ? null : s));
    },
    [mutate],
  );

  const deleteEdge = useCallback(
    (id: string) => {
      mutate((d) => ({ ...d, edges: d.edges.filter((e) => e.id !== id) }));
      setSel((s) => (s && s.kind === "edge" && s.id === id ? null : s));
    },
    [mutate],
  );

  /* ---------- автосохранение + .md ---------- */

  useEffect(() => {
    setSaveState("saving");
    const t = window.setTimeout(() => {
      persistDoc(wsId, docRef.current);
      upsertMeta({
        id: wsId,
        name: docRef.current.name,
        updatedAt: docRef.current.updatedAt,
        nodeCount: docRef.current.nodes.length,
      });
      setSaveState("saved");
      if (dirHandleRef.current) {
        syncToDirectory(dirHandleRef.current, docRef.current).catch(() => undefined);
      }
    }, 650);
    return () => window.clearTimeout(t);
  }, [doc, wsId]);

  /* ---------- зум колесом ---------- */

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const sx = e.clientX - r.left;
      const sy = e.clientY - r.top;
      setCam((c) => {
        const z = Math.min(MAX_Z, Math.max(MIN_Z, c.z * Math.exp(-e.deltaY * 0.0012)));
        const wx = (sx - c.x) / c.z;
        const wy = (sy - c.y) / c.z;
        return { x: sx - wx * z, y: sy - wy * z, z };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  /* ---------- клавиатура ---------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.tagName === "TEXTAREA" || t.tagName === "INPUT" || t.isContentEditable);
      if (e.key === "Escape") {
        setPending(null);
        setQuick(null);
        setSel(null);
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && !typing && sel) {
        e.preventDefault();
        if (sel.kind === "node") deleteNode(sel.id);
        else deleteEdge(sel.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sel, deleteNode, deleteEdge]);

  /* ---------- глобальные pointer-обработчики ---------- */

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (pendingRef.current) {
        const w = screenToWorld(e.clientX, e.clientY);
        setPending((p) => (p ? { ...p, x: w.x, y: w.y } : p));
      }
      const it = interRef.current;
      if (!it) return;
      if (it.mode === "pan") {
        setCam((c) => ({ ...c, x: it.cx + e.clientX - it.sx, y: it.cy + e.clientY - it.sy }));
      } else if (it.mode === "node") {
        const w = screenToWorld(e.clientX, e.clientY);
        mutate((d) => ({
          ...d,
          nodes: d.nodes.map((n) =>
            n.id === it.id ? { ...n, x: Math.round(w.x - it.dx), y: Math.round(w.y - it.dy) } : n,
          ),
        }));
      } else if (it.mode === "palette") {
        if (!it.moved && Math.hypot(e.clientX - it.sx, e.clientY - it.sy) > 6) it.moved = true;
        const g = ghostElRef.current;
        if (g) {
          g.style.left = `${e.clientX}px`;
          g.style.top = `${e.clientY}px`;
        }
      }
    };

    const up = (e: PointerEvent) => {
      // завершение связи
      if (pendingRef.current) {
        const from = pendingRef.current.from;
        setPending(null);
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const inEl = el ? (el.closest("[data-port-in]") as HTMLElement | null) : null;
        if (inEl) {
          const to = inEl.getAttribute("data-port-in");
          if (to && to !== from) {
            const d = docRef.current;
            if (d.edges.some((ed) => ed.from === from && ed.to === to)) {
              toast("info", "Такая связь уже есть");
            } else {
              addEdge(from, to);
            }
          }
          suppressQuickRef.current = true;
          window.setTimeout(() => {
            suppressQuickRef.current = false;
          }, 80);
        }
      }

      const it = interRef.current;
      interRef.current = null;
      document.body.style.cursor = "";
      if (!it) return;

      if (it.mode === "palette") {
        setGhost(null);
        const r = wrapRef.current?.getBoundingClientRect();
        if (r && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
          const w = screenToWorld(e.clientX, e.clientY);
          addNode(it.type, w.x - NODE_W / 2, w.y - 46);
        } else if (!it.moved) {
          // просто клик по элементу палитры — добавить в центр доски
          if (r) {
            const w = screenToWorld(r.left + r.width / 2, r.top + r.height / 2);
            addNode(it.type, w.x - NODE_W / 2 + Math.random() * 40 - 20, w.y - 60 + Math.random() * 40 - 20);
          }
        }
      }
    };

    const cancel = () => {
      interRef.current = null;
      setPending(null);
      setGhost(null);
      document.body.style.cursor = "";
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
    };
  }, [screenToWorld, mutate, addEdge, addNode, toast]);

  /* ---------- стартовая камера ---------- */

  const fitView = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const ns = docRef.current.nodes;
    if (ns.length === 0) {
      setCam({ x: r.width * 0.3, y: r.height * 0.3, z: 1 });
      return;
    }
    const pad = 90;
    const minX = Math.min(...ns.map((n) => n.x)) - pad;
    const minY = Math.min(...ns.map((n) => n.y)) - pad;
    const maxX = Math.max(...ns.map((n) => n.x + NODE_W)) + pad;
    const maxY = Math.max(...ns.map((n) => n.y + 200)) + pad;
    const z = Math.min(1.15, Math.max(MIN_Z, Math.min(r.width / (maxX - minX), r.height / (maxY - minY))));
    setCam({
      x: (r.width - (maxX - minX) * z) / 2 - minX * z,
      y: (r.height - (maxY - minY) * z) / 2 - minY * z,
      z,
    });
  }, []);

  useLayoutEffect(() => {
    fitView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const zoomBy = useCallback((f: number) => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const sx = r.width / 2;
    const sy = r.height / 2;
    setCam((c) => {
      const z = Math.min(MAX_Z, Math.max(MIN_Z, c.z * f));
      const wx = (sx - c.x) / c.z;
      const wy = (sy - c.y) / c.z;
      return { x: sx - wx * z, y: sy - wy * z, z };
    });
  }, []);

  /* ---------- обработчики нод ---------- */

  const onBgPointerDown = useCallback(
    (e: RPointerEvent) => {
      if (e.button !== 0) return;
      setSel(null);
      setQuick(null);
      interRef.current = { mode: "pan", sx: e.clientX, sy: e.clientY, cx: camRef.current.x, cy: camRef.current.y };
    },
    [],
  );

  const onNodePointerDown = useCallback(
    (id: string, e: RPointerEvent) => {
      if (e.button !== 0) return;
      const t = e.target as HTMLElement;
      if (t.closest("textarea, button, [data-port-in], [data-port-out]")) return;
      e.stopPropagation();
      setSel({ kind: "node", id });
      setQuick(null);
      const n = docRef.current.nodes.find((x) => x.id === id);
      if (!n) return;
      const w = screenToWorld(e.clientX, e.clientY);
      interRef.current = { mode: "node", id, dx: w.x - n.x, dy: w.y - n.y };
      document.body.style.cursor = "grabbing";
    },
    [screenToWorld],
  );

  const onOutDown = useCallback(
    (id: string, e: RPointerEvent) => {
      if (e.button !== 0) return;
      const w = screenToWorld(e.clientX, e.clientY);
      setPending({ from: id, x: w.x, y: w.y });
    },
    [screenToWorld],
  );

  const onInClick = useCallback((id: string, sx: number, sy: number) => {
    if (suppressQuickRef.current) return;
    setQuick((q) => (q && q.nodeId === id ? null : { nodeId: id, sx, sy }));
  }, []);

  const quickRef = useRef(quick);
  useEffect(() => {
    quickRef.current = quick;
  }, [quick]);

  const quickCreate = useCallback(
    (type: NodeType) => {
      const q = quickRef.current;
      setQuick(null);
      if (!q) return;
      const d = docRef.current;
      const target = d.nodes.find((n) => n.id === q.nodeId);
      if (!target) return;
      const k = d.edges.filter((e) => e.to === target.id).length;
      const nx = target.x - NODE_W - 96 + Math.round(Math.random() * 24 - 12);
      const ny = target.y - 150 + k * 150 + Math.round(Math.random() * 20 - 10);
      const nid = uid();
      mutate((dd) => ({
        ...dd,
        nodes: [...dd.nodes, { id: nid, type, x: nx, y: ny, text: "" }],
        edges: [...dd.edges, { id: uid(), from: nid, to: target.id }],
      }));
      setSel({ kind: "node", id: nid });
    },
    [mutate],
  );

  const onText = useCallback(
    (id: string, text: string) => {
      mutate((d) => ({ ...d, nodes: d.nodes.map((n) => (n.id === id ? { ...n, text } : n)) }));
    },
    [mutate],
  );

  const onCopyNode = useCallback(
    (node: NodeData) => {
      if (!node.text.trim()) {
        toast("info", "Нода пуста — копировать нечего");
        return;
      }
      void copyText(node.text).then((ok) =>
        ok ? toast("ok", "Текст ноды скопирован") : toast("err", "Не удалось скопировать"),
      );
    },
    [toast],
  );

  /* ---------- сборка промпта ---------- */

  const assemble = useCallback(
    (id: string) => {
      const d = docRef.current;
      const text = buildPrompt(d, id);
      if (!text.trim()) {
        toast("info", "Вопрос пуст — нечего собирать");
        return;
      }
      void copyText(text).then((ok) => {
        if (ok) toast("ok", `Промпт скопирован · ${text.length} симв.`);
        else toast("err", "Не удалось скопировать в буфер");
      });
      const q = d.nodes.find((n) => n.id === id);
      if (!q) return;
      const existingAnswer = d.edges
        .filter((e) => e.from === id)
        .map((e) => d.nodes.find((n) => n.id === e.to))
        .find((n) => n?.type === "answer");
      if (existingAnswer) {
        setFlashId(existingAnswer.id);
        window.setTimeout(() => setFlashId(null), 1700);
        toast("info", "Нода ответа уже связана — вставьте ответ туда");
      } else {
        const aid = uid();
        mutate((dd) => ({
          ...dd,
          nodes: [...dd.nodes, { id: aid, type: "answer", x: q.x + NODE_W + 130, y: q.y, text: "" }],
          edges: [...dd.edges, { id: uid(), from: id, to: aid }],
        }));
        toast("info", "Создана нода для ответа нейросети");
      }
    },
    [mutate, toast],
  );

  const pasteAnswer = useCallback(
    (id: string) => {
      navigator.clipboard
        .readText()
        .then((t) => {
          if (!t.trim()) {
            toast("info", "Буфер обмена пуст");
            return;
          }
          mutate((d) => ({ ...d, nodes: d.nodes.map((n) => (n.id === id ? { ...n, text: t } : n)) }));
          toast("ok", "Ответ вставлен в ноду");
        })
        .catch(() => toast("err", "Браузер не дал доступ к буферу — вставьте вручную (Ctrl+V)"));
    },
    [mutate, toast],
  );

  /* ---------- палитра ---------- */

  const onPaletteDown = useCallback((type: NodeType, e: RPointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    interRef.current = { mode: "palette", type, moved: false, sx: e.clientX, sy: e.clientY };
    setGhost({ type });
  }, []);

  useLayoutEffect(() => {
    const g = ghostElRef.current;
    const it = interRef.current;
    if (g && it && it.mode === "palette") {
      g.style.left = `${it.sx}px`;
      g.style.top = `${it.sy}px`;
    }
  }, [ghost]);

  /* ---------- папка с .md ---------- */

  const connectDir = useCallback(async () => {
    if (!fsSupported()) {
      toast("info", "Этот браузер не даёт доступ к папкам. Данные в localStorage, экспорт — кнопкой «Экспорт .md».");
      return;
    }
    const r = await pickDirectory();
    if (!r) return;
    dirHandleRef.current = r.handle;
    setDirName(r.name);
    try {
      const count = await syncToDirectory(r.handle, docRef.current);
      toast("ok", `Папка «${r.name}»: записано ${count} .md-файлов`);
    } catch {
      toast("err", "Не удалось записать .md — проверьте права на папку");
    }
  }, [toast]);

  const exportMd = useCallback(() => {
    downloadMarkdown(docRef.current);
    toast("ok", "Сводный .md скачан");
  }, [toast]);

  /* ---------- рендер-данные ---------- */

  const nodeById = useMemo(() => new Map(doc.nodes.map((n) => [n.id, n])), [doc.nodes]);

  const edgeGeom = useCallback(
    (e: EdgeData) => {
      const a = nodeById.get(e.from);
      const b = nodeById.get(e.to);
      if (!a || !b) return null;
      return { x1: a.x + NODE_W, y1: a.y + PORT_Y, x2: b.x, y2: b.y + PORT_Y };
    },
    [nodeById],
  );

  const selEdgeMid = useMemo(() => {
    if (!sel || sel.kind !== "edge") return null;
    const e = doc.edges.find((x) => x.id === sel.id);
    if (!e) return null;
    const g = edgeGeom(e);
    if (!g) return null;
    return { x: (g.x1 + g.x2) / 2, y: (g.y1 + g.y2) / 2 };
  }, [sel, doc.edges, edgeGeom]);

  const pendingSrc = pending ? nodeById.get(pending.from) : null;

  return (
    <div className="h-screen flex flex-col bg-abyss text-fg overflow-hidden select-none">
      {/* -------- верхняя панель -------- */}
      <header className="h-14 shrink-0 border-b border-line bg-panel flex items-center gap-3 px-4 z-40">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-mut hover:text-fg border border-line rounded-md px-2.5 py-1.5 hover:border-line2 transition"
        >
          <IconBack className="w-4 h-4" />
          <span className="hidden sm:inline">Пространства</span>
        </button>

        <span className="w-px h-6 bg-line" />
        <LogoMark className="w-6 h-6 shrink-0" />
        <input
          value={doc.name}
          onChange={(e) => mutate((d) => ({ ...d, name: e.target.value }))}
          onPointerDown={(e) => e.stopPropagation()}
          maxLength={48}
          spellCheck={false}
          className="font-display font-medium text-[13px] tracking-wide bg-transparent border border-transparent hover:border-line focus:border-line2 rounded-md px-2 py-1 outline-none w-[210px] transition-colors select-text"
          title="Название пространства"
        />

        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-dim">
          <span
            className={`w-1.5 h-1.5 rounded-full ${saveState === "saving" ? "bg-q blink-soft" : "bg-ctx"}`}
          />
          {saveState === "saving" ? "сохранение…" : "сохранено"}
        </span>

        <span className="ml-auto flex items-center gap-2">
          <button
            onClick={() => void connectDir()}
            className={`inline-flex items-center gap-1.5 text-[12px] font-medium border rounded-md px-2.5 py-1.5 transition max-w-[220px] ${
              dirName
                ? "text-ctx border-ctx/40 hover:bg-ctx/10"
                : "text-mut border-line hover:text-fg hover:border-line2"
            }`}
            title="Записывать .md-файлы доски в выбранную папку на диске"
          >
            <IconFolder className="w-4 h-4 shrink-0" />
            {dirName ? (
              <span className="truncate">{dirName}</span>
            ) : (
              <span className="hidden md:inline">Подключить папку</span>
            )}
          </button>
          <button
            onClick={exportMd}
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-mut border border-line rounded-md px-2.5 py-1.5 hover:text-fg hover:border-line2 transition"
            title="Скачать доску одним .md-файлом"
          >
            <IconDownload className="w-4 h-4" />
            <span className="hidden md:inline">Экспорт .md</span>
          </button>
        </span>
      </header>

      {/* -------- доска + палитра -------- */}
      <div className="flex-1 flex min-h-0">
        <div
          ref={wrapRef}
          onPointerDown={onBgPointerDown}
          className="relative flex-1 min-w-0 overflow-hidden cursor-grab board-dots"
          style={{
            touchAction: "none",
            backgroundSize: `${24 * cam.z}px ${24 * cam.z}px`,
            backgroundPosition: `${cam.x}px ${cam.y}px`,
          }}
        >
          {/* мягкая подсветка и зерно */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(700px 460px at 18% 12%, rgba(246,184,61,0.05), transparent 62%), radial-gradient(760px 500px at 85% 88%, rgba(87,182,245,0.055), transparent 62%)",
            }}
          />
          <div className="absolute inset-0 noise-layer pointer-events-none" />

          {/* мировой слой */}
          <div
            className="absolute top-0 left-0"
            style={{
              transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.z})`,
              transformOrigin: "0 0",
              willChange: "transform",
            }}
          >
            <svg className="absolute top-0 left-0 overflow-visible" width="1" height="1">
              {doc.edges.map((e) => {
                const g = edgeGeom(e);
                if (!g) return null;
                const src = nodeById.get(e.from);
                const color = src ? TYPE_META[src.type].color : "#96a8c8";
                const isSel = sel?.kind === "edge" && sel.id === e.id;
                const d = edgePath(g.x1, g.y1, g.x2, g.y2);
                return (
                  <g key={e.id} onPointerDown={(ev) => {
                    ev.stopPropagation();
                    setSel({ kind: "edge", id: e.id });
                    setQuick(null);
                  }}>
                    <path d={d} stroke="transparent" strokeWidth={16} fill="none" style={{ pointerEvents: "stroke" }} />
                    {isSel && <path d={d} stroke={color} strokeWidth={7} opacity={0.16} fill="none" />}
                    <path
                      d={d}
                      stroke={color}
                      strokeWidth={isSel ? 2.4 : 1.8}
                      opacity={isSel ? 1 : 0.72}
                      fill="none"
                      style={{ pointerEvents: "stroke" }}
                    />
                    {isSel && <path d={d} stroke="#e9eef8" strokeWidth={1.1} opacity={0.55} fill="none" className="edge-flow" />}
                    <circle cx={g.x1} cy={g.y1} r={3.2} fill={color} />
                    <circle cx={g.x2} cy={g.y2} r={3.2} fill={color} />
                  </g>
                );
              })}
              {pending && pendingSrc && (
                <path
                  d={edgePath(pendingSrc.x + NODE_W, pendingSrc.y + PORT_Y, pending.x, pending.y)}
                  stroke={TYPE_META[pendingSrc.type].color}
                  strokeWidth={2}
                  strokeDasharray="6 6"
                  opacity={0.9}
                  fill="none"
                  className="edge-flow"
                  style={{ pointerEvents: "none" }}
                />
              )}
            </svg>

            {doc.nodes.map((n) => (
              <NodeCard
                key={n.id}
                node={n}
                selected={sel?.kind === "node" && sel.id === n.id}
                flash={flashId === n.id}
                onText={onText}
                onDelete={deleteNode}
                onCopy={onCopyNode}
                onNodePointerDown={onNodePointerDown}
                onOutDown={onOutDown}
                onInClick={onInClick}
                onAssemble={assemble}
                onPaste={pasteAnswer}
              />
            ))}
          </div>

          {/* подсказка на пустой доске */}
          {doc.nodes.length === 0 && (
            <div className="absolute inset-0 grid place-items-center pointer-events-none">
              <div className="text-center max-w-sm px-6 anim-fade">
                <LogoMark className="w-10 h-10 mx-auto opacity-80 anim-float" />
                <div className="font-display font-medium text-lg text-mut mt-4">Доска пуста</div>
                <p className="text-[13px] text-dim mt-2 leading-relaxed">
                  Перетащите ноду «Вопрос» с панели справа — с неё начинается сборка промпта.
                  <br />
                  Колесо мыши — масштаб, пустое место — панорама.
                </p>
              </div>
            </div>
          )}

          {/* кнопка удаления выбранной связи */}
          {selEdgeMid && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => sel && sel.kind === "edge" && deleteEdge(sel.id)}
              className="absolute z-30 w-6 h-6 -translate-x-1/2 -translate-y-1/2 rounded-full border border-ans/50 bg-panel2 text-ans grid place-items-center hover:bg-ans/15 anim-pop"
              style={{ left: selEdgeMid.x * cam.z + cam.x, top: selEdgeMid.y * cam.z + cam.y }}
              title="Удалить связь (Del)"
            >
              <IconX className="w-3 h-3" />
            </button>
          )}

          {/* зум-контролы */}
          <div className="absolute left-4 bottom-4 z-30 flex flex-col items-stretch gap-1 anim-fade">
            <div className="flex flex-col border border-line bg-panel/95 rounded-md overflow-hidden shadow-lg">
              <button onClick={() => zoomBy(1.25)} className="p-2 text-mut hover:text-fg hover:bg-panel2 transition" title="Приблизить">
                <IconPlus className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCam((c) => ({ ...c, z: 1 }))}
                className="px-1 py-1 font-mono text-[10px] text-dim hover:text-fg border-y border-line/70 transition tabular-nums"
                title="Масштаб 100%"
              >
                {Math.round(cam.z * 100)}%
              </button>
              <button onClick={() => zoomBy(0.8)} className="p-2 text-mut hover:text-fg hover:bg-panel2 transition" title="Отдалить">
                <IconMinus className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={fitView}
              className="p-2 border border-line bg-panel/95 rounded-md text-mut hover:text-fg hover:bg-panel2 transition shadow-lg grid place-items-center"
              title="Показать всё (вписать в экран)"
            >
              <IconFit className="w-4 h-4" />
            </button>
          </div>

          {/* статистика доски */}
          <div className="absolute right-4 bottom-4 z-20 font-mono text-[10px] text-dim pointer-events-none">
            {doc.nodes.length} нод · {doc.edges.length} связей
          </div>
        </div>

        <Palette onDragStart={onPaletteDown} />
      </div>

      {/* -------- быстрое создание из входной точки -------- */}
      {quick && (
        <div
          className="fixed z-[110] anim-pop"
          style={{ left: Math.min(quick.sx, window.innerWidth - 230), top: Math.min(quick.sy, window.innerHeight - 240) }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="w-[218px] border border-line bg-panel2 rounded-lg shadow-[0_24px_60px_-18px_rgba(0,0,0,0.85)] overflow-hidden">
            <div className="px-3 pt-2.5 pb-1.5 text-[10px] font-mono text-dim tracking-wide">
              создать и связать со входом
            </div>
            {QUICK_TYPES.map((t) => {
              const m = TYPE_META[t];
              return (
                <button
                  key={t}
                  onClick={() => quickCreate(t)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-panel transition group"
                >
                  <span
                    className="w-7 h-7 shrink-0 rounded-md grid place-items-center transition-transform group-hover:scale-110"
                    style={{ background: `${m.color}1c`, color: m.color }}
                  >
                    <TypeIcon type={t} className="w-4 h-4" />
                  </span>
                  <span>
                    <span className="block text-[12.5px] font-semibold leading-tight">{m.label}</span>
                    <span className="block text-[10px] text-dim leading-tight">{m.hint}</span>
                  </span>
                </button>
              );
            })}
            <button
              onClick={() => setQuick(null)}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 border-t border-line/70 text-[10.5px] font-mono text-dim hover:text-fg transition"
            >
              <IconTrash className="w-3 h-3" />
              отмена (Esc)
            </button>
          </div>
        </div>
      )}

      {/* -------- призрак перетаскивания из палитры -------- */}
      {ghost && (
        <div ref={ghostElRef} className="fixed z-[120] pointer-events-none -translate-x-1/2 -translate-y-1/2" style={{ left: -200, top: -200 }}>
          <div
            className="w-[210px] border rounded-md px-3 py-2.5 flex items-center gap-2.5 shadow-[0_18px_46px_-14px_rgba(0,0,0,0.85)] bg-panel2"
            style={{ borderColor: TYPE_META[ghost.type].color }}
          >
            <span
              className="w-7 h-7 shrink-0 rounded-md grid place-items-center"
              style={{ background: `${TYPE_META[ghost.type].color}1c`, color: TYPE_META[ghost.type].color }}
            >
              <TypeIcon type={ghost.type} className="w-4 h-4" />
            </span>
            <span className="text-[12.5px] font-semibold">{TYPE_META[ghost.type].label}</span>
          </div>
        </div>
      )}
    </div>
  );
}
