import os
import importlib
import logging
import json
import sys
from flask import Blueprint, jsonify, request
from models import log_manager, LogEntry

# Настройка логирования
logger = logging.getLogger(__name__)

# Создание блюпринта для работы с расширениями
extensions_bp = Blueprint('extensions', __name__, url_prefix='/api/extensions')

# Путь к директории расширений
EXTENSIONS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'extensions')

# Информация о расширениях
extensions_info = {}
loaded_extensions = {}

# Создаем директорию для расширений, если её нет
if not os.path.exists(EXTENSIONS_DIR):
    try:
        os.makedirs(EXTENSIONS_DIR)
        # Создаем пустой __init__.py в директории расширений
        with open(os.path.join(EXTENSIONS_DIR, '__init__.py'), 'w', encoding='utf-8') as f:
            f.write('# Пакет расширений\n')
    except Exception as e:
        logger.error(f"Не удалось создать директорию расширений: {e}")


def discover_extensions():
    """Обнаружение доступных расширений"""
    global extensions_info
    extensions_info = {}
    
    if not os.path.exists(EXTENSIONS_DIR):
        return
    
    # Обходим все поддиректории в директории расширений
    for item in os.listdir(EXTENSIONS_DIR):
        ext_dir = os.path.join(EXTENSIONS_DIR, item)
        
        # Пропускаем файлы и директории, начинающиеся с подчеркивания
        if not os.path.isdir(ext_dir) or item.startswith('_'):
            continue
        
        # Проверяем наличие manifest.json
        manifest_path = os.path.join(ext_dir, 'manifest.json')
        if not os.path.exists(manifest_path):
            continue
        
        try:
            # Загружаем информацию о расширении
            with open(manifest_path, 'r', encoding='utf-8') as f:
                manifest = json.load(f)
            
            if 'id' not in manifest or 'name' not in manifest or 'version' not in manifest:
                logger.warning(f"Некорректный manifest.json в расширении {item}")
                continue
            
            # Проверяем, что есть файл extension.py
            if not os.path.exists(os.path.join(ext_dir, 'extension.py')):
                logger.warning(f"Отсутствует extension.py в расширении {item}")
                continue
            
            # Сохраняем информацию о расширении
            extensions_info[manifest['id']] = {
                'id': manifest['id'],
                'name': manifest['name'],
                'version': manifest['version'],
                'description': manifest.get('description', ''),
                'author': manifest.get('author', ''),
                'directory': item,
                'enabled': manifest.get('enabled', False)
            }
        except Exception as e:
            logger.error(f"Ошибка при загрузке информации о расширении {item}: {e}")
    
    return extensions_info


def load_extension(extension_id):
    """Загрузка расширения"""
    global loaded_extensions
    
    if extension_id not in extensions_info:
        log_manager.add_log(LogEntry(
            action="load_extension",
            details=f"Попытка загрузить несуществующее расширение: {extension_id}",
            status="error"
        ))
        return False
    
    ext_info = extensions_info[extension_id]
    if not ext_info.get('enabled', False):
        log_manager.add_log(LogEntry(
            action="load_extension",
            details=f"Попытка загрузить отключенное расширение: {extension_id}",
            status="warning"
        ))
        return False
    
    if extension_id in loaded_extensions:
        # Расширение уже загружено
        return True
    
    try:
        # Добавляем директорию с расширениями в путь импорта
        if EXTENSIONS_DIR not in sys.path:
            sys.path.append(EXTENSIONS_DIR)
        
        # Импортируем модуль расширения
        ext_module = importlib.import_module(f"{ext_info['directory']}.extension")
        
        # Проверяем наличие необходимых функций
        if not hasattr(ext_module, 'init_extension') or not hasattr(ext_module, 'register_routes'):
            log_manager.add_log(LogEntry(
                action="load_extension",
                details=f"Расширение {extension_id} не содержит необходимых функций",
                status="error"
            ))
            return False
        
        # Инициализируем расширение
        ext_module.init_extension()
        
        # Регистрируем маршруты расширения
        ext_blueprint = Blueprint(f"ext_{extension_id}", __name__, url_prefix=f"/api/ext/{extension_id}")
        ext_module.register_routes(ext_blueprint)
        
        # Сохраняем информацию о загруженном расширении
        loaded_extensions[extension_id] = {
            'module': ext_module,
            'blueprint': ext_blueprint
        }
        
        log_manager.add_log(LogEntry(
            action="load_extension",
            details=f"Расширение {ext_info['name']} успешно загружено",
            status="success"
        ))
        
        return True
    except Exception as e:
        log_manager.add_log(LogEntry(
            action="load_extension",
            details=f"Ошибка при загрузке расширения {extension_id}: {str(e)}",
            status="error"
        ))
        logger.error(f"Ошибка при загрузке расширения {extension_id}: {e}")
        return False


