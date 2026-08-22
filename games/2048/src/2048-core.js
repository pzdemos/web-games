/*
 * 2048 确定性核心引擎（UMD：浏览器 + Node 通用）
 * 前端游戏逻辑与服务端重放验证共用同一份代码。
 *
 * 设计：回合制状态机。随机出块（位置+数值）由 seed 派生（mulberry32），
 * 抽取顺序与原实现一致：先位置后数值。走子为 '0'上/'1'右/'2'下/'3'左，
 * 仅记录"实际移动了"的走子（空走不改变状态，跳过安全）。
 *
 * ⚠️ 同步副本：/opt/gameapi/src/games/2048-core.js（md5 须一致），改后 restart gameapi
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Core2048 = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SIZE = 4;
  const MAX_MOVES = 30000;

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  function createGame(seed) {
    return {
      seed: String(seed), rnd: mulberry32(hashStr(String(seed))),
      grid: emptyGrid(), score: 0, moves: 0, idSeq: 0, over: false, maxTile: 0
    };
  }
  function emptyGrid() { const g = []; for (let r = 0; r < SIZE; r++) g.push(new Array(SIZE).fill(null)); return g; }

  // 随机出块：先抽位置（行优先空格列表），再抽数值（<0.9 → 2，否则 4）
  function addRandom(s) {
    const spots = [];
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (!s.grid[r][c]) spots.push([r, c]);
    if (!spots.length) return null;
    const [r, c] = spots[Math.floor(s.rnd() * spots.length)];
    const t = { v: s.rnd() < 0.9 ? 2 : 4, id: ++s.idSeq };
    s.grid[r][c] = t;
    if (t.v > s.maxTile) s.maxTile = t.v;
    return { r, c, v: t.v, id: t.id };
  }
  function startGame(s) { addRandom(s); addRandom(s); }

  function getVec(dir) { return { 0: { r: -1, c: 0 }, 1: { r: 0, c: 1 }, 2: { r: 1, c: 0 }, 3: { r: 0, c: -1 } }[dir]; }
  function buildTraversals(v) {
    const rows = [], cols = [];
    for (let i = 0; i < SIZE; i++) { rows.push(i); cols.push(i); }
    if (v.r === 1) rows.reverse();
    if (v.c === 1) cols.reverse();
    return { rows, cols };
  }
  function clearFlags(s) {
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (s.grid[r][c]) s.grid[r][c].merged = false;
  }
  function isOver(s) {
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
      if (!s.grid[r][c]) return false;
      const v = s.grid[r][c].v;
      if (r + 1 < SIZE && s.grid[r + 1][c] && s.grid[r + 1][c].v === v) return false;
      if (c + 1 < SIZE && s.grid[r][c + 1] && s.grid[r][c + 1].v === v) return false;
    }
    return true;
  }

  // 走一步。返回 {moved, gained, anims, spawn, over, won2048}
  function move(s, dir) {
    if (s.over) return { moved: false, gained: 0, anims: [], spawn: null, over: true, won2048: false };
    clearFlags(s);
    let moved = false, gained = 0, won2048 = false;
    const vec = getVec(dir), trav = buildTraversals(vec), anims = [];
    for (const r of trav.rows) {
      for (const c of trav.cols) {
        const t = s.grid[r][c]; if (!t) continue;
        let pr = r, pc = c;
        for (; ;) {
          const nr = pr + vec.r, nc = pc + vec.c;
          if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE || s.grid[nr][nc]) break;
          pr = nr; pc = nc;
        }
        const mr = pr + vec.r, mc = pc + vec.c;
        if (mr >= 0 && mr < SIZE && mc >= 0 && mc < SIZE) {
          const tgt = s.grid[mr][mc];
          if (tgt && tgt.v === t.v && !tgt.merged) {
            s.grid[r][c] = null;
            const merged = { v: t.v * 2, id: ++s.idSeq, merged: true };
            s.grid[mr][mc] = merged;
            s.score += merged.v; gained += merged.v;
            if (merged.v === 2048) won2048 = true;
            if (merged.v > s.maxTile) s.maxTile = merged.v;
            moved = true;
            anims.push({ type: 'merge', srcId: t.id, dstId: tgt.id, newId: merged.id, r: mr, c: mc, v: merged.v });
            continue;
          }
        }
        if (pr !== r || pc !== c) {
          s.grid[r][c] = null; s.grid[pr][pc] = t; moved = true;
          anims.push({ type: 'slide', id: t.id, r: pr, c: pc });
        }
      }
    }
    if (!moved) return { moved: false, gained: 0, anims: [], spawn: null, over: false, won2048: false };
    s.moves++;
    const spawn = addRandom(s);
    const over = isOver(s);
    if (over) s.over = true;
    return { moved: true, gained, anims, spawn, over, won2048 };
  }

  // ---- 走子序列化：每步一个字符 '0'-'3'（仅有效走子） ----
  function serializeMoves(dirs) { return dirs.join(''); }
  function parseMoves(str) {
    if (typeof str !== 'string' || !str || str.length > MAX_MOVES) return null;
    if (!/^[0-3]+$/.test(str)) return null;
    return str.split('').map(Number);
  }

  return { SIZE, MAX_MOVES, mulberry32, hashStr, createGame, startGame, move, isOver, serializeMoves, parseMoves };
});
