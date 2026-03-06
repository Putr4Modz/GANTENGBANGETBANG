// Global variables
let accounts = [];
let results = [];
let isChecking = false;
let currentThreads = 0;
let stopRequested = false;
let totalChecked = 0;
let validCount = 0;
let invalidCount = 0;

// DOM Elements
const dropArea = document.getElementById('dropArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const manualAccounts = document.getElementById('manualAccounts');
const lineCount = document.getElementById('lineCount');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const exportBtn = document.getElementById('exportBtn');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const progressPercentage = document.getElementById('progressPercentage');
const tableBody = document.getElementById('tableBody');
const toastContainer = document.getElementById('toastContainer');

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${btn.dataset.tab}-tab`).classList.add('active');
    });
});

// File upload handling
dropArea.addEventListener('click', () => fileInput.click());

dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropArea.style.borderColor = 'var(--primary-color)';
});

dropArea.addEventListener('dragleave', () => {
    dropArea.style.borderColor = 'var(--border-color)';
});

dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dropArea.style.borderColor = 'var(--border-color)';
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'text/plain') {
        handleFile(file);
    } else {
        showToast('Please upload a .txt file', 'error');
    }
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
});

// Proxy type handling
document.querySelectorAll('input[name="proxyType"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        document.getElementById('proxyList').disabled = e.target.value === 'none';
    });
});

// Manual input line count
manualAccounts.addEventListener('input', () => {
    const lines = manualAccounts.value.split('\n').filter(line => line.trim());
    lineCount.textContent = `${lines.length} lines`;
});

// Filter buttons
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        filterResults(btn.dataset.filter);
    });
});

// Start checking
startBtn.addEventListener('click', startChecking);

// Stop checking
stopBtn.addEventListener('click', () => {
    stopRequested = true;
    showToast('Stopping... Please wait', 'warning');
});

// Export results
exportBtn.addEventListener('click', exportResults);

// Functions
function handleFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const content = e.target.result;
        const lines = content.split('\n').filter(line => line.trim());
        accounts = lines.map(line => {
            const [email, password] = line.split(':');
            return { email: email?.trim(), password: password?.trim() };
        }).filter(acc => acc.email && acc.password);
        
        fileName.textContent = file.name;
        fileSize.textContent = `(${(file.size / 1024).toFixed(2)} KB)`;
        fileInfo.style.display = 'flex';
        
        showToast(`Loaded ${accounts.length} accounts`, 'success');
    };
    reader.readAsText(file);
}

function removeFile() {
    fileInput.value = '';
    fileInfo.style.display = 'none';
    accounts = [];
}

function clearManual() {
    manualAccounts.value = '';
    lineCount.textContent = '0 lines';
    accounts = [];
}

async function startChecking() {
    // Get accounts from selected source
    if (document.querySelector('.tab-btn.active').dataset.tab === 'file') {
        if (accounts.length === 0) {
            showToast('Please upload a file first', 'error');
            return;
        }
    } else {
        const lines = manualAccounts.value.split('\n').filter(line => line.trim());
        accounts = lines.map(line => {
            const [email, password] = line.split(':');
            return { email: email?.trim(), password: password?.trim() };
        }).filter(acc => acc.email && acc.password);
        
        if (accounts.length === 0) {
            showToast('Please enter accounts manually', 'error');
            return;
        }
    }

    // Reset state
    isChecking = true;
    stopRequested = false;
    results = [];
    totalChecked = 0;
    validCount = 0;
    invalidCount = 0;
    
    // Update UI
    startBtn.disabled = true;
    stopBtn.disabled = false;
    exportBtn.disabled = true;
    
    updateStats();
    updateTable();
    
    const threads = parseInt(document.getElementById('threads').value);
    const delay = parseInt(document.getElementById('delay').value);
    
    // Get proxy settings
    const proxyType = document.querySelector('input[name="proxyType"]:checked').value;
    const proxyList = proxyType !== 'none' ? 
        document.getElementById('proxyList').value.split('\n').filter(p => p.trim()) : [];
    
    showToast(`Started checking ${accounts.length} accounts with ${threads} threads`, 'success');
    
    // Process accounts in chunks
    for (let i = 0; i < accounts.length; i += threads) {
        if (stopRequested) break;
        
        const chunk = accounts.slice(i, i + threads);
        const promises = chunk.map((account, index) => 
            checkAccount(account, i + index, delay, proxyType, proxyList)
        );
        
        await Promise.all(promises);
    }
    
    // Finish
    isChecking = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    exportBtn.disabled = false;
    
    showToast('Checking completed!', 'success');
}

async function checkAccount(account, index, delay, proxyType, proxyList) {
    if (stopRequested) return;
    
    const startTime = Date.now();
    
    try {
        // Simulate API call (replace with actual API)
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
        
        // Simulate result (random for demo)
        const isValid = Math.random() > 0.5;
        
        const responseTime = Date.now() - startTime;
        
        const result = {
            index: index + 1,
            email: account.email,
            password: account.password,
            status: isValid ? 'VALID' : 'INVALID',
            responseTime: `${responseTime}ms`,
            details: isValid ? 'Account is active' : 'Account not found'
        };
        
        results.push(result);
        
        if (isValid) {
            validCount++;
        } else {
            invalidCount++;
        }
        totalChecked++;
        
        updateProgress();
        updateStats();
        updateTable();
        
    } catch (error) {
        console.error('Error checking account:', error);
    }
    
    await new Promise(resolve => setTimeout(resolve, delay));
}

function updateProgress() {
    const percentage = (totalChecked / accounts.length) * 100;
    progressFill.style.width = `${percentage}%`;
    progressText.textContent = `${totalChecked}/${accounts.length} accounts`;
    progressPercentage.textContent = `${percentage.toFixed(1)}%`;
}

function updateStats() {
    document.getElementById('totalChecked').textContent = totalChecked;
    document.getElementById('validCount').textContent = validCount;
    document.getElementById('invalidCount').textContent = invalidCount;
    document.getElementById('processingCount').textContent = isChecking ? 
        accounts.length - totalChecked : 0;
}

function updateTable() {
    if (results.length === 0) {
        tableBody.innerHTML = `
            <tr class="empty-state">
                <td colspan="6">
                    <i class="fas fa-inbox"></i>
                    <p>No results yet. Start checking to see results.</p>
                </td>
            </tr>
        `;
        return;
    }
    
    const activeFilter = document.querySelector('.filter-btn.active').dataset.filter;
    const filteredResults = activeFilter === 'all' ? results :
        results.filter(r => r.status.toLowerCase() === activeFilter);
    
    tableBody.innerHTML = filteredResults.map(result => `
        <tr>
            <td>${result.index}</td>
            <td>${maskEmail(result.email)}</td>
            <td>${maskPassword(result.password)}</td>
            <td>
                <span class="status-badge status-${result.status.toLowerCase()}">
                    <i class="fas ${result.status === 'VALID' ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                    ${result.status}
                </span>
            </td>
            <td>${result.responseTime}</td>
            <td>${result.details}</td>
        </tr>
    `).join('');
}

function filterResults(filter) {
    updateTable();
}

function maskEmail(email) {
    const [local, domain] = email.split('@');
    if (!domain) return email;
    const maskedLocal = local.length > 3 ? 
        local.substring(0, 3) + '*'.repeat(local.length - 3) : 
        '*'.repeat(local.length);
    return `${maskedLocal}@${domain}`;
}
