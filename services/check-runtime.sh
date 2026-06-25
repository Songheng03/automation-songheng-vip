#!/bin/bash
echo "=== RUNTIME CHECK ==="
which node 2>/dev/null && node --version 2>/dev/null
which python3 2>/dev/null && python3 --version 2>/dev/null
which python 2>/dev/null && python --version 2>/dev/null
which deno 2>/dev/null
which bun 2>/dev/null
echo "=== PATH ==="
echo $PATH
echo "=== /usr/local/bin ==="
ls /usr/local/bin/ 2>/dev/null
echo "=== /usr/bin/ node* ==="
ls -la /usr/bin/node* 2>/dev/null
echo "=== docker exec node ==="
which docker 2>/dev/null && docker exec automaton which node 2>/dev/null