def unload_extension(extension_id):
    """Выгрузка расширения"""
    global loaded_extensions
    
    if extension_id not in loaded_extensions:
        return True
    
    try:
        # Получаем информацию о расширении
        ext_info = extensions_info.get(extension_id, {})
        
        # Выгружаем расширение
        if hasattr(loaded_extensions[extension_id]['module'], 'shutdown_extension'):
            loaded_extensions[extension_id]['module'].shutdown_extension()
        
        # Удаляем расширение из загруженных
        del loaded_extensions[extension_id]
        
        log_manager.add_log(LogEntry(
            action="unload_extension",
            details=f"Расширение {ext_info.get('name', extension_id)} выгружено",
            status="info"
        ))
        
        return True
    except Exception as e:
        log_manager.add_log(LogEntry(
            action="unload_extension",
            details=f"Ошибка при выгрузке расширения {extension_id}: {str(e)}",
            status="error"
        ))
        logger.error(f"Ошибка при выгрузке расширения {extension_id}: {e}")
        return False


@extensions_bp.route('/list', methods=['GET'])
def list_extensions():
    """Получение списка доступных расширений"""
    try:
        # Обновляем список расширений
        discover_extensions()
        
        extensions_list = list(extensions_info.values())
        
        # Добавляем информацию о статусе загрузки
        for ext in extensions_list:
            ext['loaded'] = ext['id'] in loaded_extensions
        
        return jsonify({
            "extensions": extensions_list
        })
    except Exception as e:
        log_manager.add_log(LogEntry(
            action="list_extensions",
            details=f"Ошибка при получении списка расширений: {str(e)}",
            status="error"
        ))
        return jsonify({
            "error": f"Ошибка при получении списка расширений: {str(e)}"
        }), 500


@extensions_bp.route('/toggle', methods=['POST'])
def toggle_extension():
    """Включение/выключение расширения"""
    try:
        data = request.json
        extension_id = data.get('id')
        enabled = data.get('enabled', False)
        
        if not extension_id or extension_id not in extensions_info:
            return jsonify({
                "error": "Указанное расширение не найдено"
            }), 404
        
        # Обновляем статус расширения
        ext_info = extensions_info[extension_id]
        
        # Путь к manifest.json
        manifest_path = os.path.join(EXTENSIONS_DIR, ext_info['directory'], 'manifest.json')
        
        # Загружаем текущий манифест
        with open(manifest_path, 'r', encoding='utf-8') as f:
            manifest = json.load(f)
        
        # Обновляем статус
        manifest['enabled'] = enabled
        
        # Сохраняем манифест
        with open(manifest_path, 'w', encoding='utf-8') as f:
            json.dump(manifest, f, indent=4)
        
        # Обновляем информацию в памяти
        ext_info['enabled'] = enabled
        
        # Загружаем или выгружаем расширение
        if enabled:
            if extension_id not in loaded_extensions:
                load_extension(extension_id)
        else:
            if extension_id in loaded_extensions:
                unload_extension(extension_id)
        
        log_manager.add_log(LogEntry(
            action="toggle_extension",
            details=f"Расширение {ext_info['name']} {'включено' if enabled else 'отключено'}",
            status="success"
        ))
        
        return jsonify({
            "id": extension_id,
            "enabled": enabled,
            "loaded": extension_id in loaded_extensions
        })
    except Exception as e:
        log_manager.add_log(LogEntry(
            action="toggle_extension",
            details=f"Ошибка при изменении статуса расширения: {str(e)}",
            status="error"
        ))
        return jsonify({
            "error": f"Ошибка при изменении статуса расширения: {str(e)}"
        }), 500


