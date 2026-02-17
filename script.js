// State management
let currentUser = null;
let userFiles = [];

// DOM Elements
const loginPage = document.getElementById('loginPage');
const signupPage = document.getElementById('signupPage');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const showSignupBtn = document.getElementById('showSignup');
const showLoginBtn = document.getElementById('showLogin');
const logoutBtn = document.getElementById('logoutBtn');
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const browseBtn = document.getElementById('browseBtn');
const filesGrid = document.getElementById('filesGrid');
const uploadProgress = document.getElementById('uploadProgress');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const filterBtns = document.querySelectorAll('.filter-btn');
const userName = document.getElementById('userName');

// Video player elements
const videoModal = document.getElementById('videoModal');
const modalOverlay = document.getElementById('modalOverlay');
const modalClose = document.getElementById('modalClose');
const videoPlayer = document.getElementById('videoPlayer');
const videoSource = document.getElementById('videoSource');
const videoTitle = document.getElementById('videoTitle');
const videoSize = document.getElementById('videoSize');


// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    initializeEventListeners();
});

// Check authentication
function checkAuth() {
    const user = localStorage.getItem('currentUser');
    if (user) {
        currentUser = JSON.parse(user);
        showDashboard();
    } else {
        showLogin();
    }
}

// Initialize event listeners
function initializeEventListeners() {
    // Auth navigation
    showSignupBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showSignup();
    });

    showLoginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showLogin();
    });

    // Forms
    loginForm.addEventListener('submit', handleLogin);
    signupForm.addEventListener('submit', handleSignup);
    logoutBtn.addEventListener('click', handleLogout);

    // Upload
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    uploadArea.addEventListener('click', () => fileInput.click());

    browseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
    });

    fileInput.addEventListener('change', handleFileSelect);

    // Filters
    filterBtns.forEach(btn => {
        btn.addEventListener('click', handleFilter);
    });

    // Video modal
    modalOverlay.addEventListener('click', closeVideoModal);
    modalClose.addEventListener('click', closeVideoModal);
}

// Auth functions
function showLogin() {
    loginPage.classList.remove('hidden');
    signupPage.classList.add('hidden');
    dashboard.classList.add('hidden');
}

function showSignup() {
    loginPage.classList.add('hidden');
    signupPage.classList.remove('hidden');
    dashboard.classList.add('hidden');
}

function showDashboard() {
    loginPage.classList.add('hidden');
    signupPage.classList.add('hidden');
    dashboard.classList.remove('hidden');

    userName.textContent = currentUser.name;
    loadUserFiles();
    renderFiles();
}

function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    // Get users from localStorage
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        showNotification('Welcome back!', 'success');
        showDashboard();
        loginForm.reset();
    } else {
        showNotification('Invalid email or password', 'error');
    }
}

function handleSignup(e) {
    e.preventDefault();

    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;

    // Get existing users
    const users = JSON.parse(localStorage.getItem('users') || '[]');

    // Check if email already exists
    if (users.find(u => u.email === email)) {
        showNotification('Email already registered', 'error');
        return;
    }

    // Create new user
    const newUser = {
        id: Date.now(),
        name,
        email,
        password,
        createdAt: new Date().toISOString()
    };

    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));

    currentUser = newUser;
    localStorage.setItem('currentUser', JSON.stringify(newUser));

    showNotification('Account created successfully!', 'success');
    showDashboard();
    signupForm.reset();
}

function handleLogout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    showNotification('Logged out successfully', 'success');
    showLogin();
}

// File upload functions
function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    handleFiles(files);
}

function handleFileSelect(e) {
    const files = e.target.files;
    handleFiles(files);
}

function handleFiles(files) {
    if (files.length === 0) return;

    // Show progress
    uploadProgress.classList.remove('hidden');

    const fileArray = Array.from(files);
    let uploadedCount = 0;

    fileArray.forEach((file, index) => {
        // Simulate upload with timeout
        setTimeout(() => {
            saveFile(file);
            uploadedCount++;

            const progress = (uploadedCount / fileArray.length) * 100;
            progressFill.style.width = `${progress}%`;
            progressText.textContent = `Uploading... ${uploadedCount}/${fileArray.length}`;

            if (uploadedCount === fileArray.length) {
                setTimeout(() => {
                    uploadProgress.classList.add('hidden');
                    progressFill.style.width = '0%';
                    showNotification(`${fileArray.length} file(s) uploaded successfully!`, 'success');
                    renderFiles();
                }, 500);
            }
        }, index * 300);
    });

    fileInput.value = '';
}

