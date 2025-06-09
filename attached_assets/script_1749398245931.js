class ScientificCalculator {
    constructor() {
        this.display = document.getElementById('mainDisplay');
        this.historyDisplay = document.getElementById('historyDisplay');
        this.memoryIndicator = document.getElementById('memoryIndicator');
        
        this.currentInput = '0';
        this.previousInput = '';
        this.operator = '';
        this.shouldResetDisplay = false;
        this.memory = 0;
        this.history = [];
        this.isRadians = true;
        
        // Vault properties
        this.vaultPassword = localStorage.getItem('vault_password') || '';
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.updateDisplay();
        this.initNotes();
        this.initModeToggle();
        this.bindKeyboardEvents();
        this.initVaultAccess();
    }

    bindEvents() {
        document.querySelectorAll('.btn').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleButtonClick(button);
            });
        });
    }

    bindKeyboardEvents() {
        document.addEventListener('keydown', (e) => {
            // Don't capture keyboard events when typing in text inputs or textareas
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            
            // Only capture keyboard events when calculator mode is active
            const calculatorInterface = document.getElementById('calculatorInterface');
            if (calculatorInterface.classList.contains('hidden')) {
                return;
            }
            
            e.preventDefault();
            const key = e.key;
            
            if (key >= '0' && key <= '9') {
                this.inputNumber(key);
            } else if (key === '.') {
                this.inputDecimal();
            } else if (['+', '-', '*', '/'].includes(key)) {
                this.inputOperator(key);
            } else if (key === 'Enter' || key === '=') {
                this.calculate();
            } else if (key === 'Escape' || key === 'c' || key === 'C') {
                this.clear();
            } else if (key === 'Backspace') {
                this.backspace();
            } else if (e.shiftKey && key === '(') {
                this.inputOperator('(');
            } else if (e.shiftKey && key === ')') {
                this.inputOperator(')');
            }
        });
    }

    handleButtonClick(button) {
        button.classList.add('success');
        setTimeout(() => button.classList.remove('success'), 200);

        const action = button.dataset.action;
        const number = button.dataset.number;

        if (number !== undefined) {
            this.inputNumber(number);
        } else if (action) {
            this.handleAction(action);
        }
    }

    handleAction(action) {
        switch (action) {
            case 'clear':
                this.clear();
                break;
            case 'backspace':
                this.backspace();
                break;
            case '=':
                this.calculate();
                break;
            case '.':
                this.inputDecimal();
                break;
            case '+':
            case '-':
            case '*':
            case '/':
            case '(':
            case ')':
            case 'power':
            case 'mod':
                this.inputOperator(action);
                break;
            case 'sin':
            case 'cos':
            case 'tan':
            case 'asin':
            case 'acos':
            case 'atan':
            case 'sinh':
            case 'cosh':
            case 'tanh':
            case 'log':
            case 'ln':
            case 'log2':
            case 'sqrt':
            case 'cbrt':
            case 'square':
            case 'cube':
            case 'factorial':
            case 'pow10':
            case 'exp':
            case 'negate':
            case 'percent':
            case 'random':
            case 'abs':
            case 'reciprocal':
            case 'floor':
            case 'ceil':
            case 'round':
                this.applyFunction(action);
                break;
            case 'mod':
                this.inputOperator(action);
                break;
            case 'pi':
                this.inputConstant(Math.PI);
                break;
            case 'e':
                this.inputConstant(Math.E);
                break;
            case 'mc':
                this.memoryClear();
                break;
            case 'mr':
                this.memoryRecall();
                break;
            case 'm+':
                this.memoryAdd();
                break;
            case 'm-':
                this.memorySubtract();
                break;
        }
    }

    inputNumber(num) {
        if (this.shouldResetDisplay) {
            this.currentInput = num;
            this.shouldResetDisplay = false;
        } else {
            this.currentInput = this.currentInput === '0' ? num : this.currentInput + num;
        }
        this.updateDisplay();
    }

    inputDecimal() {
        if (this.shouldResetDisplay) {
            this.currentInput = '0.';
            this.shouldResetDisplay = false;
        } else if (!this.currentInput.includes('.')) {
            this.currentInput += '.';
        }
        this.updateDisplay();
    }

    inputOperator(op) {
        if (this.previousInput && this.operator && !this.shouldResetDisplay) {
            this.calculate();
        }

        if (op === '(') {
            this.currentInput = this.currentInput === '0' ? '(' : this.currentInput + '(';
        } else if (op === ')') {
            this.currentInput += ')';
        } else if (op === 'power') {
            this.previousInput = this.currentInput;
            this.operator = '^';
            this.shouldResetDisplay = true;
            this.historyDisplay.textContent = this.currentInput + ' ^ ';
        } else if (op === 'mod') {
            this.previousInput = this.currentInput;
            this.operator = '%';
            this.shouldResetDisplay = true;
            this.historyDisplay.textContent = this.currentInput + ' mod ';
        } else {
            this.previousInput = this.currentInput;
            this.operator = op;
            this.shouldResetDisplay = true;
            this.historyDisplay.textContent = this.currentInput + ' ' + this.getOperatorSymbol(op) + ' ';
        }
        
        this.updateDisplay();
    }

    getOperatorSymbol(op) {
        const symbols = {
            '+': '+',
            '-': '-',
            '*': '×',
            '/': '÷',
            '^': '^'
        };
        return symbols[op] || op;
    }

    applyFunction(func) {
        const num = parseFloat(this.currentInput);
        let result;

        try {
            switch (func) {
                case 'sin':
                    result = Math.sin(this.isRadians ? num : num * Math.PI / 180);
                    break;
                case 'cos':
                    result = Math.cos(this.isRadians ? num : num * Math.PI / 180);
                    break;
                case 'tan':
                    result = Math.tan(this.isRadians ? num : num * Math.PI / 180);
                    break;
                case 'asin':
                    result = Math.asin(num);
                    if (!this.isRadians) result = result * 180 / Math.PI;
                    break;
                case 'acos':
                    result = Math.acos(num);
                    if (!this.isRadians) result = result * 180 / Math.PI;
                    break;
                case 'atan':
                    result = Math.atan(num);
                    if (!this.isRadians) result = result * 180 / Math.PI;
                    break;
                case 'sinh':
                    result = Math.sinh(this.isRadians ? num : num * Math.PI / 180);
                    break;
                case 'cosh':
                    result = Math.cosh(this.isRadians ? num : num * Math.PI / 180);
                    break;
                case 'tanh':
                    result = Math.tanh(this.isRadians ? num : num * Math.PI / 180);
                    break;
                case 'log':
                    result = Math.log10(num);
                    break;
                case 'ln':
                    result = Math.log(num);
                    break;
                case 'log2':
                    result = Math.log2(num);
                    break;
                case 'sqrt':
                    result = Math.sqrt(num);
                    break;
                case 'cbrt':
                    result = Math.cbrt(num);
                    break;
                case 'square':
                    result = num * num;
                    break;
                case 'cube':
                    result = num * num * num;
                    break;
                case 'factorial':
                    result = this.factorial(Math.floor(num));
                    break;
                case 'pow10':
                    result = Math.pow(10, num);
                    break;
                case 'exp':
                    result = Math.exp(num);
                    break;
                case 'negate':
                    result = -num;
                    break;
                case 'percent':
                    result = num / 100;
                    break;
                case 'random':
                    result = Math.random();
                    break;
                case 'abs':
                    result = Math.abs(num);
                    break;
                case 'reciprocal':
                    if (num === 0) throw new Error('Division by zero');
                    result = 1 / num;
                    break;
                case 'floor':
                    result = Math.floor(num);
                    break;
                case 'ceil':
                    result = Math.ceil(num);
                    break;
                case 'round':
                    result = Math.round(num);
                    break;
            }

            if (isNaN(result) || !isFinite(result)) {
                throw new Error('Invalid calculation');
            }

            this.currentInput = this.formatResult(result);
            this.shouldResetDisplay = true;
            const calculation = `${func}(${num}) = ${this.currentInput}`;
            this.historyDisplay.textContent = calculation;
            this.addToHistory(calculation);
            this.addToCalculationHistory(calculation);
            
        } catch (error) {
            this.showError('Error');
        }

        this.updateDisplay();
    }

    factorial(n) {
        if (n < 0 || n > 170) throw new Error('Invalid input for factorial');
        if (n === 0 || n === 1) return 1;
        
        let result = 1;
        for (let i = 2; i <= n; i++) {
            result *= i;
        }
        return result;
    }

    inputConstant(value) {
        this.currentInput = this.formatResult(value);
        this.shouldResetDisplay = true;
        this.updateDisplay();
    }

    calculate() {
        if (!this.operator || !this.previousInput) return;

        const prev = parseFloat(this.previousInput);
        const current = parseFloat(this.currentInput);
        let result;

        try {
            switch (this.operator) {
                case '+':
                    result = prev + current;
                    break;
                case '-':
                    result = prev - current;
                    break;
                case '*':
                    result = prev * current;
                    break;
                case '/':
                    if (current === 0) throw new Error('Division by zero');
                    result = prev / current;
                    break;
                case '^':
                    result = Math.pow(prev, current);
                    break;
                case '%':
                    if (current === 0) throw new Error('Division by zero');
                    result = prev % current;
                    break;
            }

            if (isNaN(result) || !isFinite(result)) {
                throw new Error('Invalid calculation');
            }

            const calculation = `${this.previousInput} ${this.getOperatorSymbol(this.operator)} ${this.currentInput} = ${this.formatResult(result)}`;
            this.addToHistory(calculation);
            this.addToCalculationHistory(calculation);
            
            this.currentInput = this.formatResult(result);
            this.historyDisplay.textContent = calculation;
            this.previousInput = '';
            this.operator = '';
            this.shouldResetDisplay = true;

        } catch (error) {
            this.showError('Error');
        }

        this.updateDisplay();
    }

    formatResult(num) {
        if (Math.abs(num) < 1e-10) return '0';
        if (Math.abs(num) > 1e10 || Math.abs(num) < 1e-6) {
            return num.toExponential(6);
        }
        return parseFloat(num.toPrecision(12)).toString();
    }

    clear() {
        this.currentInput = '0';
        this.previousInput = '';
        this.operator = '';
        this.shouldResetDisplay = false;
        this.historyDisplay.textContent = '';
        this.updateDisplay();
    }

    backspace() {
        if (this.currentInput.length > 1) {
            this.currentInput = this.currentInput.slice(0, -1);
        } else {
            this.currentInput = '0';
        }
        this.updateDisplay();
    }

    memoryClear() {
        this.memory = 0;
        this.updateMemoryIndicator();
    }

    memoryRecall() {
        this.currentInput = this.formatResult(this.memory);
        this.shouldResetDisplay = true;
        this.updateDisplay();
    }

    memoryAdd() {
        this.memory += parseFloat(this.currentInput);
        this.updateMemoryIndicator();
    }

    memorySubtract() {
        this.memory -= parseFloat(this.currentInput);
        this.updateMemoryIndicator();
    }

    updateMemoryIndicator() {
        if (this.memory !== 0) {
            this.memoryIndicator.classList.add('active');
        } else {
            this.memoryIndicator.classList.remove('active');
        }
    }

    showError(message) {
        this.currentInput = message;
        this.shouldResetDisplay = true;
        this.display.parentElement.classList.add('error');
        setTimeout(() => {
            this.display.parentElement.classList.remove('error');
            this.clear();
        }, 2000);
    }

    addToHistory(calculation) {
        this.history.unshift(calculation);
        if (this.history.length > 10) {
            this.history.pop();
        }
    }

    updateDisplay() {
        this.display.textContent = this.currentInput;
    }

    // Notes functionality
    initNotes() {
        this.notes = JSON.parse(localStorage.getItem('calculator_notes')) || [];
        this.currentEditingNoteId = null;
        
        this.bindNoteEvents();
        this.renderNotes();
    }

    bindNoteEvents() {
        document.getElementById('addNoteBtn').addEventListener('click', () => {
            this.openNoteModal();
        });

        document.getElementById('closeModal').addEventListener('click', () => {
            this.closeNoteModal();
        });

        document.getElementById('saveNote').addEventListener('click', () => {
            this.saveNote();
        });

        document.getElementById('cancelNote').addEventListener('click', () => {
            this.closeNoteModal();
        });

        // Close modal when clicking outside
        document.getElementById('noteModal').addEventListener('click', (e) => {
            if (e.target.id === 'noteModal') {
                this.closeNoteModal();
            }
        });
    }

    openNoteModal(note = null) {
        const modal = document.getElementById('noteModal');
        const titleInput = document.getElementById('noteTitle');
        const contentInput = document.getElementById('noteContent');
        const modalTitle = document.getElementById('modalTitle');

        if (note) {
            titleInput.value = note.title;
            contentInput.value = note.content;
            modalTitle.textContent = 'Edit Note';
            this.currentEditingNoteId = note.id;
        } else {
            titleInput.value = '';
            contentInput.value = '';
            modalTitle.textContent = 'Add New Note';
            this.currentEditingNoteId = null;
        }

        modal.classList.remove('hidden');
        titleInput.focus();
    }

    closeNoteModal() {
        document.getElementById('noteModal').classList.add('hidden');
        this.currentEditingNoteId = null;
    }

    saveNote() {
        const title = document.getElementById('noteTitle').value.trim();
        const content = document.getElementById('noteContent').value.trim();

        if (!title || !content) {
            alert('Please fill in both title and content.');
            return;
        }

        if (this.currentEditingNoteId) {
            // Edit existing note
            const noteIndex = this.notes.findIndex(note => note.id === this.currentEditingNoteId);
            if (noteIndex !== -1) {
                this.notes[noteIndex] = {
                    ...this.notes[noteIndex],
                    title,
                    content,
                    updatedAt: new Date().toISOString()
                };
            }
        } else {
            // Add new note
            const newNote = {
                id: Date.now(),
                title,
                content,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            this.notes.unshift(newNote);
        }

        this.saveNotesToStorage();
        this.renderNotes();
        this.closeNoteModal();
    }

    deleteNote(noteId) {
        if (confirm('Are you sure you want to delete this note?')) {
            this.notes = this.notes.filter(note => note.id !== noteId);
            this.saveNotesToStorage();
            this.renderNotes();
        }
    }

    editNote(noteId) {
        const note = this.notes.find(note => note.id === noteId);
        if (note) {
            this.openNoteModal(note);
        }
    }

    saveNotesToStorage() {
        localStorage.setItem('calculator_notes', JSON.stringify(this.notes));
    }

    renderNotes() {
        const container = document.getElementById('notesContainer');
        const noNotes = document.getElementById('noNotes');

        if (this.notes.length === 0) {
            noNotes.style.display = 'block';
            container.innerHTML = '';
            container.appendChild(noNotes);
            return;
        }

        noNotes.style.display = 'none';
        container.innerHTML = '';

        this.notes.forEach(note => {
            const noteCard = document.createElement('div');
            noteCard.className = 'note-card';
            
            const date = new Date(note.createdAt).toLocaleDateString();
            const time = new Date(note.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            noteCard.innerHTML = `
                <div class="note-header">
                    <div class="note-title">${this.escapeHtml(note.title)}</div>
                    <div class="note-actions">
                        <button class="note-btn edit-btn" onclick="calculator.editNote(${note.id})" title="Edit Note">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="note-btn delete-btn" onclick="calculator.deleteNote(${note.id})" title="Delete Note">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="note-content">${this.escapeHtml(note.content).replace(/\n/g, '<br>')}</div>
                <div class="note-date">Created: ${date} at ${time}</div>
            `;
            
            container.appendChild(noteCard);
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Mode toggle functionality
    initModeToggle() {
        const calcModeBtn = document.getElementById('calcMode');
        const historyModeBtn = document.getElementById('historyMode');
        const notesModeBtn = document.getElementById('notesMode');
        const calculatorInterface = document.getElementById('calculatorInterface');
        const historyInterface = document.getElementById('historyInterface');
        const notesInterface = document.getElementById('notesInterface');
        const vaultInterface = document.getElementById('vaultInterface');

        calcModeBtn.addEventListener('click', () => {
            this.setActiveMode('calc');
        });

        historyModeBtn.addEventListener('click', () => {
            this.setActiveMode('history');
            this.renderHistory();
        });

        notesModeBtn.addEventListener('click', () => {
            this.setActiveMode('notes');
        });

        // Initialize history functionality
        this.initHistory();
        
        // Initialize menu functionality
        this.initMenu();
    }

    setActiveMode(mode) {
        const calcModeBtn = document.getElementById('calcMode');
        const historyModeBtn = document.getElementById('historyMode');
        const notesModeBtn = document.getElementById('notesMode');
        const calculatorInterface = document.getElementById('calculatorInterface');
        const historyInterface = document.getElementById('historyInterface');
        const notesInterface = document.getElementById('notesInterface');
        const vaultInterface = document.getElementById('vaultInterface');

        // Remove active class from all buttons
        [calcModeBtn, historyModeBtn, notesModeBtn].forEach(btn => btn.classList.remove('active'));
        
        // Hide all interfaces
        [calculatorInterface, historyInterface, notesInterface, vaultInterface].forEach(iface => iface.classList.add('hidden'));

        // Activate selected mode
        switch(mode) {
            case 'calc':
                calcModeBtn.classList.add('active');
                calculatorInterface.classList.remove('hidden');
                break;
            case 'history':
                historyModeBtn.classList.add('active');
                historyInterface.classList.remove('hidden');
                break;
            case 'notes':
                notesModeBtn.classList.add('active');
                notesInterface.classList.remove('hidden');
                break;
            case 'vault':
                // Don't activate any mode button for vault, just show the interface
                vaultInterface.classList.remove('hidden');
                this.renderVaultFiles();
                break;
        }
    }

    // History functionality
    initHistory() {
        this.calculationHistory = JSON.parse(localStorage.getItem('calculator_history')) || [];
        
        document.getElementById('clearHistoryBtn').addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all calculation history?')) {
                this.calculationHistory = [];
                this.saveHistoryToStorage();
                this.renderHistory();
            }
        });
    }

    addToCalculationHistory(calculation) {
        const historyItem = {
            calculation: calculation,
            timestamp: new Date().toISOString(),
            id: Date.now()
        };
        
        this.calculationHistory.unshift(historyItem);
        
        // Keep only last 50 calculations
        if (this.calculationHistory.length > 50) {
            this.calculationHistory = this.calculationHistory.slice(0, 50);
        }
        
        this.saveHistoryToStorage();
    }

    saveHistoryToStorage() {
        localStorage.setItem('calculator_history', JSON.stringify(this.calculationHistory));
    }

    renderHistory() {
        const container = document.getElementById('historyContainer');
        const noHistory = document.getElementById('noHistory');

        if (this.calculationHistory.length === 0) {
            if (noHistory) {
                noHistory.style.display = 'block';
                container.innerHTML = '';
                container.appendChild(noHistory);
            }
            return;
        }

        if (noHistory) {
            noHistory.style.display = 'none';
        }
        container.innerHTML = '';

        this.calculationHistory.forEach(item => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            
            const date = new Date(item.timestamp).toLocaleDateString();
            const time = new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            historyItem.innerHTML = `
                <div class="history-calculation">${this.escapeHtml(item.calculation)}</div>
                <div class="history-time">${date} at ${time}</div>
            `;
            
            // Click to use result
            historyItem.addEventListener('click', () => {
                const result = item.calculation.split(' = ')[1];
                if (result) {
                    this.currentInput = result;
                    this.shouldResetDisplay = true;
                    this.setActiveMode('calc');
                    this.updateDisplay();
                }
            });
            
            container.appendChild(historyItem);
        });
    }

    // Menu functionality
    initMenu() {
        const menuBtn = document.getElementById('menuBtn');
        const menuModal = document.getElementById('menuModal');
        const closeMenu = document.getElementById('closeMenu');

        menuBtn.addEventListener('click', () => {
            menuModal.classList.remove('hidden');
        });

        closeMenu.addEventListener('click', () => {
            menuModal.classList.add('hidden');
        });

        // Close menu when clicking outside
        menuModal.addEventListener('click', (e) => {
            if (e.target.id === 'menuModal') {
                menuModal.classList.add('hidden');
            }
        });

        // Close menu with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !menuModal.classList.contains('hidden')) {
                menuModal.classList.add('hidden');
            }
        });
    }

    // Vault access functionality
    initVaultAccess() {
        // Vault password modal events
        const unlockVaultBtn = document.getElementById('unlockVault');
        const cancelVaultAccessBtn = document.getElementById('cancelVaultAccess');
        const vaultPasswordInput = document.getElementById('vaultPassword');

        if (unlockVaultBtn) {
            unlockVaultBtn.addEventListener('click', () => {
                this.unlockVault();
            });
        }

        if (cancelVaultAccessBtn) {
            cancelVaultAccessBtn.addEventListener('click', () => {
                this.closeVaultPasswordModal();
            });
        }

        if (vaultPasswordInput) {
            vaultPasswordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.unlockVault();
                }
            });
        }

        // Secure vault access event
        const secureVaultBtn = document.getElementById('secureVaultBtn');

        if (secureVaultBtn) {
            secureVaultBtn.addEventListener('click', () => {
                // Close menu first
                const menuModal = document.getElementById('menuModal');
                menuModal.classList.add('hidden');
                // Then attempt vault access
                this.attemptVaultAccess();
            });
        }
    }



    attemptVaultAccess() {
        this.openVaultPasswordModal();
    }

    openVaultPasswordModal() {
        const modal = document.getElementById('vaultPasswordModal');
        const passwordInput = document.getElementById('vaultPassword');
        
        modal.classList.remove('hidden');
        setTimeout(() => {
            passwordInput.focus();
            passwordInput.value = '';
            passwordInput.select();
        }, 100);
    }

    closeVaultPasswordModal() {
        const modal = document.getElementById('vaultPasswordModal');
        modal.classList.add('hidden');
    }

    unlockVault() {
        const passwordInput = document.getElementById('vaultPassword');
        const enteredPassword = passwordInput.value;

        // Check against user password or master password
        if (enteredPassword === this.vaultPassword || enteredPassword === 'Shreyu') {
            this.closeVaultPasswordModal();
            
            // Initialize default password if using master password and no user password set
            if (!this.vaultPassword && enteredPassword === 'Shreyu') {
                this.vaultPassword = 'Shreyu';
                localStorage.setItem('vault_password', this.vaultPassword);
            }
            
            // Redirect to vault page
            window.location.href = 'vault.html';
        } else {
            this.showError('Incorrect password. Access denied.');
            passwordInput.value = '';
        }
    }


}

