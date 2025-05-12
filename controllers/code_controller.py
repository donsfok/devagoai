
from flask import Blueprint, jsonify, request
from models.code_manager import CodeManager

code_bp = Blueprint('code', __name__, url_prefix='/api/code')
code_manager = CodeManager()

@code_bp.route('/changes/create', methods=['POST'])
def create_changes():
    """Создает новую ветку для изменений"""
    data = request.json
    description = data.get('description', 'AI changes')
    
    try:
        branch = code_manager.create_change_branch(description)
        return jsonify({
            "status": "success",
            "branch": branch
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@code_bp.route('/changes/commit', methods=['POST'])
def commit_changes():
    """Коммитит изменения в ветку"""
    data = request.json
    files = data.get('files', [])
    message = data.get('message', 'AI: Code modifications')
    
    try:
        code_manager.commit_changes(files, message)
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
