// Инициализация основных компонентов UI
// Функция для проверки обновлений
function checkForUpdates() {
    fetch('/api/version')
        .then(response => response.json())
        .then(data => {
            if (window.lastVersion && window.lastVersion !== data.version) {
                location.reload();
            }
            window.lastVersion = data.version;
        });
}

// Проверяем обновления каждые 5 секунд
setInterval(checkForUpdates, 5000);

document.addEventListener('DOMContentLoaded', function() {
    // Инициализация тултипов и поповеров Bootstrap
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Инициализация табов
    var tabElems = document.querySelectorAll('button[data-bs-toggle="tab"]');
    tabElems.forEach(function(tabElem) {
        tabElem.addEventListener('shown.bs.tab', function (event) {
            const targetId = event.target.getAttribute('data-bs-target');
            if (targetId === '#terminal-tab-content') {
                window.terminalInstance?.focus();
            }
        });
    });

    // Загрузка начальных данных
    loadInitialData();
});

// Функция загрузки начальных данных
async function loadInitialData() {
    try {
        // Проверка статуса Ollama
        const ollamaStatus = await checkOllamaStatus();
        updateOllamaStatus(ollamaStatus);

        // Загрузка списка моделей
        if (ollamaStatus.status === 'online') {
            await loadModelsList();
        }

        // Инициализация системного монитора
        initSystemMonitor();

        // Инициализация редактора
        initEditor();

        // Инициализация терминала
        initTerminal();

        console.log('Инициализация интерфейса завершена');
    } catch (error) {
        console.error('Ошибка при инициализации:', error);
        showNotification('Ошибка', 'Не удалось загрузить начальные данные', 'danger');
    }
}

// Функция для отображения уведомлений
function showNotification(title, message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');

    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                <strong>${title}</strong><br>${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;

    document.getElementById('toast-container').appendChild(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();

    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

// Глобальные переменные
let currentModel = null;
let currentFile = null;
let terminal = null;
let editor = null;

// Инициализация всех компонентов
async function initializeInterface() {
    console.log("Инициализация интерфейса...");

    // Инициализация редактора
    editor = initializeEditor();

    // Инициализация терминала
    terminal = initializeTerminal();

    // Загрузка списка моделей
    await loadModels();

    // Загрузка файловой системы
    await loadFileExplorer('.');

    // Инициализация системного монитора
    initializeSystemMonitor('system-monitor-container');

    // Загрузка логов
    await loadLogs();
}

// Загрузка логов
async function loadLogs() {
    try {
        const response = await fetch('/api/ollama/logs');
        const logs = await response.json();

        const logsContainer = document.querySelector('#logs-container');
        if (!logsContainer) return;

        logsContainer.innerHTML = logs.map(log => `
            <div class="log-entry log-${log.status}">
                <span class="log-timestamp">${new Date(log.timestamp).toLocaleString()}</span>
                <span class="log-action">${log.action}</span>
                <span class="log-details">${log.details}</span>
            </div>
        `).join('');
    } catch (error) {
        console.error('Ошибка при загрузке логов:', error);
        showNotification('Ошибка', 'Не удалось загрузить логи', 'error');
    }
}

// Инициализация при загрузке страницы
//document.addEventListener('DOMContentLoaded', () => {
//    initializeInterface();
//    setupEventListeners();
//    showWelcomeMessage();
//    loadExtensions();
//
//});

// Настройка слушателей событий
function setupEventListeners() {
    // Переключение между вкладками
    document.querySelectorAll('.nav-link').forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            const tabTarget = this.getAttribute('data-bs-target');
            
            // Убираем активность со всех вкладок
            document.querySelectorAll('.nav-link').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active', 'show'));
            
            // Активируем нужную вкладку
            this.classList.add('active');
            document.querySelector(tabTarget).classList.add('active', 'show');
            
            // Инициализируем вкладку по необходимости
            if (tabTarget === '#monitor-tab') {
                // Инициализируем системный монитор при первом открытии вкладки
                if (!window.systemMonitorInitialized) {
                    initializeSystemMonitor('system-monitor-container');
                    window.systemMonitorInitialized = true;
                }
            }
        });
    });
    
    // Кнопки обновления
    document.querySelectorAll('.btn-refresh').forEach(btn => {
        btn.addEventListener('click', function() {
            const target = this.getAttribute('data-target');
            if (target === 'models') {
                loadModels();
            } else if (target === 'logs') {
                loadLogs();
            } else if (target === 'files') {
                const currentPath = document.querySelector('#file-path').value || '.';
                loadFileExplorer(currentPath);
            } else if (target === 'extensions') {
                loadExtensions();
            }
        });
    });
    
    // Кнопка загрузки модели
    document.querySelector('#btn-pull-model').addEventListener('click', function() {
        const modelName = document.querySelector('#model-name-input').value.trim();
        if (modelName) {
            pullModel(modelName);
        } else {
            showNotification('Ошибка', 'Введите имя модели', 'error');
        }
    });
    
    // Кнопка отправки запроса в модель
    document.querySelector('#btn-send-prompt').addEventListener('click', function() {
        sendPromptToModel();
    });
    
    // Кнопка сохранения файла
    document.querySelector('#btn-save-file').addEventListener('click', function() {
        saveCurrentFile();
    });
    
    // Кнопка открытия кода программы
    document.querySelector('#btn-view-self-code').addEventListener('click', function() {
        loadSelfCode();
    });
    
    // Кнопка генерации кода
    document.querySelector('#btn-generate-code').addEventListener('click', function() {
        // Проверяем, что функция существует
        if (typeof generateCode === 'function') {
            generateCode();
        } else {
            showNotification('Ошибка', 'Функция генерации кода недоступна', 'error');
            console.error('Ошибка: функция generateCode не найдена');
        }
    });
    
    // Кнопка создания расширения
    document.querySelector('#btn-create-extension').addEventListener('click', function() {
        createExtension();
    });
}

