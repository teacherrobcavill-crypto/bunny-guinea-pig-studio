#!/usr/bin/env python3
"""Validate story_graph.json against manuscript.md for Fighting Fantasy graph integrity."""
import json, re, sys
from collections import deque

root = sys.argv[1] if len(sys.argv) > 1 else "."
g = json.load(open(f"{root}/story_graph.json"))
ms = open(f"{root}/manuscript.md").read()
nodes = {int(k): v for k, v in g["nodes"].items()}
errors = []

# 1. Numbers in range and count
if len(nodes) != 20: errors.append(f"Expected 20 nodes, got {len(nodes)}")
for n in nodes:
    if not 1 <= n <= 100: errors.append(f"Section {n} out of range")

# 2. No dangling links
for n, v in nodes.items():
    for c in v["choices"]:
        if c["to"] not in nodes: errors.append(f"{n} -> {c['to']} dangling")

# 3. Reachability (no orphans)
start = g["start"]; seen = {start}; q = deque([start])
while q:
    for c in nodes[q.popleft()]["choices"]:
        if c["to"] not in seen: seen.add(c["to"]); q.append(c["to"])
orphans = set(nodes) - seen
if orphans: errors.append(f"Orphans: {sorted(orphans)}")

# 4. Every node can reach an ending (no inescapable loops)
endings = {n for n, v in nodes.items() if v["type"] in ("death", "victory")}
rev = {n: set() for n in nodes}
for n, v in nodes.items():
    for c in v["choices"]: rev[c["to"]].add(n)
ok = set(endings); q = deque(endings)
while q:
    for p in rev[q.popleft()]:
        if p not in ok: ok.add(p); q.append(p)
trapped = set(nodes) - ok
if trapped: errors.append(f"Nodes that cannot reach an ending: {sorted(trapped)}")
for n, v in nodes.items():
    if not v["choices"] and n not in endings: errors.append(f"{n} is a dead end with no death/victory")

# 5. Critical item reachable before boss gate WITHOUT passing the gate
for item in g.get("critical_items", []):
    givers = {n for n, v in nodes.items() if item in v.get("items_gained", [])}
    gates = {n for n, v in nodes.items() for c in v["choices"] if c.get("requires", {}).get("item") == item}
    seen2 = {start}; q = deque([start])
    while q:
        cur = q.popleft()
        if cur in gates: continue
        for c in nodes[cur]["choices"]:
            if c["to"] not in seen2: seen2.add(c["to"]); q.append(c["to"])
    if not givers & seen2: errors.append(f"Critical item {item} unreachable before gate")
    # Item reachable from every branch point before gate?
    for n in seen2 - gates - endings:
        s3 = {n}; q = deque([n])
        while q:
            cur = q.popleft()
            if cur in gates: continue
            for c in nodes[cur]["choices"]:
                if c["to"] not in s3: s3.add(c["to"]); q.append(c["to"])
        if not givers & s3 and gates & s3:
            errors.append(f"From {n} you can reach the gate but never the {item}")

# 6. Requirements
combats = [n for n, v in nodes.items() if v["type"] == "combat"]
lucks = [n for n, v in nodes.items() if v.get("test") == "luck"]
if len(combats) < 2: errors.append("Fewer than 2 combats")
if not lucks: errors.append("No Test Your Luck trap")

# 7. Manuscript sync: headers and 'turn to' links match graph
headers = set(map(int, re.findall(r"^## (\d+)\s*$", ms, re.M)))
if headers != set(nodes): errors.append(f"Manuscript/graph mismatch: {sorted(headers ^ set(nodes))}")
sections = re.split(r"^## (\d+)\s*$", ms, flags=re.M)
for i in range(1, len(sections), 2):
    n = int(sections[i]); body = sections[i + 1]
    prose_links = set(map(int, re.findall(r"turn to \*\*(\d+)\*\*", body, re.I)))
    graph_links = {c["to"] for c in nodes.get(n, {}).get("choices", [])}
    if prose_links != graph_links:
        errors.append(f"Section {n}: prose links {sorted(prose_links)} != graph {sorted(graph_links)}")

print(f"Nodes: {len(nodes)} | Combats: {sorted(combats)} | Luck: {lucks} | Endings: {sorted(endings)}")
if errors:
    print("FAIL"); [print(" -", e) for e in errors]; sys.exit(1)
print("PASS: graph valid, no orphans, no trapped loops, critical item reachable from every pre-boss node, manuscript in sync.")
