from functools import wraps
from flask import jsonify
from backend.core.db import get_db_connection, get_current_user_id

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        conn = get_db_connection()
        try:
            user_id = get_current_user_id(conn)
            if not user_id:
                return jsonify({'error': 'Unauthorized', 'message': 'Bạn cần đăng nhập để thực hiện chức năng này.'}), 401
        finally:
            conn.close()
        return f(*args, **kwargs)
    return decorated_function

def optional_login(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # We don't check user_id here, just pass through. 
        # The route itself will call get_current_user_id if needed.
        return f(*args, **kwargs)
    return decorated_function
