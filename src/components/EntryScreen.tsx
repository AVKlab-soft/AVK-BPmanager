import { useState } from "react";
import type { FormEvent } from "react";
import type { WorkspaceMeta } from "../types";
import { fmtDate, plural } from "../types";
import { IconAlert, IconFolder, IconPlus, IconTrash, LogoMark } from "./icons";

interface Props {
  mode: "detecting" | "need-folder" | "none" | "ready";
  backendInfo: string | null;
  projects: WorkspaceMeta[];
  loading: boolean;
  onConnect: () => void;
  onOpen: (id: string) => void;
  onCreate: (name: string) => void;
  onDelete: (id: string) => void;
}

function MiniGraph() {
  return (
    <svg viewBox="0 0 420 232" className="w-full max-w-[430px]" aria-hidden>
      <g fill="none" stroke="#2b3a55" strokeWidth="1.6">
        <path d="M134 58 C 158 58, 144 115, 168 115" />
        <path d="M134 168 C 158 168, 144 115, 168 115" />
        <path d="M288 115 C 300 115, 306 115, 318 115" />
      </g>
      <g fill="none" strokeWidth="1.6" className="edge-flow">
        <path d="M134 58 C 158 58, 144 115, 168 115" stroke="#57b6f5" opacity="0.85" />
        <path d="M134 168 C 158 168, 144 115, 168 115" stroke="#3ed598" opacity="0.85" />
        <path d="M288 115 C 300 115, 306 115, 318 115" stroke="#f6b83d" opacity="0.9" />
      </g>
      <g className="anim-float" style={{ animationDelay: "0s" }}>
        <rect x="24" y="30" width="110" height="56" rx="9" fill="#111928" stroke="#57b6f5" strokeOpacity="0.55" />
        <circle cx="44" cy="58" r="5" fill="#57b6f5" fillOpacity="0.25" stroke="#57b6f5" strokeWidth="1.4" />
        <text x="58" y="62" fontSize="11" fill="#94a2bd" fontFamily="JetBrains Mono, monospace">система</text>
      </g>
      <g className="anim-float" style={{ animationDelay: "0.9s" }}>
        <rect x="24" y="140" width="110" height="56" rx="9" fill="#111928" stroke="#3ed598" strokeOpacity="0.55" />
        <circle cx="44" cy="168" r="5" fill="#3ed598" fillOpacity="0.25" stroke="#3ed598" strokeWidth="1.4" />
        <text x="58" y="172" fontSize="11" fill="#94a2bd" fontFamily="JetBrains Mono, monospace">контекст</text>
      </g>
      <g className="anim-float" style={{ animationDelay: "0.4s" }}>
        <rect x="168" y="86" width="120" height="58" rx="9" fill="#111928" stroke="#f6b83d" strokeOpacity="0.7" />
        <circle cx="189" cy="115" r="5" fill="#f6b83d" fillOpacity="0.25" stroke="#f6b83d" strokeWidth="1.4" />
        <text x="203" y="119" fontSize="11" fill="#e9eef8" fontFamily="JetBrains Mono, monospace">вопрос</text>
      </g>
      <g className="anim-float" style={{ animationDelay: "1.4s" }}>
        <rect x="318" y="86" width="86" height="58" rx="9" fill="#111928" stroke="#f0705a" strokeOpacity="0.55" strokeDasharray="5 4" />
        <text x="336" y="119" fontSize="11" fill="#5d6b88" fontFamily="JetBrains Mono, monospace">ответ…</text>
      </g>
      <circle cx="134" cy="58" r="3.4" fill="#57b6f5" />
      <circle cx="134" cy="168" r="3.4" fill="#3ed598" />
      <circle cx="168" cy="115" r="3.4" fill="#f6b83d" />
      <circle cx="288" cy="115" r="3.4" fill="#f6b83d" />
      <circle cx="318" cy="115" r="3.4" fill="#f0705a" />
    </svg>
  );
}

const STEPS: Array<[string, string]> = [
  ["01", "Перетащите ноду «Вопрос» на доску — с неё начинается сборка."],
  ["02", "Кликните по входной точке — рядом встанет контекст или системный промпт."],
  ["03", "«Собрать» копирует промпт в буфер и создаёт ноду для ответа нейросети."],
];

