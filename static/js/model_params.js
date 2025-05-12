
class ModelParamsManager {
    constructor() {
        this.currentModel = null;
        this.settings = {};
    }

    async loadSettings(modelName) {
        try {
            const response = await fetch(`/api/model-params/settings/${modelName}`);
            if (!response.ok) throw new Error('Ошибка при загрузке настроек');
            
            this.settings = await response.json();
            this.currentModel = modelName;
            this.renderSettings();
        } catch (error) {
            console.error('Ошибка:', error);
            showNotification('Ошибка', 'Не удалось загрузить настройки модели', 'error');
        }
    }

    async saveSettings() {
        try {
            const response = await fetch(`/api/model-params/settings/${this.currentModel}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.settings)
            });

            if (!response.ok) throw new Error('Ошибка при сохранении настроек');
            
            showNotification('Успех', 'Настройки модели сохранены', 'success');
        } catch (error) {
            console.error('Ошибка:', error);
            showNotification('Ошибка', 'Не удалось сохранить настройки', 'error');
        }
    }

    renderSettings() {
        const container = document.getElementById('model-params');
        if (!container) return;

        container.innerHTML = `
            <div class="model-params-container">
                <h3>Параметры модели ${this.currentModel}</h3>
                <div class="param-group">
                    <label>Temperature:</label>
                    <input type="range" min="0" max="1" step="0.1" 
                           value="${this.settings.temperature}"
                           onchange="modelParamsManager.updateParam('temperature', this.value)">
                    <span>${this.settings.temperature}</span>
                </div>
                <div class="param-group">
                    <label>Top P:</label>
                    <input type="range" min="0" max="1" step="0.1" 
                           value="${this.settings.top_p}"
                           onchange="modelParamsManager.updateParam('top_p', this.value)">
                    <span>${this.settings.top_p}</span>
                </div>
                <div class="param-group">
                    <label>Max Tokens:</label>
                    <input type="number" min="1" max="4096" 
                           value="${this.settings.max_tokens}"
                           onchange="modelParamsManager.updateParam('max_tokens', this.value)">
                </div>
                <button onclick="modelParamsManager.saveSettings()">Сохранить настройки</button>
            </div>
        `;
    }

    updateParam(param, value) {
        this.settings[param] = parseFloat(value);
        this.renderSettings();
    }
}

// Инициализация менеджера параметров
const modelParamsManager = new ModelParamsManager();
