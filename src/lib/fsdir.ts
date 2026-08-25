import type { WorkspaceDoc } from "../types";
import { TYPE_META } from "../types";
import { docToMarkdown, nodeToMarkdown } from "./prompt";
import { slugify } from "./store";

export function fsSupported(): boolean {
  return typeof (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker === "function";
}

export async function pickDirectory(): Promise<{ handle: FileSystemDirectoryHandle; name: string } | null> {
  try {
    const w = window as unknown as {
      showDirectoryPicker: (opts?: { mode?: string }) => Promise<FileSystemDirectoryHandle>;
    };
    const handle = await w.showDirectoryPicker({ mode: "readwrite" });
    return { handle, name: handle.name };
  } catch {
    return null; // пользователь отменил или API недоступен
  }
}

function firstWords(s: string): string {
  return slugify(s.trim().split(/\s+/).slice(0, 3).join("-")).slice(0, 24);
}

/**
 * Записывает доску в подпапку рабочей директории:
 * 00-index.md + по файлу на каждую ноду. Устаревшие .md удаляются.
 */
export async function syncToDirectory(root: FileSystemDirectoryHandle, doc: WorkspaceDoc): Promise<number> {
  const dir = await root.getDirectoryHandle(slugify(doc.name), { create: true });

  const want = new Map<string, string>();
  want.set("00-index.md", docToMarkdown(doc));
  doc.nodes.forEach((n, i) => {
    const num = String(i + 1).padStart(2, "0");
    const name = `${num}-${TYPE_META[n.type].file}-${firstWords(n.text) || n.id.slice(0, 6)}.md`;
    want.set(name, nodeToMarkdown(n, doc.name));
  });

  // чистим устаревшее
  const entries = (dir as unknown as { entries(): AsyncIterable<[string, { kind: string }]> }).entries();
  for await (const [name, handle] of entries) {
    if (handle.kind === "file" && name.endsWith(".md") && !want.has(name)) {
      try {
        await dir.removeEntry(name);
      } catch {
        /* ignore */
      }
    }
  }

  for (const [name, content] of want) {
    const fh = await dir.getFileHandle(name, { create: true });
    const writable = await (fh as unknown as { createWritable(): Promise<{ write(s: string): Promise<void>; close(): Promise<void> }> }).createWritable();
    await writable.write(content);
    await writable.close();
  }
  return want.size;
}

/** Скачивание сводного .md (фолбэк для браузеров без File System Access). */
export function downloadMarkdown(doc: WorkspaceDoc): void {
  const blob = new Blob([docToMarkdown(doc)], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugify(doc.name)}.md`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Копирование в буфер с фолбэком. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