function StorageGate({ mode, onConnect }: { mode: "detecting" | "need-folder" | "none"; onConnect: () => void }) {
  if (mode === "detecting") {
    return (
      <div className="px-6 py-12 text-center">
        <div className="mx-auto w-3 h-3 rounded-full bg-q blink-soft" />
        <p className="mt-4 text-[13px] text-mut">Ищем локальный сервер…</p>
        <p className="mt-1 text-[11px] text-dim font-mono">localhost:4173</p>
      </div>
    );
  }
  if (mode === "need-folder") {
    return (
      <div className="px-6 py-9 text-center">
        <div className="mx-auto w-12 h-12 rounded-md border border-dashed border-line2 grid place-items-center text-ctx">
          <IconFolder className="w-5 h-5" />
        </div>
        <h3 className="mt-4 font-display font-medium text-[13px] tracking-wide">Данные — в файлах, не в браузере</h3>
        <p className="mt-2 text-[12.5px] text-mut leading-relaxed">
          Подключите папку, в которой будут лежать проекты (json + .md каждой ноды).
          Внутри создастся подпапка <span className="font-mono text-ctx">data</span>.
        </p>
        <button
          onClick={onConnect}
          className="mt-5 inline-flex items-center gap-2 bg-ctx text-[#032117] font-bold text-[13px] rounded-md px-5 py-2.5 hover:brightness-110 active:scale-[0.97] transition"
        >
          <IconFolder className="w-4 h-4" />
          Подключить папку
        </button>
        <p className="mt-4 text-[11px] text-dim leading-relaxed">
          После перезапуска страницы папку нужно подключить заново — браузеры не позволяют
          запоминать доступ. Альтернатива без переподключения — запуск через{" "}
          <span className="font-mono text-mut">start.command</span>.
        </p>
      </div>
    );
  }
  return (
    <div className="px-6 py-9">
      <div className="flex items-center gap-2 text-ans">
        <IconAlert className="w-4 h-4 shrink-0" />
        <h3 className="font-display font-medium text-[13px] tracking-wide">Локальный сервер не найден</h3>
      </div>
      <p className="mt-3 text-[12.5px] text-mut leading-relaxed">
        Этот браузер (Safari) не даёт странице прямого доступа к файлам, а сервер не запущен.
        Запустите приложение через файл{" "}
        <span className="font-mono text-q">start.command</span> рядом с приложением — откроется{" "}
        <span className="font-mono">localhost:4173</span>, и проекты будут сохраняться в папку{" "}
        <span className="font-mono">data</span> автоматически.
      </p>
      <div className="mt-4 border border-line rounded-md px-4 py-3 font-mono text-[11px] text-mut leading-relaxed">
        cd …/папка-приложения
        <br />
        node server.mjs
      </div>
    </div>
  );
}

