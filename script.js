// State management
let currentUser = null;
let userFiles = [];
let currentOtp = null;
let pendingUser = null; // Store user temporarily during OTP phase

// EmailJS Configuration
const EMAILJS_CONFIG = {
    SERVICE_ID: 'service_6lse30k',
    TEMPLATE_ID: 'template_iapqf56',
    PUBLIC_KEY: 'lSnUB-d07Mi54Vvcb'
};

// Supabase Configuration
const SUPABASE_CONFIG = {
    URL: 'https://nfpwusbwlycfgxgatolv.supabase.co',
    ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mcHd1c2J3bHljZmd4Z2F0b2x2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMzM0NjYsImV4cCI6MjA4NjkwOTQ2Nn0.Fl1zJnRNzHR_kmpl6ZpHyKxVXY7lTBBFecKj3QBcfQ8'
};

// Initialize Supabase Client
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY);

// Updated filesAppDB to use Supabase
const filesAppDB = {
    getAll: async function (storeName) {
        if (!currentUser) return [];
        try {
            const { data, error } = await supabaseClient
                .from(storeName)
                .select('*')
                .eq('user_id', currentUser.id);

            if (error) throw error;
            return data || [];
        } catch (e) {
            console.error(`Error fetching from ${storeName}:`, e);
            return [];
        }
    },

    add: async function (storeName, item) {
        try {
            const { data, error } = await supabaseClient
                .from(storeName)
                .upsert(item);

            if (error) throw error;
            return data;
        } catch (e) {
            console.error(`Error adding to ${storeName}:`, e);
            throw e;
        }
    },

    delete: async function (storeName, id) {
        try {
            const { error } = await supabaseClient
                .from(storeName)
                .delete()
                .eq('id', id);

            if (error) throw error;
        } catch (e) {
            console.error(`Error deleting from ${storeName}:`, e);
            throw e;
        }
    },

    get: async function (storeName, key, keyName = 'id') {
        try {
            const { data, error } = await supabaseClient
                .from(storeName)
                .select('*')
                .eq(keyName, key)
                .single();

            if (error && error.code !== 'PGRST116') throw error; // PGRST116 is code for "no rows returned"
            return data;
        } catch (e) {
            console.error(`Error getting from ${storeName}:`, e);
            return null;
        }
    }
};

// DOM Elements
const loginPage = document.getElementById('loginPage');
const signupPage = document.getElementById('signupPage');
const otpPage = document.getElementById('otpPage');
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

// OTP Elements
const otpInputs = document.querySelectorAll('.otp-input');
const verifyOtpBtn = document.getElementById('verifyOtpBtn');
const resendOtpBtn = document.getElementById('resendOtp');

// Activity Log Elements
const navActivity = document.getElementById('navActivity');
const activitySection = document.getElementById('activitySection');
const activityList = document.getElementById('activityList');
const clearActivityBtn = document.getElementById('clearActivityBtn');
const mainFilesSection = document.querySelector('.files-section');
const statsSection = document.querySelector('.stats-section');
const uploadSection = document.querySelector('.upload-section');

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

// Profile Elements
const profileModal = document.getElementById('profileModal');
const profileModalOverlay = document.getElementById('profileModalOverlay');
const profileModalClose = document.getElementById('profileModalClose');
const profileTrigger = document.getElementById('profileTrigger');
const profileForm = document.getElementById('profileForm');
const profileNameInput = document.getElementById('profileName');
const profileEmailInput = document.getElementById('profileEmail');
const userAvatarSmall = document.getElementById('userAvatarSmall');

// Share Elements
const shareModal = document.getElementById('shareModal');
const shareModalOverlay = document.getElementById('shareModalOverlay');
const shareModalClose = document.getElementById('shareModalClose');
const shareLinkInput = document.getElementById('shareLinkInput');
const copyShareLinkBtn = document.getElementById('copyShareLinkBtn');
const shareStatusText = document.getElementById('shareStatusText');

let currentFileId = null;

