#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Sokoban level pipeline: design + generate + compose + verify. Exports full grids."""
import json, random, time, heapq, sys
from collections import deque

DIRS = [(-1, 0), (1, 0), (0, -1), (0, 1)]

def solve(grid, goals, boxes, player, node_cap=1_500_000, time_cap=3.0):
    """A* over pushes. Grid must be fully bordered. Returns min pushes or None."""
    t0 = time.time()
    goals = frozenset(goals)
    gl = list(goals)
    H, W = len(grid), len(grid[0])
    def wall(p):
        return grid[p[0]][p[1]] == '#'
    def corner_dead(bx):
        r, c = bx
        if bx in goals: return False
        up, dn, lf, rt = wall((r-1, c)), wall((r+1, c)), wall((r, c-1)), wall((r, c+1))
        return (up and lf) or (up and rt) or (dn and lf) or (dn and rt)
    def h(bxs):
        return sum(min(abs(b[0]-g[0]) + abs(b[1]-g[1]) for g in gl) for b in bxs)
    def reach(p, bxs):
        seen = {p}; q = deque([p])
        while q:
            cur = q.popleft()
            for dr, dc in DIRS:
                n = (cur[0]+dr, cur[1]+dc)
                if not wall(n) and n not in bxs and n not in seen:
                    seen.add(n); q.append(n)
        return seen
    R0 = reach(player, boxes)
    fb = frozenset(boxes)
    seen = {(fb, min(R0))}
    heap = [(h(fb), 0, fb, min(R0))]
    while heap:
        f, g, bxs, pseed = heapq.heappop(heap)
        if bxs <= goals:
            return g
        if len(seen) > node_cap or time.time() - t0 > time_cap:
            return None
        R = reach(pseed, bxs)
        for bx in bxs:
            for dr, dc in DIRS:
                frm = (bx[0]-dr, bx[1]-dc); to = (bx[0]+dr, bx[1]+dc)
                if frm not in R: continue
                if wall(to) or to in bxs: continue
                if corner_dead(to): continue
                nb = set(bxs); nb.discard(bx); nb.add(to)
                nb = frozenset(nb)
                ns = min(reach(frm, nb))
                st = (nb, ns)
                if st not in seen:
                    seen.add(st)
                    heapq.heappush(heap, (g + 1 + h(nb), g + 1, nb, ns))
    return None

def parse(level_str):
    """Parse level text; pad ragged rows with '#'. Returns (grid, goals, boxes, player)."""
    rows = [list(l) for l in level_str.split('\n') if l.strip('\n') != '']
    W = max(len(r) for r in rows)
    grid = [r + ['#'] * (W - len(r)) for r in rows]
    goals, boxes, player = set(), set(), None
    for r in range(len(grid)):
        for c in range(W):
            ch = grid[r][c]
            if ch == '.': goals.add((r, c))
            elif ch == '$': boxes.add((r, c))
            elif ch == '@': player = (r, c)
            elif ch == '*': boxes.add((r, c)); goals.add((r, c))
            elif ch == '+': player = (r, c); goals.add((r, c))
    return grid, goals, boxes, player

def render(grid, goals, boxes, player):
    rows = []
    for r in range(len(grid)):
        row = ''
        for c in range(len(grid[0])):
            if (r, c) == player: row += '@'
            elif (r, c) in boxes and (r, c) in goals: row += '*'
            elif (r, c) in boxes: row += '$'
            elif (r, c) in goals: row += '.'
            else: row += grid[r][c]
        rows.append(row)
    return rows

DESIGNED = [
"#######\n#     #\n# @$. #\n#     #\n#######",
"#######\n#     #\n# .$@ #\n#     #\n#######",
"#####\n#   #\n# @ #\n# $ #\n# . #\n#   #\n#####",
"#######\n#     #\n# @ # #\n# $ # #\n#   # #\n# .   #\n#######",
"#####\n# . #\n# $ #\n# . #\n# $ #\n# @ #\n#####",
"#######\n#     #\n# .@  #\n#  $  #\n#     #\n##   ##\n#     #\n#######",
"########\n#      #\n# .$@$.#\n#      #\n########",
"#######\n#  .. #\n#  $$ #\n#  @  #\n#     #\n#######",
"#########\n#       #\n# .$$ . #\n#   @   #\n#       #\n#########",
"######\n#    #\n# #@ #\n# $* #\n# .* #\n#    #\n######",
"#######\n#     #\n# $ $ #\n# .@. #\n#     #\n#######",
"########\n#   #  #\n# $ #  #\n# $ #  #\n# $ #  #\n# @ ...#\n########",
"#########\n#       #\n# ## ## #\n# $   $ #\n#  .@.  #\n#       #\n#########",
"##########\n#        #\n#  ####  #\n#  #..#  #\n#  #..#  #\n#  $$$$  #\n#   @    #\n##########",
"########\n#      #\n# .  . #\n#  $$  #\n#  @   #\n#      #\n########",
"##########\n#        #\n# ###### #\n# #    # #\n# # $$ # #\n# # .. # #\n#   @    #\n##########",
"########\n#      #\n# $  $ #\n# #..# #\n#  @   #\n#      #\n########",
"#########\n#   #   #\n# $   $ #\n#. @  .#\n#       #\n#########",
"########\n#      #\n# $  $ #\n# #..# #\n#   @  #\n#      #\n########",
"#########\n#       #\n#  ###  #\n#  #.#  #\n#  $ #  #\n#  @$ # #\n#  # .# #\n#  ###  #\n#       #\n#########",
]

