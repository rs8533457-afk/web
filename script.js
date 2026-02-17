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

// File Viewer Elements
const fileViewerModal = document.getElementById('fileViewerModal');
const modalOverlay = document.getElementById('modalOverlay');
const modalClose = document.getElementById('modalClose');
const previewContainer = document.getElementById('previewContainer');
const videoPlayer = document.getElementById('videoPlayer');
const imagePreview = document.getElementById('imagePreview');
const iconPreview = document.getElementById('iconPreview');
const modalFileName = document.getElementById('modalFileName');
const modalFileSize = document.getElementById('modalFileSize');
const commentsList = document.getElementById('commentsList');
const commentForm = document.getElementById('commentForm');
const commentInput = document.getElementById('commentInput');

let currentFileId = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    initializeEventListeners();
});

// ... (keep authentication code) ...

// Initialize event listeners
function initializeEventListeners() {
    // ... (keep existing listeners) ...

    // File Viewer modal
    modalOverlay.addEventListener('click', closeFileViewer);
    modalClose.addEventListener('click', closeFileViewer);

    // Comments
    commentForm.addEventListener('submit', handleAddComment);
}

// ... (keep auth functions) ...

// Updated createFileCard to open file viewer
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

    // Add click handler to preview for all files
    const previewClass = file.type === 'video' ? 'file-preview video-preview' : 'file-preview';

    card.innerHTML = `
        <div class="${previewClass}" onclick="openFileViewer('${file.id}')">${file.thumbnail}</div>
        <div class="file-info">
            <span class="file-type" style="background: ${typeColors[file.type]}20; color: ${typeColors[file.type]}">${typeLabels[file.type]}</span>
            <p class="file-name" onclick="openFileViewer('${file.id}')" style="cursor: pointer">${file.name}</p>
            <div class="file-meta">
                <span>${file.size}</span>
                <div class="file-actions">
                    <button class="btn-icon" onclick="downloadFile('${file.id}')" title="Download">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                    <button class="btn-icon delete" onclick="deleteFile('${file.id}')" title="Delete">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    `;

    return card;
}

// ... (keep handleFilter, downloadFile, deleteFile) ...

// File Viewer Functions
function openFileViewer(fileId) {
    const file = userFiles.find(f => f.id == fileId);
    if (!file) return;

    currentFileId = fileId;
    modalFileName.textContent = file.name;
    modalFileSize.textContent = file.size;

    // Reset previews
    videoPlayer.classList.add('hidden');
    videoPlayer.pause();
    imagePreview.classList.add('hidden');
    iconPreview.classList.add('hidden');

    // Show appropriate preview
    if (file.type === 'video' && file.data) {
        videoPlayer.src = file.data;
        videoPlayer.classList.remove('hidden');
        // Auto-play videos
        videoPlayer.play().catch(e => console.log('Autoplay prevented'));
    } else if (file.type === 'image' && file.data) {
        imagePreview.src = file.data;
        imagePreview.classList.remove('hidden');
    } else {
        iconPreview.innerHTML = file.thumbnail;
        iconPreview.classList.remove('hidden');
        // Set color based on type
        iconPreview.style.color = '#a1a1aa';
    }

    // Load comments
    loadComments(fileId);

    // Show modal
    fileViewerModal.classList.remove('hidden');
}

function closeFileViewer() {
    fileViewerModal.classList.add('hidden');
    videoPlayer.pause();
    videoPlayer.src = '';
    currentFileId = null;
}