// Auth Migration to Supabase
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;

        if (data.user) {
            // Check if profile exists
            let profile = await filesAppDB.get('profiles', data.user.id);

            // Auto-create profile if missing
            if (!profile) {
                console.log('Profile missing, creating auto-profile...');
                const newProfile = {
                    id: data.user.id,
                    name: data.user.user_metadata?.full_name || data.user.email.split('@')[0],
                    email: data.user.email
                };
                await supabaseClient.from('profiles').insert([newProfile]);
                profile = newProfile;
            }

            currentUser = {
                id: data.user.id,
                name: profile.name,
                email: data.user.email
            };
            showNotification('Welcome back!', 'success');
            showDashboard();
            updateUserAvatar();
            setupRealtimeSubscriptions();
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification(error.message || 'Login failed', 'error');
    }
}

async function handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;

    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name
                }
            }
        });

        if (error) throw error;

        if (data.user) {
            // Create profile
            await supabaseClient.from('profiles').insert([
                { id: data.user.id, name, email }
            ]);

            showNotification('Signup successful! You can now log in.', 'success');
            showLogin();
        }
    } catch (error) {
        console.error('Signup error:', error);
        showNotification(error.message || 'Signup failed', 'error');
    }
}

async function handleLogout() {
    await supabaseClient.auth.signOut();
    currentUser = null;
    showNotification('Logged out successfully', 'success');
    showLogin();
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await checkAuth();
    } catch (error) {
        console.error('Failed to initialize app:', error);
        showNotification('Failed to initialize application', 'error');
    }
});

// Check authentication
async function checkAuth() {
    const { data: { session }, error } = await supabaseClient.auth.getSession();

    if (session && session.user) {
        // Fetch profile
        let profile = await filesAppDB.get('profiles', session.user.id);

        // Auto-create profile if missing (resilience)
        if (!profile) {
            console.log('Restoring missing profile for session user...');
            const newProfile = {
                id: session.user.id,
                name: session.user.user_metadata?.full_name || session.user.email.split('@')[0],
                email: session.user.email
            };
            await supabaseClient.from('profiles').insert([newProfile]);
            profile = newProfile;
        }

        currentUser = {
            id: session.user.id,
            name: profile.name,
            email: session.user.email
        };
        updateUserAvatar();
        showDashboard();
        setupRealtimeSubscriptions(); // Start listening for changes
    }
    else {
        showLogin();
    }
}

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

// Sidebar Navigation
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', handleFilter);
});

// Search functionality
const fileSearch = document.getElementById('fileSearch');
if (fileSearch) {
    fileSearch.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const activeFilter = document.querySelector('.filter-btn.active, .nav-item.active')?.dataset.filter || 'all';
        renderFiles(activeFilter, query);
    });
}

// Activity Log Event Listeners
if (navActivity) {
    navActivity.addEventListener('click', (e) => {
        e.preventDefault();
        showActivityLog();
    });
}

if (clearActivityBtn) {
    clearActivityBtn.addEventListener('click', async () => {
        if (confirm('Clear entire activity log?')) {
            try {
                const { error } = await supabaseClient
                    .from('activity')
                    .delete()
                    .eq('user_id', currentUser.id);

                if (error) throw error;

                renderActivityLog();
                showNotification('Activity log cleared', 'info');
            } catch (e) {
                console.error('Error clearing activity:', e);
                showNotification('Failed to clear activity log', 'error');
            }
        }
    });
}

// File Viewer modal
modalOverlay.addEventListener('click', closeFileViewer);
modalClose.addEventListener('click', closeFileViewer);

// Navigation
showSignupBtn.addEventListener('click', (e) => {
    e.preventDefault();
    showSignup();
});

showLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    showLogin();
});

// Comments
commentForm.addEventListener('submit', handleAddComment);

// Profile
if (profileTrigger) profileTrigger.addEventListener('click', openProfileModal);
if (profileModalOverlay) profileModalOverlay.addEventListener('click', closeProfileModal);
if (profileModalClose) profileModalClose.addEventListener('click', closeProfileModal);
if (profileForm) profileForm.addEventListener('submit', handleUpdateProfile);

// Share
if (shareModalOverlay) shareModalOverlay.addEventListener('click', closeShareModal);
if (shareModalClose) shareModalClose.addEventListener('click', closeShareModal);
if (copyShareLinkBtn) copyShareLinkBtn.addEventListener('click', copyShareLink);