// Показать приветственное сообщение
function showWelcomeMessage() {
    Swal.fire({
        title: 'Добро пожаловать в интерфейс ИИ будущего!',
        html: `
        <div class="text-left">
            <p>Этот интерфейс позволяет:</p>
            <ul>
                <li>Управлять ИИ-моделями через Ollama</li>
                <li>Самопрограммироваться с помощью ИИ</li>
                <li>Управлять Linux через терминал</li>
                <li>Расширяться через модули</li>
            </ul>
            <p>Начните с загрузки модели или исследования кода программы!</p>
            <p class="mt-2"><a href="#" onclick="showOllamaInfo(); return false;">Как настроить Ollama?</a></p>
        </div>
        `,
        icon: 'info',
        confirmButtonText: 'Начать работу',
        backdrop: `rgba(0,0,0,0.4)`
    });
}

// Показать информацию об установке Ollama
function showOllamaInfo() {
    Swal.fire({
        title: 'Настройка Ollama',
        html: `
        <div class="text-left">
            <p><strong>Что такое Ollama?</strong></p>
            <p>Ollama - это инструмент для локального запуска моделей ИИ на вашем компьютере. Чтобы использовать все функции приложения, вам потребуется:</p>
            
            <ol>
                <li>
                    <strong>Установить Ollama</strong>
                    <p>Загрузите и установите Ollama с официального сайта: <a href="https://ollama.ai" target="_blank">ollama.ai</a></p>
                    <p>Доступна для Linux, macOS и Windows</p>
                </li>
                <li>
                    <strong>Запустить Ollama</strong>
                    <p>После установки запустите Ollama согласно инструкциям для вашей операционной системы.</p>
                </li>
                <li>
                    <strong>Подключиться к Ollama</strong>
                    <p>По умолчанию Ollama доступен на <code>http://localhost:11434</code></p>
                    <p>Если Ollama запущен на другом компьютере, укажите полный URL на странице моделей.</p>
                </li>
            </ol>
            
            <p><strong>Команды для Linux:</strong></p>
            <pre>curl -fsSL https://ollama.com/install.sh | sh
ollama serve</pre>
            
            <p>После успешного запуска Ollama вы сможете загружать и использовать различные модели ИИ.</p>
        </div>
        `,
        icon: 'info',
        confirmButtonText: 'Понятно',
        width: '600px'
    });
}


