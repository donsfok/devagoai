import os
import logging

from flask import Flask, send_from_directory
from datetime import datetime, render_template, jsonify, request
from werkzeug.middleware.proxy_fix import ProxyFix

# Настройка логирования
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Создаем приложение Flask
app = Flask(__name__)

# Отключаем кэширование статических файлов
@app.after_request
def add_header(response):
    if 'Cache-Control' not in response.headers:
        response.headers['Cache-Control'] = 'no-store'
    return response

# Добавляем версионирование для статических файлов
app.config['version'] = datetime.now().strftime("%Y%m%d%H%M%S")
app.secret_key = os.environ.get("SESSION_SECRET", "dev_secret_key")
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

# Настройка обработки сигналов
import signal
def handle_signals():
    signal.signal(signal.SIGWINCH, signal.SIG_IGN)
    
handle_signals()

@app.after_request
def after_request(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    return response

@app.errorhandler(Exception)
def handle_exception(e):
    """Глобальный обработчик ошибок"""
    logger.error(f"Необработанная ошибка: {str(e)}")
    return jsonify({"error": str(e)}), 500

# Импортируем контроллеры
from controllers.ollama_controller import ollama_bp
from controllers.terminal_controller import terminal_bp
from controllers.file_controller import file_bp
from controllers.extensions_controller import extensions_bp, loaded_extensions

# Регистрируем блюпринты
app.register_blueprint(ollama_bp)
app.register_blueprint(terminal_bp)
app.register_blueprint(file_bp)
app.register_blueprint(extensions_bp)

# Регистрируем блюпринты загруженных расширений
for ext_id, ext_data in loaded_extensions.items():
    app.register_blueprint(ext_data['blueprint'])

@app.route('/')
def index():
    """Главная страница приложения"""
    return render_template('index.html')

@app.errorhandler(404)
def page_not_found(e):
    """Обработчик ошибки 404"""
    return render_template('index.html'), 404

@app.errorhandler(500)
def server_error(e):
    """Обработчик ошибки 500"""
    logger.error(f"Ошибка сервера: {e}")
    return jsonify({"error": "Произошла ошибка на сервере. Пожалуйста, попробуйте позже."}), 500
