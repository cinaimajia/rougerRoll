#!/usr/bin/env python3
import json
import random
import string
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

ROOMS = {}


def now_str():
  return datetime.now().strftime('%H:%M:%S')


def random_id(n=6):
  return ''.join(random.choice(string.ascii_uppercase + string.digits) for _ in range(n))


def make_player_token():
  return ''.join(random.choice(string.ascii_lowercase + string.digits) for _ in range(18))


def init_room():
  return {
    'hp': {'p1': 20, 'p2': 20},
    'maxHp': {'p1': 20, 'p2': 20},
    'wins': {'p1': 0, 'p2': 0},
    'stats': {
      'p1': {'attack': 0, 'reduction': 0, 'lifesteal': 0, 'maxHpBonus': 0},
      'p2': {'attack': 0, 'reduction': 0, 'lifesteal': 0, 'maxHpBonus': 0},
    },
    'activeSide': 'p1',
    'roundCount': 0,
    'gameOver': False,
    'ready': False,
    'message': '等待对手加入房间...',
    'logs': [{'time': now_str(), 'message': '房间已创建，等待玩家2加入。'}],
    'players': {},
  }


def append_log(room, msg):
  room['logs'].insert(0, {'time': now_str(), 'message': msg})
  room['logs'] = room['logs'][:60]


def apply_boon(room, loser):
  choice = random.choice(['attack', 'reduction', 'lifesteal', 'maxHpBonus'])
  if choice == 'attack':
    room['stats'][loser]['attack'] += 1
    return '攻击力 +1'
  if choice == 'reduction':
    room['stats'][loser]['reduction'] += 1
    return '减伤 +1'
  if choice == 'lifesteal':
    room['stats'][loser]['lifesteal'] += 1
    return '造成伤害后回复 1 点生命'
  room['stats'][loser]['maxHpBonus'] += 4
  return '生命上限 +4'


def reset_round_hp(room):
  for side in ('p1', 'p2'):
    room['maxHp'][side] = 20 + room['stats'][side]['maxHpBonus']
    room['hp'][side] = room['maxHp'][side]


def room_public(room):
  return {
    'hp': room['hp'],
    'maxHp': room['maxHp'],
    'wins': room['wins'],
    'activeSide': room['activeSide'],
    'roundCount': room['roundCount'],
    'gameOver': room['gameOver'],
    'ready': room['ready'],
    'message': room['message'],
    'logs': room['logs'],
  }


class Handler(SimpleHTTPRequestHandler):
  def _json(self, code, payload):
    raw = json.dumps(payload, ensure_ascii=False).encode('utf-8')
    self.send_response(code)
    self.send_header('Content-Type', 'application/json; charset=utf-8')
    self.send_header('Content-Length', str(len(raw)))
    self.end_headers()
    self.wfile.write(raw)

  def _read_json(self):
    length = int(self.headers.get('Content-Length', '0'))
    if length == 0:
      return {}
    return json.loads(self.rfile.read(length).decode('utf-8'))

  def do_GET(self):
    parsed = urlparse(self.path)
    if parsed.path == '/api/state':
      room_id = parse_qs(parsed.query).get('room', [''])[0]
      room = ROOMS.get(room_id)
      if not room:
        return self._json(404, {'error': '房间不存在'})
      return self._json(200, room_public(room))
    return super().do_GET()

  def do_POST(self):
    if self.path == '/api/create-room':
      room_id = random_id()
      token = make_player_token()
      room = init_room()
      room['players']['p1'] = token
      ROOMS[room_id] = room
      return self._json(200, {'roomId': room_id, 'token': token, 'state': room_public(room)})

    if self.path == '/api/join-room':
      data = self._read_json()
      room = ROOMS.get(data.get('roomId', ''))
      if not room:
        return self._json(404, {'error': '房间不存在'})
      if 'p2' in room['players']:
        return self._json(409, {'error': '房间已满'})
      token = make_player_token()
      room['players']['p2'] = token
      room['ready'] = True
      room['message'] = '双方已就绪，轮到玩家1行动。'
      append_log(room, '玩家2已加入，PVP 对战开始。')
      return self._json(200, {'token': token, 'side': 'p2', 'state': room_public(room)})

    if self.path == '/api/reset':
      data = self._read_json()
      room = ROOMS.get(data.get('roomId', ''))
      if not room:
        return self._json(404, {'error': '房间不存在'})
      token = data.get('token', '')
      if token not in room['players'].values():
        return self._json(403, {'error': '无效玩家'})
      old_players = dict(room.get('players', {}))
      room.update(init_room())
      room['players'] = old_players
      room['ready'] = bool(room['players'].get('p1') and room['players'].get('p2'))
      room['message'] = '双方已就绪，轮到玩家1行动。' if room['ready'] else '等待对手加入房间...'
      append_log(room, '对局已重置。')
      return self._json(200, room_public(room))

    if self.path == '/api/action':
      data = self._read_json()
      room = ROOMS.get(data.get('roomId', ''))
      if not room:
        return self._json(404, {'error': '房间不存在'})
      token = data.get('token', '')
      side = 'p1' if room['players'].get('p1') == token else ('p2' if room['players'].get('p2') == token else '')
      if not side:
        return self._json(403, {'error': '无效玩家'})
      if not room['ready']:
        return self._json(409, {'error': '对手尚未加入'})
      if room['gameOver']:
        return self._json(409, {'error': '对局已结束'})
      if room['activeSide'] != side:
        return self._json(409, {'error': '未到你的回合'})

      attacker = side
      defender = 'p2' if side == 'p1' else 'p1'
      roll = random.randint(1, 6)
      damage = max(0, roll + room['stats'][attacker]['attack'] - room['stats'][defender]['reduction'])
      room['hp'][defender] = max(0, room['hp'][defender] - damage)

      if damage > 0 and room['stats'][attacker]['lifesteal'] > 0:
        room['hp'][attacker] = min(room['maxHp'][attacker], room['hp'][attacker] + room['stats'][attacker]['lifesteal'])

      append_log(room, f"{'玩家1' if attacker == 'p1' else '玩家2'} 掷出 {roll}，造成 {damage} 点伤害。")

      if room['hp'][defender] == 0:
        room['wins'][attacker] += 1
        room['roundCount'] += 1
        append_log(room, f"第 {room['roundCount']} 小局结束，{'玩家1' if attacker == 'p1' else '玩家2'} 获胜。")

        if room['wins'][attacker] >= 2:
          room['gameOver'] = True
          room['message'] = f"{'玩家1' if attacker == 'p1' else '玩家2'} 连赢两局，获得本场胜利！"
          append_log(room, room['message'])
          return self._json(200, room_public(room))

        boon_text = apply_boon(room, defender)
        append_log(room, f"{'玩家1' if defender == 'p1' else '玩家2'} 获得败者增益：{boon_text}。")
        reset_round_hp(room)
        room['activeSide'] = defender
        room['message'] = f"{'玩家1' if attacker == 'p1' else '玩家2'} 赢下小局，{'玩家1' if defender == 'p1' else '玩家2'} 获得随机增益并先手。"
        return self._json(200, room_public(room))

      room['activeSide'] = defender
      room['message'] = f"轮到 {'玩家1' if defender == 'p1' else '玩家2'} 行动。"
      return self._json(200, room_public(room))

    return self._json(404, {'error': 'unknown api'})


def main():
  server = ThreadingHTTPServer(('0.0.0.0', 8000), Handler)
  print('PVP server started at http://0.0.0.0:8000')
  server.serve_forever()


if __name__ == '__main__':
  main()