// Загрузка списка моделей
function loadModels() {
    showLoader('#models-container');
    
    // Сначала проверяем статус подключения к Ollama
    fetch('/api/ollama/status')
        .then(response => response.json())
        .then(statusData => {
            // Показываем статус в специальном индикаторе
            const statusIndicator = document.createElement('div');
            statusIndicator.classList.add('d-flex', 'align-items-center', 'mb-3', 'p-2', 'neo-card');
            
            let statusClass, statusText;
            if (statusData.status === 'online') {
                statusClass = 'success';
                statusText = `Подключено к Ollama API (${statusData.url})`;
                if (statusData.version) {
                    statusText += ` - Версия: ${statusData.version}`;
                }
            } else {
                statusClass = 'error';
                statusText = `Нет подключения к Ollama API (${statusData.url})`;
                if (statusData.message) {
                    statusText += ` - ${statusData.message}`;
                }
            }
            
            statusIndicator.innerHTML = `
                <span class="status-dot status-${statusClass} me-2"></span>
                <small>${statusText}</small>
            `;
            
            const modelsContainer = document.querySelector('#models-container');
            modelsContainer.innerHTML = '';
            modelsContainer.appendChild(statusIndicator);
            
            // Если Ollama не подключена, показываем инструкции по настройке
            if (statusData.status !== 'online') {
                const setupGuide = document.createElement('div');
                setupGuide.classList.add('mt-3', 'neo-card', 'p-3');
                setupGuide.innerHTML = `
                    <h5>Настройка подключения к Ollama</h5>
                    <p>Если у вас есть доступ к внешнему серверу Ollama, укажите URL:</p>
                    <div class="input-group mb-2">
                        <input type="text" id="ollama-api-url" class="form-control" 
                            placeholder="Например: http://your-ollama-server:11434">
                        <button class="btn btn-neo" id="btn-set-ollama-url">Применить</button>
                    </div>
                    <small class="text-muted">Укажите полный URL, включая http:// или https:// и порт.</small>
                    <div class="mt-3">
                        <button class="btn btn-outline-primary btn-sm" onclick="showOllamaInfo()">
                            <i class="fas fa-info-circle"></i> Как установить Ollama?
                        </button>
                    </div>
                `;
                modelsContainer.appendChild(setupGuide);
                
                // Добавляем обработчик для кнопки изменения URL
                document.querySelector('#btn-set-ollama-url').addEventListener('click', setOllamaApiUrl);
                
                hideLoader('#models-container');
                return;
            }
            
            // Если подключено, продолжаем загрузку списка моделей
            return fetch('/api/ollama/models')
                .then(response => response.json())
                .then(data => {
                    const modelsContainer = document.querySelector('#models-container');
                    
                    if (data.error) {
                        // Если ошибка подключения, предложим настроить URL API
                        modelsContainer.innerHTML = `
                            <div class="alert alert-warning">
                                ${data.error}
                                <p>Убедитесь, что Ollama запущена и доступна.</p>
                            </div>
                            <div class="mt-3 neo-card p-3">
                                <h5>Настройка подключения к Ollama</h5>
                                <p>Если у вас есть доступ к внешнему серверу Ollama, укажите URL:</p>
                                <div class="input-group mb-2">
                                    <input type="text" id="ollama-api-url" class="form-control" 
                                        placeholder="Например: http://your-ollama-server:11434">
                                    <button class="btn btn-neo" id="btn-set-ollama-url">Применить</button>
                                </div>
                                <small class="text-muted">Укажите полный URL, включая http:// или https:// и порт.</small>
                            </div>
                        `;
                        
                        // Добавляем обработчик для кнопки изменения URL
                        document.querySelector('#btn-set-ollama-url').addEventListener('click', setOllamaApiUrl);
                        
                        hideLoader('#models-container');
                        return;
                    }
                    
                    if (!data.models || data.models.length === 0) {
                        modelsContainer.innerHTML = `
                            <div class="alert alert-info">
                                Нет загруженных моделей. Введите имя модели и нажмите "Загрузить".
                            </div>
                        `;
                        hideLoader('#models-container');
                        return;
                    }
                    
                    // Отображаем модели в таблице
                    let tableHtml = `
                        <table class="table table-futuristic">
                            <thead>
                                <tr>
                                    <th>Модель</th>
                                    <th>Размер</th>
                                    <th>Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                    `;
                    
                    data.models.forEach(model => {
                        tableHtml += `
                            <tr>
                                <td>
                                    <div class="d-flex align-items-center">
                                        <span class="status-dot status-success"></span>
                                        ${model.name}
                                    </div>
                                </td>
                                <td>${formatSize(model.size)}</td>
                                <td>
                                    <button class="btn btn-sm btn-primary btn-neo" 
                                            onclick="selectModel('${model.name}')">
                                        Выбрать
                                    </button>
                                </td>
                            </tr>
                        `;
                    });
                    
                    tableHtml += `
                            </tbody>
                        </table>
                    `;
                    
                    modelsContainer.innerHTML = tableHtml;
                    hideLoader('#models-container');
                })
                .catch(error => {
                    console.error('Ошибка при загрузке моделей:', error);
                    document.querySelector('#models-container').innerHTML = `
                        <div class="alert alert-danger">
                            Ошибка при загрузке моделей: ${error.message}
                            <p>Убедитесь, что Ollama запущена и доступна.</p>
                        </div>
                    `;
                    hideLoader('#models-container');
                });
        })
        .catch(error => {
            console.error('Ошибка при проверке статуса Ollama:', error);
            const modelsContainer = document.querySelector('#models-container');
            modelsContainer.innerHTML = `
                <div class="alert alert-danger">
                    Ошибка при проверке статуса Ollama: ${error.message}
                </div>
                <div class="mt-3 neo-card p-3">
                    <h5>Настройка подключения к Ollama</h5>
                    <p>Если у вас есть доступ к внешнему серверу Ollama, укажите URL:</p>
                    <div class="input-group mb-2">
                        <input type="text" id="ollama-api-url" class="form-control" 
                            placeholder="Например: http://your-ollama-server:11434">
                        <button class="btn btn-neo" id="btn-set-ollama-url">Применить</button>
                    </div>
                    <small class="text-muted">Укажите полный URL, включая http:// или https:// и порт.</small>
                    <div class="mt-3">
                        <button class="btn btn-outline-primary btn-sm" onclick="showOllamaInfo()">
                            <i class="fas fa-info-circle"></i> Как установить Ollama?
                        </button>
                    </div>
                </div>
            `;
            
            // Добавляем обработчик для кнопки изменения URL
            document.querySelector('#btn-set-ollama-url').addEventListener('click', setOllamaApiUrl);
            
            hideLoader('#models-container');
        });
}