export default function EntryScreen({
  mode,
  backendInfo,
  projects,
  loading,
  onConnect,
  onOpen,
  onCreate,
  onDelete,
}: Props) {
  const [name, setName] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setName("");
  };

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden select-none">
      <div className="absolute inset-0 board-dots opacity-60" style={{ backgroundSize: "26px 26px" }} />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(560px 380px at 12% 8%, rgba(246,184,61,0.07), transparent 65%), radial-gradient(640px 420px at 88% 92%, rgba(87,182,245,0.07), transparent 65%), radial-gradient(500px 360px at 78% 6%, rgba(62,213,152,0.05), transparent 60%)",
        }}
      />
      <div className="absolute inset-0 noise-layer pointer-events-none" />

      <header className="relative px-7 lg:px-14 pt-7 flex items-center justify-between anim-fade">
        <div className="flex items-center gap-3">
          <LogoMark className="w-8 h-8" />
          <span className="font-display font-bold text-lg tracking-[0.08em]">УЗЕЛ</span>
          <span className="ml-1 text-[10px] font-mono text-dim border border-line rounded px-1.5 py-0.5">
            файлы · без памяти браузера
          </span>
        </div>
        <div className="hidden sm:block text-[11px] font-mono text-dim">проекты лежат в папке data</div>
      </header>

      <main className="relative flex-1 w-full max-w-[1220px] mx-auto px-7 lg:px-14 py-10 lg:py-14 grid lg:grid-cols-[1.12fr_1fr] gap-12 lg:gap-16 items-center">
        <section className="anim-rise">
          <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-q mb-5">канвас для работы с нейросетями</p>
          <h1 className="font-display font-bold text-[32px] sm:text-[42px] leading-[1.08] tracking-tight max-w-[560px]">
            Ветвящиеся идеи —<br />
            <span className="text-q">теперь по полочкам</span>
          </h1>
          <p className="mt-6 text-mut text-[15px] leading-relaxed max-w-[480px]">
            Доска нод удерживает ход исследования за вас: вопрос, системный промпт и контекст связываются в один
            промпт, а ответ нейросети ложится в соседнюю ноду — и сам становится контекстом для следующего шага.
            Всё хранится файлами рядом с приложением — браузерная память не используется.
          </p>

          <div className="mt-9 anim-float">
            <MiniGraph />
          </div>

          <ol className="mt-9 max-w-[480px] space-y-0">
            {STEPS.map(([num, text], i) => (
              <li key={num} className="flex gap-4 anim-rise" style={{ animationDelay: `${0.15 + i * 0.1}s` }}>
                <div className="flex flex-col items-center">
                  <span className="font-mono text-[11px] text-q border border-q/35 rounded px-1.5 py-0.5 mt-0.5">{num}</span>
                  {i < STEPS.length - 1 && <span className="w-px flex-1 bg-line my-1.5" />}
                </div>
                <p className="text-[13.5px] text-mut leading-relaxed pb-5">{text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="anim-rise" style={{ animationDelay: "0.12s" }}>
          <div className="border border-line bg-panel/90 rounded-lg shadow-[0_30px_70px_-30px_rgba(0,0,0,0.8)]">
            <div className="flex items-center justify-between px-6 pt-6 pb-4">
              <h2 className="font-display font-medium text-[13px] tracking-[0.14em] uppercase">Проекты</h2>
              {mode === "ready" && (
                <span
                  className="max-w-[55%] truncate font-mono text-[10px] text-ctx border border-ctx/35 bg-ctx/10 rounded-full px-2 py-0.5"
                  title={`Хранилище: ${backendInfo ?? ""}`}
                >
                  {backendInfo}
                </span>
              )}
              {mode !== "ready" && (
                <span className="font-mono text-[11px] text-dim border border-line rounded-full px-2 py-0.5">…</span>
              )}
            </div>

            {mode === "ready" ? (
              <>
                <form onSubmit={submit} className="px-6 pb-5 flex gap-2">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Название проекта…"
                    maxLength={48}
                    className="flex-1 min-w-0 bg-deep border border-line rounded-md px-3.5 py-2.5 text-[14px] outline-none placeholder:text-dim focus:border-line2 transition-colors select-text"
                  />
                  <button
                    type="submit"
                    disabled={!name.trim()}
                    className="shrink-0 inline-flex items-center gap-1.5 bg-q text-[#241a02] font-semibold text-[13px] rounded-md px-4 py-2.5 hover:brightness-110 active:scale-[0.97] transition disabled:opacity-35 disabled:pointer-events-none"
                  >
                    <IconPlus className="w-4 h-4" />
                    Создать
                  </button>
                </form>

                <div className="border-t border-line/70 px-6 py-2 max-h-[380px] overflow-y-auto">
                  {loading ? (
                    <div className="py-10 space-y-3">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="h-11 rounded-md bg-panel2/70 animate-pulse" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  ) : projects.length === 0 ? (
                    <div className="py-10 text-center">
                      <div className="mx-auto w-12 h-12 rounded-md border border-dashed border-line2 grid place-items-center text-dim">
                        <IconPlus className="w-5 h-5" />
                      </div>
                      <p className="mt-3 text-[13px] text-dim">
                        В папке пока пусто. Создайте первый проект — он сразу появится на диске.
                      </p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-line/60">
                      {projects.map((m) => (
                        <li key={m.id} className="group py-3.5 flex items-center gap-3.5">
                          <LogoMark className="w-7 h-7 shrink-0 opacity-90" />
                          <button onClick={() => onOpen(m.id)} className="flex-1 min-w-0 text-left" title="Открыть доску">
                            <span className="block font-semibold text-[15px] truncate group-hover:text-q transition-colors">
                              {m.name}
                            </span>
                            <span className="block font-mono text-[11px] text-dim mt-0.5">
                              {fmtDate(m.updatedAt)} · {m.nodeCount} {plural(m.nodeCount, ["нода", "ноды", "нод"])}
                            </span>
                          </button>

                          {confirmId === m.id ? (
                            <span className="flex items-center gap-1.5 anim-pop">
                              <span className="text-[11px] font-mono text-ans">удалить?</span>
                              <button
                                onClick={() => {
                                  onDelete(m.id);
                                  setConfirmId(null);
                                }}
                                className="text-[11px] font-semibold text-ans border border-ans/40 rounded px-2 py-1 hover:bg-ans/10 transition"
                              >
                                да
                              </button>
                              <button
                                onClick={() => setConfirmId(null)}
                                className="text-[11px] font-semibold text-mut border border-line rounded px-2 py-1 hover:bg-panel2 transition"
                              >
                                нет
                              </button>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5">
                              <button
                                onClick={() => onOpen(m.id)}
                                className="inline-flex items-center gap-1 text-[12px] font-semibold text-fg border border-line rounded-md px-3 py-1.5 hover:border-q/50 hover:text-q transition"
                              >
                                Открыть
                              </button>
                              <button
                                onClick={() => setConfirmId(m.id)}
                                className="p-1.5 rounded-md text-dim hover:text-ans hover:bg-ans/10 transition"
                                title="Удалить проект с диска"
                              >
                                <IconTrash className="w-4 h-4" />
                              </button>
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            ) : (
              <StorageGate mode={mode} onConnect={onConnect} />
            )}
          </div>
          <p className="mt-4 text-[11.5px] text-dim leading-relaxed px-1">
            Каждый проект — папка с <span className="font-mono">workspace.json</span> и файлом{" "}
            <span className="font-mono">.md</span> на каждую ноду. Папку с данными можно переносить, копировать и
            открывать в любом редакторе.
          </p>
        </section>
      </main>

      <footer className="relative px-7 lg:px-14 py-6 flex items-center justify-between text-[11px] font-mono text-dim anim-fade">
        <span>«Узел» — сборщик промптов из связанных нод</span>
        <span className="hidden sm:inline">хранение: файлы на диске, ноль localStorage</span>
      </footer>
    </div>
  );
}
