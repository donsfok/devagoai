import os
import subprocess
import logging
from flask import Blueprint, jsonify, request
from models import log_manager, LogEntry

# Настройка логирования
logger = logging.getLogger(__name__)

# Создание блюпринта для терминала
terminal_bp = Blueprint('terminal', __name__, url_prefix='/api/terminal')

# Список разрешенных команд
ALLOWED_COMMANDS = {
    'ls', 'dir', 'pwd', 'cd', 'cat', 'echo', 'mkdir', 'touch', 'grep',
    'find', 'head', 'tail', 'wc', 'sort', 'uniq', 'date', 'whoami',
    'uname', 'df', 'du', 'free', 'ps'
}

# Список запрещенных команд (чувствительных)
FORBIDDEN_COMMANDS = {
    'rm', 'rmdir', 'mv', 'cp', 'sudo', 'su', 'chown', 'chmod',
    'dd', 'mkfs', 'mount', 'umount', 'apt', 'yum', 'dnf', 'pacman',
    'systemctl', 'service', 'init', 'kill', 'pkill'
}

def is_command_allowed(command):
    """Проверка, разрешена ли команда"""
    # Разбиваем команду на части и проверяем первую часть (собственно команду)
    cmd_parts = command.strip().split()
    if not cmd_parts:
        return False
    
    # Проверяем, является ли первая часть запрещенной командой
    main_cmd = cmd_parts[0]
    
    # Проверяем на наличие опасных пайпов и перенаправлений
    if '|' in command or '>' in command or '<' in command or ';' in command or '&&' in command:
        return False
    
    if main_cmd in FORBIDDEN_COMMANDS:
        return False
    
    # Если команда в списке разрешенных, то разрешаем
    if main_cmd in ALLOWED_COMMANDS:
        return True
    
    # По умолчанию запрещаем
    return False

@terminal_bp.route('/execute', methods=['POST'])
def execute_command():
    """Выполнение команды в терминале"""
    data = request.json
    command = data.get('command', '').strip()
    
    if not command:
        return jsonify({"error": "Команда не указана"}), 400
    
    # Логируем запрос на выполнение команды
    log_manager.add_log(LogEntry(
        action="terminal_command",
        details=f"Запрос на выполнение команды: {command}",
        status="info"
    ))
    
    # Проверяем, разрешена ли команда
    if not is_command_allowed(command):
        log_manager.add_log(LogEntry(
            action="terminal_command",
            details=f"Запрещенная команда: {command}",
            status="warning"
        ))
        return jsonify({
            "output": f"Команда '{command}' запрещена для выполнения в целях безопасности.",
            "error": True
        })
    
    try:
        # Выполняем команду
        process = subprocess.Popen(
            command,
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        stdout, stderr = process.communicate(timeout=10)
        
        if stderr:
            log_manager.add_log(LogEntry(
                action="terminal_command",
                details=f"Ошибка при выполнении команды {command}: {stderr}",
                status="error"
            ))
            return jsonify({
                "output": stderr,
                "error": True
            })
        
        log_manager.add_log(LogEntry(
            action="terminal_command",
            details=f"Команда {command} успешно выполнена",
            status="success"
        ))
        
        return jsonify({
            "output": stdout,
            "error": False
        })
    
    except subprocess.TimeoutExpired:
        log_manager.add_log(LogEntry(
            action="terminal_command",
            details=f"Превышено время ожидания выполнения команды {command}",
            status="error"
        ))
        return jsonify({
            "output": "Превышено время ожидания выполнения команды",
            "error": True
        }), 408
    
    except Exception as e:
        log_manager.add_log(LogEntry(
            action="terminal_command",
            details=f"Ошибка при выполнении команды {command}: {str(e)}",
            status="error"
        ))
        return jsonify({
            "output": f"Ошибка при выполнении команды: {str(e)}",
            "error": True
        }), 500
