#!/bin/sh
# «Узел» — запуск на Mac: двойной клик по этому файлу.
# Сервер стартует, данные будут в папке ./data рядом с приложением.
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo "Не найден Node.js. Установите его: https://nodejs.org"
  echo "Нажмите Enter, чтобы закрыть окно…"
  read -r _
  exit 1
fi

(sleep 1; open "http://localhost:4173") >/dev/null 2>&1 &
node server.mjs

echo ""
echo "Сервер остановлен. Нажмите Enter, чтобы закрыть окно…"
read -r _