// Выбор модели для использования
function selectModel(modelName) {
    // Устанавливаем выбранную модель
    document.querySelector('#selected-model').textContent = modelName;
    document.querySelector('#selected-model-badge').style.display = 'inline-block';
    
    // Обновляем значение в скрытом поле
    document.querySelector('#current-model').value = modelName;
    
    showNotification('Модель выбрана', `Модель "${modelName}" готова к использованию`, 'success');
    
    // Переключаемся на вкладку с промптом
    document.querySelector('[data-bs-target="#prompt-tab"]').click();
}

// Загрузка новой модели
function pullModel(modelName) {
    showLoader('#models-container');
    
    fetch('/api/ollama/pull', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ model: modelName })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showNotification('Ошибка', data.error, 'error');
        } else {
            showNotification('Загрузка модели', data.message, 'info');
            
            // Через некоторое время обновляем список моделей
            setTimeout(() => {
                loadModels();
            }, 5000);
        }
    })
    .catch(error => {
        console.error('Ошибка при загрузке модели:', error);
        showNotification('Ошибка', `Не удалось загрузить модель: ${error.message}`, 'error');
        hideLoader('#models-container');
    });
}

// Отправка запроса в модель
function sendPromptToModel() {
    const prompt = document.querySelector('#prompt-input').value.trim();
    const model = document.querySelector('#current-model').value;
    
    if (!prompt) {
        showNotification('Ошибка', 'Введите текст запроса', 'error');
        return;
    }
    
    if (!model) {
        showNotification('Ошибка', 'Сначала выберите модель', 'error');
        return;
    }
    
    // Показываем индикатор загрузки
    const responseContainer = document.querySelector('#model-response');
    responseContainer.innerHTML = '<div class="text-center py-5"><div class="spinner"></div><p class="mt-3">Генерация ответа...</p></div>';
    
    fetch('/api/ollama/generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: model,
            prompt: prompt
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            responseContainer.innerHTML = `<div class="alert alert-danger">${data.error}</div>`;
        } else {
            // Форматирование ответа
            const response = data.response || '';
            responseContainer.innerHTML = `<pre class="model-response-text">${escapeHtml(response)}</pre>`;
        }
    })
    .catch(error => {
        console.error('Ошибка при отправке запроса:', error);
        responseContainer.innerHTML = `<div class="alert alert-danger">Ошибка при отправке запроса: ${error.message}</div>`;
    });
}

