
import os
import git
import logging
from flask import Blueprint, jsonify, request
from models import log_manager, LogEntry

self_programming_bp = Blueprint('self_programming', __name__, url_prefix='/api/self')
logger = logging.getLogger(__name__)

# Инициализация git репозитория
try:
    repo = git.Repo('.')
except git.exc.InvalidGitRepositoryError:
    repo = git.Repo.init('.')

@self_programming_bp.route('/analyze', methods=['POST'])
def analyze_code():
    """Анализ кода с помощью ИИ"""
    data = request.json
    if not data or 'file_path' not in data:
        return jsonify({"error": "Путь к файлу не указан"}), 400
        
    file_path = data['file_path']
    try:
        with open(file_path, 'r') as f:
            code = f.read()
            
        # Здесь будет анализ кода через Ollama
        return jsonify({
            "status": "success",
            "suggestions": []
        })
    except Exception as e:
        logger.error(f"Ошибка при анализе кода: {str(e)}")
        return jsonify({"error": str(e)}), 500

@self_programming_bp.route('/modify', methods=['POST'])
def modify_code():
    """Модификация кода с подтверждением"""
    data = request.json
    if not data or 'file_path' not in data or 'changes' not in data:
        return jsonify({"error": "Необходимые данные не предоставлены"}), 400
        
    file_path = data['file_path']
    changes = data['changes']
    
    # Создаем новую ветку для изменений
    branch_name = f"ai_changes_{int(time.time())}"
    repo.git.checkout('-b', branch_name)
    
    try:
        with open(file_path, 'w') as f:
            f.write(changes)
            
        # Коммитим изменения
        repo.index.add([file_path])
        repo.index.commit(f"AI: Модификация {file_path}")
        
        return jsonify({
            "status": "success",
            "branch": branch_name
        })
    except Exception as e:
        logger.error(f"Ошибка при модификации кода: {str(e)}")
        repo.git.checkout('master')
        repo.git.branch('-D', branch_name)
        return jsonify({"error": str(e)}), 500