// Updated File Functions for Supabase
async function loadUserFiles() {
    try {
        const { data, error } = await supabaseClient
            .from('files')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('uploaded_at', { ascending: false });

        if (error) throw error;
        userFiles = data || [];
        renderFiles();
        updateDashboardStats();
    } catch (e) {
        console.error('Error loading files:', e);
        showNotification('Failed to load files', 'error');
    }
}



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
                    <button class="btn-icon" onclick="shareFile('${file.id}')" title="Share">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
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
async function openFileViewer(fileId) {
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

    // Get public URL for preview
    const { data: { publicUrl } } = supabaseClient
        .storage
        .from('files')
        .getPublicUrl(file.storage_path);

    // Show appropriate preview
    if (file.type === 'video') {
        videoPlayer.src = publicUrl;
        videoPlayer.classList.remove('hidden');
        videoPlayer.play().catch(e => console.log('Autoplay prevented'));
    } else if (file.type === 'image') {
        imagePreview.src = publicUrl;
        imagePreview.classList.remove('hidden');
    } else {
        iconPreview.innerHTML = file.thumbnail;
        iconPreview.classList.remove('hidden');
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
async function loadComments(fileId) {
    try {
        const { data: fileComments, error } = await supabaseClient
            .from('comments')
            .select('*')
            .eq('file_id', fileId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        commentsList.innerHTML = '';

        if (!fileComments || fileComments.length === 0) {
            commentsList.innerHTML = '<p class="empty-state" style="font-size: 14px; padding: 20px;">No comments yet. Be the first!</p>';
            return;
        }

        fileComments.forEach(comment => {
            const commentEl = document.createElement('div');
            commentEl.className = 'comment-item';

            const file = userFiles.find(f => f.id == fileId);
            const canDelete = comment.user_id === currentUser.id || (file && file.user_id === currentUser.id);
            const deleteBtn = canDelete ? `<span class="comment-delete" onclick="deleteComment('${comment.id}')">Delete</span>` : '';

            const initial = (comment.user_name || 'U').charAt(0).toUpperCase();
            const date = new Date(comment.created_at).toLocaleDateString();

            commentEl.innerHTML = `
                <div class="comment-avatar">${initial}</div>
                <div class="comment-content">
                    <div class="comment-header">
                        <span class="comment-name">${comment.user_name}</span>
                        <span class="comment-date">${date} ${deleteBtn}</span>
                    </div>
                    <div class="comment-text">${comment.text}</div>
                </div>
            `;

            commentsList.appendChild(commentEl);
        });

        commentsList.scrollTop = commentsList.scrollHeight;
    } catch (e) {
        console.error('Error loading comments:', e);
    }
}

async function handleAddComment(e) {
    e.preventDefault();
    if (!currentFileId) return;

    const text = commentInput.value.trim();
    if (!text) return;

    const commentId = Date.now().toString();
    const newComment = {
        id: commentId,
        file_id: currentFileId,
        user_id: currentUser.id,
        user_name: currentUser.name,
        text: text,
        created_at: new Date().toISOString()
    };

    try {
        const { error } = await supabaseClient
            .from('comments')
            .insert([newComment]);

        if (error) throw error;

        commentInput.value = '';

        const file = userFiles.find(f => f.id == currentFileId);
        logActivity('comment', file ? file.name : 'Unknown File', `Comment: "${text.substring(0, 20)}..."`);

        loadComments(currentFileId);
    } catch (e) {
        console.error('Error adding comment:', e);
        showNotification('Failed to add comment', 'error');
    }
}

async function deleteComment(commentId) {
    if (!confirm('Delete this comment?')) return;

    try {
        await filesAppDB.delete('comments', commentId);
        loadComments(currentFileId);
    } catch (e) {
        console.error('Error deleting comment:', e);
        showNotification('Failed to delete comment', 'error');
    }
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
    otpPage.classList.add('hidden');
    dashboard.classList.add('hidden');
}

function showOTPPage() {
    loginPage.classList.add('hidden');
    signupPage.classList.add('hidden');
    otpPage.classList.remove('hidden');
    dashboard.classList.add('hidden');

    // Update subtitle with email
    if (pendingUser) {
        document.getElementById('otpSubtitle').textContent = `We've sent a 6-digit code to ${pendingUser.email}`;
    }

    // Focus first input
    setTimeout(() => otpInputs[0].focus(), 100);
}

function showDashboard() {
    loginPage.classList.add('hidden');
    signupPage.classList.add('hidden');
    otpPage.classList.add('hidden');
    dashboard.classList.remove('hidden');

    userName.textContent = currentUser.name;
    loadUserFiles();
    renderFiles();
    showFilesView(); // Default to files view
}

function showFilesView() {
    mainFilesSection.classList.remove('hidden');
    statsSection.classList.remove('hidden');
    uploadSection.classList.remove('hidden');
    activitySection.classList.add('hidden');

    // Deactivate Activity Log nav item
    navActivity.classList.remove('active');
}

async function showActivityLog() {
    mainFilesSection.classList.add('hidden');
    statsSection.classList.add('hidden');
    uploadSection.classList.add('hidden');
    activitySection.classList.remove('hidden');

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    navActivity.classList.add('active');

    renderActivityLog();
}

async function logActivity(action, fileName, details) {
    if (!currentUser) return;

    const activity = {
        id: (Date.now() + Math.random()).toString(),
        user_id: currentUser.id,
        user_name: currentUser.name,
        action: action,
        file_name: fileName,
        details: details,
        created_at: new Date().toISOString()
    };

    try {
        const { error } = await supabaseClient
            .from('activity')
            .insert([activity]);

        if (error) throw error;
    } catch (e) {
        console.error('Error logging activity:', e);
    }
}

async function renderActivityLog() {
    try {
        const { data: userActivity, error } = await supabaseClient
            .from('activity')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        activityList.innerHTML = '';

        if (!userActivity || userActivity.length === 0) {
            activityList.innerHTML = '<p class="empty-state" style="padding: 40px; text-align: center;">No activity recorded yet.</p>';
            return;
        }

        const icons = {
            'upload': '📤',
            'delete': '🗑️',
            'download': '📥',
            'comment': '💬'
        };

        const titles = {
            'upload': 'File Uploaded',
            'delete': 'File Deleted',
            'download': 'File Downloaded',
            'comment': 'Comment Added'
        };

        userActivity.forEach(act => {
            const item = document.createElement('div');
            item.className = 'activity-item';

            const time = new Date(act.created_at).toLocaleString();

            item.innerHTML = `
                <div class="activity-icon">${icons[act.action] || '📝'}</div>
                <div class="activity-content">
                    <div class="activity-header">
                        <span class="activity-title">${titles[act.action] || act.action}</span>
                        <span class="activity-time">${time}</span>
                    </div>
                    <div class="activity-details">
                        <strong>${act.file_name || ''}</strong> ${act.details || ''}
                    </div>
                </div>
            `;
            activityList.appendChild(item);
        });
    } catch (e) {
        console.error('Error rendering activity:', e);
    }
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

async function handleFiles(files) {
    if (files.length === 0) return;

    // Show progress
    uploadProgress.classList.remove('hidden');

    const fileArray = Array.from(files);

    for (const [index, file] of fileArray.entries()) {
        try {
            await saveFile(file);
            const progress = ((index + 1) / fileArray.length) * 100;
            progressFill.style.width = `${progress}%`;
            progressText.textContent = `Uploading... ${index + 1}/${fileArray.length}`;
        } catch (error) {
            console.error(`Error uploading ${file.name}:`, error);
        }
    }

    setTimeout(() => {
        uploadProgress.classList.add('hidden');
        progressFill.style.width = '0%';
        if (fileArray.length > 0) {
            showNotification(`${fileArray.length} file(s) processed.`, 'info');
        }
    }, 500);

    fileInput.value = '';
}

async function saveFile(file) {
    const fileId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const storagePath = `${currentUser.id}/${fileId}_${file.name}`;

    // Show progress (start)
    uploadProgress.classList.remove('hidden');
    progressFill.style.width = '20%';
    progressText.textContent = `Uploading ${file.name}...`;

    try {
        // 1. Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabaseClient
            .storage
            .from('files')
            .upload(storagePath, file);

        if (uploadError) throw uploadError;

        progressFill.style.width = '60%';

        // 2. Get Public URL
        const { data: { publicUrl } } = supabaseClient
            .storage
            .from('files')
            .getPublicUrl(storagePath);

        const fileData = {
            id: fileId,
            user_id: currentUser.id,
            name: file.name,
            size: formatFileSize(file.size),
            type: getFileType(file.type, file.name),
            uploaded_at: new Date().toISOString(),
            thumbnail: getFileThumbnail(file.type),
            storage_path: storagePath,
            mime_type: file.type
        };

        // 3. Save metadata to Firestore (files table)
        const { error: dbError } = await supabaseClient
            .from('files')
            .insert([fileData]);

        if (dbError) throw dbError;

        progressFill.style.width = '100%';

        setTimeout(() => {
            uploadProgress.classList.add('hidden');
            showNotification('File uploaded successfully!', 'success');
            loadUserFiles(); // Refresh files
        }, 500);

        // Log activity
        logActivity('upload', file.name, `Size: ${fileData.size}`);

    } catch (e) {
        console.error('Save file error:', e);
        uploadProgress.classList.add('hidden');
        showNotification('Error saving file: ' + e.message, 'error');
    }
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
function renderFiles(filter = 'all', searchQuery = '') {
    filesGrid.innerHTML = '';

    let filteredFiles = filter === 'all'
        ? userFiles
        : userFiles.filter(file => file.type === filter);

    if (searchQuery) {
        filteredFiles = filteredFiles.filter(file =>
            file.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }

    if (filteredFiles.length === 0) {
        filesGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📂</div>
                <h3>${searchQuery ? 'No matching files' : 'No files yet'}</h3>
                <p>${searchQuery ? 'Try a different search term' : 'Upload your first file to get started!'}</p>
            </div>
        `;
        return;
    }

    filteredFiles.forEach((file, index) => {
        const fileCard = createFileCard(file, index);
        filesGrid.appendChild(fileCard);
    });

    updateDashboardStats();
}

function updateDashboardStats() {
    const totalFilesEl = document.getElementById('totalFiles');
    const storageUsedEl = document.getElementById('storageUsed');
    const recentFilesEl = document.getElementById('recentFiles');
    const storagePercentEl = document.getElementById('storagePercent');
    const storageFillEl = document.getElementById('storageFill');
    const storageTextEl = document.getElementById('storageText');

    if (!totalFilesEl) return; // Not on dashboard

    const totalFiles = userFiles.length;
    let totalBytes = 0;
    let newToday = 0;
    const today = new Date().toDateString();

    userFiles.forEach(file => {
        // Handle size string (e.g., "1.2 MB")
        const sizeParts = file.size.split(' ');
        const value = parseFloat(sizeParts[0]);
        const unit = sizeParts[1];

        let bytes = value;
        if (unit === 'KB') bytes *= 1024;
        else if (unit === 'MB') bytes *= 1024 * 1024;
        else if (unit === 'GB') bytes *= 1024 * 1024 * 1024;

        totalBytes += bytes;

        if (file.createdAt && new Date(file.createdAt).toDateString() === today) {
            newToday++;
        }
    });

    const storageUsedMB = (totalBytes / (1024 * 1024)).toFixed(1);
    const storageLimitMB = 104857600; // 100TB limit (100 * 1024 * 1024 MB)
    const percentUsed = Math.min(100, (totalBytes / (storageLimitMB * 1024 * 1024) * 100)).toFixed(1);

    totalFilesEl.textContent = totalFiles;
    storageUsedEl.textContent = `${storageUsedMB} MB`;
    recentFilesEl.textContent = newToday;

    if (storagePercentEl) storagePercentEl.textContent = `${percentUsed}%`;
    if (storageFillEl) storageFillEl.style.width = `${percentUsed}%`;
    if (storageTextEl) {
        const usedDisplay = totalBytes > 1024 * 1024 * 1024
            ? (totalBytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
            : storageUsedMB + ' MB';
        storageTextEl.textContent = `${usedDisplay} of 100 TB used`;
    }
}

function handleFilter(e) {
    e.preventDefault();
    const target = e.currentTarget;
    const filter = target.getAttribute('data-filter') || target.dataset.filter;

    // Switch back to files view if we're in activity log
    showFilesView();

    // Update active state for both header filters and sidebar nav
    document.querySelectorAll('.filter-btn, .nav-item').forEach(btn => {
        if (btn.getAttribute('data-filter') === filter) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    const searchQuery = document.getElementById('fileSearch')?.value || '';
    renderFiles(filter, searchQuery);
}

// File actions
async function downloadFile(fileId) {
    const file = userFiles.find(f => f.id == fileId);
    if (!file) return;

    try {
        const { data, error } = await supabaseClient
            .storage
            .from('files')
            .download(file.storage_path);

        if (error) throw error;

        const blob = new Blob([data], { type: file.mime_type });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showNotification('Download started', 'success');
        logActivity('download', file.name, `User: ${currentUser.name}`);
    } catch (e) {
        console.error('Download error:', e);
        showNotification('Failed to download file', 'error');
    }
}

async function deleteFile(fileId) {
    if (confirm('Are you sure you want to delete this file?')) {
        try {
            const fileToDelete = userFiles.find(f => f.id == fileId);
            if (!fileToDelete) return;

            // 1. Delete from Supabase Storage
            const { error: storageError } = await supabaseClient
                .storage
                .from('files')
                .remove([fileToDelete.storage_path]);

            if (storageError) throw storageError;

            // 2. Delete from Metadata DB
            const { error: dbError } = await supabaseClient
                .from('files')
                .delete()
                .eq('id', fileId);

            if (dbError) throw dbError;

            showNotification('File deleted successfully', 'success');
            loadUserFiles(); // Refresh

            // Log activity
            logActivity('delete', fileToDelete.name, 'Permanent removal');
        } catch (e) {
            console.error('Error deleting file:', e);
            showNotification('Failed to delete file', 'error');
        }
    }
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

// Profile & Real-time Functions
function openProfileModal() {
    if (!currentUser) return;
    profileNameInput.value = currentUser.name;
    profileEmailInput.value = currentUser.email;
    profileModal.classList.remove('hidden');
}

function closeProfileModal() {
    profileModal.classList.add('hidden');
}

async function handleUpdateProfile(e) {
    e.preventDefault();
    const newName = profileNameInput.value.trim();
    if (!newName || newName === currentUser.name) {
        closeProfileModal();
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('profiles')
            .update({ name: newName })
            .eq('id', currentUser.id);

        if (error) throw error;

        currentUser.name = newName;
        userName.textContent = newName;
        updateUserAvatar();
        closeProfileModal();
        showNotification('Profile updated successfully', 'success');

        // Log activity
        logActivity('profile_update', 'Profile', `Changed name to ${newName}`);
    } catch (error) {
        console.error('Update profile error:', error);
        showNotification('Failed to update profile', 'error');
    }
}

function updateUserAvatar() {
    if (currentUser && currentUser.name && userAvatarSmall) {
        userAvatarSmall.textContent = currentUser.name.charAt(0).toUpperCase();
    }
}

function setupRealtimeSubscriptions() {
    if (!currentUser) return;

    // Listen for file changes (uploads/deletions/updates)
    supabaseClient
        .channel('public:files')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'files'
        }, (payload) => {
            console.log('Real-time file change:', payload);
            loadUserFiles(); // Refresh file list
        })
        .subscribe();

    // Listen for activity changes
    supabaseClient
        .channel('public:activity')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'activity',
            filter: `user_id=eq.${currentUser.id}`
        }, (payload) => {
            console.log('Real-time activity:', payload);
            if (activitySection && !activitySection.classList.contains('hidden')) {
                renderActivityLog();
            }
        })
        .subscribe();

    // Listen for comment changes
    supabaseClient
        .channel('public:comments')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'comments'
        }, (payload) => {
            console.log('Real-time comment change:', payload);
            if (currentFileId) {
                loadComments(currentFileId);
            }
        })
        .subscribe();
}

// File Sharing Functions
async function shareFile(fileId) {
    const file = userFiles.find(f => f.id == fileId);
    if (!file) return;

    try {
        const { data: { publicUrl } } = supabaseClient
            .storage
            .from('files')
            .getPublicUrl(file.storage_path);

        shareLinkInput.value = publicUrl;
        shareModal.classList.remove('hidden');

        logActivity('share', file.name, 'Generated public link');
    } catch (e) {
        console.error('Sharing error:', e);
        showNotification('Failed to generate sharing link', 'error');
    }
}

function closeShareModal() {
    shareModal.classList.add('hidden');
    shareStatusText.style.opacity = '0';
}

function copyShareLink() {
    shareLinkInput.select();
    shareLinkInput.setSelectionRange(0, 99999); // For mobile devices

    navigator.clipboard.writeText(shareLinkInput.value).then(() => {
        shareStatusText.style.opacity = '1';
        setTimeout(() => {
            shareStatusText.style.opacity = '0';
        }, 2000);
    }).catch(err => {
        console.error('Copy failed:', err);
        showNotification('Failed to copy link', 'error');
    });
}