// Загрузка списка файлов проекта
function loadSelfCode() {
    // Показываем содержимое проводника (может быть скрыто)
    document.querySelector('#file-explorer').classList.remove('d-none');
    
    // Переключаемся на вкладку файлов
    document.querySelector('[data-bs-target="#files-tab"]').click();
    
    // Показываем загрузчик
    showLoader('#file-explorer');
    
    fetch('/api/file/self')
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                document.querySelector('#file-explorer').innerHTML = `
                    <div class="alert alert-danger">${data.error}</div>
                `;
                hideLoader('#file-explorer');
                return;
            }
            
            const files = data.files;
            
            // Группируем файлы по директориям для удобства отображения
            const fileTree = {};
            
            files.forEach(file => {
                const path = file.path;
                const parts = path.split('/');
                
                // Создаем структуру дерева
                let currentLevel = fileTree;
                
                for (let i = 0; i < parts.length - 1; i++) {
                    const part = parts[i];
                    if (!currentLevel[part]) {
                        currentLevel[part] = {};
                    }
                    currentLevel = currentLevel[part];
                }
                
                // Добавляем файл
                const fileName = parts[parts.length - 1];
                currentLevel[fileName] = file.type;
            });
            
            // Рендерим дерево файлов
            let fileExplorerHtml = '<div class="file-browser">';
            
            // Рекурсивная функция для рендеринга дерева
            function renderTree(tree, path = '') {
                let html = '<ul class="list-unstyled pl-3 mb-0">';
                
                // Сортируем: сначала директории, потом файлы
                const items = Object.keys(tree).sort((a, b) => {
                    const aIsDir = typeof tree[a] === 'object';
                    const bIsDir = typeof tree[b] === 'object';
                    
                    if (aIsDir && !bIsDir) return -1;
                    if (!aIsDir && bIsDir) return 1;
                    return a.localeCompare(b);
                });
                
                for (const item of items) {
                    const itemPath = path ? `${path}/${item}` : item;
                    
                    if (typeof tree[item] === 'object') {
                        // Это директория
                        html += `
                            <li>
                                <div class="file-item directory">
                                    <i class="fas fa-folder file-icon directory"></i>
                                    ${item}
                                </div>
                                ${renderTree(tree[item], itemPath)}
                            </li>
                        `;
                    } else {
                        // Это файл
                        const fileType = tree[item];
                        let iconClass = 'fa-file';
                        
                        // Выбираем иконку в зависимости от типа файла
                        if (fileType === 'py') iconClass = 'fa-file-code';
                        else if (fileType === 'html') iconClass = 'fa-html5';
                        else if (fileType === 'css') iconClass = 'fa-css3-alt';
                        else if (fileType === 'js') iconClass = 'fa-js';
                        
                        html += `
                            <li>
                                <div class="file-item" onclick="openFile('${itemPath}')">
                                    <i class="fas ${iconClass} file-icon ${fileType}"></i>
                                    ${item}
                                </div>
                            </li>
                        `;
                    }
                }
                
                html += '</ul>';
                return html;
            }
            
            fileExplorerHtml += renderTree(fileTree);
            fileExplorerHtml += '</div>';
            
            document.querySelector('#file-explorer').innerHTML = fileExplorerHtml;
            hideLoader('#file-explorer');
        })
        .catch(error => {
            console.error('Ошибка при загрузке файлов:', error);
            document.querySelector('#file-explorer').innerHTML = `
                <div class="alert alert-danger">Ошибка при загрузке файлов: ${error.message}</div>
            `;
            hideLoader('#file-explorer');
        });
}

