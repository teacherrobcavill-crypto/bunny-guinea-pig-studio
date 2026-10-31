#!/bin/zsh
cd "$(dirname "$0")"
echo "Starting RJC Audio Ltd — Sonics AI Accounting Assistant..."
(sleep 2 && open "http://localhost:5173") &
npm run dev
