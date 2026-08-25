/**
 * Чистые помощники. Никакого localStorage: данные живут только в файлах
 * (server.mjs → папка ./data, либо подключённая папка через File System Access).
 */

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
      .slice(0, 40) || "proekt"
  );
}
