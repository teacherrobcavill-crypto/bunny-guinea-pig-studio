#!/bin/zsh
echo "Stopping RJC Audio Ltd Accounting servers (ports 3001 and 5173)..."
lsof -ti tcp:3001 | xargs kill -9 2>/dev/null || true
lsof -ti tcp:5173 | xargs kill -9 2>/dev/null || true
echo "Stopped."
