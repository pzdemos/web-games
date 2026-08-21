#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Sokoban server: static files + progress API. Stdlib only."""
import json, os, threading
from http.server import HTTPServer, SimpleHTTPRequestHandler

DATA = '/opt/sokoban/data/progress.json'
LOCK = threading.Lock()

def load_progress():
    try:
        with open(DATA) as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}

def save_progress(data):
    tmp = DATA + '.tmp'
    with open(tmp, 'w') as f:
        json.dump(data, f)
    os.replace(tmp, DATA)

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory='/opt/sokoban', **kw)

    def log_message(self, fmt, *args):
        pass

    def _json(self, obj, code=200):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path.startswith('/api/progress'):
            from urllib.parse import urlparse, parse_qs
            q = parse_qs(urlparse(self.path).query)
            player = q.get('player', [''])[0][:64]
            if not player:
                return self._json({'error': 'player required'}, 400)
            with LOCK:
                data = load_progress()
                rec = data.get(player, {'unlocked': 1, 'best': {}})
            return self._json({'ok': True, 'player': player,
                               'unlocked': rec.get('unlocked', 1),
                               'best': rec.get('best', {})})
        return super().do_GET()

    def do_POST(self):
        if self.path != '/api/progress':
            return self._json({'error': 'not found'}, 404)
        try:
            length = int(self.headers.get('Content-Length', 0))
            payload = json.loads(self.rfile.read(length).decode())
        except ValueError:
            return self._json({'error': 'bad json'}, 400)
        player = str(payload.get('player', ''))[:64]
        if not player:
            return self._json({'error': 'player required'}, 400)
        unlocked = payload.get('unlocked')
        best = payload.get('best', {})
        if not isinstance(unlocked, int) or not isinstance(best, dict):
            return self._json({'error': 'bad payload'}, 400)
        unlocked = max(1, min(int(unlocked), 9999))
        try:
            best = {str(k)[:8]: int(v) for k, v in list(best.items())[:200]}
        except (TypeError, ValueError):
            best = {}
        with LOCK:
            data = load_progress()
            rec = data.setdefault(player, {'unlocked': 1, 'best': {}})
            rec['unlocked'] = max(rec.get('unlocked', 1), unlocked)
            for k, v in list(best.items())[:200]:
                cur = rec['best'].get(k)
                if cur is None or v < cur:
                    rec['best'][k] = v
            save_progress(data)
        return self._json({'ok': True})

if __name__ == '__main__':
    os.makedirs('/opt/sokoban/data', exist_ok=True)
    server = HTTPServer(('127.0.0.1', 2050), Handler)
    print('sokoban serving on 127.0.0.1:2050')
    server.serve_forever()
