document.addEventListener('DOMContentLoaded', async () => {
    // Check Auth
    if (!localStorage.getItem('token')) {
        window.location.href = 'login.html';
        return;
    }

    // Load User Data
    let currentUser = null;
    try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            currentUser = JSON.parse(storedUser);
            updateUserUI(currentUser);
        } else {
            currentUser = await window.api.auth.getCurrentUser();
            localStorage.setItem('user', JSON.stringify(currentUser));
            updateUserUI(currentUser);
        }
    } catch (e) {
        console.error('Failed to load user', e);
    }

    function updateUserUI(user) {
        // Sidebar UI
        const oldName = document.getElementById('currentUserName');
        if (oldName) oldName.textContent = user.first_name || user.name || 'User';
        const oldInitials = document.getElementById('currentUserInitials');
        const initials = user.first_name ? user.first_name.charAt(0).toUpperCase() : (user.name ? user.name.charAt(0).toUpperCase() : 'U');
        if (oldInitials) oldInitials.textContent = initials;

        // Persistent Header UI
        const headerName = document.getElementById('headerUserName');
        if (headerName) headerName.textContent = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.name || 'User';

        const headerEmail = document.getElementById('headerUserEmail');
        if (headerEmail) headerEmail.textContent = user.email || '';

        const headerRole = document.getElementById('headerUserRole');
        if (headerRole) {
            headerRole.textContent = user.role ? user.role.toUpperCase() : 'USER';
            if (user.role === 'admin') {
                headerRole.style.backgroundColor = '#dc3545'; // Red for admin
                headerRole.style.color = 'white';
            } else {
                headerRole.style.backgroundColor = 'var(--primary-color)';
                headerRole.style.color = '#000';
            }
        }

        const headerInitials = document.getElementById('headerUserInitials');
        if (headerInitials) headerInitials.textContent = initials;
    }

    // Sidebar Navigation Logic
    const navLinks = document.querySelectorAll('.sidebar .nav-link');
    const views = document.querySelectorAll('.view-section');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            // Remove active from all
            navLinks.forEach(nav => nav.classList.remove('active'));
            link.classList.add('active');

            // Hide all views
            views.forEach(v => {
                v.classList.add('d-none');
                v.classList.remove('fade-in-up');
            });

            // Show selected
            const viewId = link.getAttribute('data-view');
            const targetView = document.getElementById(`view-${viewId}`);
            if (targetView) {
                targetView.classList.remove('d-none');
                // Trigger reflow to restart animation
                void targetView.offsetWidth;
                targetView.classList.add('fade-in-up');
                loadDataForView(viewId);
            }
        });
    });

    // Initial Load
    loadDataForView('overview');

    // Handle Upload Form
    const uploadForm = document.getElementById('uploadSongForm');
    if (uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('uploadBtn');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Uploading...';
            btn.disabled = true;

            const formData = new FormData();
            formData.append('song_name', document.getElementById('songName').value);
            formData.append('artist_name', document.getElementById('artistName').value);
            formData.append('song', document.getElementById('songFile').files[0]);
            formData.append('thumbnail', document.getElementById('thumbnailFile').files[0]);
            formData.append('hex_code', document.getElementById('hexCode').value);

            try {
                await window.api.songs.upload(formData);

                // Clear and hide modal
                uploadForm.reset();
                const modalEl = document.getElementById('uploadSongModal');
                const modal = bootstrap.Modal.getInstance(modalEl);
                modal.hide();

                // Reload My Songs View if active
                if (document.getElementById('view-my-songs').classList.contains('d-none') === false) {
                    loadDataForView('my-songs');
                }
                window.showToast('Success', 'Track uploaded successfully!', 'success');
            } catch (error) {
                window.showToast('Upload Failed', error.message, 'error');
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }

    // Now Playing Play/Pause Mock Toggle
    const playBtn = document.getElementById('playBtn');
    const audio = document.getElementById('audioPlayer');
    const progressFill = document.getElementById('progress-fill');
    const progressThumb = document.getElementById('progress-thumb');
    const progressTrack = document.getElementById('progress-track');
    const currentTimeEl = document.getElementById('np-current-time');
    const totalTimeEl = document.getElementById('np-total-time');

    if (playBtn && audio) {
        playBtn.addEventListener('click', () => {
            if (!audio.src || audio.src === window.location.href) return;
            const icon = document.getElementById('np-play-icon');
            if (audio.paused) {
                audio.play();
                icon.classList.remove('bi-play-fill');
                icon.classList.add('bi-pause-fill');
            } else {
                audio.pause();
                icon.classList.remove('bi-pause-fill');
                icon.classList.add('bi-play-fill');
            }
        });

        audio.addEventListener('timeupdate', () => {
            if (audio.duration) {
                const percent = (audio.currentTime / audio.duration) * 100;
                if (progressFill) progressFill.style.width = `${percent}%`;
                if (progressThumb) progressThumb.style.left = `${percent}%`;

                let min = Math.floor(audio.currentTime / 60);
                let sec = Math.floor(audio.currentTime % 60);
                if (currentTimeEl) currentTimeEl.textContent = `${min}:${sec < 10 ? '0' : ''}${sec}`;
            }
        });

        audio.addEventListener('loadedmetadata', () => {
            let min = Math.floor(audio.duration / 60);
            let sec = Math.floor(audio.duration % 60);
            if (totalTimeEl) totalTimeEl.textContent = `${min}:${sec < 10 ? '0' : ''}${sec}`;
        });

        if (progressTrack) {
            progressTrack.addEventListener('click', (e) => {
                if (audio.duration) {
                    const rect = progressTrack.getBoundingClientRect();
                    const pos = (e.clientX - rect.left) / rect.width;
                    audio.currentTime = pos * audio.duration;
                }
            });
        }

        audio.addEventListener('ended', () => {
            const icon = document.getElementById('np-play-icon');
            icon.classList.remove('bi-pause-fill');
            icon.classList.add('bi-play-fill');
        });
    }

    // Notification UI Logic
    const notifTargetType = document.getElementById('notifTargetType');
    const notifTargetLabel = document.getElementById('notifTargetLabel');
    const notifTargetHelp = document.getElementById('notifTargetHelp');
    const notifTargetValue = document.getElementById('notifTargetValue');
    const notifForm = document.getElementById('notificationForm');

    if (notifTargetType) {
        notifTargetType.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val === 'topic') {
                notifTargetLabel.textContent = 'Topic Name';
                notifTargetValue.placeholder = 'e.g. news';
                notifTargetHelp.textContent = 'Enter the topic name without any prefix.';
            } else if (val === 'token') {
                notifTargetLabel.textContent = 'Device Token';
                notifTargetValue.placeholder = 'Enter FCM device token';
                notifTargetHelp.textContent = 'Provide a single valid FCM registration token.';
            } else if (val === 'multicast') {
                notifTargetLabel.textContent = 'Device Tokens (Comma-separated)';
                notifTargetValue.placeholder = 'token1, token2, token3...';
                notifTargetHelp.textContent = 'Enter multiple FCM tokens separated by commas (max 500).';
            }
        });
    }

    if (notifForm) {
        notifForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('sendNotifBtn');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sending...';
            btn.disabled = true;

            try {
                const type = document.getElementById('notifTargetType').value;
                const targetValue = document.getElementById('notifTargetValue').value.trim();

                const payload = {
                    notification: {
                        title: document.getElementById('notifTitle').value.trim(),
                        body: document.getElementById('notifBody').value.trim(),
                    }
                };

                const imageUrl = document.getElementById('notifImage').value.trim();
                if (imageUrl) payload.notification.image_url = imageUrl;

                const dataStr = document.getElementById('notifData').value.trim();
                if (dataStr) {
                    try {
                        payload.data = JSON.parse(dataStr);
                    } catch (err) {
                        throw new Error('Invalid JSON in Extra Data field.');
                    }
                }

                let response;
                if (type === 'topic') {
                    payload.topic = targetValue;
                    response = await window.api.notifications.sendToTopic(payload);
                } else if (type === 'token') {
                    payload.token = targetValue;
                    response = await window.api.notifications.sendToToken(payload);
                } else if (type === 'multicast') {
                    payload.tokens = targetValue.split(',').map(t => t.trim()).filter(t => t);
                    if (payload.tokens.length === 0) throw new Error("At least one token is required for multicast.");
                    response = await window.api.notifications.sendToMulticast(payload);
                }

                window.showToast('Notification Sent', 'Your message has been broadcasted.', 'success');
                notifForm.reset();
                notifTargetType.dispatchEvent(new Event('change'));

            } catch (err) {
                window.showToast('Send Failed', err.message, 'error');
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }
});


