import type { WorkspaceDoc, WorkspaceMeta } from "../types";
import { TYPE_META } from "../types";
import { slugify, uid } from "./store";
import { docToMarkdown, nodeToMarkdown } from "./prompt";
import { pickDirectory, fsSupported } from "./fsdir";

/**
 * Хранение — только файлы, никакой памяти браузера.
 * Два бэкенда:
 *  — server: локальный server.mjs (запускается через start.command), папка ./data рядом с приложением
 *  — fs:     папка, подключённая вручную через File System Access (Chrome/Edge), подпапка ./data
 */

export type Backend =
  | { kind: "server"; base: string; dataPath: string }
  | { kind: "fs"; root: FileSystemDirectoryHandle };

const SERVER_BASES = ["", "http://localhost:4173"];

async function fetchTimeout(url: string, ms: number, init?: RequestInit): Promise<Response> {
  const ctl = new AbortController();
  const t = window.setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctl.signal });
  } finally {
    window.clearTimeout(t);
  }
}

function firstWords(s: string): string {
  return slugify(s.trim().split(/\s+/).slice(0, 3).join("-")).slice(0, 24);
}

/** Все файлы проекта: документ + сводный md + md каждой ноды. */
function buildFiles(doc: WorkspaceDoc): Array<{ name: string; content: string }> {
  const files: Array<{ name: string; content: string }> = [
    { name: "workspace.json", content: JSON.stringify(doc, null, 2) },
    { name: "00-index.md", content: docToMarkdown(doc) },
  ];
  doc.nodes.forEach((n, i) => {
    const num = String(i + 1).padStart(2, "0");
    files.push({
      name: `${num}-${TYPE_META[n.type].file}-${firstWords(n.text) || n.id.slice(0, 6)}.md`,
      content: nodeToMarkdown(n, doc.name),
    });
  });
  return files;
}

/* ---------- определение бэкенда ---------- */

async function tryServer(base: string): Promise<{ dataPath: string } | null> {
  try {
    const r = await fetchTimeout(`${base}/api/projects`, 900);
    if (!r.ok) return null;
    const j = (await r.json()) as { dataPath?: string; projects?: unknown };
    return Array.isArray(j.projects) ? { dataPath: j.dataPath || "data" } : null;
  } catch {
    return null;
  }
}

/** server → fs-папка → ничего. */
export async function detectBackend(): Promise<Backend | "need-folder" | "none"> {
  for (const base of SERVER_BASES) {
    const hit = await tryServer(base);
    if (hit) return { kind: "server", base, dataPath: hit.dataPath };
  }
  return fsSupported() ? "need-folder" : "none";
}

export async function connectFolderBackend(): Promise<Backend | null> {
  const r = await pickDirectory();
  return r ? { kind: "fs", root: r.handle } : null;
}

export function backendLabel(b: Backend): string {
  return b.kind === "server" ? b.dataPath : `папка «${b.root.name}» → data`;
}

/* ---------- CRUD ---------- */

async function fsDataDir(root: FileSystemDirectoryHandle): Promise<FileSystemDirectoryHandle> {
  return root.getDirectoryHandle("data", { create: true });
}

type DirHandle = FileSystemDirectoryHandle & {
  entries(): AsyncIterable<[string, { kind: string }]>;
};

async function readJsonDoc(dir: FileSystemDirectoryHandle): Promise<WorkspaceDoc> {
  const fh = await dir.getFileHandle("workspace.json");
  const file = await (fh as unknown as { getFile(): Promise<File> }).getFile();
  return JSON.parse(await file.text()) as WorkspaceDoc;
}

export async function listProjects(b: Backend): Promise<WorkspaceMeta[]> {
  if (b.kind === "server") {
    const r = await fetchTimeout(`${b.base}/api/projects`, 4000);
    if (!r.ok) throw new Error("server");
    const j = (await r.json()) as { projects: WorkspaceMeta[] };
    return j.projects;
  }
  const data = (await fsDataDir(b.root)) as DirHandle;
  const out: WorkspaceMeta[] = [];
  for await (const [name, h] of data.entries()) {
    if (h.kind !== "directory") continue;
    try {
      const doc = await readJsonDoc(await data.getDirectoryHandle(name));
      out.push({ id: name, name: doc.name, updatedAt: doc.updatedAt, nodeCount: doc.nodes.length });
    } catch {
      /* пропускаем битые папки */
    }
  }
  out.sort((x, y) => y.updatedAt - x.updatedAt);
  return out;
}

export async function loadProject(b: Backend, folder: string): Promise<WorkspaceDoc> {
  if (b.kind === "server") {
    const r = await fetchTimeout(`${b.base}/api/projects/${encodeURIComponent(folder)}`, 5000);
    if (!r.ok) throw new Error("not found");
    return (await r.json()) as WorkspaceDoc;
  }
  const data = await fsDataDir(b.root);
  return readJsonDoc(await data.getDirectoryHandle(folder));
}

export async function saveProject(b: Backend, folder: string, doc: WorkspaceDoc): Promise<void> {
  const files = buildFiles(doc);
  if (b.kind === "server") {
    const r = await fetchTimeout(`${b.base}/api/projects/${encodeURIComponent(folder)}`, 8000, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files }),
    });
    if (!r.ok) throw new Error("save failed");
    return;
  }
  const data = (await fsDataDir(b.root)) as DirHandle;
  const dir = await data.getDirectoryHandle(folder, { create: true });
  const wanted = new Set(files.map((f) => f.name));
  for await (const [name, h] of (dir as DirHandle).entries()) {
    if (h.kind === "file" && /\.(md|json)$/i.test(name) && !wanted.has(name)) {
      try {
        await dir.removeEntry(name);
      } catch {
        /* ignore */
      }
    }
  }
  for (const f of files) {
    const fh = await dir.getFileHandle(f.name, { create: true });
    const w = await (fh as unknown as { createWritable(): Promise<{ write(s: string): Promise<void>; close(): Promise<void> }> }).createWritable();
    await w.write(f.content);
    await w.close();
  }
}

export async function deleteProject(b: Backend, folder: string): Promise<void> {
  if (b.kind === "server") {
    const r = await fetchTimeout(`${b.base}/api/projects/${encodeURIComponent(folder)}`, 5000, {
      method: "DELETE",
    });
    if (!r.ok) throw new Error("delete failed");
    return;
  }
  const data = await fsDataDir(b.root);
  await data.removeEntry(folder, { recursive: true });
}

export async function createProject(
  b: Backend,
  name: string,
): Promise<{ folder: string; doc: WorkspaceDoc }> {
  const folder = `${slugify(name)}--${uid().slice(0, 6)}`;
  const doc: WorkspaceDoc = { name, nodes: [], edges: [], updatedAt: Date.now() };
  await saveProject(b, folder, doc);
  return { folder, doc };
}