// Commenting System
function loadComments(fileId) {
    const allComments = JSON.parse(localStorage.getItem('comments') || '[]');
    const fileComments = allComments.filter(c => c.fileId == fileId);

    commentsList.innerHTML = '';

    if (fileComments.length === 0) {
        commentsList.innerHTML = '<p class="empty-state" style="font-size: 14px; padding: 20px;">No comments yet. Be the first!</p>';
        return;
    }

    fileComments.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    fileComments.forEach(comment => {
        const commentEl = document.createElement('div');
        commentEl.className = 'comment-item';

        // Check if current user can delete (owner of comment or owner of file)
        const file = userFiles.find(f => f.id == fileId);
        const canDelete = comment.userId === currentUser.id || (file && file.userId === currentUser.id);
        const deleteBtn = canDelete ? `<span class="comment-delete" onclick="deleteComment(${comment.id})">Delete</span>` : '';

        // Initial for avatar
        const initial = comment.userName.charAt(0).toUpperCase();

        // Format date
        const date = new Date(comment.createdAt).toLocaleDateString();

        commentEl.innerHTML = `
            <div class="comment-avatar">${initial}</div>
            <div class="comment-content">
                <div class="comment-header">
                    <span class="comment-name">${comment.userName}</span>
                    <span class="comment-date">${date} ${deleteBtn}</span>
                </div>
                <div class="comment-text">${comment.text}</div>
            </div>
        `;

        commentsList.appendChild(commentEl);
    });

    // Scroll to bottom
    commentsList.scrollTop = commentsList.scrollHeight;
}

function handleAddComment(e) {
    e.preventDefault();
    if (!currentFileId) return;

    const text = commentInput.value.trim();
    if (!text) return;

    const newComment = {
        id: Date.now(),
        fileId: currentFileId,
        userId: currentUser.id,
        userName: currentUser.name,
        text: text,
        createdAt: new Date().toISOString()
    };

    const allComments = JSON.parse(localStorage.getItem('comments') || '[]');
    allComments.push(newComment);
    localStorage.setItem('comments', JSON.stringify(allComments));

    commentInput.value = '';
    loadComments(currentFileId);
}

function deleteComment(commentId) {
    if (!confirm('Delete this comment?')) return;

    let allComments = JSON.parse(localStorage.getItem('comments') || '[]');
    allComments = allComments.filter(c => c.id != commentId);
    localStorage.setItem('comments', JSON.stringify(allComments));

    loadComments(currentFileId);
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




function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const wrapper = input.parentElement;
    const eyeIcon = wrapper.querySelector('.eye-icon');
    const eyeOffIcon = wrapper.querySelector('.eye-off-icon');

    if (input.type === 'password') {
        input.type = 'text';
        eyeIcon.classList.add('hidden');
        eyeOffIcon.classList.remove('hidden');
    } else {
        input.type = 'password';
        eyeIcon.classList.remove('hidden');
        eyeOffIcon.classList.add('hidden');
    }
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
    const reader = new FileReader();

    reader.onload = function (e) {
        const fileData = {
            id: Date.now() + Math.random(),
            userId: currentUser.id,
            name: file.name,
            size: formatFileSize(file.size),
            type: getFileType(file.type, file.name),
            uploadedAt: new Date().toISOString(),
            thumbnail: getFileThumbnail(file.type),
            data: e.target.result, // Store the actual file data as base64
            mimeType: file.type
        };

        userFiles.push(fileData);

        // Save to localStorage
        const allFiles = JSON.parse(localStorage.getItem('files') || '[]');
        allFiles.push(fileData);

        try {
            localStorage.setItem('files', JSON.stringify(allFiles));
        } catch (e) {
            // If storage quota exceeded, show warning
            if (e.name === 'QuotaExceededError') {
                showNotification('Storage limit reached! Large files may not be stored.', 'error');
            }
        }
    };

    reader.onerror = function () {
        showNotification('Error reading file: ' + file.name, 'error');
    };

    // Read file as data URL (base64)
    reader.readAsDataURL(file);
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



function handleFilter(e) {
    filterBtns.forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');

    const filter = e.target.dataset.filter;
    renderFiles(filter);
}

// File actions
// File actions
function downloadFile(fileId) {
    const file = userFiles.find(f => f.id == fileId);
    if (!file) return;

    if (!file.data) {
        showNotification('File data not found (older files cannot be downloaded)', 'error');
        return;
    }

    const link = document.createElement('a');
    link.href = file.data;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

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
