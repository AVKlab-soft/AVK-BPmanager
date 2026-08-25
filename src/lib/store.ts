import type { WorkspaceDoc, WorkspaceMeta } from "../types";

const META_KEY = "uzel.metas.v1";
const docKey = (id: string) => `uzel.doc.${id}.v1`;

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-zа-яё0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "workspace"
  );
}

export function loadMetas(): WorkspaceMeta[] {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as WorkspaceMeta[]) : [];
  } catch {
    return [];
  }
}

export function saveMetas(metas: WorkspaceMeta[]): void {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(metas));
  } catch {
    /* переполнение хранилища — молча */
  }
}

export function upsertMeta(meta: WorkspaceMeta): void {
  const metas = loadMetas().filter((m) => m.id !== meta.id);
  metas.unshift(meta);
  saveMetas(metas);
}

export function loadDoc(id: string): WorkspaceDoc | null {
  try {
    const raw = localStorage.getItem(docKey(id));
    return raw ? (JSON.parse(raw) as WorkspaceDoc) : null;
  } catch {
    return null;
  }
}

export function persistDoc(id: string, doc: WorkspaceDoc): void {
  try {
    localStorage.setItem(docKey(id), JSON.stringify(doc));
  } catch {
    /* ignore */
  }
}

export function deleteWorkspace(id: string): void {
  try {
    localStorage.removeItem(docKey(id));
  } catch {
    /* ignore */
  }
  saveMetas(loadMetas().filter((m) => m.id !== id));
}

/** При первом запуске создаёт пример, чтобы доска не встречала пустотой. */
export function seedIfEmpty(): WorkspaceMeta[] {
  const existing = loadMetas();
  if (existing.length > 0) return existing;

  const now = Date.now();
  const sysId = uid();
  const ctxId = uid();
  const qId = uid();
  const aId = uid();

  const doc: WorkspaceDoc = {
    name: "Пример: лонгрид про сон",
    updatedAt: now,
    nodes: [
      {
        id: sysId,
        type: "system",
        x: 20,
        y: 20,
        text: "Ты — научный редактор популярного издания. Отвечай структурно, без воды, с конкретными примерами. Язык ответа — русский.",
      },
      {
        id: ctxId,
        type: "context",
        x: 20,
        y: 330,
        text: "Аудитория — студенты. Объём лонгрида ~12 000 знаков. Тон: дружелюбный, но точный. Без эзотерики и «биохакинга».",
      },
      {
        id: qId,
        type: "question",
        x: 430,
        y: 165,
        text: "Собери структуру лонгрида «Зачем мы спим»: 7–9 разделов, к каждому — тезис и идея врезки.",
      },
      {
        id: aId,
        type: "answer",
        x: 850,
        y: 165,
        text: "",
      },
    ],
    edges: [
      { id: uid(), from: sysId, to: qId },
      { id: uid(), from: ctxId, to: qId },
      { id: uid(), from: qId, to: aId },
    ],
  };

  const id = uid();
  persistDoc(id, doc);
  upsertMeta({ id, name: doc.name, updatedAt: now, nodeCount: doc.nodes.length });
  return loadMetas();
}
