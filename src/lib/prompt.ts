import type { NodeData, WorkspaceDoc } from "../types";
import { SECTION_ORDER, TYPE_META, fmtDate } from "../types";

/** Все ноды выше по течению от данной (обход против рёбер, с защитой от циклов). */
export function upstreamNodes(doc: WorkspaceDoc, fromId: string): NodeData[] {
  const visited = new Set<string>([fromId]);
  const out: NodeData[] = [];
  const walk = (id: string) => {
    for (const e of doc.edges) {
      if (e.to !== id || visited.has(e.from)) continue;
      visited.add(e.from);
      const n = doc.nodes.find((x) => x.id === e.from);
      if (!n) continue;
      walk(e.from);
      out.push(n);
    }
  };
  walk(fromId);
  return out;
}

/** Сборный промпт: системный промпт + промпты + контекст + заметки + прошлые ответы + вопрос. */
export function buildPrompt(doc: WorkspaceDoc, questionId: string): string {
  const q = doc.nodes.find((n) => n.id === questionId);
  const ups = upstreamNodes(doc, questionId).filter((n) => n.text.trim().length > 0);

  const blocks: string[] = [];
  for (const t of SECTION_ORDER) {
    const group = ups.filter((n) => n.type === t);
    if (group.length === 0) continue;
    const label = TYPE_META[t].section;
    group.forEach((n, i) => {
      const head = group.length > 1 ? `${label} ${i + 1}` : label;
      blocks.push(`[${head}]\n${n.text.trim()}`);
    });
  }
  if (q && q.text.trim()) {
    blocks.push(`[${TYPE_META.question.section}]\n${q.text.trim()}`);
  }
  return blocks.join("\n\n");
}

function firstLine(s: string, max = 60): string {
  const l = s.trim().split("\n")[0] ?? "";
  return l.length > max ? l.slice(0, max - 1).trimEnd() + "…" : l || "(пусто)";
}

/** Markdown одной ноды — то, что пишется в отдельный .md файл. */
export function nodeToMarkdown(n: NodeData, wsName: string): string {
  const meta = TYPE_META[n.type];
  return [
    "---",
    `type: ${n.type}`,
    `workspace: ${wsName}`,
    `updated: ${new Date().toISOString()}`,
    "---",
    "",
    `# ${meta.label}`,
    "",
    n.text.trim() || "_пока пусто_",
    "",
  ].join("\n");
}

/** Сводный markdown всей доски (индексный файл). */
export function docToMarkdown(doc: WorkspaceDoc): string {
  const lines: string[] = [
    `# ${doc.name}`,
    "",
    `> Обновлено: ${fmtDate(doc.updatedAt)} · нод: ${doc.nodes.length} · связей: ${doc.edges.length}`,
    "",
    "## Состав доски",
    "",
  ];
  for (const n of doc.nodes) {
    const inc = doc.edges.filter((e) => e.to === n.id).length;
    const outc = doc.edges.filter((e) => e.from === n.id).length;
    lines.push(`- **${TYPE_META[n.type].label}** — ${firstLine(n.text)} _(вх: ${inc}, вых: ${outc})_`);
  }
  lines.push("", "## Полные тексты", "");
  for (const n of doc.nodes) {
    lines.push(`### ${TYPE_META[n.type].label} — ${firstLine(n.text, 42)}`, "", n.text.trim() || "_пусто_", "");
  }
  return lines.join("\n");
}
