
from flask import Blueprint, jsonify, current_app, request
from functools import wraps
import jwt
import datetime

api_bp = Blueprint('api', __name__, url_prefix='/api')

def require_token(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
            
        try:
            token = token.split()[1]  # Remove 'Bearer ' prefix
            jwt.decode(token, 'your-secret-key', algorithms=['HS256'])
        except:
            return jsonify({'error': 'Invalid token'}), 401
            
        return f(*args, **kwargs)
    return decorated

@api_bp.route('/token', methods=['POST'])
def get_token():
    auth = request.authorization
    if not auth or not auth.username or not auth.password:
        return jsonify({'error': 'Invalid credentials'}), 401
        
    # Here should be your user validation
    if auth.username == "admin" and auth.password == "password":
        token = jwt.encode({
            'user': auth.username,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, 'your-secret-key')
        return jsonify({'token': token})
        
    return jsonify({'error': 'Invalid credentials'}), 401

@api_bp.route('/models', methods=['GET'])
@require_token
def get_models():
    # Implementation for getting models list
    return jsonify({'models': []})

@api_bp.route('/chat', methods=['POST'])
@require_token
def chat():
    data = request.json
    if not data or 'message' not in data:
        return jsonify({'error': 'Message is required'}), 400
        
    # Implementation for chat
    return jsonify({'response': 'AI response'})
@api_bp.route('/version')
def get_version():
    return jsonify({'version': current_app.config['version']})
