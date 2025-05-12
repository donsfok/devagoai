// Функции для работы с расширениями

// Загрузка списка расширений
function loadExtensions() {
    showLoader('#extensions-container');
    
    fetch('/api/extensions/list')
        .then(response => response.json())
        .then(data => {
            const extensionsContainer = document.querySelector('#extensions-container');
            extensionsContainer.innerHTML = '';
            
            if (data.error) {
                extensionsContainer.innerHTML = `
                    <div class="alert alert-danger">${data.error}</div>
                `;
                hideLoader('#extensions-container');
                return;
            }
            
            const extensions = data.extensions || [];
            
            if (extensions.length === 0) {
                extensionsContainer.innerHTML = `
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle"></i>
                        Расширения не найдены. Создайте новое расширение с помощью кнопки "Новое расширение".
                    </div>
                `;
                hideLoader('#extensions-container');
                return;
            }
            
            // Создаем карточки для каждого расширения
            extensions.forEach(extension => {
                const card = document.createElement('div');
                card.className = 'card mb-3 neo-card';
                
                // Состояние расширения (включено/отключено)
                const enabledClass = extension.enabled ? 'success' : 'muted';
                const enabledIcon = extension.enabled ? 'check-circle' : 'circle';
                const enabledText = extension.enabled ? 'Включено' : 'Отключено';
                
                card.innerHTML = `
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <h5 class="card-title mb-0">
                                <i class="fas fa-puzzle-piece me-2"></i>
                                ${extension.name}
                            </h5>
                            <span class="badge text-${enabledClass}">
                                <i class="fas fa-${enabledIcon} me-1"></i>
                                ${enabledText}
                            </span>
                        </div>
                        
                        <div class="card-text mb-3">
                            <small class="text-muted d-block">ID: ${extension.id}</small>
                            <small class="text-muted d-block">Версия: ${extension.version}</small>
                            ${extension.author ? `<small class="text-muted d-block">Автор: ${extension.author}</small>` : ''}
                        </div>
                        
                        <p class="card-text mb-3">${extension.description || 'Нет описания'}</p>
                        
                        <div class="d-flex">
                            <button class="btn btn-sm btn-outline-primary me-2" 
                                    onclick="toggleExtension('${extension.id}', ${!extension.enabled})">
                                <i class="fas fa-${extension.enabled ? 'times' : 'check'}"></i>
                                ${extension.enabled ? 'Отключить' : 'Включить'}
                            </button>
                            <button class="btn btn-sm btn-outline-secondary" 
                                    onclick="openExtensionCode('${extension.directory}')">
                                <i class="fas fa-code"></i>
                                Редактировать код
                            </button>
                        </div>
                    </div>
                `;
                
                extensionsContainer.appendChild(card);
            });
            
            hideLoader('#extensions-container');
        })
        .catch(error => {
            console.error('Ошибка при загрузке расширений:', error);
            document.querySelector('#extensions-container').innerHTML = `
                <div class="alert alert-danger">Ошибка при загрузке расширений: ${error.message}</div>
            `;
            hideLoader('#extensions-container');
        });
}

// Включение/отключение расширения
function toggleExtension(id, enabled) {
    showLoader('#extensions-container');
    
    fetch('/api/extensions/toggle', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            id: id,
            enabled: enabled
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showNotification('Ошибка', data.error, 'error');
            hideLoader('#extensions-container');
            return;
        }
        
        showNotification(
            'Расширение обновлено', 
            `Расширение ${data.enabled ? 'включено' : 'отключено'}`,
            data.enabled ? 'success' : 'info'
        );
        
        // Перезагружаем список расширений
        loadExtensions();
    })
    .catch(error => {
        console.error('Ошибка при обновлении расширения:', error);
        showNotification('Ошибка', `Ошибка при обновлении расширения: ${error.message}`, 'error');
        hideLoader('#extensions-container');
    });
}

// Открытие кода расширения в редакторе
function openExtensionCode(directory) {
    // Переключаемся на вкладку файлов
    document.querySelector('[data-bs-target="#files-tab"]').click();
    
    // Путь к директории расширения
    const path = `extensions/${directory}`;
    
    // Загружаем файлы расширения
    loadFileExplorer(path);
    
    showNotification('Файлы расширения', 'Открыта директория расширения', 'info');
}

// Создание нового расширения
function createExtension() {
    Swal.fire({
        title: 'Создание нового расширения',
        html: `
            <form>
                <div class="mb-3">
                    <label for="ext-id" class="form-label">ID расширения*</label>
                    <input type="text" class="form-control" id="ext-id" placeholder="my_extension">
                    <small class="text-muted">Только латинские буквы, цифры и подчеркивания</small>
                </div>
                <div class="mb-3">
                    <label for="ext-name" class="form-label">Название*</label>
                    <input type="text" class="form-control" id="ext-name" placeholder="Моё расширение">
                </div>
                <div class="mb-3">
                    <label for="ext-description" class="form-label">Описание</label>
                    <textarea class="form-control" id="ext-description" rows="2"></textarea>
                </div>
                <div class="mb-3">
                    <label for="ext-author" class="form-label">Автор</label>
                    <input type="text" class="form-control" id="ext-author">
                </div>
            </form>
        `,
        showCancelButton: true,
        confirmButtonText: 'Создать',
        cancelButtonText: 'Отмена',
        preConfirm: () => {
            const id = document.getElementById('ext-id').value.trim();
            const name = document.getElementById('ext-name').value.trim();
            const description = document.getElementById('ext-description').value.trim();
            const author = document.getElementById('ext-author').value.trim();
            
            if (!id) {
                Swal.showValidationMessage('Укажите ID расширения');
                return false;
            }
            
            if (!name) {
                Swal.showValidationMessage('Укажите название расширения');
                return false;
            }
            
            // Проверка формата ID
            if (!/^[a-zA-Z0-9_]+$/.test(id)) {
                Swal.showValidationMessage('ID может содержать только латинские буквы, цифры и подчеркивания');
                return false;
            }
            
            return { id, name, description, author };
        }
    }).then((result) => {
        if (result.isConfirmed) {
            // Отправляем запрос на создание расширения
            fetch('/api/extensions/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(result.value)
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    showNotification('Ошибка', data.error, 'error');
                    return;
                }
                
                showNotification('Создано расширение', `Расширение "${data.name}" успешно создано`, 'success');
                
                // Обновляем список расширений
                loadExtensions();
                
                // Предлагаем открыть код расширения
                setTimeout(() => {
                    Swal.fire({
                        title: 'Открыть код расширения?',
                        text: 'Хотите перейти к редактированию кода расширения?',
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonText: 'Да, открыть',
                        cancelButtonText: 'Нет, позже'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            openExtensionCode(data.id);
                        }
                    });
                }, 1000);
            })
            .catch(error => {
                console.error('Ошибка при создании расширения:', error);
                showNotification('Ошибка', `Ошибка при создании расширения: ${error.message}`, 'error');
            });
        }
    });
}