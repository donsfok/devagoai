import logging
import json
import subprocess
import shutil
import os
import psutil
from flask import jsonify, request

# Настройка логирования
logger = logging.getLogger(__name__)

def init_extension():
    """Инициализация расширения для мониторинга системы."""
    logger.info("Расширение 'Монитор системы' инициализировано")
    
def shutdown_extension():
    """Завершение работы расширения."""
    logger.info("Расширение 'Монитор системы' выгружено")
    
def register_routes(blueprint):
    """Регистрация маршрутов API расширения.
    
    Args:
        blueprint: Flask Blueprint для регистрации маршрутов
    """
    @blueprint.route('/info', methods=['GET'])
    def extension_info():
        """Информация о расширении"""
        return jsonify({
            "id": "system_monitor",
            "name": "Монитор системы",
            "description": "Расширение для мониторинга системных ресурсов и процессов",
            "version": "0.1.0",
            "author": "AI Future Interface"
        })
    
    @blueprint.route('/system-info', methods=['GET'])
    def system_info():
        """Получение общей информации о системе"""
        try:
            # Получаем информацию о CPU
            cpu_count = psutil.cpu_count()
            cpu_usage = psutil.cpu_percent(interval=0.5)
            
            # Получаем информацию о памяти
            memory = psutil.virtual_memory()
            
            # Получаем информацию о диске
            disk = psutil.disk_usage('/')
            
            # Формируем результат
            result = {
                "hostname": os.uname().nodename,
                "system": os.uname().sysname,
                "release": os.uname().release,
                "version": os.uname().version,
                "cpu": {
                    "count": cpu_count,
                    "usage": cpu_usage
                },
                "memory": {
                    "total": memory.total,
                    "available": memory.available,
                    "used": memory.used,
                    "percent": memory.percent
                },
                "disk": {
                    "total": disk.total,
                    "used": disk.used,
                    "free": disk.free,
                    "percent": disk.percent
                }
            }
            
            return jsonify(result)
        except Exception as e:
            logger.error(f"Ошибка при получении информации о системе: {e}")
            return jsonify({"error": str(e)}), 500
    
    @blueprint.route('/processes', methods=['GET'])
    def processes():
        """Получение списка запущенных процессов"""
        try:
            # Фильтр для процессов (можно получать через query параметр)
            search_term = request.args.get('search', '').lower()
            
            # Список процессов
            processes_list = []
            
            for process in psutil.process_iter(['pid', 'name', 'username', 'memory_percent', 'cpu_percent']):
                try:
                    proc_info = process.info
                    
                    # Применяем фильтр, если есть
                    if search_term and search_term not in proc_info['name'].lower():
                        continue
                    
                    # Добавляем информацию о процессе
                    processes_list.append({
                        "pid": proc_info['pid'],
                        "name": proc_info['name'],
                        "username": proc_info['username'],
                        "memory_percent": round(proc_info['memory_percent'], 2),
                        "cpu_percent": round(proc_info['cpu_percent'], 2)
                    })
                except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                    pass
            
            # Сортировка по использованию CPU (по убыванию)
            processes_list.sort(key=lambda x: x['cpu_percent'], reverse=True)
            
            return jsonify({
                "count": len(processes_list),
                "processes": processes_list[:50]  # ограничиваем 50 процессами для производительности
            })
        except Exception as e:
            logger.error(f"Ошибка при получении списка процессов: {e}")
            return jsonify({"error": str(e)}), 500
    
    @blueprint.route('/network', methods=['GET'])
    def network():
        """Получение информации о сетевых подключениях"""
        try:
            # Получаем информацию о сетевых интерфейсах
            net_io = psutil.net_io_counters(pernic=True)
            
            interfaces = {}
            for interface, stats in net_io.items():
                interfaces[interface] = {
                    "bytes_sent": stats.bytes_sent,
                    "bytes_recv": stats.bytes_recv,
                    "packets_sent": stats.packets_sent,
                    "packets_recv": stats.packets_recv,
                    "errin": stats.errin,
                    "errout": stats.errout,
                    "dropin": stats.dropin,
                    "dropout": stats.dropout
                }
            
            # Получаем информацию о подключениях
            connections = []
            for conn in psutil.net_connections():
                try:
                    connections.append({
                        "fd": conn.fd,
                        "family": conn.family.name,
                        "type": conn.type.name,
                        "local_addr": {
                            "ip": conn.laddr.ip if conn.laddr else None,
                            "port": conn.laddr.port if conn.laddr else None
                        },
                        "remote_addr": {
                            "ip": conn.raddr.ip if conn.raddr else None,
                            "port": conn.raddr.port if conn.raddr else None
                        },
                        "status": conn.status,
                        "pid": conn.pid
                    })
                except (AttributeError, psutil.AccessDenied):
                    # Пропускаем подключения, к которым нет доступа
                    pass
            
            return jsonify({
                "interfaces": interfaces,
                "connections_count": len(connections),
                "connections": connections[:30]  # ограничиваем для производительности
            })
        except Exception as e:
            logger.error(f"Ошибка при получении информации о сети: {e}")
            return jsonify({"error": str(e)}), 500