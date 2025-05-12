from datetime import datetime
import json
from typing import List, Dict, Optional

class LogEntry:
    def __init__(self, action: str, details: str, status: str = "info", timestamp: str = None):
        self.action = action
        self.details = details
        self.status = status
        self.timestamp = timestamp or datetime.now().isoformat()

    def to_dict(self) -> Dict:
        return {
            "action": self.action,
            "details": self.details,
            "status": self.status,
            "timestamp": self.timestamp
        }

class LogManager:
    def __init__(self, log_file: str = "logs.json"):
        self.log_file = log_file
        self.logs: List[LogEntry] = []
        self.load_logs()

    def load_logs(self):
        try:
            with open(self.log_file, 'r') as f:
                logs_data = json.load(f)
                self.logs = [LogEntry(**log) for log in logs_data]
        except (FileNotFoundError, json.JSONDecodeError):
            self.logs = []

    def save_logs(self):
        with open(self.log_file, 'w') as f:
            json.dump([log.to_dict() for log in self.logs], f, indent=2)

    def add_log(self, log_entry: LogEntry):
        self.logs.append(log_entry)
        self.save_logs()

    def get_logs(self, limit: Optional[int] = None) -> List[Dict]:
        logs = sorted(self.logs, key=lambda x: x.timestamp, reverse=True)
        if limit:
            logs = logs[:limit]
        return [log.to_dict() for log in logs]

class Config:
    def __init__(self):
        self.ollama_url = "http://localhost:11434"
        self.debug = True
        self.log_level = "DEBUG"

# Создаем глобальные экземпляры
log_manager = LogManager()
config = Config()