// Logout Helper
window.logout = function () {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
};

async function loadDataForView(view) {
    if (view === 'overview') {
        try {
            const [users, songs, mySongs] = await Promise.all([
                window.api.auth.getUsers(),
                window.api.songs.getPlatformSongs(),
                window.api.songs.getUserSongs()
            ]);
            document.getElementById('stat-users').textContent = users.length;
            document.getElementById('stat-songs').textContent = songs.length;
            document.getElementById('stat-my-songs').textContent = mySongs.length;

            // Populate trending (just first 4 platform songs for mockup)
            const trendContainer = document.getElementById('overview-trending-container');
            if (songs.length > 0) {
                renderSongs(songs.slice(0, 4), trendContainer);
            } else {
                trendContainer.innerHTML = '<div class="col-12"><div class="text-center text-secondary py-4"><p>No trending songs</p></div></div>';
            }
        } catch (e) {
            console.error('Failed loading stats', e);
        }
    } else if (view === 'all-songs') {
        const container = document.getElementById('all-songs-container');
        container.innerHTML = '<div class="text-center py-5 text-secondary w-100"><div class="spinner-border" role="status"></div><p class="mt-2">Loading tracks...</p></div>';
        try {
            const songs = await window.api.songs.getPlatformSongs();
            renderSongs(songs, container);
        } catch (e) {
            container.innerHTML = `<div class="alert alert-danger" style="background: rgba(255,0,0,0.1); border: 1px solid red; color: #ff4b4b;">Error loading songs: ${e.message}</div>`;
        }
    } else if (view === 'my-songs') {
        const container = document.getElementById('my-songs-container');
        container.innerHTML = '<div class="text-center py-5 text-secondary w-100"><div class="spinner-border" role="status"></div><p class="mt-2">Loading your library...</p></div>';
        try {
            const songs = await window.api.songs.getUserSongs();
            renderSongs(songs, container);
        } catch (e) {
            container.innerHTML = `<div class="alert alert-danger" style="background: rgba(255,0,0,0.1); border: 1px solid red; color: #ff4b4b;">Error loading your songs: ${e.message}</div>`;
        }
    } else if (view === 'users') {
        const tbody = document.getElementById('users-table-body');
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-5"><div class="spinner-border text-secondary" role="status"></div></td></tr>';
        try {
            const users = await window.api.auth.getUsers();
            tbody.innerHTML = '';
            users.forEach(user => {
                const tr = document.createElement('tr');
                const userInitial = user.first_name ? user.last_name.charAt(0).toUpperCase() : 'U';
                tr.innerHTML = `
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="rounded-circle d-flex align-items-center justify-content-center me-3" style="width:36px; height:36px; background: rgba(255,255,255,0.1); color: var(--text-primary); font-weight: bold;">
                                ${userInitial}
                            </div>
                            <span class="fw-bold">${user.first_name}</span>
                        </div>
                    </td>
                    <td class="text-secondary">${user.email}</td>
                    <td class="text-secondary">${user.is_active === true ? 'Active' : 'Inactive'}</td>
                    <td class="text-secondary">${user.created_at.split('T')[0]}</td>
                    <td class="text-end">
                        ${user.is_active === false ? `<button class="btn btn-sm btn-outline-success me-2" title="Activate User" onclick="activateUser('${user.id}')"><i class="bi bi-person-check-fill"></i></button>` : ''}
                        <button class="btn btn-sm btn-outline-warning me-2" title="Deactivate User" onclick="deleteUser('${user.id}', false)"><i class="bi bi-person-x-fill"></i></button>
                        <button class="btn btn-sm btn-outline-danger" title="Permanent Delete" onclick="deleteUser('${user.id}', true)"><i class="bi bi-trash-fill"></i></button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-danger text-center py-4">Error loading users</td></tr>`;
        }
    }
}

function renderSongs(songs, container) {
    container.innerHTML = '';
    if (songs.length === 0) {
        container.innerHTML = '<div class="col-12"><div class="text-center text-secondary py-5"><i class="bi bi-music-note" style="font-size: 3rem;"></i><p class="mt-3">No tracks found.</p></div></div>';
        return;
    }

    songs.forEach((song, index) => {
        const col = document.createElement('div');
        col.className = 'col-6 col-md-4 col-lg-3';

        // Staggered animation
        col.style.animationDelay = `${index * 0.05}s`;
        col.classList.add('fade-in-up');

        const hex = song.hex_code || '#1DB954';
        const imgUrl = song.thumbnail_url || 'https://via.placeholder.com/300';

        col.innerHTML = `
            <div class="card song-card h-100 p-3 border-0 bg-transparent" style="cursor: pointer;">
                <div class="position-relative">
                    <img src="${imgUrl}" alt="${song.song_name}" class="card-img-top shadow-lg">
                    <div class="play-overlay">
                        <i class="bi bi-play-fill"></i>
                    </div>
                </div>
                <div class="card-body p-0 mt-2 position-relative">
                    <h6 class="card-title fw-bold text-truncate text-white mb-1 pe-4" title="${song.song_name}">${song.song_name}</h6>
                    <p class="card-text text-secondary small text-truncate mb-0 pe-4" title="${song.artist_name}">${song.artist_name}</p>
                    <button class="btn btn-sm btn-outline-danger position-absolute top-0 end-0 rounded-circle" 
                            title="Delete Track" 
                            style="padding: 0.1rem 0.3rem; border: none;"
                            onclick="event.stopPropagation(); window.deleteSong('${song.song_id || song.id}')">
                        <i class="bi bi-trash-fill" style="font-size: 0.8rem;"></i>
                    </button>
                </div>
            </div>
        `;

        // Add click listener to favorite or play
        col.querySelector('.song-card').addEventListener('click', () => {
            // Update Now Playing Bar mockup
            document.getElementById('np-image').src = imgUrl;
            document.getElementById('np-title').textContent = song.song_name;
            document.getElementById('np-artist').textContent = song.artist_name;

            // Set audio source and play
            const audio = document.getElementById('audioPlayer');
            if (audio && song.song_url) {
                audio.src = song.song_url;
                audio.play().catch(e => console.error("Playback failed", e));
            }

            // Auto play icon mock
            const icon = document.getElementById('np-play-icon');
            if (icon) {
                icon.classList.remove('bi-play-fill');
                icon.classList.add('bi-pause-fill');
            }

            // Update glow based on song hex
            document.getElementById('nowPlayingBar').style.boxShadow = `0 -10px 40px ${hex}33`; // 33 is 20% opacity in hex
        });

        container.appendChild(col);
    });
}

window.deleteUser = async function (userId, permanent = false) {
    const actionText = permanent ? 'permanently DELETE' : 'DEACTIVATE';
    if (confirm(`Are you sure you want to ${actionText} this user?`)) {
        try {
            await window.api.users.delete(userId, permanent);
            window.showToast('User Updated', `User ${permanent ? 'deleted' : 'deactivated'} successfully.`, 'success');
            loadDataForView('users');
        } catch (e) {
            window.showToast('Action Failed', e.message, 'error');
        }
    }
}

window.activateUser = async function (userId) {
    if (confirm('Are you sure you want to reactivate this user?')) {
        try {
            await window.api.users.activate(userId);
            window.showToast('User Activated', 'User account is now active.', 'success');
            loadDataForView('users');
        } catch (e) {
            window.showToast('Activation Failed', e.message, 'error');
        }
    }
}


// Global action for deleting song
window.deleteSong = async function (songId) {
    if (!songId) return;
    if (confirm('Are you sure you want to delete this song? This will permanently remove it from the platform and Cloudinary.')) {
        try {
            await window.api.songs.delete(songId);
            window.showToast('Song Deleted', 'The track has been removed from the platform.', 'success');
            // Refresh views
            if (!document.getElementById('view-all-songs').classList.contains('d-none')) {
                loadDataForView('all-songs');
            } else if (!document.getElementById('view-my-songs').classList.contains('d-none')) {
                loadDataForView('my-songs');
            } else {
                loadDataForView('overview');
            }
        } catch (e) {
            window.showToast('Delete Failed', e.message, 'error');
        }
    }
}
