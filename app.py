import os
from flask import Flask, render_template, send_from_directory, request
from flask_socketio import SocketIO, emit, join_room, leave_room
from models import db, Player, UnitState
from flask_migrate import Migrate
import mimetypes
import random
import string

mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('text/css', '.css')

app = Flask(__name__, static_folder='.', static_url_path='')
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'doodle-rts-secret!')

# Fix for Render's DATABASE_URL (postgres:// -> postgresql://)
database_url = os.environ.get('DATABASE_URL', 'sqlite:///game.db')
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)
app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)
migrate = Migrate(app, db)

with app.app_context():
    db.create_all()

# Use Redis if available (for Render deployment)
redis_url = os.environ.get('REDIS_URL')
if redis_url:
    # When using multiple gunicorn workers, we MUST use Redis for Socket.IO
    socketio = SocketIO(app, cors_allowed_origins="*", message_queue=redis_url)
else:
    socketio = SocketIO(app, cors_allowed_origins="*")

# In-memory room storage
# Format: { room_code: { host: socket_id, players: { socket_id: { name, color, ready, pId, slotIndex } }, settings: {}, status: 'lobby', slots: [] } }
ROOMS = {}

def generate_room_code():
    while True:
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
        if code not in ROOMS:
            return code

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

@app.after_request
def add_header(response):
    # Force MIME types for static files, especially on Windows
    # Check path or content_type to be sure
    path = request.path.lower()
    if path.endswith('.js'):
        response.headers['Content-Type'] = 'application/javascript'
    elif path.endswith('.css'):
        response.headers['Content-Type'] = 'text/css'
    
    # Disable caching for development
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

@socketio.on('connect')
def handle_connect():
    print('Client connected')

@socketio.on('disconnect')
def handle_disconnect():
    sid = request.sid
    # Find if the player was in a room
    for code, room in list(ROOMS.items()):
        if sid in room['players']:
            player_name = room['players'][sid]['name']
            is_playing = room.get('status') == 'playing'
            
            del room['players'][sid]
            
            if is_playing:
                # Notify others of forfeit
                emit('player_forfeited', {'playerName': player_name}, room=code)
            
            if not room['players']:
                # Last player left, delete room
                del ROOMS[code]
            else:
                # Update others
                emit('room_update', room, room=code)
                # If host left, assign new host
                if room['host'] == sid:
                    room['host'] = next(iter(room['players']))
                    emit('room_update', room, room=code)
            break
    print(f'Client disconnected: {sid}')

@socketio.on('player_focus_changed')
def handle_focus_changed(data):
    sid = request.sid
    code = data.get('code')
    focused = data.get('focused')
    
    if code in ROOMS and sid in ROOMS[code]['players']:
        room = ROOMS[code]
        player = room['players'][sid]
        player['focused'] = focused
        
        if room.get('status') != 'playing':
            return

        # Determine if we should pause or resume
        if not focused:
            # Game pauses if ANYONE loses focus
            emit('game_paused', {'playerName': player['name']}, room=code)
        else:
            # Game resumes only if EVERYONE is focused
            all_focused = all(p.get('focused', True) for p in room['players'].values())
            if all_focused:
                emit('game_resumed', room=code)


@socketio.on('create_room')
def handle_create_room(data):
    sid = request.sid
    username = data.get('username', 'Host')
    settings = data.get('settings', {
        'maxPlayers': 8,
        'maxUnits': 100,
        'mapSize': 'medium',
        'startResources': 'standard'
    })
    
    code = generate_room_code()
    print(f"Creating room {code} for host {username} (sid: {sid})")
    
    # Initialize 8 slots
    slots = []
    for i in range(8):
        slots.append({'type': 'open', 'playerId': None})
    
    # Host takes the first slot
    slots[0] = {'type': 'player', 'playerId': sid}
    
    ROOMS[code] = {
        'host': sid,
        'players': {
            sid: {
                'name': username,
                'color': '#e74c3c',
                'ready': False,
                'pId': 1,
                'slotIndex': 0
            }
        },
        'settings': settings,
        'status': 'lobby',
        'slots': slots
    }
    join_room(code)
    emit('room_created', {'code': code, 'room': ROOMS[code]})
    print(f"Room {code} created successfully")

@socketio.on('join_room')
def handle_join_room(data):
    sid = request.sid
    code = data.get('code', '').upper()
    username = data.get('username', 'Guest')
    
    if code not in ROOMS:
        emit('player_error', {'message': 'Room not found'})
        return
    
    room = ROOMS[code]
    
    # Find first open slot
    slot_index = -1
    for i, slot in enumerate(room['slots']):
        if slot['type'] == 'open':
            slot_index = i
            break
            
    if slot_index == -1:
        emit('player_error', {'message': 'Room is full or no open slots'})
        return
    
    # Assign next available pId
    used_pids = [p['pId'] for p in room['players'].values()]
    next_pid = 1
    for i in range(1, 9):
        if i not in used_pids:
            next_pid = i
            break
            
    # Default colors for new players
    default_colors = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22', '#ff9ff3', '#00d2d3']
    color = default_colors[(next_pid - 1) % len(default_colors)]

    room['players'][sid] = {
        'name': username,
        'color': color,
        'ready': False,
        'pId': next_pid,
        'slotIndex': slot_index
    }
    room['slots'][slot_index] = {'type': 'player', 'playerId': sid}
    
    join_room(code)
    print(f"User {username} ({sid}) joined room {code} in slot {slot_index}")
    emit('room_joined', {'code': code, 'room': room})
    emit('room_update', room, room=code)
    print(f'Client {sid} joined room {code}')

@socketio.on('update_slot')
def handle_update_slot(data):
    sid = request.sid
    code = data.get('code')
    index = data.get('index')
    slot_type = data.get('type') # 'open', 'closed', 'computer'
    
    if code in ROOMS and ROOMS[code]['host'] == sid:
        room = ROOMS[code]
        if 0 <= index < 8 and room['slots'][index]['type'] != 'player':
            room['slots'][index]['type'] = slot_type
            emit('room_update', room, room=code)

@socketio.on('update_settings')
def handle_update_settings(data):
    sid = request.sid
    code = data.get('code')
    settings = data.get('settings')
    
    if code in ROOMS and ROOMS[code]['host'] == sid:
        ROOMS[code]['settings'].update(settings)
        emit('room_update', ROOMS[code], room=code)

@socketio.on('update_player')
def handle_update_player(data):
    sid = request.sid
    code = data.get('code')
    if code in ROOMS and sid in ROOMS[code]['players']:
        player = ROOMS[code]['players'][sid]
        if 'color' in data:
            player['color'] = data['color']
        if 'ready' in data:
            player['ready'] = data['ready']
        emit('room_update', ROOMS[code], room=code)

@socketio.on('start_game')
def handle_start_game(data):
    sid = request.sid
    code = data.get('code')
    if code in ROOMS and ROOMS[code]['host'] == sid:
        ROOMS[code]['status'] = 'playing'
        emit('game_started', ROOMS[code], room=code)

@socketio.on('unit_update')
def handle_unit_update(data):
    # Support both list (legacy) and dict (new room-based) formats
    if isinstance(data, list):
        emit('unit_update', {'units': data}, broadcast=True, include_self=False)
        return

    code = data.get('code')
    if code:
        emit('unit_update', data, room=code, include_self=False)
    else:
        emit('unit_update', data, broadcast=True, include_self=False)

if __name__ == '__main__':
    socketio.run(app, debug=True, port=5000)
