
from flask import Blueprint, jsonify, request
from models.log_manager import LogEntry, log_manager

model_params_bp = Blueprint('model_params', __name__, url_prefix='/api/model-params')

@model_params_bp.route('/settings/<model_name>', methods=['GET'])
def get_model_settings(model_name):
    """Получение настроек модели"""
    try:
        # TODO: Реализовать получение настроек из базы данных
        default_settings = {
            'temperature': 0.7,
            'top_p': 0.9,
            'max_tokens': 2048,
            'presence_penalty': 0,
            'frequency_penalty': 0
        }
        return jsonify(default_settings)
    except Exception as e:
        log_manager.add_log(LogEntry(
            action="get_model_settings",
            details=f"Ошибка при получении настроек модели {model_name}: {str(e)}",
            status="error"
        ))
        return jsonify({"error": str(e)}), 500

@model_params_bp.route('/settings/<model_name>', methods=['POST'])
def update_model_settings(model_name):
    """Обновление настроек модели"""
    try:
        data = request.json
        # TODO: Сохранение настроек в базу данных
        log_manager.add_log(LogEntry(
            action="update_model_settings",
            details=f"Настройки модели {model_name} обновлены",
            status="success"
        ))
        return jsonify({"message": "Настройки обновлены"})
    except Exception as e:
        log_manager.add_log(LogEntry(
            action="update_model_settings", 
            details=f"Ошибка при обновлении настроек модели {model_name}: {str(e)}",
            status="error"
        ))
        return jsonify({"error": str(e)}), 500
