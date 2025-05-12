
// Менеджер моделей
class ModelsManager {
    constructor() {
        this.models = new Map();
        this.activeModel = null;
    }

    async downloadModel(modelName) {
        try {
            const response = await fetch('/api/ollama/pull', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ model: modelName })
            });
            
            if (!response.ok) {
                showNotification('Ошибка', 'Не удалось загрузить модель', 'error');
                return;
            }
            
            const data = await response.json();
            this.updateModelStatus(modelName, 'downloading');
            return data;
        } catch (error) {
            console.error('Ошибка:', error);
            throw error;
        }
    }

    async getModelStatus(modelName) {
        try {
            const response = await fetch('/api/ollama/models');
            const data = await response.json();
            return data.find(m => m.name === modelName);
        } catch (error) {
            console.error('Ошибка получения статуса:', error);
            throw error;
        }
    }

    updateModelStatus(modelName, status) {
        this.models.set(modelName, status);
        this.renderModelsList();
    }

    renderModelsList() {
        const container = document.getElementById('models-list');
        if (!container) return;

        container.innerHTML = '';
        this.models.forEach((status, name) => {
            const modelEl = document.createElement('div');
            modelEl.className = `model-item status-${status}`;
            modelEl.innerHTML = `
                <span class="model-name">${name}</span>
                <span class="model-status">${status}</span>
                <button onclick="modelsManager.downloadModel('${name}')">Скачать</button>
            `;
            container.appendChild(modelEl);
        });
    }
}

// Инициализация
const modelsManager = new ModelsManager();
