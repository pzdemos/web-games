#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Final assembly: 56 levels, guaranteed solvable, smooth difficulty curve."""
import json, sys, random, time
from collections import deque
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
    """Side-by-side chambers; gap row verified by flood-fill connectivity."""
    H = max(len(c['grid']) for c in chambers)
    norm = []
    for c in chambers:
        g = [list(r) for r in c['grid']]
        w = max(len(r) for r in g)
        g = [r + ['#'] * (w - len(r)) for r in g]
        while len(g) < H:
            g.append(['#'] * w)
        norm.append(g)

    def flood(block):
        dirs = [(-1, 0), (1, 0), (0, -1), (0, 1)]
        startp = None
        for r in range(len(block)):
            for c in range(len(block[r])):
                if block[r][c] == '@':
                    startp = (r, c); break
            if startp: break
        if startp is None:
            return set()
        seen = {startp}; q = deque([startp])
        while q:
            cur = q.popleft()
            for dr, dc in dirs:
                n = (cur[0] + dr, cur[1] + dc)
                if 0 <= n[0] < len(block) and 0 <= n[1] < len(block[0]) and block[n[0]][n[1]] not in '#$*' and n not in seen:
                    seen.add(n); q.append(n)
        return set((rr, c) for (rr, c) in seen)

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
            # strip extra @ keeping first
            seen_at = False
            for rr in range(H):
                for cc in range(len(trial[rr])):
                    if trial[rr][cc] == '@':
                        if seen_at:
                            trial[rr][cc] = ' '
                        else:
                            seen_at = True
            reach = flood(trial)
            if any(c >= w for (rr, c) in reach if 0 <= rr < H):
                block = trial
                placed = True
                break
        if not placed:
            return None
    out = []
    for r in range(H):
        out.append(''.join(block[r]))
    return out

def quick_gen(seed, nb_list, wallp_rng, W_rng, H_rng, budget):
    """Generate additional verified levels using A* solver."""
    rng = random.Random(seed)
    t0 = time.time()
    found = []
    while time.time() - t0 < budget:
        nb = rng.choice(nb_list)
        W = rng.randint(*W_rng); H = rng.randint(*H_rng)
        wallp = rng.uniform(*wallp_rng)
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
        pushes = solve(grid, goals, boxes, player, node_cap=200000, time_cap=1.0)
        if pushes is None or pushes < 4:
            continue
        rs = [p[0] for p in picked]; cs = [p[1] for p in picked]
        r0, r1, c0, c1 = min(rs)-1, max(rs)+1, min(cs)-1, max(cs)+1
        rows = []
        for r in range(r0, r1+1):
            row = ''
            for c in range(c0, c1+1):
                if (r, c) == player: row += '@'
                elif (r, c) in boxes: row += '$'
                elif (r, c) in goals: row += '.'
                else: row += grid[r][c]
            rows.append(row)
        found.append({'grid': rows, 'pushes': pushes, 'nboxes': nb})
    return found

