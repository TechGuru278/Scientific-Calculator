class SecureVault {
    constructor() {
        this.db = null;
        this.dbName = 'SecureVaultDB';
        this.dbVersion = 1;
        this.storeName = 'vaultFiles';
        this.passwordKey = 'vault_password';
        this.masterPassword = 'Shreyu';
        this.secretClickCount = 0;
        this.secretClickTimeout = null;
        
        this.init();
    }

    async init() {
        await this.initIndexedDB();
        this.bindEvents();
        this.loadFiles();
        this.initSecretAccess();
    }

    async initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('Error opening IndexedDB:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { 
                        keyPath: 'id',
                        autoIncrement: true 
                    });
                    store.createIndex('name', 'name', { unique: false });
                    store.createIndex('type', 'type', { unique: false });
                    store.createIndex('uploadDate', 'uploadDate', { unique: false });
                }
            };
        });
    }

    bindEvents() {
        // Navigation
        document.getElementById('backBtn').addEventListener('click', () => {
            window.location.href = 'index.html';
        });

        document.getElementById('lockBtn').addEventListener('click', () => {
            this.lockVault();
        });

        // File operations
        document.getElementById('addFilesBtn').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });

        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files);
        });

        // Settings
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.openSettingsModal();
        });

        document.getElementById('closeSettings').addEventListener('click', () => {
            this.closeSettingsModal();
        });

        document.getElementById('changePasswordBtn').addEventListener('click', () => {
            this.changePassword();
        });

        // Drag and drop
        const filesGrid = document.getElementById('filesGrid');
        filesGrid.addEventListener('dragover', (e) => {
            e.preventDefault();
            filesGrid.style.opacity = '0.7';
        });

        filesGrid.addEventListener('dragleave', () => {
            filesGrid.style.opacity = '1';
        });

        filesGrid.addEventListener('drop', (e) => {
            e.preventDefault();
            filesGrid.style.opacity = '1';
            this.handleFileUpload(e.dataTransfer.files);
        });
    }

    initSecretAccess() {
        // Add secret click access to vault title
        const vaultTitle = document.querySelector('.vault-title h1');
        if (vaultTitle) {
            vaultTitle.addEventListener('click', () => {
                this.handleSecretClick();
            });
            vaultTitle.style.cursor = 'pointer';
        }
    }

    handleSecretClick() {
        this.secretClickCount++;
        
        if (this.secretClickTimeout) {
            clearTimeout(this.secretClickTimeout);
        }

        // Visual feedback
        const vaultTitle = document.querySelector('.vault-title h1');
        vaultTitle.style.textShadow = '0 0 20px rgba(255,255,255,0.8)';
        setTimeout(() => {
            vaultTitle.style.textShadow = 'none';
        }, 300);

        if (this.secretClickCount >= 5) {
            this.showSettingsButton();
            this.secretClickCount = 0;
        } else {
            this.secretClickTimeout = setTimeout(() => {
                this.secretClickCount = 0;
            }, 3000);
        }
    }

    showSettingsButton() {
        const settingsBtn = document.getElementById('settingsBtn');
        settingsBtn.style.display = 'flex';
        
        // Show notification
        this.showNotification('Settings unlocked!', 'success');
    }

    async handleFileUpload(files) {
        const fileArray = Array.from(files);
        
        for (const file of fileArray) {
            if (file.size > 500 * 1024 * 1024) { // 500MB limit per file
                this.showNotification(`File ${file.name} is too large (max 500MB)`, 'error');
                continue;
            }

            try {
                const fileData = await this.fileToData(file);
                await this.saveFile(fileData);
                this.showNotification(`${file.name} uploaded successfully`, 'success');
            } catch (error) {
                console.error('Error uploading file:', error);
                this.showNotification(`Error uploading ${file.name}`, 'error');
            }
        }

        // Clear file input
        document.getElementById('fileInput').value = '';
        await this.loadFiles();
    }

    async fileToData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = () => {
                resolve({
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    data: reader.result,
                    uploadDate: new Date().toISOString()
                });
            };
            
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });
    }

    async saveFile(fileData) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.add(fileData);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async loadFiles() {
        try {
            const files = await this.getAllFiles();
            this.renderFiles(files);
        } catch (error) {
            console.error('Error loading files:', error);
            this.showNotification('Error loading files', 'error');
        }
    }

    async getAllFiles() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    renderFiles(files) {
        const filesGrid = document.getElementById('filesGrid');
        const emptyState = document.getElementById('emptyState');

        if (files.length === 0) {
            emptyState.style.display = 'block';
            filesGrid.innerHTML = '';
            filesGrid.appendChild(emptyState);
            return;
        }

        emptyState.style.display = 'none';
        filesGrid.innerHTML = '';

        files.forEach(file => {
            const fileElement = this.createFileElement(file);
            filesGrid.appendChild(fileElement);
        });
    }

    createFileElement(file) {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';

        const preview = this.createFilePreview(file);
        const fileSize = this.formatFileSize(file.size);
        const uploadDate = new Date(file.uploadDate).toLocaleDateString();

        fileItem.innerHTML = `
            ${preview}
            <div class="file-info">
                <div class="file-name">${this.escapeHtml(file.name)}</div>
                <div class="file-details">${fileSize} • ${uploadDate}</div>
            </div>
            <div class="file-actions">
                <button class="download-btn" onclick="vault.downloadFile(${file.id})">
                    <i class="fas fa-download"></i> Download
                </button>
                <button class="delete-btn" onclick="vault.deleteFile(${file.id})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;

        return fileItem;
    }

    createFilePreview(file) {
        const preview = document.createElement('div');
        preview.className = 'file-preview';

        if (file.type.startsWith('image/')) {
            preview.innerHTML = `<img src="${file.data}" alt="${file.name}" loading="lazy">`;
        } else if (file.type.startsWith('video/')) {
            preview.innerHTML = `<video src="${file.data}" controls></video>`;
        } else {
            const icon = this.getFileIcon(file.type);
            preview.innerHTML = `<i class="${icon} file-icon"></i>`;
        }

        return preview.outerHTML;
    }

    getFileIcon(mimeType) {
        if (mimeType.startsWith('image/')) return 'fas fa-image';
        if (mimeType.startsWith('video/')) return 'fas fa-video';
        if (mimeType.startsWith('audio/')) return 'fas fa-music';
        if (mimeType.includes('pdf')) return 'fas fa-file-pdf';
        if (mimeType.includes('document') || mimeType.includes('word')) return 'fas fa-file-word';
        if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'fas fa-file-excel';
        if (mimeType.includes('text')) return 'fas fa-file-alt';
        if (mimeType.includes('zip') || mimeType.includes('archive')) return 'fas fa-file-archive';
        return 'fas fa-file';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async downloadFile(fileId) {
        try {
            const file = await this.getFile(fileId);
            if (!file) return;

            const link = document.createElement('a');
            link.href = file.data;
            link.download = file.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showNotification(`${file.name} downloaded`, 'success');
        } catch (error) {
            console.error('Error downloading file:', error);
            this.showNotification('Error downloading file', 'error');
        }
    }

    async deleteFile(fileId) {
        if (!confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
            return;
        }

        try {
            await this.removeFile(fileId);
            await this.loadFiles();
            this.showNotification('File deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting file:', error);
            this.showNotification('Error deleting file', 'error');
        }
    }

    async getFile(fileId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get(fileId);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async removeFile(fileId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(fileId);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    lockVault() {
        if (confirm('Are you sure you want to lock the vault and return to the calculator?')) {
            window.location.href = 'index.html';
        }
    }

    openSettingsModal() {
        const modal = document.getElementById('settingsModal');
        modal.classList.remove('hidden');
        
        // Clear inputs
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
    }

    closeSettingsModal() {
        const modal = document.getElementById('settingsModal');
        modal.classList.add('hidden');
    }

    changePassword() {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Get stored password or use master password
        const storedPassword = localStorage.getItem(this.passwordKey) || this.masterPassword;

        if (currentPassword !== storedPassword && currentPassword !== this.masterPassword) {
            this.showNotification('Current password is incorrect', 'error');
            return;
        }

        if (newPassword.length < 1) {
            this.showNotification('New password cannot be empty', 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            this.showNotification('New passwords do not match', 'error');
            return;
        }

        localStorage.setItem(this.passwordKey, newPassword);
        this.closeSettingsModal();
        this.showNotification('Password changed successfully', 'success');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: type === 'error' ? 'linear-gradient(135deg, #f093fb, #f5576c)' : 
                       type === 'success' ? 'linear-gradient(135deg, #667eea, #764ba2)' : 
                       'linear-gradient(135deg, #764ba2, #667eea)',
            color: 'white',
            padding: '15px 20px',
            borderRadius: '10px',
            boxShadow: '0 8px 25px rgba(0,0,0,0.3)',
            zIndex: '3000',
            animation: 'slideInRight 0.3s ease',
            maxWidth: '300px',
            wordWrap: 'break-word'
        });

        document.body.appendChild(notification);

        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Add notification animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize vault when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.vault = new SecureVault();
});