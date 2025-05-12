// Функции для работы с расширением мониторинга системы

// Загрузка системной информации
function loadSystemInfo() {
    fetch('/api/ext/system_monitor/system-info')
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                showNotification('Ошибка', data.error, 'error');
                return;
            }
            
            // Отображаем информацию о системе
            updateSystemInfoUI(data);
        })
        .catch(error => {
            console.error('Ошибка при загрузке информации о системе:', error);
            showNotification('Ошибка', `Не удалось загрузить информацию о системе: ${error.message}`, 'error');
        });
}

// Обновление UI с информацией о системе
function updateSystemInfoUI(data) {
    const systemInfoContainer = document.getElementById('system-info-container');
    if (!systemInfoContainer) return;
    
    // Форматирование размеров в удобочитаемом виде
    const formatBytes = (bytes, decimals = 2) => {
        if (bytes === 0) return '0 Байт';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Байт', 'КБ', 'МБ', 'ГБ', 'ТБ'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };
    
    // Базовая информация о системе
    systemInfoContainer.innerHTML = `
        <div class="mb-4">
            <h5><i class="fas fa-server me-2"></i>Информация о системе</h5>
            <div class="card neo-card mb-3">
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <p><strong>Хост:</strong> ${data.hostname}</p>
                            <p><strong>Система:</strong> ${data.system}</p>
                            <p><strong>Версия:</strong> ${data.release}</p>
                        </div>
                        <div class="col-md-6">
                            <p><strong>Процессоры:</strong> ${data.cpu.count} ядер</p>
                            <p><strong>Загрузка CPU:</strong> ${data.cpu.usage}%</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Память -->
            <div class="card neo-card mb-3">
                <div class="card-header">
                    <i class="fas fa-memory me-2"></i>Память
                </div>
                <div class="card-body">
                    <div class="row mb-2">
                        <div class="col-md-6">
                            <span>Использовано: ${formatBytes(data.memory.used)} / ${formatBytes(data.memory.total)}</span>
                        </div>
                        <div class="col-md-6 text-end">
                            <span>${data.memory.percent}%</span>
                        </div>
                    </div>
                    <div class="progress neo-progress">
                        <div class="progress-bar" role="progressbar" style="width: ${data.memory.percent}%" 
                             aria-valuenow="${data.memory.percent}" aria-valuemin="0" aria-valuemax="100"></div>
                    </div>
                </div>
            </div>
            
            <!-- Диск -->
            <div class="card neo-card">
                <div class="card-header">
                    <i class="fas fa-hdd me-2"></i>Диск
                </div>
                <div class="card-body">
                    <div class="row mb-2">
                        <div class="col-md-6">
                            <span>Использовано: ${formatBytes(data.disk.used)} / ${formatBytes(data.disk.total)}</span>
                        </div>
                        <div class="col-md-6 text-end">
                            <span>${data.disk.percent}%</span>
                        </div>
                    </div>
                    <div class="progress neo-progress">
                        <div class="progress-bar" role="progressbar" style="width: ${data.disk.percent}%" 
                             aria-valuenow="${data.disk.percent}" aria-valuemin="0" aria-valuemax="100"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Добавляем кнопки для других функций
    systemInfoContainer.innerHTML += `
        <div class="mb-3">
            <button class="btn btn-neo me-2" onclick="loadProcessesList()">
                <i class="fas fa-tasks me-1"></i> Процессы
            </button>
            <button class="btn btn-neo" onclick="loadNetworkInfo()">
                <i class="fas fa-network-wired me-1"></i> Сеть
            </button>
        </div>
    `;
}

// Загрузка списка процессов
function loadProcessesList() {
    fetch('/api/ext/system_monitor/processes')
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                showNotification('Ошибка', data.error, 'error');
                return;
            }
            
            // Отображаем список процессов во всплывающем окне
            showProcessesModal(data);
        })
        .catch(error => {
            console.error('Ошибка при загрузке списка процессов:', error);
            showNotification('Ошибка', `Не удалось загрузить список процессов: ${error.message}`, 'error');
        });
}

// Показать модальное окно со списком процессов
function showProcessesModal(data) {
    // Создаем таблицу процессов
    let processesTable = `
        <div class="table-responsive">
            <table class="table table-sm">
                <thead>
                    <tr>
                        <th>PID</th>
                        <th>Имя</th>
                        <th>Пользователь</th>
                        <th>CPU %</th>
                        <th>Память %</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    // Добавляем строки процессов
    data.processes.forEach(process => {
        processesTable += `
            <tr>
                <td>${process.pid}</td>
                <td>${process.name}</td>
                <td>${process.username}</td>
                <td>${process.cpu_percent}%</td>
                <td>${process.memory_percent}%</td>
            </tr>
        `;
    });
    
    processesTable += `
                </tbody>
            </table>
        </div>
    `;
    
    // Показываем модальное окно
    Swal.fire({
        title: 'Активные процессы',
        html: `
            <div class="mb-2">
                <small class="text-muted">Показаны ${data.processes.length} из ${data.count} процессов</small>
            </div>
            ${processesTable}
        `,
        width: '800px',
        confirmButtonText: 'Закрыть'
    });
}

// Загрузка сетевой информации
function loadNetworkInfo() {
    fetch('/api/ext/system_monitor/network')
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                showNotification('Ошибка', data.error, 'error');
                return;
            }
            
            // Отображаем сетевую информацию во всплывающем окне
            showNetworkModal(data);
        })
        .catch(error => {
            console.error('Ошибка при загрузке сетевой информации:', error);
            showNotification('Ошибка', `Не удалось загрузить сетевую информацию: ${error.message}`, 'error');
        });
}

