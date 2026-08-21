#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generate random Sokoban levels verified solvable by push-BFS."""
import random, time, json, sys
from collections import deque

def solve(grid, goals, boxes, player, node_cap=400000, time_cap=3.0):
    import heapq
    t0 = time.time()
    goals = frozenset(goals)
    gl = list(goals)
    def wall(p):
        return grid[p[0]][p[1]] == '#'
    def corner_dead(bx):
        r, c = bx
        if bx in goals: return False
        up, dn, lf, rt = wall((r-1,c)), wall((r+1,c)), wall((r,c-1)), wall((r,c+1))
        return (up and lf) or (up and rt) or (dn and lf) or (dn and rt)
    def h(bxs):
        s = 0
        for b in bxs:
            s += min(abs(b[0]-g[0]) + abs(b[1]-g[1]) for g in gl)
        return s
    dirs = [(-1,0),(1,0),(0,-1),(0,1)]
    def reach(p, bxs):
        seen = {p}; q = deque([p])
        while q:
            cur = q.popleft()
            for dr, dc in dirs:
                n = (cur[0]+dr, cur[1]+dc)
                if not wall(n) and n not in bxs and n not in seen:
                    seen.add(n); q.append(n)
        return seen
    R0 = reach(player, boxes)
    fb = frozenset(boxes)
    start = (h(fb), 0, fb, min(R0))
    seen = {(fb, min(R0))}
    heap = [start]
    while heap:
        f, g, bxs, pseed = heapq.heappop(heap)
        if bxs <= goals:
            return g
        if len(seen) > node_cap or time.time() - t0 > time_cap:
            return None
        R = reach(pseed, bxs)
        for bx in bxs:
            for dr, dc in dirs:
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

def try_gen(rng, nboxes, W, H, wallp):
    grid = [['#']*W for _ in range(H)]
    for r in range(1, H-1):
        for c in range(1, W-1):
            grid[r][c] = '#' if rng.random() < wallp else ' '
    cells = [(r, c) for r in range(1, H-1) for c in range(1, W-1) if grid[r][c] == ' ']
    if len(cells) < nboxes*2 + 3:
        return None
    picked = rng.sample(cells, nboxes*2 + 1)
    goals = picked[:nboxes]
    boxes = picked[nboxes:2*nboxes]
    if set(goals) & set(boxes):
        return None
    player = picked[-1]
    # player must reach every box (else unsolvable fast reject)
    pushes = solve(grid, goals, boxes, player)
    if pushes is None or pushes < 1:
        return None
    # trim to bounding box
    rs = [p[0] for p in picked]; cs = [p[1] for p in picked]
    r0, r1, c0, c1 = min(rs)-1, max(rs)+1, min(cs)-1, max(cs)+1
    sub = [row[c0:c1+1] for row in grid[r0:r1+1]]
    g2 = set((r-r0, c-c0) for r, c in goals)
    b2 = set((r-r0, c-c0) for r, c in boxes)
    p2 = (player[0]-r0, player[1]-c0)
    rows = []
    for r in range(len(sub)):
        row = ''
        for c in range(len(sub[0])):
            if (r, c) == p2: row += '@'
            elif (r, c) in b2: row += '$'
            elif (r, c) in g2: row += '.'
            else: row += sub[r][c]
        rows.append(row)
    key = ('\n'.join(rows)).replace('@', ' ')
    return {'grid': rows, 'pushes': pushes, 'nboxes': nboxes, 'key': key}

def main():
    t0 = time.time()
    rng = random.Random(777)
    pool = {}
    seen_keys = set()
    attempts = 0
    # quotas: (nboxes, count_needed)
    quotas = [(5, 14), (6, 10)]
    need_total = sum(n for _, n in quotas)
    while sum(len(v) for v in pool.values()) < need_total and time.time() - t0 < 110:
        attempts += 1
        nb = rng.choice([5, 5, 5, 6, 6])
        W = rng.randint(8, 11); H = rng.randint(7, 9)
        wallp = rng.uniform(0.05, 0.13)
        lv = try_gen(rng, nb, W, H, wallp)
        if lv is None: continue
        if lv['key'] in seen_keys: continue
        seen_keys.add(lv['key'])
        pool.setdefault(lv['nboxes'], []).append(lv)
    out = {}
    for nb, lvs in sorted(pool.items()):
        lvs.sort(key=lambda x: x['pushes'])
        out[nb] = [{'grid': l['grid'], 'pushes': l['pushes']} for l in lvs]
        print(f"boxes={nb}: {len(lvs)} levels, pushes range {lvs[0]['pushes']}..{lvs[-1]['pushes']}", flush=True)
    print(f"attempts={attempts} elapsed={time.time()-t0:.1f}s total={sum(len(v) for v in pool.values())}", flush=True)
    with open('/tmp/opencode/sokoban/gen_levels_xhard.json', 'w') as f:
        json.dump(out, f)

if __name__ == '__main__':
    main()