// Открытие файла в редакторе
function openFile(path) {
    showLoader('#editor-container');
    
    fetch(`/api/file/read?path=${encodeURIComponent(path)}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                showNotification('Ошибка', data.error, 'error');
                hideLoader('#editor-container');
                return;
            }
            
            // Установка содержимого в редактор
            window.editorInstance.setValue(data.content);
            
            // Определяем режим (подсветку синтаксиса) на основе расширения файла
            const fileExtension = path.split('.').pop().toLowerCase();
            let mode = 'text';
            
            if (fileExtension === 'py') mode = 'python';
            else if (fileExtension === 'js') mode = 'javascript';
            else if (fileExtension === 'html') mode = 'htmlmixed';
            else if (fileExtension === 'css') mode = 'css';
            
            window.editorInstance.setOption('mode', mode);
            
            // Сохраняем путь к текущему файлу
            document.querySelector('#current-file-path').value = path;
            document.querySelector('#current-file-name').textContent = path;
            document.querySelector('#current-file-badge').style.display = 'inline-block';
            
            // Активируем кнопку сохранения
            document.querySelector('#btn-save-file').disabled = false;
            
            hideLoader('#editor-container');
        })
        .catch(error => {
            console.error('Ошибка при открытии файла:', error);
            showNotification('Ошибка', `Не удалось открыть файл: ${error.message}`, 'error');
            hideLoader('#editor-container');
        });
}

// Сохранение текущего файла
function saveCurrentFile() {
    const path = document.querySelector('#current-file-path').value;
    const content = window.editorInstance.getValue();
    
    if (!path) {
        showNotification('Ошибка', 'Файл не выбран', 'error');
        return;
    }
    
    // Запрашиваем подтверждение перед сохранением
    Swal.fire({
        title: 'Подтверждение',
        text: `Вы уверены, что хотите сохранить изменения в файле ${path}?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Сохранить',
        cancelButtonText: 'Отмена',
        reverseButtons: true
    }).then((result) => {
        if (result.isConfirmed) {
            showLoader('#editor-container');
            
            fetch('/api/file/write', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    path: path,
                    content: content
                })
            })
            .then(response => response.json())
            .then(data => {
                hideLoader('#editor-container');
                
                if (data.error) {
                    showNotification('Ошибка', data.error, 'error');
                } else {
                    showNotification('Успех', data.message, 'success');
                }
            })
            .catch(error => {
                console.error('Ошибка при сохранении файла:', error);
                hideLoader('#editor-container');
                showNotification('Ошибка', `Не удалось сохранить файл: ${error.message}`, 'error');
            });
        }
    });
}