def gen_pool(seed, spec, budget):
    """spec: list of (nboxes, weight). Returns verified levels (full grid)."""
    rng = random.Random(seed)
    t0 = time.time()
    out, seen = [], set()
    nlist = []
    for nb, wt in spec:
        nlist += [nb] * wt
    while time.time() - t0 < budget:
        nb = rng.choice(nlist)
        W = rng.randint(6, 10); H = rng.randint(6, 8)
        wallp = rng.uniform(0.08, 0.22)
        grid = [['#'] * W for _ in range(H)]
        for r in range(1, H-1):
            for c in range(1, W-1):
                grid[r][c] = '#' if rng.random() < wallp else ' '
        cells = [(r, c) for r in range(1, H-1) for c in range(1, W-1) if grid[r][c] == ' ']
        if len(cells) < nb * 2 + 3:
            continue
        picked = rng.sample(cells, nb * 2 + 1)
        goals, boxes, player = picked[:nb], picked[nb:2*nb], picked[-1]
        if set(goals) & set(boxes):
            continue
        pushes = solve(grid, goals, boxes, player, node_cap=250000, time_cap=1.2)
        if pushes is None or pushes < 1:
            continue
        rows = render(grid, goals, boxes, player)
        key = '\n'.join(rows).replace('@', ' ')
        if key in seen:
            continue
        seen.add(key)
        out.append({'grid': rows, 'pushes': pushes, 'nboxes': nb, 'kind': 'gen'})
    return out

def bordered(grid_rows):
    H = len(grid_rows); W = len(grid_rows[0])
    for c in range(W):
        if grid_rows[0][c] != '#' or grid_rows[H-1][c] != '#': return False
    for r in range(H):
        if grid_rows[r][0] != '#' or grid_rows[r][W-1] != '#': return False
    return True

def compose(chambers):
    H = max(len(c['grid']) for c in chambers)
    norm = []
    for c in chambers:
        assert bordered(c['grid'])
        g = [list(r) for r in c['grid']]
        while len(g) < H:
            g.append(['#'] * len(g[0]))
        norm.append(g)
    def flood(block):
        startp = None
        for r in range(len(block)):
            for c in range(len(block[r])):
                if block[r][c] == '@':
                    startp = (r, c); break
            if startp: break
        if startp is None: return set()
        seen = {startp}; q = deque([startp])
        while q:
            cur = q.popleft()
            for dr, dc in DIRS:
                n = (cur[0]+dr, cur[1]+dc)
                if 0 <= n[0] < len(block) and 0 <= n[1] < len(block[0]) and block[n[0]][n[1]] not in '#$*' and n not in seen:
                    seen.add(n); q.append(n)
        return seen
    block = None
    for g in norm:
        if block is None:
            block = [r[:] for r in g]
            continue
        w = len(block[0])
        placed = False
        for r in range(1, H - 1):
            if block[r][w-2] == '#' or g[r][1] == '#':
                continue
            trial = [row[:] for row in block]
            for rr in range(H):
                trial[rr].extend(g[rr][1:])
            trial[r][w-1] = ' '
            seen_at = False
            for rr in range(H):
                for cc in range(len(trial[rr])):
                    if trial[rr][cc] == '@':
                        if seen_at: trial[rr][cc] = ' '
                        else: seen_at = True
            reach = flood(trial)
            if any(c >= w for (rr, c) in reach if 0 <= rr < H):
                block = trial; placed = True; break
        if not placed:
            return None
    return [''.join(r) for r in block]

