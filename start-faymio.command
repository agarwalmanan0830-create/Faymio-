#!/bin/bash
cd -- "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  printf '\nFaymio needs Node.js 22.12 or later.\nInstall the current Node.js LTS from https://nodejs.org, then open this file again.\n\n'
  read -r -p 'Press Return to close… '
  exit 1
fi
node scripts/demo.mjs
faymio_result=$?
if [ "$faymio_result" -ne 0 ] && [ "$faymio_result" -ne 130 ]; then
  read -r -p 'Press Return to close… '
fi
exit "$faymio_result"
