#!/usr/bin/env node
/**
 * «Узел» — локальный сервер без зависимостей.
 * Запуск: node server.mjs  (или двойной клик по start.command / start.bat)
 *
 * — раздаёт приложение из своей папки:  http://localhost:4173
 * — хранит проекты в папке ./data рядом с собой:
 *     data/<проект>/workspace.json   — документ доски
 *     data/<проект>/*.md             — тексты нод
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(ROOT, "data");
const PORT = Number(process.env.PORT) || 4173;

fs.mkdirSync(DATA, { recursive: true });

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const FOLDER_RE = /^[a-zа-яё0-9][a-zа-яё0-9-]{0,80}$/i;
const FILE_RE = /^[a-zа-яё0-9][a-zа-яё0-9 .-]{0,120}\.(md|json)$/i;

function send(res, code, body, type = "application/json; charset=utf-8") {
  res.writeHead(code, { "Content-Type": type });
  res.end(body);
}

function listProjects() {
  const out = [];
  for (const entry of fs.readdirSync(DATA, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const file = path.join(DATA, entry.name, "workspace.json");
    try {
      const doc = JSON.parse(fs.readFileSync(file, "utf8"));
      out.push({
        id: entry.name,
        name: String(doc.name || entry.name),
        updatedAt: Number(doc.updatedAt) || 0,
        nodeCount: Array.isArray(doc.nodes) ? doc.nodes.length : 0,
      });
    } catch {
      /* папка без workspace.json — пропускаем */
    }
  }
  out.sort((a, b) => b.updatedAt - a.updatedAt);
  return out;
}

function readBody(req, limit = 25 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) return reject(new Error("body too large"));
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return send(res, 204, "");

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const p = url.pathname;

  try {
    /* ---------- API ---------- */
    if (p === "/api/projects" && req.method === "GET") {
      return send(res, 200, JSON.stringify({ dataPath: DATA, projects: listProjects() }));
    }

    const m = p.match(/^\/api\/projects\/([^/]+)$/);
    if (m) {
      const folder = m[1];
      if (!FOLDER_RE.test(folder)) return send(res, 400, JSON.stringify({ error: "bad folder name" }));
      const dir = path.join(DATA, folder);

      if (req.method === "GET") {
        try {
          const doc = fs.readFileSync(path.join(dir, "workspace.json"), "utf8");
          return send(res, 200, doc);
        } catch {
          return send(res, 404, JSON.stringify({ error: "not found" }));
        }
      }

      if (req.method === "PUT") {
        const body = JSON.parse((await readBody(req)) || "{}");
        const files = Array.isArray(body.files) ? body.files : [];
        fs.mkdirSync(dir, { recursive: true });
        const wanted = new Set();
        for (const f of files) {
          if (!f || typeof f.name !== "string" || typeof f.content !== "string") continue;
          if (!FILE_RE.test(f.name)) continue;
          wanted.add(f.name);
          fs.writeFileSync(path.join(dir, f.name), f.content, "utf8");
        }
        // чистим устаревшие md/json, которых больше нет в доске
        for (const name of fs.readdirSync(dir)) {
          if (!wanted.has(name) && /\.(md|json)$/i.test(name)) {
            try {
              fs.unlinkSync(path.join(dir, name));
            } catch {
              /* ignore */
            }
          }
        }
        return send(res, 200, JSON.stringify({ ok: true, dataPath: DATA }));
      }

      if (req.method === "DELETE") {
        fs.rmSync(dir, { recursive: true, force: true });
        return send(res, 200, JSON.stringify({ ok: true }));
      }
    }

    /* ---------- статика ---------- */
    if (req.method !== "GET") return send(res, 405, JSON.stringify({ error: "method not allowed" }));
    let rel = decodeURIComponent(p);
    if (rel === "/") rel = "/index.html";
    const file = path.normalize(path.join(ROOT, rel));
    if (!file.startsWith(ROOT)) return send(res, 403, "forbidden");
    if (fs.existsSync(file) && fs.statSync(file).isFile()) {
      const type = MIME[path.extname(file).toLowerCase()] || "application/octet-stream";
      res.writeHead(200, { "Content-Type": type });
      return fs.createReadStream(file).pipe(res);
    }
    // SPA-фолбэк
    res.writeHead(200, { "Content-Type": MIME[".html"] });
    return fs.createReadStream(path.join(ROOT, "index.html")).pipe(res);
  } catch (e) {
    return send(res, 500, JSON.stringify({ error: String((e && e.message) || e) }));
  }
});

server.listen(PORT, () => {
  console.log("");
  console.log("  УЗЕЛ — локальный сервер");
  console.log(`  Приложение:  http://localhost:${PORT}`);
  console.log(`  Данные:      ${DATA}`);
  console.log("  (Ctrl+C — остановить)");
  console.log("");
});
