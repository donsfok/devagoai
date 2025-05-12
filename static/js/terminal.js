// Инициализация и управление терминалом
function initializeTerminal() {
    // Создаем экземпляр терминала
    const term = new Terminal({
        cursorBlink: true,
        theme: {
            background: '#000000',
            foreground: '#f0f0f0',
            cursor: '#f0f0f0',
            cursorAccent: '#000000',
            selection: 'rgba(128, 128, 255, 0.3)',
            black: '#000000',
            red: '#ff5555',
            green: '#50fa7b',
            yellow: '#f1fa8c',
            blue: '#bd93f9',
            magenta: '#ff79c6',
            cyan: '#8be9fd',
            white: '#f8f8f2',
            brightBlack: '#6272a4',
            brightRed: '#ff6e6e',
            brightGreen: '#69ff94',
            brightYellow: '#ffffa5',
            brightBlue: '#d6acff',
            brightMagenta: '#ff92df',
            brightCyan: '#a4ffff',
            brightWhite: '#ffffff'
        },
        fontFamily: 'Fira Code, monospace',
        fontSize: 14,
        lineHeight: 1.2,
        scrollback: 5000,
        allowTransparency: true
    });
    
    // Создаем подпроцесс со стандартными потоками
    const fitAddon = new FitAddon.FitAddon();
    term.loadAddon(fitAddon);
    
    // Поле ввода команды
    let commandInput = '';
    const prompt = '\r\n\x1b[1;32m$ \x1b[0m';
    
    // Открываем терминал в контейнере
    term.open(document.getElementById('terminal'));
    fitAddon.fit();
    
    // Приветственное сообщение
    term.write('\x1b[1;34mФутуристический терминал ИИ\x1b[0m\r\n');
    term.write('Введите команды для управления системой.\r\n');
    term.write('Для помощи введите \x1b[1;33mhelp\x1b[0m\r\n');
    term.write(prompt);
    
    // Обработка ввода
    term.onKey(({ key, domEvent }) => {
        const printable = !domEvent.altKey && !domEvent.ctrlKey && !domEvent.metaKey;
        
        if (domEvent.keyCode === 13) { // Enter
            // Отправляем команду
            executeCommand(commandInput, term);
            commandInput = '';
        } else if (domEvent.keyCode === 8) { // Backspace
            // Удаляем последний символ
            if (commandInput.length > 0) {
                commandInput = commandInput.substring(0, commandInput.length - 1);
                term.write('\b \b');
            }
        } else if (printable) {
            // Добавляем символ к команде
            commandInput += key;
            term.write(key);
        }
    });
    
    // Обработчик изменения размера окна
    window.addEventListener('resize', () => {
        fitAddon.fit();
    });
    
    return term;
}

// Выполнение команды в терминале
function executeCommand(command, term) {
    term.write('\r\n');
    
    // Специальные локальные команды
    if (command.trim() === 'clear' || command.trim() === 'cls') {
        term.clear();
        term.write('\x1b[1;34mФутуристический терминал ИИ\x1b[0m\r\n');
        term.write(getPrompt());
        return;
    }
    
    if (command.trim() === 'help') {
        showHelp(term);
        return;
    }
    
    if (command.trim() === '') {
        term.write(getPrompt());
        return;
    }
    
    // Отправляем команду на выполнение на сервер
    fetch('/api/terminal/execute', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ command: command })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error === true) {
            term.write(`\x1b[1;31m${data.output}\x1b[0m\r\n`);
        } else {
            // Вывод результата построчно с правильными переносами строк
            const lines = data.output.split('\n');
            lines.forEach((line, index) => {
                term.write(`${line}${index < lines.length - 1 ? '\r\n' : ''}`);
            });
        }
        term.write(getPrompt());
    })
    .catch(error => {
        console.error('Ошибка при выполнении команды:', error);
        term.write(`\x1b[1;31mОшибка: ${error.message}\x1b[0m\r\n`);
        term.write(getPrompt());
    });
}

// Получение строки приглашения
function getPrompt() {
    return '\r\n\x1b[1;32m$ \x1b[0m';
}

// Отображение справки
function showHelp(term) {
    term.write('\x1b[1;34mДоступные команды:\x1b[0m\r\n');
    term.write('\x1b[1;33mclear/cls\x1b[0m - очистить терминал\r\n');
    term.write('\x1b[1;33mhelp\x1b[0m - показать эту справку\r\n');
    term.write('\x1b[1;33mls\x1b[0m - показать содержимое директории\r\n');
    term.write('\x1b[1;33mpwd\x1b[0m - показать текущую директорию\r\n');
    term.write('\x1b[1;33mcat [файл]\x1b[0m - показать содержимое файла\r\n');
    term.write('\x1b[1;33mps\x1b[0m - показать список процессов\r\n');
    term.write('\x1b[1;33mdate\x1b[0m - показать текущую дату и время\r\n');
    term.write('\x1b[1;33mwhoami\x1b[0m - показать имя пользователя\r\n');
    term.write('\x1b[1;33muname -a\x1b[0m - показать информацию о системе\r\n');
    term.write('\x1b[1;33mecho [текст]\x1b[0m - вывести текст\r\n');
    term.write('\r\n\x1b[1;31mПримечание:\x1b[0m Некоторые команды ограничены в целях безопасности.\r\n');
    term.write(getPrompt());
}

