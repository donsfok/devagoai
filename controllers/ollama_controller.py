import os
import logging
import requests
from flask import Blueprint, jsonify, request
from models import log_manager, LogEntry

# Настройка логирования
logger = logging.getLogger(__name__)

# Создание блюпринта
ollama_bp = Blueprint('ollama', __name__, url_prefix='/api/ollama')

# URL API Ollama по умолчанию
OLLAMA_API_URL = os.environ.get("OLLAMA_API_URL", "http://localhost:11434")

@ollama_bp.route('/set-api-url', methods=['POST'])
def set_api_url():
    """Установка URL API для Ollama"""
    global OLLAMA_API_URL
    data = request.json
    if data is None:
        return jsonify({"error": "Неверный формат данных"}), 400

    url = data.get('url')
    if not url:
        return jsonify({"error": "URL не указан"}), 400

    if not url.startswith(('http://', 'https://')):
        return jsonify({"error": "URL должен начинаться с http:// или https://"}), 400

    OLLAMA_API_URL = url

    log_manager.add_log(LogEntry(
        action="set_api_url",
        details=f"URL API изменен на {url}",
        status="success"
    ))

    return jsonify({
        "message": f"URL API успешно изменен на {url}",
        "url": url
    })

def get_ollama_url():
    """Получение URL API Ollama"""
    return OLLAMA_API_URL

@ollama_bp.route('/status', methods=['GET'])
def check_status():
    """Проверка статуса подключения к Ollama API"""
    try:
        response = requests.get(f"{OLLAMA_API_URL}/api/version", timeout=5)
        if response.status_code == 200:
            log_manager.add_log(LogEntry(
                action="check_status",
                details="Соединение с Ollama API установлено",
                status="success"
            ))
            return jsonify({
                "status": "online",
                "url": OLLAMA_API_URL
            })
        else:
            log_manager.add_log(LogEntry(
                action="check_status",
                details=f"Ошибка при проверке соединения: {response.status_code}",
                status="error"
            ))
            return jsonify({
                "status": "error",
                "message": f"Сервер вернул код ошибки: {response.status_code}"
            })
    except requests.RequestException as e:
        log_manager.add_log(LogEntry(
            action="check_status",
            details=f"Ошибка подключения: {str(e)}",
            status="error"
        ))
        return jsonify({
            "status": "offline",
            "message": f"Не удалось подключиться к Ollama API: {str(e)}"
        })

@ollama_bp.route('/models', methods=['GET'])
def get_models():
    """Получение списка доступных моделей"""
    try:
        response = requests.get(f"{OLLAMA_API_URL}/api/tags")
        if response.status_code == 200:
            log_manager.add_log(LogEntry(
                action="get_models",
                details="Получен список моделей",
                status="success"
            ))
            return jsonify(response.json())
        else:
            error_msg = f"Ошибка при получении моделей: {response.status_code}"
            log_manager.add_log(LogEntry(
                action="get_models",
                details=error_msg,
                status="error"
            ))
            return jsonify({"error": error_msg}), response.status_code
    except requests.RequestException as e:
        error_msg = f"Ошибка соединения с Ollama API: {str(e)}"
        log_manager.add_log(LogEntry(
            action="get_models",
            details=error_msg,
            status="error"
        ))
        return jsonify({"error": error_msg}), 500

@ollama_bp.route('/pull', methods=['POST'])
def pull_model():
    """Загрузка модели из репозитория"""
    data = request.json
    if not data or 'model' not in data:
        return jsonify({"error": "Имя модели не указано"}), 400

    model_name = data['model']

    try:
        response = requests.post(
            f"{OLLAMA_API_URL}/api/pull",
            json={"name": model_name}
        )

        if response.status_code == 200:
            log_manager.add_log(LogEntry(
                action="pull_model",
                details=f"Модель {model_name} успешно загружена",
                status="success"
            ))
            return jsonify({"message": f"Модель {model_name} загружается"})
        else:
            error_msg = f"Ошибка при загрузке модели: {response.status_code}"
            log_manager.add_log(LogEntry(
                action="pull_model",
                details=error_msg,
                status="error"
            ))
            return jsonify({"error": error_msg}), response.status_code
    except requests.RequestException as e:
        error_msg = f"Ошибка соединения: {str(e)}"
        log_manager.add_log(LogEntry(
            action="pull_model",
            details=error_msg,
            status="error"
        ))
        return jsonify({"error": error_msg}), 500

@ollama_bp.route('/generate', methods=['POST'])
def generate():
    """Генерация текста с помощью модели"""
    data = request.json
    if not data:
        return jsonify({"error": "Данные не предоставлены"}), 400

    model = data.get('model')
    prompt = data.get('prompt')

    if not model or not prompt:
        return jsonify({"error": "Модель или промпт не указаны"}), 400

    try:
        response = requests.post(
            f"{OLLAMA_API_URL}/api/generate",
            json={
                "model": model,
                "prompt": prompt,
                "stream": False
            }
        )

        if response.status_code == 200:
            result = response.json()
            log_manager.add_log(LogEntry(
                action="generate",
                details=f"Успешная генерация текста моделью {model}",
                status="success"
            ))
            return jsonify(result)
        else:
            error_msg = f"Ошибка при генерации: {response.status_code}"
            log_manager.add_log(LogEntry(
                action="generate",
                details=error_msg,
                status="error"
            ))
            return jsonify({"error": error_msg}), response.status_code
    except requests.RequestException as e:
        error_msg = f"Ошибка соединения: {str(e)}"
        log_manager.add_log(LogEntry(
            action="generate",
            details=error_msg,
            status="error"
        ))
        return jsonify({"error": error_msg}), 500

@ollama_bp.route('/chat', methods=['POST'])
def chat():
    """Чат с моделью"""
    data = request.json
    if not data:
        return jsonify({"error": "Данные не предоставлены"}), 400

    model = data.get('model')
    messages = data.get('messages', [])

    if not model or not messages:
        return jsonify({"error": "Модель или сообщения не указаны"}), 400

    try:
        response = requests.post(
            f"{OLLAMA_API_URL}/api/chat",
            json={
                "model": model,
                "messages": messages,
                "stream": False
            }
        )

        if response.status_code == 200:
            result = response.json()
            log_manager.add_log(LogEntry(
                action="chat",
                details=f"Успешный чат с моделью {model}",
                status="success"
            ))
            return jsonify(result)
        else:
            error_msg = f"Ошибка в чате: {response.status_code}"
            log_manager.add_log(LogEntry(
                action="chat",
                details=error_msg,
                status="error"
            ))
            return jsonify({"error": error_msg}), response.status_code
    except requests.RequestException as e:
        error_msg = f"Ошибка соединения: {str(e)}"
        log_manager.add_log(LogEntry(
            action="chat",
            details=error_msg,
            status="error"
        ))
        return jsonify({"error": error_msg}), 500

@ollama_bp.route('/logs', methods=['GET'])
def get_logs():
    """Получение логов работы с моделями"""
    limit = request.args.get('limit', 50, type=int)
    logs = log_manager.get_logs(limit)
    return jsonify(logs)