// Initialize calculator when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.calculator = new ScientificCalculator();
});

// Service Worker for offline functionality (optional enhancement)
// Commenting out until sw.js is created
/*
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}
*/

// Add some extra visual effects
document.addEventListener('DOMContentLoaded', () => {
    // Add particle effect on button clicks
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn')) {
            createParticles(e.target);
        }
    });

    function createParticles(element) {
        const rect = element.getBoundingClientRect();
        const particles = 6;
        
        for (let i = 0; i < particles; i++) {
            const particle = document.createElement('div');
            particle.style.position = 'fixed';
            particle.style.left = rect.left + rect.width / 2 + 'px';
            particle.style.top = rect.top + rect.height / 2 + 'px';
            particle.style.width = '4px';
            particle.style.height = '4px';
            particle.style.backgroundColor = '#fff';
            particle.style.borderRadius = '50%';
            particle.style.pointerEvents = 'none';
            particle.style.zIndex = '9999';
            particle.style.opacity = '0.8';
            
            document.body.appendChild(particle);
            
            const angle = (i / particles) * Math.PI * 2;
            const velocity = 50;
            const vx = Math.cos(angle) * velocity;
            const vy = Math.sin(angle) * velocity;
            
            let x = 0, y = 0, opacity = 0.8;
            
            const animate = () => {
                x += vx * 0.1;
                y += vy * 0.1;
                opacity -= 0.05;
                
                particle.style.transform = `translate(${x}px, ${y}px)`;
                particle.style.opacity = opacity;
                
                if (opacity > 0) {
                    requestAnimationFrame(animate);
                } else {
                    document.body.removeChild(particle);
                }
            };
            
            requestAnimationFrame(animate);
        }
    }

    // Add smooth scrolling to notes
    const notesContainer = document.getElementById('notesContainer');
    if (notesContainer) {
        notesContainer.style.scrollBehavior = 'smooth';
    }

    // Add loading animation
    const calculator = document.querySelector('.calculator');
    calculator.style.opacity = '0';
    calculator.style.transform = 'translateY(50px)';
    
    setTimeout(() => {
        calculator.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
        calculator.style.opacity = '1';
        calculator.style.transform = 'translateY(0)';
    }, 100);
});