@extensions_bp.route('/create', methods=['POST'])
def create_extension():
    """Создание нового расширения"""
    try:
        data = request.json
        ext_id = data.get('id', '').strip()
        ext_name = data.get('name', '').strip()
        ext_description = data.get('description', '').strip()
        ext_author = data.get('author', '').strip()
        
        if not ext_id or not ext_name:
            return jsonify({
                "error": "Необходимо указать ID и название расширения"
            }), 400
        
        # Проверяем, что ID содержит только латинские буквы, цифры и подчеркивания
        if not all(c.isalnum() or c == '_' for c in ext_id):
            return jsonify({
                "error": "ID расширения может содержать только латинские буквы, цифры и подчеркивания"
            }), 400
        
        # Проверяем, что расширение с таким ID не существует
        if ext_id in extensions_info:
            return jsonify({
                "error": f"Расширение с ID '{ext_id}' уже существует"
            }), 400
        
        # Создаем директорию для расширения
        ext_dir = os.path.join(EXTENSIONS_DIR, ext_id)
        os.makedirs(ext_dir, exist_ok=True)
        
        # Создаем manifest.json
        manifest = {
            "id": ext_id,
            "name": ext_name,
            "version": "0.1.0",
            "description": ext_description,
            "author": ext_author,
            "enabled": False
        }
        
        with open(os.path.join(ext_dir, 'manifest.json'), 'w', encoding='utf-8') as f:
            json.dump(manifest, f, indent=4)
        
        # Создаем __init__.py
        with open(os.path.join(ext_dir, '__init__.py'), 'w', encoding='utf-8') as f:
            f.write(f"# Расширение {ext_name}\n")
        
        # Создаем шаблон extension.py
        ext_template = f"""import logging

# Настройка логирования
logger = logging.getLogger(__name__)

def init_extension():
    \"\"\"Инициализация расширения. Вызывается при загрузке расширения.\"\"\"
    logger.info("Расширение {ext_name} инициализировано")
    
def shutdown_extension():
    \"\"\"Завершение работы расширения. Вызывается при выгрузке расширения.\"\"\"
    logger.info("Расширение {ext_name} выгружено")
    
def register_routes(blueprint):
    \"\"\"Регистрация маршрутов API расширения.
    
    Args:
        blueprint: Flask Blueprint для регистрации маршрутов
    \"\"\"
    @blueprint.route('/info', methods=['GET'])
    def extension_info():
        return {{
            "id": "{ext_id}",
            "name": "{ext_name}",
            "description": "{ext_description}",
            "version": "0.1.0",
            "author": "{ext_author}"
        }}
    
    # Пример маршрута с вашей функциональностью
    @blueprint.route('/example', methods=['GET'])
    def example_route():
        return {{
            "message": "Это пример маршрута расширения {ext_name}"
        }}
"""
        
        with open(os.path.join(ext_dir, 'extension.py'), 'w', encoding='utf-8') as f:
            f.write(ext_template)
        
        # Обновляем список расширений
        discover_extensions()
        
        log_manager.add_log(LogEntry(
            action="create_extension",
            details=f"Создано новое расширение: {ext_name}",
            status="success"
        ))
        
        return jsonify({
            "id": ext_id,
            "name": ext_name,
            "message": "Расширение успешно создано"
        })
    except Exception as e:
        log_manager.add_log(LogEntry(
            action="create_extension",
            details=f"Ошибка при создании расширения: {str(e)}",
            status="error"
        ))
        return jsonify({
            "error": f"Ошибка при создании расширения: {str(e)}"
        }), 500


# Инициализация - обнаружение расширений при запуске
discover_extensions()

# Загрузка включенных расширений
for ext_id, ext_info in extensions_info.items():
    if ext_info.get('enabled', False):
        load_extension(ext_id)