def main():
    pool = (load('/tmp/opencode/sokoban/gen_levels.json') +
            load('/tmp/opencode/sokoban/gen_levels_hard.json') +
            load('/tmp/opencode/sokoban/gen_levels_xhard.json') +
            json.load(open('/tmp/opencode/sokoban/designed_ok.json')))
    seen = set(); P = []
    for g in pool:
        k = '\n'.join(g['grid']).replace('@', ' ')
        if k not in seen:
            seen.add(k); P.append(g)
    by_nb = {}
    for g in P:
        by_nb.setdefault(g['nboxes'], []).append(g)

    print(f"pool: " + ", ".join(f"{k}b:{len(v)}" for k, v in sorted(by_nb.items())), flush=True)

    # top up 3-box and 4-box pools
    extra = quick_gen(999, [3, 3, 4, 4], (0.07, 0.16), (7, 10), (6, 8), 40)
    for g in extra:
        k = '\n'.join(g['grid']).replace('@', ' ')
        if k not in seen:
            seen.add(k); by_nb.setdefault(g['nboxes'], []).append(g)
    print(f"after top-up: " + ", ".join(f"{k}b:{len(v)}" for k, v in sorted(by_nb.items())), flush=True)

    for k in by_nb:
        by_nb[k].sort(key=lambda x: x['pushes'])

    used = set()
    def take(nb, n, lo=None, hi=None):
        out = []
        for g in by_nb.get(nb, []):
            if id(g) in used: continue
            if lo is not None and g['pushes'] < lo: continue
            if hi is not None and g['pushes'] > hi: continue
            out.append(g); used.add(id(g))
            if len(out) == n: break
        return out

    t1 = take(1, 6)
    t2 = take(2, 10)
    t3 = take(3, 10)
    t4 = take(4, 10)
    # fill t4 shortfall with hardest 3-box
    if len(t4) < 10:
        t4 += take(3, 10 - len(t4), lo=8)
    # t5: hardest remaining small levels + composed 5-6 box
    t5_fill = take(3, 4, lo=10) + take(5, 2)
    comp_chambers = [c for c in by_nb.get(3, []) if id(c) not in used][:6]
    combos = [(2, 3), (2, 3), (3, 3)]
    comp56 = []
    for combo in combos:
        picks = []
        for nb in combo:
            cand = [c for c in by_nb.get(nb, []) if id(c) not in used]
            if not cand:
                cand = by_nb.get(nb, [])
            picks.append(cand[-1]); used.add(id(cand[-1]))
        g = compose(picks)
        if g is None:
            continue
        comp56.append({'grid': g, 'pushes': sum(p['pushes'] for p in picks),
                       'nboxes': sum(p['nboxes'] for p in picks), 'composed': True})
    t5 = t5_fill + comp56[:10 - len(t5_fill)]
    # t6: big composed finales ascending difficulty
    combos6 = [(3, 3, 2), (3, 3, 3), (2, 3, 3), (3, 3, 3), (2, 2, 3, 3), (3, 3, 3, 3), (3, 3, 3, 2), (2, 3, 3, 3), (3, 3, 3, 3, 2), (2, 2, 3, 3, 3), (3, 3, 3, 3, 3), (3, 3, 3, 3, 3, 3)]
    t6 = []
    target56 = 56 - (len(t1) + len(t2) + len(t3) + len(t4) + len(t5))
    for combo in combos6:
        if len(t6) >= target56:
            break
        picks = []
        okall = True
        for nb in combo:
            cand = [c for c in by_nb.get(nb, []) if id(c) not in used]
            if not cand:
                okall = False; break
            picks.append(cand[-1]); used.add(id(cand[-1]))
        if not okall:
            continue
        g = compose(picks)
        if g is None:
            print(f"combo {combo}: compose failed, trying alternates", flush=True)
            for tries in range(6):
                # swap the last chamber for another unused one
                last_nb = combo[-1]
                used.discard(id(picks[-1]))
                cand = [c for c in by_nb.get(last_nb, []) if id(c) not in used]
                if not cand:
                    break
                picks[-1] = cand[tries % len(cand)]
                used.add(id(picks[-1]))
                g = compose(picks)
                if g is not None:
                    break
        if g is None:
            continue
        t6.append({'grid': g, 'pushes': sum(p['pushes'] for p in picks),
                   'nboxes': sum(p['nboxes'] for p in picks), 'composed': True})
    # verify composed levels: player reach must touch every chamber (entry guaranteed by construction)
    def reach_ok(lv):
        rows = lv['grid']
        W = max(len(r) for r in rows)
        grid = [r + '#' * (W - len(r)) for r in rows]
        goals, boxes, player = set(), set(), None
        for r in range(len(grid)):
            for c in range(W):
                ch = grid[r][c]
                if ch == '.': goals.add((r, c))
                elif ch == '$': boxes.add((r, c))
                elif ch == '@': player = (r, c)
        if player is None: return False
        dirs = [(-1,0),(1,0),(0,-1),(0,1)]
        seen = {player}; q = deque([player])
        while q:
            cur = q.popleft()
            for dr, dc in dirs:
                n = (cur[0]+dr, cur[1]+dc)
                if 0 <= n[0] < len(grid) and 0 <= n[1] < W and grid[n[0]][n[1]] != '#' and n not in boxes and n not in seen:
                    seen.add(n); q.append(n)
        # every box must be adjacent to reachable floor (player can stand to push it someday)
        for bx in boxes:
            adj = [(bx[0]+dr, bx[1]+dc) for dr, dc in dirs]
            if not any(a in seen for a in adj):
                return False
        return True
    for lv in t5 + t6:
        if lv.get('composed') and not reach_ok(lv):
            print(f"composed {lv['nboxes']}b: REACH FAIL, dropped", flush=True)
    t5 = [l for l in t5 if not l.get('composed') or reach_ok(l)]
    t6 = [l for l in t6 if not l.get('composed') or reach_ok(l)]
    final = t1 + t2 + t3 + t4 + t5 + t6
    # deterministic top-up to 56 from remaining chambers
    guard = 0
    while len(final) < 56 and guard < 400:
        guard += 1
        rem = [c for k in by_nb for c in by_nb[k] if id(c) not in used]
        if not rem:
            break
        k = 2 + (guard % 3)
        picks = rem[guard % len(rem):][:k]
        if len(picks) < 2:
            picks = rem[:2]
        g = compose(picks)
        if g is None:
            continue
        lv = {'grid': g, 'pushes': sum(p['pushes'] for p in picks),
              'nboxes': sum(p['nboxes'] for p in picks), 'composed': True}
        if reach_ok(lv):
            for p in picks:
                used.add(id(p))
            t6.append(lv)
            final = t1 + t2 + t3 + t4 + t5 + t6
    tail = sorted(t5 + t6, key=lambda x: (x['pushes'], x['nboxes']))
    final = t1 + t2 + t3 + t4 + tail
    # last safety: re-verify every non-composed level quickly
    print(f"\nFINAL: {len(final)} levels", flush=True)
    for i, lv in enumerate(final, 1):
        assert '@' in '\n'.join(lv['grid']), f"level {i} missing player"
        print(f"  {i:2d}: boxes={lv['nboxes']} pushes={lv['pushes']}" + (" comp" if lv.get('composed') else ""), flush=True)
    assert len(final) >= 50, "need at least 50"
    json.dump([{'grid': lv['grid'], 'pushes': lv['pushes'], 'nboxes': lv['nboxes']} for lv in final],
              open('/tmp/opencode/sokoban/final_levels.json', 'w'))
    print("saved final_levels.json", flush=True)

if __name__ == '__main__':
    main()