def main():
    # 1. designed
    designed = []
    for s in DESIGNED:
        grid, goals, boxes, player = parse(s)
        p = solve(grid, goals, boxes, player, node_cap=3_000_000, time_cap=20.0)
        if p is not None:
            designed.append({'grid': render(grid, goals, boxes, player), 'pushes': p,
                             'nboxes': len(boxes), 'kind': 'designed'})
            print(f"designed: OK {p} pushes", flush=True)
        else:
            print("designed: DROP", flush=True)

    # 2. generated pools
    easy = gen_pool(20260821, [(1, 2), (2, 3), (3, 3)], 45)
    hard = gen_pool(777, [(3, 3), (4, 4), (5, 1)], 75)
    print(f"gen easy={len(easy)} hard={len(hard)}", flush=True)
    pool = designed + easy + hard
    seen = set(); P = []
    for g in pool:
        k = '\n'.join(g['grid']).replace('@', ' ')
        if k not in seen:
            seen.add(k); P.append(g)
    by_nb = {}
    for g in P:
        by_nb.setdefault(g['nboxes'], []).append(g)
    for k in by_nb:
        by_nb[k].sort(key=lambda x: x['pushes'])
    print("pool: " + ", ".join(f"{k}b:{len(v)}" for k, v in sorted(by_nb.items())), flush=True)

    used = set()
    def take(nb, n):
        out = []
        for g in by_nb.get(nb, []):
            if id(g) in used: continue
            out.append(g); used.add(id(g))
            if len(out) == n: break
        return out

    t1 = take(1, 6)
    t2 = take(2, 10)
    t3 = take(3, 10)
    t4 = take(4, 10)
    if len(t4) < 10:
        t4 += take(3, 10 - len(t4))
    t5 = take(5, 10)
    if len(t5) < 10:
        t5 += take(4, 10 - len(t5))

    # t6: composed finales from hardest remaining chambers
    t6 = []
    combos = [(3, 3), (3, 3, 2), (3, 3, 3), (2, 3, 3), (3, 3, 3, 3),
              (3, 3, 3, 2), (2, 2, 3, 3), (3, 3, 3, 3, 3), (2, 3, 3, 3, 3),
              (3, 3, 3, 3, 3, 3), (2, 2, 3, 3, 3, 3), (3, 3, 3, 3, 3, 3, 3)]
    for combo in combos:
        picks = []
        ok = True
        for nb in combo:
            cand = [c for c in by_nb.get(nb, []) if id(c) not in used]
            if not cand:
                ok = False; break
            picks.append(cand[-1]); used.add(id(cand[-1]))
        if not ok:
            continue
        g = compose(picks)
        if g is None:
            for c in picks: used.discard(id(c))
            continue
        t6.append({'grid': g, 'pushes': sum(p['pushes'] for p in picks),
                   'nboxes': sum(p['nboxes'] for p in picks), 'kind': 'composed'})
    guard = 0
    while len(t6) < 6 and guard < 300:
        guard += 1
        rem = [c for k2 in by_nb for c in by_nb[k2] if id(c) not in used]
        if len(rem) < 2: break
        k = 2 + (guard % 3)
        picks = rem[guard % len(rem):][:k]
        g = compose(picks)
        if g is None: continue
        t6.append({'grid': g, 'pushes': sum(p['pushes'] for p in picks),
                   'nboxes': sum(p['nboxes'] for p in picks), 'kind': 'composed'})
        for p in picks: used.add(id(p))

    final = t1 + t2 + t3 + t4 + t5 + sorted(t6, key=lambda x: (x['pushes'], x['nboxes']))
    print(f"\nFINAL: {len(final)} levels", flush=True)
    for i, lv in enumerate(final, 1):
        print(f"  {i:2d}: {lv['nboxes']}b {lv['pushes']}p {lv['kind']}", flush=True)

    # QA: re-verify every level <=5 boxes; composed: parse+border+player checks
    issues = 0
    for i, lv in enumerate(final, 1):
        s = '\n'.join(lv['grid'])
        if s.count('@') != 1:
            print(f"QA lv{i}: player!=1"); issues += 1; continue
        if lv['kind'] != 'composed':
            grid, goals, boxes, player = parse(s)
            p = solve(grid, goals, boxes, player, node_cap=3_000_000, time_cap=25.0)
            if p is None:
                print(f"QA lv{i}: UNSOLVABLE"); issues += 1
            elif p != lv['pushes']:
                print(f"QA lv{i}: pushes {lv['pushes']} -> {p}")
                lv['pushes'] = p
        else:
            grid, goals, boxes, player = parse(s)
            if len(boxes) != len(goals):
                print(f"QA lv{i}: composed box/goal mismatch"); issues += 1
    print(f"QA issues: {issues}", flush=True)
    assert issues == 0 and len(final) >= 50
    json.dump([{'grid': lv['grid'], 'pushes': lv['pushes'], 'nboxes': lv['nboxes']} for lv in final],
              open('/tmp/opencode/sokoban/final_levels.json', 'w'))
    print("saved.", flush=True)

if __name__ == '__main__':
    main()