// Показать модальное окно с сетевой информацией
function showNetworkModal(data) {
    // Форматирование байтов
    const formatBytes = (bytes, decimals = 2) => {
        if (bytes === 0) return '0 Байт';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Байт', 'КБ', 'МБ', 'ГБ', 'ТБ'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };
    
    // Создаем карточки для сетевых интерфейсов
    let interfacesHtml = '';
    
    for (const [name, stats] of Object.entries(data.interfaces)) {
        interfacesHtml += `
            <div class="card neo-card mb-3">
                <div class="card-header">
                    <i class="fas fa-ethernet me-2"></i>${name}
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <p><strong>Отправлено:</strong> ${formatBytes(stats.bytes_sent)} (${stats.packets_sent} пакетов)</p>
                            <p><strong>Ошибки исходящие:</strong> ${stats.errout}</p>
                            <p><strong>Dropped исходящие:</strong> ${stats.dropout}</p>
                        </div>
                        <div class="col-md-6">
                            <p><strong>Получено:</strong> ${formatBytes(stats.bytes_recv)} (${stats.packets_recv} пакетов)</p>
                            <p><strong>Ошибки входящие:</strong> ${stats.errin}</p>
                            <p><strong>Dropped входящие:</strong> ${stats.dropin}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Создаем таблицу соединений
    let connectionsTable = `
        <div class="table-responsive">
            <table class="table table-sm">
                <thead>
                    <tr>
                        <th>Тип</th>
                        <th>Локальный адрес</th>
                        <th>Удаленный адрес</th>
                        <th>Статус</th>
                        <th>PID</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    // Добавляем строки соединений
    data.connections.forEach(conn => {
        const localAddr = conn.local_addr.ip ? `${conn.local_addr.ip}:${conn.local_addr.port}` : '-';
        const remoteAddr = conn.remote_addr.ip ? `${conn.remote_addr.ip}:${conn.remote_addr.port}` : '-';
        
        connectionsTable += `
            <tr>
                <td>${conn.type}</td>
                <td>${localAddr}</td>
                <td>${remoteAddr}</td>
                <td>${conn.status || '-'}</td>
                <td>${conn.pid || '-'}</td>
            </tr>
        `;
    });
    
    connectionsTable += `
                </tbody>
            </table>
        </div>
    `;
    
    // Показываем модальное окно
    Swal.fire({
        title: 'Сетевая информация',
        html: `
            <div>
                <h6 class="mb-3">Сетевые интерфейсы</h6>
                ${interfacesHtml}
                
                <h6 class="mb-3">Активные соединения</h6>
                <div class="mb-2">
                    <small class="text-muted">Показаны ${data.connections.length} из ${data.connections_count} соединений</small>
                </div>
                ${connectionsTable}
            </div>
        `,
        width: '800px',
        confirmButtonText: 'Закрыть'
    });
}

// Инициализация панели мониторинга системы
function initializeSystemMonitor(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Создаем контейнер для информации о системе
    container.innerHTML = `
        <div id="system-info-container" class="mt-3">
            <div class="text-center py-4">
                <div class="spinner"></div>
                <p class="mt-2">Загрузка информации о системе...</p>
            </div>
        </div>
    `;
    
    // Загружаем информацию о системе
    loadSystemInfo();
    
    // Настраиваем автообновление каждые 10 секунд
    window.systemMonitorInterval = setInterval(() => {
        loadSystemInfo();
    }, 10000);
}