function saveFile(file) {
    const fileData = {
        id: Date.now() + Math.random(),
        userId: currentUser.id,
        name: file.name,
        size: formatFileSize(file.size),
        type: getFileType(file.type, file.name),
        uploadedAt: new Date().toISOString(),
        thumbnail: getFileThumbnail(file.type)
    };

    userFiles.push(fileData);

    // Save to localStorage
    const allFiles = JSON.parse(localStorage.getItem('files') || '[]');
    allFiles.push(fileData);
    localStorage.setItem('files', JSON.stringify(allFiles));
}

function loadUserFiles() {
    const allFiles = JSON.parse(localStorage.getItem('files') || '[]');
    userFiles = allFiles.filter(f => f.userId === currentUser.id);
}

function getFileType(mimeType, fileName) {
    if (mimeType.startsWith('video/') || fileName.endsWith('.mp4') || fileName.endsWith('.avi') || fileName.endsWith('.mov')) {
        return 'video';
    } else if (mimeType.startsWith('image/') || fileName.endsWith('.jpg') || fileName.endsWith('.png') || fileName.endsWith('.gif')) {
        return 'image';
    } else if (mimeType.includes('pdf') || fileName.endsWith('.pdf') || fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
        return 'document';
    } else {
        return 'file';
    }
}

function getFileThumbnail(mimeType) {
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '📦';
    return '📁';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Render functions
function renderFiles(filter = 'all') {
    filesGrid.innerHTML = '';

    const filteredFiles = filter === 'all'
        ? userFiles
        : userFiles.filter(file => file.type === filter);

    if (filteredFiles.length === 0) {
        filesGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📂</div>
                <h3>No files yet</h3>
                <p>Upload your first file to get started!</p>
            </div>
        `;
        return;
    }

    filteredFiles.forEach((file, index) => {
        const fileCard = createFileCard(file, index);
        filesGrid.appendChild(fileCard);
    });
}

function createFileCard(file, index) {
    const card = document.createElement('div');
    card.className = 'file-card';
    card.style.animationDelay = `${index * 0.1}s`;

    const typeLabels = {
        'video': 'Video',
        'image': 'Image',
        'document': 'Document',
        'file': 'File'
    };

    const typeColors = {
        'video': '#8b5cf6',
        'image': '#06b6d4',
        'document': '#f59e0b',
        'file': '#6366f1'
    };

    // Add video-preview class and click handler for video files
    const previewClass = file.type === 'video' ? 'file-preview video-preview' : 'file-preview';
    const playButton = file.type === 'video' ? `onclick="playVideo('${file.id}')"` : '';

    card.innerHTML = `
        <div class="${previewClass}" ${playButton}>${file.thumbnail}</div>
        <span class="file-type" style="background: ${typeColors[file.type]}20; color: ${typeColors[file.type]}">${typeLabels[file.type]}</span>
        <p class="file-name">${file.name}</p>
        <div class="file-meta">
            <span>${file.size}</span>
            <div class="file-actions">
                <button class="btn-icon" onclick="downloadFile('${file.id}')" title="Download">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
                <button class="btn-icon delete" onclick="deleteFile('${file.id}')" title="Delete">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>
            </div>
        </div>
    `;

    return card;
}

function handleFilter(e) {
    filterBtns.forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');

    const filter = e.target.dataset.filter;
    renderFiles(filter);
}

// File actions
function downloadFile(fileId) {
    showNotification('Download started', 'success');
}

function deleteFile(fileId) {
    if (confirm('Are you sure you want to delete this file?')) {
        // Remove from userFiles
        userFiles = userFiles.filter(f => f.id != fileId);

        // Remove from localStorage
        let allFiles = JSON.parse(localStorage.getItem('files') || '[]');
        allFiles = allFiles.filter(f => f.id != fileId);
        localStorage.setItem('files', JSON.stringify(allFiles));

        renderFiles();
        showNotification('File deleted successfully', 'success');
    }
}

// Video player functions
function playVideo(fileId) {
    const file = userFiles.find(f => f.id == fileId);
    if (!file || file.type !== 'video') return;

    // For demo purposes, show placeholder message
    // In a real app, you would load the actual video file
    videoTitle.textContent = file.name;
    videoSize.textContent = `Size: ${file.size}`;

    // Show modal
    videoModal.classList.remove('hidden');

    // Pause any playing video
    videoPlayer.pause();

    showNotification('Video playback ready! (Demo mode - upload actual video files for playback)', 'info');
}

function closeVideoModal() {
    videoModal.classList.add('hidden');
    videoPlayer.pause();
    videoSource.src = '';
}

// Notification system
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'success' ? 'linear-gradient(135deg, #10b981, #06b6d4)' :
            type === 'error' ? 'linear-gradient(135deg, #ef4444, #dc2626)' :
                'linear-gradient(135deg, #6366f1, #8b5cf6)'};
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        z-index: 1000;
        font-weight: 600;
        animation: slideInRight 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
