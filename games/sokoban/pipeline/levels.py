#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Sokoban level set + BFS solvability verifier."""
import sys
from collections import deque

LEVELS = [
# ---- Tier 1: 入门 (1-10) ----
"""
#######
#     #
# @$. #
#     #
#######
""",
"""
#######
#     #
# .$@ #
#     #
#######
""",
"""
#####
#   #
# @ #
# $ #
# . #
#   #
#####
""",
"""
#######
#     #
# @ # #
# $ # #
#   # #
# .   #
#######
""",
"""
#####
# @ #
# $ #
# $ #
# . #
# . #
#####
""",
"""
#######
#     #
# .@  #
#  $  #
#     #
##   ##
#     #
#######
""",
"""
########
#      #
# .$@$.#
#      #
########
""",
"""
#########
#   #   #
# $ # . #
#   #   #
## ### ##
#   @   #
#########
""",
"""
#######
#  .. #
#  $$ #
#  @  #
#     #
#######
""",
"""
#########
#       #
# .$$ . #
#   @   #
#       #
#########
""",
# ---- Tier 2: 基础 (11-20) ----
"""
######
#    #
# #@ #
# $* #
# .* #
#    #
######
""",
"""
#######
#     #
# .$. #
# $@$ #
# .$. #
#     #
#######
""",
"""
########
#   #  #
# $ #  #
# $ #  #
# $ #  #
# @ ...#
########
""",
"""
#########
#       #
# ## ## #
# $   $ #
#  .@.  #
#       #
#########
""",
"""
#########
#   #   #
# $ . $ #
#. @  .#
# $   $ #
#       #
#########
""",
"""
##########
#        #
#  ####  #
#  #..#  #
#  #..#  #
#  $$$$  #
#   @    #
##########
""",
"""
########
#      #
# .  . #
#  $$  #
#  @   #
#      #
########
""",
"""
##########
#        #
# ###### #
# #    # #
# # $$ # #
# # .. # #
#   @    #
##########
""",
"""
########
#      #
# $  $ #
# #..# #
#  @   #
#      #
########
""",
"""
#########
#   #   #
# $   $ #
#. @  .#
#       #
#########
""",
"""
########
#      #
# $  $ #
# #..# #
#   @  #
#      #
########
""",
# ---- Tier 3: 进阶 (21-30) ----
"""
#########
#       #
#  ###  #
#  #.#  #
#  $ #  #
#  @$ # #
#  # .# #
#  ###  #
#       #
#########
""",
"""
########
#   #  #
# $ #. #
#   #  #
##   # #
# $ .# #
##$.#  #
#  @   #
########
""",
"""
#########
#  #    #
#  $ ## #
# ##.$  #
#  $ ## #
#  #. $ #
# ## .# #
#   @  #
#########
""",
"""
##########
#        #
#  ####  #
#  #..#  #
#  #..#  #
#  $$    #
#   $$ @ #
##########
""",
"""
########
#  #   #
#  $ # #
##.# # #
#  $#  #
# @ .  #
#  # . #
########
""",
"""
#########
#       #
# ##### #
# #...# #
# #$$$ #
#   @   #
#########
""",
"""
########
#. #   #
#  # $ #
#  # $ #
#  ##$ #
#     .#
#  @  .#
########
""",
"""
#########
##  #   #
#  $ #  #
# $# .  #
#  ###  #
# $.@   #
#  #  . #
#########
""",
"""
##########
#    #   #
# $$ # . #
# $$   . #
#   ## . #
#  @   . #
##########
""",
"""
########
#      #
# $#$. #
# $..$ #
# $@.$ #
# $#$. #
#      #
########
""",
# ---- Tier 4: 挑战 (31-40) ----
"""
##########
#   #    #
# $ # .. #
# $   .. #
# $ ##.. #
#        #
#   @    #
##########
""",
"""
##########
#  ##    #
#  $$ .  #
## $$ .  #
#   #  . #
#   @  . #
##########
""",
"""
##########
#    #   #
# $$ # . #
#  $   . #
#  $## . #
#     .  #
#   @    #
##########
""",
"""
##########
#     #  #
# $$$ #  #
#  $      #
#  ###### #
#  .....  #
#    @    #
##########
""",
"""
##########
#        #
# $$$$$  #
# #...#  #
#  ...   #
#   @    #
##########
""",
"""
##########
#  #     #
#  $  #  #
# ##$ #  #
#  $  #  #
# #@$.#  #
#  #..#  #
#  ####  #
##########
""",
"""
###########
#     #   #
# $$$ # . #
# $ $   . #
# $ $   . #
#     # . #
#    @# . #
###########
""",
"""
##########
#   #    #
# $ $ $. #
# $ $ $. #
#     #  #
#   @    #
##########
""",
"""
##########
# #   #  #
# # $ #  #
# #.$.#  #
# # $ #  #
# ##.##  #
#   @    #
##########
""",
"""
##########
#        #
#  $  $  #
# $....$ #
#  $  $  #
#   @    #
##########
""",
# ---- Tier 5: 困难 (41-50) ----
"""
###########
#    #    #
# $$ # $$ #
#  $   $  #
# #.....# #
#  $   $  #
# $$ @ $$ #
#    #    #
###########
""",
"""
###########
#     #   #
# $$$ # . #
#  $    . #
# $ $  #. #
#      .  #
#  ## # . #
#   @ #   #
###########
""",
"""
###########
#         #
# $ $ $ $ #
#  #####  #
#  #...#  #
#  #$ $#  #
#  $ @ $  #
#  ## ##  #
###########
""",
"""
###########
#  #   #  #
#  $ . $  #
# ##. .## #
#  $@$@$  #
# ##. .## #
#  # . #  #
#    #    #
###########
""",
"""
############
#     #    #
# $$$ # .. #
# $ $   .. #
# $ $  #.  #
#      .   #
#  ##  #.  #
#   @  #   #
############
""",
"""
############
#          #
# $ $ $ $  #
# #......# #
#          #
# $ $ $ $ @#
#          #
############
""",
"""
############
#   #      #
# $ $  ### #
# $ $  #.# #
# $ $  #.# #
#      #.# #
#  @   ### #
#          #
############
""",
"""
############
#          #
#  $ $ $   #
## .... #  #
#  $@$ $   #
#    $ $   #
#          #
############
""",
"""
############
#    #     #
# $$ # ... #
#  $    .. #
# $ $ ## . #
#      #   #
#  @   #   #
############
""",
"""
###########
#         #
# $ $ $ $ #
#  ...    #
#  ...    #
# $ $ $ $ #
#    @    #
###########
""",
# ---- Tier 6: 大师 (51-56) ----
"""
############
#          #
#  $ $ $   #
#  #$#$#   #
#  . . .   #
#  #$#$#   #
#  $ @ $   #
#          #
############
""",
"""
############
#     #    #
# $$$ # $$ #
#  $     $ #
# # .....# #
#  $     $ #
# $$ @ $$  #
#     #    #
############
""",
"""
#############
#           #
# $ $ $ $ $ #
#  #.....#  #
#  #.....#  #
# $ $ $ $ $ #
#     @     #
#############
""",
"""
############
#          #
# $$$$$$$  #
# #.....#  #
#          #
# $$$$$$$  #
#     @    #
############
""",
"""
############
#   #  #   #
# $ $  $ $ #
#  . .. .  #
#  .$@$.   #
#  . .. .  #
# $ $  $ $ #
#   #  #   #
############
""",
"""
#############
#           #
#  $ $ $ $  #
#  #######  #
#  #.....#  #
#  #.....#  #
#  #######  #
#     @     #
#           #
#############
""",
]