// Загрузка файлового проводника
function loadFileExplorer(path = '.') {
    const fileList = document.querySelector('#file-list');
    if (!fileList) return;
    
    // Show loading state
    const loadingHtml = `
        <div class="text-center py-4">
            <div class="spinner"></div>
            <p class="mt-2">Загрузка файлов...</p>
            <small class="text-muted">Пожалуйста, подождите...</small>
        </div>
    `;
    fileList.innerHTML = loadingHtml;
    
    // Set timeout for loading
    const timeoutId = setTimeout(() => {
        if (fileList.innerHTML === loadingHtml) {
            fileList.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Превышено время ожидания загрузки
                    <button class="btn btn-sm btn-warning mt-2" onclick="loadFileExplorer('${path}')">
                        <i class="fas fa-sync-alt me-1"></i> Повторить
                    </button>
                </div>
            `;
        }
    }, 10000); // 10 second timeout
    
    fetch(`/api/file/list?path=${encodeURIComponent(path)}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.error) {
                document.querySelector('#file-list').innerHTML = `
                    <div class="alert alert-danger">${data.error}</div>
                `;
                hideLoader('#file-list');
                return;
            }
            
            // Сохраняем текущий путь
            document.querySelector('#file-path').value = data.path;
            
            // Рендерим навигационную цепочку
            const pathParts = data.path.split('/');
            let breadcrumbHtml = '<nav aria-label="breadcrumb"><ol class="breadcrumb">';
            let currentPath = '';
            
            breadcrumbHtml += `<li class="breadcrumb-item"><a href="#" onclick="loadFileExplorer(''); return false;">Корень</a></li>`;
            
            for (let i = 0; i < pathParts.length; i++) {
                if (pathParts[i] === '' || pathParts[i] === '.') continue;
                
                currentPath += '/' + pathParts[i];
                
                if (i === pathParts.length - 1) {
                    breadcrumbHtml += `<li class="breadcrumb-item active">${pathParts[i]}</li>`;
                } else {
                    breadcrumbHtml += `<li class="breadcrumb-item"><a href="#" onclick="loadFileExplorer('${currentPath}'); return false;">${pathParts[i]}</a></li>`;
                }
            }
            
            breadcrumbHtml += '</ol></nav>';
            
            // Рендерим список файлов и директорий
            let filesHtml = '<div class="list-group">';
            
            // Добавляем ссылку на родительскую директорию, если мы не в корне
            if (data.path !== '.' && data.path !== '') {
                const parentPath = data.path.split('/').slice(0, -1).join('/');
                filesHtml += `
                    <a href="#" class="list-group-item list-group-item-action d-flex align-items-center" 
                       onclick="loadFileExplorer('${parentPath}'); return false;">
                        <i class="fas fa-arrow-up me-2"></i>
                        ..
                    </a>
                `;
            }
            
            // Сортируем: сначала директории, потом файлы
            const sortedItems = [...data.items].sort((a, b) => {
                if (a.type !== b.type) {
                    return a.type === 'directory' ? -1 : 1;
                }
                return a.name.localeCompare(b.name);
            });
            
            sortedItems.forEach(item => {
                const isDir = item.type === 'directory';
                const iconClass = isDir ? 'fa-folder' : 'fa-file';
                const clickAction = isDir 
                    ? `loadFileExplorer('${item.path}'); return false;` 
                    : `openFileFromExplorer('${item.path}'); return false;`;
                
                filesHtml += `
                    <a href="#" class="list-group-item list-group-item-action d-flex align-items-center" 
                       onclick="${clickAction}">
                        <i class="fas ${iconClass} me-2 ${isDir ? 'text-warning' : ''}"></i>
                        ${item.name}
                    </a>
                `;
            });
            
            filesHtml += '</div>';
            
            // Объединяем навигацию и список файлов
            document.querySelector('#file-list').innerHTML = breadcrumbHtml + filesHtml;
            hideLoader('#file-list');
        })
        .catch(error => {
            console.error('Ошибка при загрузке файлов:', error);
            const fileList = document.querySelector('#file-list');
            if (fileList) {
                fileList.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-circle me-2"></i>
                        Ошибка при загрузке файлов: ${error.message}
                        <button class="btn btn-sm btn-outline-danger mt-2" onclick="loadFileExplorer('.')">
                            <i class="fas fa-sync-alt me-1"></i> Попробовать снова
                        </button>
                    </div>
                `;
            }
        });
}

// Открытие файла из проводника
function openFileFromExplorer(path) {
    // Показать вкладку редактора
    document.querySelector('[data-bs-target="#editor-tab"]').click();
    // Открыть файл
    openFile(path);
}

// Вспомогательные функции

// Показать индикатор загрузки
function showLoader(selector) {
    const container = document.querySelector(selector);
    if (!container) return;
    
    // Сохраняем оригинальное содержимое
    if (!container.dataset.originalContent) {
        container.dataset.originalContent = container.innerHTML;
    }
    
    // Показываем индикатор загрузки
    container.innerHTML = `
        <div class="text-center py-4">
            <div class="spinner"></div>
            <p class="mt-2">Загрузка...</p>
        </div>
    `;
}

// Скрыть индикатор загрузки
function hideLoader(selector) {
    const container = document.querySelector(selector);
    if (!container) return;
    
    // Проверяем, не остался ли индикатор загрузки (spinner)
    const spinner = container.querySelector('.spinner');
    
    // Если есть спиннер, но нет нового контента, восстанавливаем оригинальное содержимое
    if (spinner && container.dataset.originalContent) {
        container.innerHTML = container.dataset.originalContent;
        delete container.dataset.originalContent;
    }
}

// Показать уведомление
function showNotification(title, message, type) {
    Swal.fire({
        title: title,
        text: message,
        icon: type, // 'success', 'error', 'warning', 'info'
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
    });
}

// Форматирование размера файла
function formatSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Экранирование HTML
function escapeHtml(html) {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
}

// Обработка ошибок
window.onerror = function(msg, url, lineNo, columnNo, error) {
    console.error('Ошибка:', msg, 'Строка:', lineNo, 'Колонка:', columnNo);
    showNotification('Ошибка', msg, 'error');
    return false;
};

// Дополнительные функции, которых нет в оригинале, но могут потребоваться.
async function checkOllamaStatus() {
    try {
        const response = await fetch('/api/ollama/status');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Ошибка при проверке статуса Ollama:', error);
        return { status: 'offline', message: error.message };
    }
}

function updateOllamaStatus(statusData) {
    const statusIndicator = document.getElementById('ollama-status');
    if (statusIndicator) {
        if (statusData.status === 'online') {
            statusIndicator.textContent = `Ollama: Online`;
            statusIndicator.className = 'text-success';
        } else {
            statusIndicator.textContent = `Ollama: Offline`;
            statusIndicator.className = 'text-danger';
        }
    }
}

async function loadModelsList() {
    try {
        const response = await fetch('/api/ollama/models');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // Обработка списка моделей
        console.log('Список моделей:', data);
    } catch (error) {
        console.error('Ошибка при загрузке списка моделей:', error);
        showNotification('Ошибка', 'Не удалось загрузить список моделей', 'danger');
    }
}

function initSystemMonitor() {
        initializeSystemMonitor('system-monitor-container');
}

function initEditor() {
        initializeEditor();
}

function initTerminal() {
        initializeTerminal();
}