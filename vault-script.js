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
        this.isMobile = this.detectMobile();
        
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

    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
               window.navigator.userAgent.includes('wv') || // WebView detection
               window.navigator.userAgent.includes('Version/') && window.navigator.userAgent.includes('Mobile'); // Additional WebView detection
    }

    // Enhanced file input trigger for Android WebView
    triggerFileInput(fileInput) {
        // Multiple trigger attempts for better Android WebView compatibility
        const triggerMethods = [
            () => fileInput.click(),
            () => {
                const event = new MouseEvent('click', {
                    view: window,
                    bubbles: true,
                    cancelable: true
                });
                fileInput.dispatchEvent(event);
            },
            () => {
                const event = new Event('click', { bubbles: true });
                fileInput.dispatchEvent(event);
            },
            () => {
                // Focus and trigger programmatically
                fileInput.focus();
                fileInput.click();
            }
        ];

        // Try each method with delays
        triggerMethods.forEach((method, index) => {
            setTimeout(() => {
                try {
                    method();
                } catch (error) {
                    console.log(`File input trigger method ${index + 1} failed:`, error);
                }
            }, index * 50);
        });

        // Show user feedback for Android WebView
        if (this.isMobile) {
            this.showNotification('Tap to select files. If file picker doesn\'t open, try refreshing the page.', 'info');
        }
    }

    // Robust storage methods for mobile WebView compatibility
    setStorageItem(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            try {
                sessionStorage.setItem(key, JSON.stringify(value));
            } catch (e2) {
                if (!window.memoryStorage) window.memoryStorage = {};
                window.memoryStorage[key] = JSON.stringify(value);
            }
        }
    }

    getStorageItem(key) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (e) {
            try {
                const item = sessionStorage.getItem(key);
                return item ? JSON.parse(item) : null;
            } catch (e2) {
                if (window.memoryStorage && window.memoryStorage[key]) {
                    return JSON.parse(window.memoryStorage[key]);
                }
                return null;
            }
        }
    }

    bindEvents() {
        // Navigation
        document.getElementById('backBtn').addEventListener('click', () => {
            window.location.href = 'index.html';
        });

        document.getElementById('lockBtn').addEventListener('click', () => {
            this.lockVault();
        });

        // File operations - Enhanced for Android WebView
        document.getElementById('addFilesBtn').addEventListener('click', (e) => {
            e.preventDefault();
            const fileInput = document.getElementById('fileInput');
            
            // Enhanced Android WebView file input handling
            if (this.isMobile) {
                fileInput.setAttribute('accept', '*/*');
                fileInput.setAttribute('capture', '');
                fileInput.setAttribute('multiple', 'multiple');
                
                // Create a new file input if the old one is not working
                const newFileInput = document.createElement('input');
                newFileInput.type = 'file';
                newFileInput.id = 'fileInput';
                newFileInput.multiple = true;
                newFileInput.accept = '*/*';
                newFileInput.style.display = 'none';
                
                // Replace the old input
                const oldInput = document.getElementById('fileInput');
                oldInput.parentNode.replaceChild(newFileInput, oldInput);
                
                // Add event listener to new input
                newFileInput.addEventListener('change', (e) => {
                    this.handleFileUpload(e.target.files);
                });
                
                // Force click with multiple attempts for Android WebView
                this.triggerFileInput(newFileInput);
            } else {
                this.triggerFileInput(fileInput);
            }
        });

        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files);
        });

        // Enhanced touch feedback for mobile
        document.getElementById('addFilesBtn').addEventListener('touchstart', (e) => {
            e.preventDefault();
            document.getElementById('addFilesBtn').style.backgroundColor = 'rgba(255,255,255,0.2)';
            document.getElementById('addFilesBtn').style.transform = 'scale(0.95)';
        });

        document.getElementById('addFilesBtn').addEventListener('touchend', (e) => {
            e.preventDefault();
            setTimeout(() => {
                document.getElementById('addFilesBtn').style.backgroundColor = '';
                document.getElementById('addFilesBtn').style.transform = 'scale(1)';
            }, 200);
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
                <button class="preview-btn" onclick="vault.previewFile(${file.id})">
                    <i class="fas fa-eye"></i> Preview
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

    async previewFile(fileId) {
        try {
            const file = await this.getFile(fileId);
            if (!file) return;

            this.openPreviewModal(file);
        } catch (error) {
            console.error('Error loading file preview:', error);
            this.showNotification('Error loading file preview', 'error');
        }
    }

    openPreviewModal(file) {
        const modal = document.createElement('div');
        modal.className = 'preview-modal';
        modal.innerHTML = `
            <div class="preview-modal-content">
                <div class="preview-header">
                    <h3><i class="fas fa-eye"></i> ${this.escapeHtml(file.name)}</h3>
                    <button class="close-preview-btn" onclick="this.closest('.preview-modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="preview-body">
                    ${this.generatePreviewContent(file)}
                </div>
                <div class="preview-footer">
                    <div class="file-info">
                        <span><i class="fas fa-calendar"></i> ${new Date(file.uploadDate).toLocaleDateString()}</span>
                        <span><i class="fas fa-weight-hanging"></i> ${this.formatFileSize(file.size)}</span>
                        <span><i class="fas fa-file"></i> ${file.type}</span>
                    </div>
                </div>
            </div>
        `;

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        // Close modal with Escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);

        document.body.appendChild(modal);
    }

    generatePreviewContent(file) {
        if (file.type.startsWith('image/')) {
            return `<img src="${file.data}" alt="${file.name}" class="preview-image">`;
        } else if (file.type.startsWith('video/')) {
            return `<video src="${file.data}" controls class="preview-video"></video>`;
        } else if (file.type.startsWith('audio/')) {
            return `
                <div class="audio-preview">
                    <i class="fas fa-music audio-icon"></i>
                    <audio src="${file.data}" controls class="preview-audio"></audio>
                </div>
            `;
        } else if (file.type === 'application/pdf') {
            return `<iframe src="${file.data}" class="preview-pdf"></iframe>`;
        } else if (file.type.startsWith('text/')) {
            // For text files, we'd need to decode the base64 data
            try {
                const textContent = atob(file.data.split(',')[1]);
                return `<pre class="preview-text">${this.escapeHtml(textContent)}</pre>`;
            } catch (e) {
                return `<div class="preview-unsupported">
                    <i class="fas fa-file-alt"></i>
                    <p>Text file preview not available</p>
                    <p>File: ${this.escapeHtml(file.name)}</p>
                </div>`;
            }
        } else {
            const icon = this.getFileIcon(file.type);
            return `
                <div class="preview-unsupported">
                    <i class="${icon}"></i>
                    <p>Preview not available for this file type</p>
                    <p>File: ${this.escapeHtml(file.name)}</p>
                    <p>Type: ${file.type}</p>
                </div>
            `;
        }
    }

    async deleteFile(fileId) {
        try {
            // Delete file directly without confirmation
            await this.removeFile(fileId);
            await this.loadFiles();
            this.showNotification('File deleted successfully', 'success');
            
            // Refresh page immediately
            setTimeout(() => {
                window.location.reload();
            }, 500);
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
        this.showNotification('Vault locked. Returning to calculator...', 'info');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 500);
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

        this.setStorageItem(this.passwordKey, newPassword);
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