WALL, GOAL, BOX, PLAYER, BOX_ON_GOAL, PLAYER_ON_GOAL = '#', '.', '$', '@', '*', '+'

def parse(level_str):
    rows = [list(line.rstrip('\n')) for line in level_str.split('\n') if line.strip()]
    h = len(rows)
    w = max(len(r) for r in rows)
    grid = [r + [' '] * (w - len(r)) for r in rows]
    goals, boxes, player = set(), set(), None
    for r in range(h):
        for c in range(w):
            ch = grid[r][c]
            if ch == GOAL:
                goals.add((r, c))
            elif ch == BOX:
                boxes.add((r, c))
            elif ch == PLAYER:
                player = (r, c)
            elif ch == BOX_ON_GOAL:
                boxes.add((r, c)); goals.add((r, c))
            elif ch == PLAYER_ON_GOAL:
                player = (r, c); goals.add((r, c))
    return grid, h, w, frozenset(goals), frozenset(boxes), player

def bfs_solve(level_str, max_states=4_000_000):
    grid, h, w, goals, boxes, player = parse(level_str)
    if player is None:
        return None, "no player"
    if len(boxes) != len(goals):
        return None, f"box/goal mismatch {len(boxes)}/{len(goals)}"
    def wall(p):
        return grid[p[0]][p[1]] == WALL
    # corner deadlock: box against two perpendicular walls, not on goal
    def corner_dead(bx):
        r, c = bx
        if bx in goals:
            return False
        up, dn, lf, rt = wall((r-1,c)), wall((r+1,c)), wall((r,c-1)), wall((r,c+1))
        return (up and lf) or (up and rt) or (dn and lf) or (dn and rt)
    dirs = [(-1,0),(1,0),(0,-1),(0,1)]
    def reach(p, bxs):
        seen = {p}
        q = deque([p])
        while q:
            cur = q.popleft()
            for dr, dc in dirs:
                n = (cur[0]+dr, cur[1]+dc)
                if not wall(n) and n not in bxs and n not in seen:
                    seen.add(n)
                    q.append(n)
        return seen
    R0 = reach(player, boxes)
    start = (frozenset(boxes), min(R0))
    seen = {start}
    q = deque([(boxes, min(R0), 0)])
    while q:
        bxs, pseed, pushes = q.popleft()
        if all(bx in goals for bx in bxs):
            return pushes, "ok"
        if len(seen) > max_states:
            return None, "state explosion"
        R = reach(pseed, bxs)  # player-reachable cells in this state
        for bx in bxs:
            for dr, dc in dirs:
                from_cell = (bx[0]-dr, bx[1]-dc)
                to_cell = (bx[0]+dr, bx[1]+dc)
                if from_cell not in R:
                    continue
                if wall(to_cell) or to_cell in bxs:
                    continue
                if corner_dead(to_cell):
                    continue
                nb = set(bxs); nb.discard(bx); nb.add(to_cell)
                nb = frozenset(nb)
                nseed = min(reach(from_cell, nb))  # player ends at from_cell after push
                state = (nb, nseed)
                if state not in seen:
                    seen.add(state)
                    q.append((nb, nseed, pushes + 1))
    return None, "unsolvable"

def main():
    all_ok = True
    for i, lv in enumerate(LEVELS, 1):
        pushes, msg = bfs_solve(lv)
        if pushes is None:
            all_ok = False
            print(f"Level {i:2d}: FAIL ({msg})", flush=True)
        else:
            print(f"Level {i:2d}: OK   min-pushes={pushes}", flush=True)
    print(f"\nTotal: {len(LEVELS)} levels, {'ALL SOLVABLE' if all_ok else 'HAS FAILURES'}")
    return 0 if all_ok else 1

if __name__ == '__main__':
    sys.exit(main())
