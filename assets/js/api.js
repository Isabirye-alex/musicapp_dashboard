const API_BASE_URL = 'https://musicapp-api-6y2l.onrender.com/api/v1';

const getAuthToken = () => localStorage.getItem('token');
const setAuthToken = (token) => localStorage.setItem('token', token);
const clearAuthToken = () => localStorage.removeItem('token');

window.showLoading = (active = true) => {
    const el = document.getElementById('loadingOverlay');
    if (el) {
        if (active) el.classList.add('active');
        else el.classList.remove('active');
    }
};

window.showToast = (title, message, type = 'success') => {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `custom-toast toast-${type}`;
    const icon = type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill';
    
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="bi ${icon}"></i>
        </div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
    `;

    container.appendChild(toast);
    
    // Animate in
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Remove after 5 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500);
    }, 5000);
};

async function fetchAPI(endpoint, options = {}) {
    const token = getAuthToken();
    
    if (!options.skipLoading) window.showLoading(true);

    const headers = {
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && options.method !== 'GET') {
        headers['Content-Type'] = headers['Content-Type'] || 'application/json';
        if (options.body && typeof options.body === 'object') {
            options.body = JSON.stringify(options.body);
        }
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
        });

        if (response.status === 401) {
            // Prevent redirect loop during login/signup
            const isAuthEndpoint = endpoint.includes('/auth/signin') || endpoint.includes('/auth/signup');
            if (!isAuthEndpoint) {
                clearAuthToken();
                window.location.href = 'login.html';
            }
            // For auth endpoints, we let the caller handle the 401 error
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || errorData.message || 'Unauthorized');
        }

        if (response.status === 204) {
            return null;
        }

        let data;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        if (!response.ok) {
            throw new Error(data.detail || data.message || 'API Error');
        }

        return data;
    } finally {
        if (!options.skipLoading) window.showLoading(false);
    }
}

window.api = {
    auth: {
        signin: (credentials) => fetchAPI('/auth/signin', { method: 'POST', body: credentials }),
        signup: (userData) => fetchAPI('/auth/signup', { method: 'POST', body: userData }),
        getCurrentUser: () => fetchAPI('/auth/'),
        getUsers: () => fetchAPI('/auth/users'),
    },
    songs: {
        getPlatformSongs: () => fetchAPI('/songs/platform/all'),
        getUserSongs: () => fetchAPI('/songs/list'),
        upload: (formData) => fetchAPI('/songs/upload', { method: 'POST', body: formData }),
        favorite: (songId) => fetchAPI(`/songs/favorites/${songId}`, { method: 'POST' }),
        delete: (songId) => fetchAPI(`/songs/${songId}`, { method: 'DELETE' }),
    },
    users: {
        update: (userData) => fetchAPI('/users/update', { method: 'PATCH', body: userData }),
        delete: (userId, permanent = false) => fetchAPI(`/users/delete/${userId}${permanent ? '?permanent=true' : ''}`, { method: 'DELETE' }),
        activate: (userId) => fetchAPI(`/users/activate/${userId}`, { method: 'POST' })
    },
    notifications: {
        sendToToken: (payload) => fetchAPI('/notify/token', { method: 'POST', body: payload }),
        sendToTopic: (payload) => fetchAPI('/notify/topic', { method: 'POST', body: payload }),
        sendToMulticast: (payload) => fetchAPI('/notify/multicast', { method: 'POST', body: payload })
    }
};
