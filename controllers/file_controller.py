import os
import logging
from flask import Blueprint, jsonify, request
from models import log_manager, LogEntry

# Настройка логирования
logger = logging.getLogger(__name__)

# Создание блюпринта для работы с файлами
file_bp = Blueprint('file', __name__, url_prefix='/api/file')

# Ограничиваем доступные директории текущей директорией и её поддиректориями
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def is_path_allowed(path):
    """Проверяет, что путь находится внутри разрешенной директории"""
    # Получаем абсолютный путь
    abs_path = os.path.abspath(path)
    # Проверяем, что путь внутри базовой директории
    return abs_path.startswith(BASE_DIR)

@file_bp.route('/list', methods=['GET'])
def list_files():
    """Получение списка файлов в директории"""
    path = request.args.get('path', '.')
    
    # Полный путь к директории
    full_path = os.path.join(BASE_DIR, path)
    
    # Проверяем, что путь разрешен
    if not is_path_allowed(full_path):
        log_manager.add_log(LogEntry(
            action="list_files",
            details=f"Попытка доступа к запрещенному пути: {path}",
            status="warning"
        ))
        return jsonify({
            "error": "Доступ запрещен"
        }), 403
    
    try:
        # Получаем список файлов и директорий
        items = []
        for item in os.listdir(full_path):
            item_path = os.path.join(full_path, item)
            item_type = "directory" if os.path.isdir(item_path) else "file"
            items.append({
                "name": item,
                "type": item_type,
                "path": os.path.join(path, item).replace("\\", "/")
            })
        
        log_manager.add_log(LogEntry(
            action="list_files",
            details=f"Получен список файлов для пути: {path}",
            status="info"
        ))
        
        return jsonify({
            "path": path,
            "items": items
        })
    
    except Exception as e:
        log_manager.add_log(LogEntry(
            action="list_files",
            details=f"Ошибка при получении списка файлов: {str(e)}",
            status="error"
        ))
        return jsonify({
            "error": f"Ошибка при получении списка файлов: {str(e)}"
        }), 500

@file_bp.route('/read', methods=['GET'])
def read_file():
    """Чтение содержимого файла"""
    path = request.args.get('path', '')
    
    if not path:
        return jsonify({"error": "Путь к файлу не указан"}), 400
    
    # Полный путь к файлу
    full_path = os.path.join(BASE_DIR, path)
    
    # Проверяем, что путь разрешен
    if not is_path_allowed(full_path):
        log_manager.add_log(LogEntry(
            action="read_file",
            details=f"Попытка доступа к запрещенному пути: {path}",
            status="warning"
        ))
        return jsonify({
            "error": "Доступ запрещен"
        }), 403
    
    try:
        # Проверяем, что это файл
        if not os.path.isfile(full_path):
            return jsonify({
                "error": "Указанный путь не является файлом"
            }), 400
        
        # Читаем содержимое файла
        with open(full_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        log_manager.add_log(LogEntry(
            action="read_file",
            details=f"Прочитан файл: {path}",
            status="info"
        ))
        
        return jsonify({
            "path": path,
            "content": content
        })
    
    except Exception as e:
        log_manager.add_log(LogEntry(
            action="read_file",
            details=f"Ошибка при чтении файла: {str(e)}",
            status="error"
        ))
        return jsonify({
            "error": f"Ошибка при чтении файла: {str(e)}"
        }), 500

@file_bp.route('/write', methods=['POST'])
def write_file():
    """Запись содержимого в файл"""
    data = request.json
    path = data.get('path', '')
    content = data.get('content', '')
    
    if not path:
        return jsonify({"error": "Путь к файлу не указан"}), 400
    
    # Полный путь к файлу
    full_path = os.path.join(BASE_DIR, path)
    
    # Проверяем, что путь разрешен
    if not is_path_allowed(full_path):
        log_manager.add_log(LogEntry(
            action="write_file",
            details=f"Попытка доступа к запрещенному пути: {path}",
            status="warning"
        ))
        return jsonify({
            "error": "Доступ запрещен"
        }), 403
    
    try:
        # Создаем директории, если их нет
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        
        # Записываем содержимое в файл
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        log_manager.add_log(LogEntry(
            action="write_file",
            details=f"Записан файл: {path}",
            status="success"
        ))
        
        return jsonify({
            "path": path,
            "message": "Файл успешно сохранен"
        })
    
    except Exception as e:
        log_manager.add_log(LogEntry(
            action="write_file",
            details=f"Ошибка при записи файла: {str(e)}",
            status="error"
        ))
        return jsonify({
            "error": f"Ошибка при записи файла: {str(e)}"
        }), 500

@file_bp.route('/self', methods=['GET'])
def get_self_code():
    """Получение исходного кода приложения"""
    try:
        files = []
        
        # Функция для рекурсивного обхода директорий
        def scan_dir(directory, relative_path=""):
            for item in os.listdir(directory):
                full_path = os.path.join(directory, item)
                rel_path = os.path.join(relative_path, item)
                
                # Исключаем директории __pycache__, .git и т.д.
                if os.path.isdir(full_path) and not item.startswith('.') and item != "__pycache__":
                    scan_dir(full_path, rel_path)
                elif os.path.isfile(full_path) and item.endswith(('.py', '.html', '.js', '.css')):
                    files.append({
                        "path": rel_path.replace("\\", "/"),
                        "type": os.path.splitext(item)[1][1:]  # Расширение без точки
                    })
        
        # Начинаем сканирование с корневой директории
        scan_dir(BASE_DIR)
        
        log_manager.add_log(LogEntry(
            action="get_self_code",
            details="Получен список файлов исходного кода",
            status="info"
        ))
        
        return jsonify({
            "files": files
        })
    
    except Exception as e:
        log_manager.add_log(LogEntry(
            action="get_self_code",
            details=f"Ошибка при получении списка файлов: {str(e)}",
            status="error"
        ))
        return jsonify({
            "error": f"Ошибка при получении списка файлов: {str(e)}"
        }), 500
