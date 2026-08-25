export type NodeType = "question" | "system" | "context" | "prompt" | "answer" | "note";

export interface NodeData {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  text: string;
}

export interface EdgeData {
  id: string;
  from: string;
  to: string;
}

export interface WorkspaceDoc {
  name: string;
  nodes: NodeData[];
  edges: EdgeData[];
  updatedAt: number;
}

export interface WorkspaceMeta {
  id: string;
  name: string;
  updatedAt: number;
  nodeCount: number;
}

export interface TypeMeta {
  label: string;
  section: string;
  file: string;
  color: string;
  placeholder: string;
  hint: string;
}

/** ширина ноды в мировых координатах */
export const NODE_W = 288;
/** высота, на которой расположены порты (от верха ноды) */
export const PORT_Y = 52;

export const TYPE_META: Record<NodeType, TypeMeta> = {
  question: {
    label: "Вопрос",
    section: "ВОПРОС",
    file: "question",
    color: "#f6b83d",
    placeholder: "Сформулируйте вопрос к нейросети…",
    hint: "с него начинается сборка",
  },
  system: {
    label: "Системный промпт",
    section: "СИСТЕМНЫЙ ПРОМПТ",
    file: "system",
    color: "#57b6f5",
    placeholder: "Роль, тон, ограничения модели…",
    hint: "роль и правила модели",
  },
  context: {
    label: "Контекст",
    section: "КОНТЕКСТ",
    file: "context",
    color: "#3ed598",
    placeholder: "Факты, данные, предыстория…",
    hint: "факты и предыстория",
  },
  prompt: {
    label: "Промпт",
    section: "ПРОМПТ",
    file: "prompt",
    color: "#b48df0",
    placeholder: "Готовый фрагмент промпта…",
    hint: "переиспользуемый фрагмент",
  },
  answer: {
    label: "Ответ",
    section: "ПРЕДЫДУЩИЙ ОТВЕТ",
    file: "answer",
    color: "#f0705a",
    placeholder: "Вставьте ответ нейросети…",
    hint: "сюда копируется ответ",
  },
  note: {
    label: "Заметка",
    section: "ЗАМЕТКА",
    file: "note",
    color: "#96a8c8",
    placeholder: "Ссылка, идея, напоминание…",
    hint: "свободная заметка",
  },
};

export const PALETTE_ORDER: NodeType[] = ["question", "system", "context", "prompt", "answer", "note"];

/** порядок секций при сборке промпта */
export const SECTION_ORDER: NodeType[] = ["system", "prompt", "context", "note", "answer"];

/** типы, которые можно быстро создать из входной точки */
export const QUICK_TYPES: NodeType[] = ["system", "context", "prompt", "note"];

export function plural(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(n) % 100;
  const d = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (d > 1 && d < 5) return forms[1];
  if (d === 1) return forms[0];
  return forms[2];
}

export function fmtDate(ts: number): string {
  const d = new Date(ts);
  const date = d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  const time = d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  return `${date}, ${time}`;
}
