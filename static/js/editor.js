// Инициализация и управление редактором кода
function initializeEditor() {
    // Создаем экземпляр редактора CodeMirror
    const editor = CodeMirror(document.getElementById('editor'), {
        value: "// Выберите файл для редактирования",
        mode: "javascript",
        theme: "dracula",
        lineNumbers: true,
        indentUnit: 4,
        smartIndent: true,
        tabSize: 4,
        indentWithTabs: false,
        electricChars: true,
        keyMap: "sublime",
        matchBrackets: true,
        autoCloseBrackets: true,
        autoCloseTags: true,
        matchTags: { bothTags: true },
        highlightSelectionMatches: { minChars: 3 },
        foldGutter: true,
        gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
        lint: true,
        extraKeys: {
            "Ctrl-Space": "autocomplete",
            "F11": function(cm) {
                cm.setOption("fullScreen", !cm.getOption("fullScreen"));
            },
            "Esc": function(cm) {
                if (cm.getOption("fullScreen")) cm.setOption("fullScreen", false);
            }
        }
    });
    
    // Автоматический размер по высоте контейнера
    editor.setSize("100%", "100%");
    
    // Обработчик изменения размера окна
    window.addEventListener('resize', () => {
        editor.refresh();
    });
    
    return editor;
}

// Обработка запроса на генерацию кода с помощью ИИ
function generateCode() {
    const currentModel = document.querySelector('#current-model').value;
    
    if (!currentModel) {
        showNotification('Ошибка', 'Сначала выберите модель ИИ', 'error');
        return;
    }
    
    // Получаем выделенный текст или весь код
    const editor = window.editorInstance;
    const selectedText = editor.getSelection();
    const codeContext = selectedText || editor.getValue();
    const mode = editor.getOption('mode');
    
    // Формируем промпт в зависимости от контекста
    let prompt = '';
    
    if (selectedText) {
        prompt = `Улучши или исправь следующий код:\n\n\`\`\`\n${selectedText}\n\`\`\`\n\nПожалуйста, предоставь только улучшенную версию кода без дополнительных объяснений.`;
    } else {
        prompt = `Проанализируй следующий код и предложи улучшения или исправления:\n\n\`\`\`\n${codeContext}\n\`\`\`\n\nПожалуйста, предоставь улучшенную версию кода и краткие комментарии о внесенных изменениях.`;
    }
    
    // Показываем диалог подтверждения
    Swal.fire({
        title: 'Запрос к ИИ',
        html: `
            <p>Вы хотите отправить ${selectedText ? 'выделенный фрагмент' : 'весь код'} на анализ модели ${currentModel}?</p>
            <div class="form-group">
                <label for="ai-prompt" class="form-label">Изменить запрос (опционально):</label>
                <textarea id="ai-prompt" class="form-control" rows="5">${prompt}</textarea>
            </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Отправить',
        cancelButtonText: 'Отмена',
        reverseButtons: true,
        preConfirm: () => {
            return document.getElementById('ai-prompt').value;
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const finalPrompt = result.value;
            
            // Показываем диалог загрузки
            Swal.fire({
                title: 'Генерация кода',
                html: 'Модель обрабатывает запрос...',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });
            
            // Отправляем запрос к модели
            fetch('/api/ollama/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: currentModel,
                    prompt: finalPrompt
                })
            })
            .then(response => response.json())
            .then(data => {
                Swal.close();
                
                if (data.error) {
                    showNotification('Ошибка', data.error, 'error');
                    return;
                }
                
                const response = data.response || '';
                
                // Извлекаем код из ответа (ищем блоки кода между ```)
                let codeMatch = response.match(/```(?:\w+)?\n([\s\S]*?)```/);
                let extractedCode = codeMatch ? codeMatch[1].trim() : response;
                
                // Показываем диалог с результатом
                Swal.fire({
                    title: 'Результат генерации',
                    html: `
                        <div class="mb-3">
                            <pre class="code-preview">${escapeHtml(extractedCode)}</pre>
                        </div>
                    `,
                    icon: 'info',
                    showCancelButton: true,
                    confirmButtonText: 'Применить',
                    cancelButtonText: 'Отмена',
                    reverseButtons: true,
                    customClass: {
                        popup: 'swal-wide'
                    }
                }).then((applyResult) => {
                    if (applyResult.isConfirmed) {
                        if (selectedText) {
                            // Заменяем только выделенный текст
                            const selectedRange = editor.listSelections()[0];
                            editor.replaceRange(extractedCode, selectedRange.anchor, selectedRange.head);
                            showNotification('Успех', 'Код успешно обновлен', 'success');
                        } else {
                            // Заменяем весь код
                            editor.setValue(extractedCode);
                            showNotification('Успех', 'Код полностью заменен', 'success');
                        }
                    }
                });
            })
            .catch(error => {
                Swal.close();
                console.error('Ошибка при генерации кода:', error);
                showNotification('Ошибка', `Ошибка при генерации кода: ${error.message}`, 'error');
            });
        }
    });
}

// Настройка редактора выполняется в main.js
// generateCode() теперь доступен глобально для использования
