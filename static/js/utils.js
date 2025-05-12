// Утилиты для работы с интерфейсом

// Показ/скрытие индикатора загрузки
function showLoader(selector) {
    const container = document.querySelector(selector);
    if (!container) return;

    const loader = document.createElement('div');
    loader.className = 'loader-overlay';
    loader.innerHTML = `
        <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Загрузка...</span>
        </div>
    `;
    container.appendChild(loader);
}

function hideLoader(selector) {
    const container = document.querySelector(selector);
    if (!container) return;

    const loader = container.querySelector('.loader-overlay');
    if (loader) {
        loader.remove();
    }
}

// Показ уведомлений
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

// Форматирование размера файлов
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Б';
    const k = 1024;
    const sizes = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Адаптация интерфейса для мобильных устройств
function adaptForMobile() {
    if (window.innerWidth < 768) {
        document.querySelectorAll('.desktop-only').forEach(el => {
            el.style.display = 'none';
        });
        document.querySelectorAll('.mobile-friendly').forEach(el => {
            el.classList.add('compact-view');
        });
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    // Инициализируем тултипы
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Адаптируем для мобильных
    adaptForMobile();

    // Обработчик изменения размера окна
    window.addEventListener('resize', () => {
        adaptForMobile();
    });
});

// Обновление времени
function updateClock() {
    const clockElement = document.getElementById('system-clock');
    if (clockElement) {
        const now = new Date();
        clockElement.textContent = now.toLocaleTimeString();
    }
}

setInterval(updateClock, 1000);

// Вспомогательные функции

// Форматирование даты
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString();
}

// Проверка доступности API Ollama
function checkOllamaAvailability() {
    return fetch('/api/ollama/models')
        .then(response => response.json())
        .then(data => {
            return !data.error;
        })
        .catch(() => false);
}

// Вспомогательные функции были перемещены в main.js

// Обработка ошибок
function handleApiError(error, container, message) {
    console.error(error);
    if (container) {
        container.innerHTML = `
            <div class="alert alert-danger">
                ${message || 'Произошла ошибка при обработке запроса'}: ${error.message}
            </div>
        `;
    }
    return false;
}

// Генерация уникального ID
function generateId() {
    return 'id_' + Math.random().toString(36).substr(2, 9);
}

// Обнаружение языка программирования на основе расширения файла
function detectLanguage(filename) {
    const extension = filename.split('.').pop().toLowerCase();
    
    const languageMap = {
        'py': 'python',
        'js': 'javascript',
        'html': 'html',
        'css': 'css',
        'json': 'json',
        'md': 'markdown',
        'txt': 'text',
        'sh': 'bash'
    };
    
    return languageMap[extension] || 'text';
}

// Функция для безопасного отображения HTML
function safeHtml(html) {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
}

// Копирование текста в буфер обмена
function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text)
            .then(() => {
                showNotification('Успех', 'Текст скопирован в буфер обмена', 'success');
            })
            .catch(err => {
                console.error('Ошибка копирования в буфер обмена:', err);
                showNotification('Ошибка', 'Не удалось скопировать текст', 'error');
            });
    } else {
        // Для старых браузеров
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                showNotification('Успех', 'Текст скопирован в буфер обмена', 'success');
            } else {
                showNotification('Ошибка', 'Не удалось скопировать текст', 'error');
            }
        } catch (err) {
            console.error('Ошибка копирования в буфер обмена:', err);
            showNotification('Ошибка', 'Не удалось скопировать текст', 'error');
        }
        
        document.body.removeChild(textarea);
    }
}

// Обнаружение мобильного устройства
function isMobileDevice() {
    return (
        navigator.userAgent.match(/Android/i) ||
        navigator.userAgent.match(/webOS/i) ||
        navigator.userAgent.match(/iPhone/i) ||
        navigator.userAgent.match(/iPad/i) ||
        navigator.userAgent.match(/iPod/i) ||
        navigator.userAgent.match(/BlackBerry/i) ||
        navigator.userAgent.match(/Windows Phone/i)
    );
}

// Функция для изменения URL API Ollama
function setOllamaApiUrl() {
    const urlInput = document.querySelector('#ollama-api-url');
    const url = urlInput ? urlInput.value.trim() : '';
    
    if (!url) {
        showNotification('Ошибка', 'URL не может быть пустым', 'error');
        return;
    }
    
    // Проверяем, что URL правильно сформирован
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        showNotification('Ошибка', 'URL должен начинаться с http:// или https://', 'error');
        return;
    }
    
    // Отправляем запрос на изменение URL
    fetch('/api/ollama/set-api-url', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: url })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showNotification('Ошибка', data.error, 'error');
        } else {
            showNotification('Успех', `URL API изменен на ${data.url}`, 'success');
            // Перезагружаем список моделей
            loadModels();
        }
    })
    .catch(error => {
        console.error('Ошибка при изменении URL API:', error);
        showNotification('Ошибка', `Не удалось изменить URL API: ${error.message}`, 'error');
    });
}

// Инициализация часов при загрузке
document.addEventListener('DOMContentLoaded', () => {
    // Запускаем часы
    updateClock();
    setInterval(updateClock, 1000);
    
    // Адаптируем для мобильных
    adaptForMobile();
});
// Управление изменениями кода
async function createCodeChange(description) {
    const response = await fetch('/api/code/changes/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description })
    });
    return await response.json();
}

async function commitCodeChanges(files, message) {
    const response = await fetch('/api/code/changes/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files, message })
    });
    return await response.json();
}

// Функция для показа уведомлений
function showNotification(title, message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <h4>${title}</h4>
        <p>${message}</p>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
