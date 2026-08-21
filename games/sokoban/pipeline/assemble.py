#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Assemble final 56-level set: designed (verified) + generated (verified)."""
import json, sys
sys.path.insert(0, '/tmp/opencode/sokoban')
from gen import solve

DESIGNED = [
("""#######
#     #
# @$. #
#     #
#######""", 1),
("""#######
#     #
# .$@ #
#     #
#######""", 1),
("""#####
#   #
# @ #
# $ #
# . #
#   #
#####""", 1),
("""#######
#     #
# @ # #
# $ # #
#   # #
# .   #
#######""", 1),
("""#####
# . #
# $ #
# . #
# $ #
# @ #
#####""", 2),
("""#######
#     #
# .@  #
#  $  #
#     #
##   ##
#     #
#######""", 1),
("""########
#      #
# .$@$.#
#      #
########""", 2),
("""#########
#   #   #
# $ # . #
#   #   #
## ### ##
#       #
#   @   #
#########""", 1),
("""#######
#  .. #
#  $$ #
#  @  #
#     #
#######""", 2),
("""#########
#       #
# .$$ . #
#   @   #
#       #
#########""", 2),
("""######
#    #
# #@ #
# $* #
# .* #
#    #
######""", 2),
("""#######
#     #
# $ $ #
# .@. #
#     #
#######""", 2),
("""########
#   #  #
# $ #  #
# $ #  #
# $ #  #
# @ ...#
########""", 3),
("""#########
#       #
# ## ## #
# $   $ #
#  .@.  #
#       #
#########""", 2),
("""#########
#   #   #
# $ . $ #
#. @  .#
# $   $ #
#       #
#########""", 3),
("""##########
#        #
#  ####  #
#  #..#  #
#  #..#  #
#  $$$$  #
#   @    #
##########""", 4),
("""########
#      #
# .  . #
#  $$  #
#  @   #
#      #
########""", 2),
("""##########
#        #
# ###### #
# #    # #
# # $$ # #
# # .. # #
#   @    #
##########""", 2),
("""########
#      #
# $  $ #
# #..# #
#  @   #
#      #
########""", 2),
("""#########
#   #   #
# $   $ #
#. @  .#
#       #
#########""", 2),
("""########
#      #
# $  $ #
# #..# #
#   @  #
#      #
########""", 2),
("""#########
#       #
#  ###  #
#  #.#  #
#  $ #  #
#  @$ # #
#  # .# #
#  ###  #
#       #
#########""", 2),
("""#########
##  #   #
#  $ #  #
# $# .  #
#  ###  #
# $.@   #
#  #  . #
#########""", 3),
("""##########
#    #   #
# $$ # . #
# $$   . #
#   ## . #
#  @   . #
##########""", 4),
("""########
#      #
# $#$. #
# $..$ #
# $@.$ #
# $#$. #
#      #
########""", 5),
]

def parse_and_verify(level_str):
    rows = [list(l) for l in level_str.split('\n')]
    goals, boxes, player = set(), set(), None
    for r in range(len(rows)):
        for c in range(len(rows[r])):
            ch = rows[r][c]
            if ch == '.': goals.add((r, c))
            elif ch == '$': boxes.add((r, c))
            elif ch == '@': player = (r, c)
            elif ch == '*': boxes.add((r, c)); goals.add((r, c))
            elif ch == '+': player = (r, c); goals.add((r, c))
    if player is None or len(boxes) != len(goals):
        return None
    grid = [row + [' '] * (max(len(r) for r in rows) - len(row)) for row in rows]
    pushes = solve(grid, goals, boxes, player, node_cap=3_000_000, time_cap=8.0)
    return pushes

def load_gen(path):
    d = json.load(open(path))
    out = []
    for nb, lvs in d.items():
        for lv in lvs:
            out.append({'grid': lv['grid'], 'pushes': lv['pushes'], 'nboxes': int(nb)})
    return out

def main():
    designed = []
    for s, _nb in DESIGNED:
        p = parse_and_verify(s)
        status = 'OK' if p is not None else 'DROP'
        print(f"designed: {status} pushes={p}", flush=True)
        if p is not None:
            nb = s.count('$') + s.count('*')
            designed.append({'grid': s.split('\n'), 'pushes': p, 'nboxes': nb, 'designed': True})
    gen = load_gen('/tmp/opencode/sokoban/gen_levels.json') + load_gen('/tmp/opencode/sokoban/gen_levels_hard.json')
    # dedupe gen by key
    seen = set()
    gen_u = []
    for g in gen:
        k = '\n'.join(g['grid']).replace('@', ' ')
        if k not in seen:
            seen.add(k)
            gen_u.append(g)
    pool = designed + gen_u
    by_nb = {}
    for g in pool:
        by_nb.setdefault(g['nboxes'], []).append(g)

    tiers = []
    t1 = sorted(by_nb.get(1, []), key=lambda x: x['pushes'])[:8]
    t2 = sorted(by_nb.get(2, []), key=lambda x: x['pushes'])[:10]
    t3 = sorted(by_nb.get(3, []), key=lambda x: x['pushes'])[:10]
    t4 = sorted(by_nb.get(4, []), key=lambda x: x['pushes'])[:10]
    used = {id(x) for x in (t1+t2+t3+t4)}
    rest = [x for x in pool if id(x) not in used]
    t5 = sorted(rest, key=lambda x: (x['nboxes'], x['pushes']))[:10]
    used |= {id(x) for x in t5}
    rest = [x for x in pool if id(x) not in used]
    t6 = sorted(rest, key=lambda x: x['pushes'], reverse=True)[:8]
    tiers = [t1, t2, t3, t4, t5, t6]
    final = [lv for t in tiers for lv in t]
    print(f"\nfinal: {len(final)} levels", flush=True)
    for i, lv in enumerate(final, 1):
        assert all(len(r) > 0 for r in lv['grid'])
        print(f"  {i:2d}: boxes={lv['nboxes']} pushes={lv['pushes']}" + (" designed" if lv.get('designed') else ""), flush=True)
    json.dump([{'grid': lv['grid'], 'pushes': lv['pushes'], 'nboxes': lv['nboxes']} for lv in final],
              open('/tmp/opencode/sokoban/final_levels.json', 'w'))

if __name__ == '__main__':
    main()
