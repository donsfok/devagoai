
// Функции для работы с Ollama API

// Загрузка списка моделей
async function loadModels() {
    try {
        const response = await fetch('/api/ollama/models');
        const data = await response.json();
        
        if (data.error) {
            showNotification('Ошибка', data.error, 'error');
            return;
        }
        
        updateModelsList(data.models || []);
    } catch (error) {
        console.error('Ошибка при загрузке моделей:', error);
        showNotification('Ошибка', 'Не удалось загрузить список моделей', 'error');
    }
}

// Загрузка новой модели
async function pullModel(modelName) {
    showNotification('Информация', `Начата загрузка модели ${modelName}`, 'info');
    
    try {
        const response = await fetch('/api/ollama/pull', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ model: modelName })
        });
        
        const data = await response.json();
        
        if (data.error) {
            showNotification('Ошибка', data.error, 'error');
            return;
        }
        
        showNotification('Успех', data.message, 'success');
        loadModels(); // Обновляем список моделей
    } catch (error) {
        console.error('Ошибка при загрузке модели:', error);
        showNotification('Ошибка', 'Не удалось загрузить модель', 'error');
    }
}

// Отправка запроса к модели
async function generateResponse(model, prompt) {
    try {
        const response = await fetch('/api/ollama/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ model, prompt })
        });
        
        const data = await response.json();
        
        if (data.error) {
            showNotification('Ошибка', data.error, 'error');
            return null;
        }
        
        return data.response;
    } catch (error) {
        console.error('Ошибка при генерации ответа:', error);
        showNotification('Ошибка', 'Не удалось получить ответ от модели', 'error');
        return null;
    }
}

// Чат с моделью
async function chatWithModel(model, messages) {
    try {
        const response = await fetch('/api/ollama/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ model, messages })
        });
        
        const data = await response.json();
        
        if (data.error) {
            showNotification('Ошибка', data.error, 'error');
            return null;
        }
        
        return data.message;
    } catch (error) {
        console.error('Ошибка в чате:', error);
        showNotification('Ошибка', 'Не удалось получить ответ в чате', 'error');
        return null;
    }
}

// Обновление списка моделей в интерфейсе
function updateModelsList(models) {
    const container = document.querySelector('#models-list');
    if (!container) return;
    
    container.innerHTML = models.map(model => `
        <div class="model-item card mb-2">
            <div class="card-body">
                <h5 class="card-title">${model.name}</h5>
                <p class="card-text">
                    <small class="text-muted">Размер: ${formatSize(model.size)}</small>
                </p>
                <button class="btn btn-primary btn-sm" onclick="selectModel('${model.name}')">
                    Выбрать
                </button>
            </div>
        </div>
    `).join('');
}

// Форматирование размера в читаемый вид
function formatSize(bytes) {
    const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
    if (bytes === 0) return '0 Б';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
}
