import type { WorkspaceDoc } from "../types";
import { docToMarkdown } from "./prompt";
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
