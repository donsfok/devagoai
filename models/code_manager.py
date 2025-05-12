
import git
import os
from datetime import datetime

class CodeManager:
    def __init__(self, repo_path='.'):
        self.repo = git.Repo(repo_path)
        
    def create_change_branch(self, description):
        """Создает новую ветку для изменений"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        branch_name = f'ai_changes_{timestamp}'
        current = self.repo.create_head(branch_name)
        current.checkout()
        return branch_name
        
    def commit_changes(self, files, message):
        """Коммитит изменения в текущую ветку"""
        self.repo.index.add(files)
        self.repo.index.commit(message)
        
    def apply_changes(self, branch_name):
        """Применяет изменения из ветки в master"""
        master = self.repo.heads.master
        master.checkout()
        self.repo.git.merge(branch_name)
