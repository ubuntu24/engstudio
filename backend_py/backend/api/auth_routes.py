from flask import Blueprint, request, jsonify, session as flask_session
from werkzeug.security import generate_password_hash, check_password_hash
from markupsafe import escape
from backend.core.db import get_db_connection
from backend.core.extensions import limiter

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/api/auth/register', methods=['POST'])
@limiter.limit("10 per hour")
def auth_register():
    data = request.get_json(silent=True) or {}
    username = str(escape((data.get('username') or '').strip().lower()))
    password = data.get('password') or ''
    display_name = str(escape((data.get('display_name') or '').strip())) or username

    if not username or not password:
        return jsonify({'error': 'Tên đăng nhập và mật khẩu không được để trống.'}), 400

    if len(username) < 3:
        return jsonify({'error': 'Tên đăng nhập phải có ít nhất 3 ký tự.'}), 400

    if len(password) < 6:
        return jsonify({'error': 'Mật khẩu phải có ít nhất 6 ký tự.'}), 400

    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE username = ?", (username,))
        if cur.fetchone():
            return jsonify({'error': 'Tên đăng nhập đã tồn tại.'}), 400

        pwd_hash = generate_password_hash(password)
        cur.execute(
            "INSERT INTO users (username, password_hash, display_name) VALUES (?, ?, ?)",
            (username, pwd_hash, display_name)
        )
        user_id = cur.lastrowid
        conn.commit()

        flask_session['user_id'] = user_id
        flask_session['username'] = username

        return jsonify({
            'ok': True,
            'user': {
                'id': user_id,
                'username': username,
                'display_name': display_name
            }
        })
    finally:
        conn.close()

@auth_bp.route('/api/auth/login', methods=['POST'])
@limiter.limit("20 per hour")
def auth_login():
    data = request.get_json(silent=True) or {}
    username = (data.get('username') or '').strip().lower()
    password = data.get('password') or ''

    if not username or not password:
        return jsonify({'error': 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.'}), 400

    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM users WHERE username = ?", (username,))
        user = cur.fetchone()

        if not user or not user['password_hash'] or not check_password_hash(user['password_hash'], password):
            return jsonify({'error': 'Tên đăng nhập hoặc mật khẩu không chính xác.'}), 401

        flask_session['user_id'] = user['id']
        flask_session['username'] = user['username']

        return jsonify({
            'ok': True,
            'user': {
                'id': user['id'],
                'username': user['username'],
                'display_name': user['display_name'] or user['username']
            }
        })
    finally:
        conn.close()

@auth_bp.route('/api/auth/logout', methods=['POST'])
def auth_logout():
    flask_session.pop('user_id', None)
    flask_session.pop('username', None)
    return jsonify({'ok': True})

@auth_bp.route('/api/auth/me')
def auth_me():
    user_id = flask_session.get('user_id')
    if not user_id:
        return jsonify({'user': None})

    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, username, display_name FROM users WHERE id = ?", (user_id,))
        user = cur.fetchone()
        if not user:
            flask_session.pop('user_id', None)
            return jsonify({'user': None})

        return jsonify({
            'user': {
                'id': user['id'],
                'username': user['username'],
                'display_name': user['display_name'] or user['username']
            }
        })
    finally:
        conn.close()
