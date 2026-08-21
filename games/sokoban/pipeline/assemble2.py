#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Compose hard levels from verified chambers + assemble final 56-level set."""
import json, sys
sys.path.insert(0, '/tmp/opencode/sokoban')
from gen3 import solve  # A* solver

def load(path):
    d = json.load(open(path))
    out = []
    for nb, lvs in d.items():
        for lv in lvs:
            out.append({'grid': lv['grid'], 'pushes': lv['pushes'], 'nboxes': int(nb)})
    return out

def compose(chambers):
    """Side-by-side chambers, shared wall columns with a gap at local row 1."""
    H = max(len(c['grid']) for c in chambers)
    norm = []
    for c in chambers:
        g = [list(r) for r in c['grid']]
        w = len(g[0])
        while len(g) < H:
            g.append(['#'] * w)
        norm.append(g)
    rows = []
    block = None
    for g in norm:
        if block is None:
            block = [r[:] for r in g]
        else:
            w = len(block[0])
            for r in range(H):
                block[r].extend(g[r][1:])
            block[1][w] = ' '
    # strip extra @ (keep first)
    seen_at = False
    out = []
    for r in range(H):
        row = ''
        for ch in block[r]:
            if ch == '@':
                if seen_at:
                    row += ' '
                else:
                    row += '@'; seen_at = True
            else:
                row += ch
        out.append(row)
    return out

def main():
    pool = load('/tmp/opencode/sokoban/gen_levels.json') + \
           load('/tmp/opencode/sokoban/gen_levels_hard.json') + \
           load('/tmp/opencode/sokoban/gen_levels_xhard.json')
    designed = json.load(open('/tmp/opencode/sokoban/designed_ok.json'))
    pool += designed
    # dedupe
    seen = set(); P = []
    for g in pool:
        k = '\n'.join(g['grid']).replace('@', ' ')
        if k not in seen:
            seen.add(k); P.append(g)
    by_nb = {}
    for g in P:
        by_nb.setdefault(g['nboxes'], []).append(g)
    for k in by_nb:
        by_nb[k].sort(key=lambda x: x['pushes'], reverse=True)

    # chambers for composition: verified 2-3 box levels
    chambers = (by_nb.get(2, [])[:] + by_nb.get(3, [])[:])[:]
    rng_pick = __import__('random').Random(42)
    composed = []
    combos = [(2, 3), (2, 3), (3, 3), (3, 3), (2, 2, 3), (3, 3, 2), (3, 3, 3), (2, 3, 3), (3, 3, 3), (2, 2, 3, 3), (3, 3, 3, 2), (3, 3, 3, 3)]
    used_ids = set()
    for combo in combos:
        picks = []
        for nb in combo:
            cand = [c for c in by_nb.get(nb, []) if id(c) not in used_ids]
            if not cand:
                cand = by_nb.get(nb, [])
            c = cand[len(picks) % len(cand)]
            picks.append(c); used_ids.add(id(c))
        grid = compose(picks)
        pushes = sum(p['pushes'] for p in picks)
        nboxes = sum(p['nboxes'] for p in picks)
        composed.append({'grid': grid, 'pushes': pushes, 'nboxes': nboxes, 'designed': True})
        print(f"composed: boxes={nboxes} pushes≥{pushes} size={len(grid)}x{len(grid[0])}", flush=True)

    # ---- final tiering ----
    everything = P + composed
    def take(nb, n, exclude):
        out = []
        for g in sorted(by_nb.get(nb, []), key=lambda x: x['pushes']):
            if id(g) in exclude: continue
            out.append(g); exclude.add(id(g))
            if len(out) == n: break
        return out
    exc = set()
    t1 = take(1, 6, exc)
    t2 = take(2, 10, exc)
    t3 = take(3, 10, exc)
    t4 = take(4, 10, exc)
    # tier5: composed medium (5-8 boxes)
    comp_sorted = sorted([c for c in composed if c['nboxes'] <= 8], key=lambda x: x['nboxes'])
    t5 = comp_sorted[:10]
    for c in t5: exc.add(id(c))
    # tier6: hardest remaining: composed 9+ and anything by pushes desc
    rest = [g for g in everything if id(g) not in exc]
    t6 = sorted(rest, key=lambda x: (x['pushes'], x['nboxes']), reverse=True)[:10]
    final = t1 + t2 + t3 + t4 + t5 + t6
    # sort within tiers already ok; ensure within-tier ascending
    print(f"\nFINAL: {len(final)} levels", flush=True)
    for i, lv in enumerate(final, 1):
        print(f"  {i:2d}: boxes={lv['nboxes']} pushes={lv['pushes']}", flush=True)
    json.dump([{'grid': lv['grid'], 'pushes': lv['pushes'], 'nboxes': lv['nboxes']} for lv in final],
              open('/tmp/opencode/sokoban/final_levels.json', 'w'))

if __name__ == '__main__':
    main()
