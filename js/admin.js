let adminPassword = localStorage.getItem('adminPassword_anymoons');
let currentFandubs = [];
let currentLinks = [];
let currentClan = [];
let inactivityTimer;
const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutos

// --- Funciones de sesión e inactividad ---
function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        showToast('Sesión cerrada por inactividad', 'error');
        logout();
    }, INACTIVITY_LIMIT);
}

['click', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
    document.addEventListener(event, resetInactivityTimer);
});

async function validatePassword(pass) {
    try {
        const res = await fetch(`${API_URL}/api/admin/games`, { headers: { 'X-Admin-Password': pass } });
        return res.status !== 401;
    } catch(e) { return false; }
}

async function authFetch(url, options = {}) {
    const res = await fetch(url, {
        ...options,
        headers: { ...options.headers, 'X-Admin-Password': adminPassword }
    });
    if (res.status === 401) {
        showToast('Sesión expirada', 'error');
        logout();
        throw new Error('Sesión expirada');
    }
    return res;
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info'}"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function logout() {
    localStorage.removeItem('adminPassword_anymoons');
    clearTimeout(inactivityTimer);
    window.location.reload();
}

document.addEventListener('DOMContentLoaded', async () => {
    if (adminPassword) {
        if (await validatePassword(adminPassword)) { showDashboard(); resetInactivityTimer(); } 
        else { localStorage.removeItem('adminPassword_anymoons'); adminPassword = null; }
    }
});

document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pass = document.getElementById('login-password').value;
    if (await validatePassword(pass)) {
        adminPassword = pass;
        localStorage.setItem('adminPassword_anymoons', pass);
        showDashboard();
        resetInactivityTimer();
    } else {
        showToast('Contraseña incorrecta', 'error');
    }
});

function showDashboard() {
    document.getElementById('login-modal')?.classList.add('hidden');
    document.getElementById('admin-content')?.classList.remove('hidden');
    loadAvatarInAdmin();
    loadFandubs();
    loadClandestine();
    loadLinks();
    setupImportExport();
}

// ========== AVATAR ==========
async function loadAvatarInAdmin() {
    try {
        const res = await authFetch(`${API_URL}/api/admin/avatar`);
        if (res.ok) {
            const data = await res.json();
            if (data.url) {
                document.getElementById('avatar-preview').src = data.url;
                document.getElementById('avatar-url-input').value = data.url;
            }
        }
    } catch(e) {}
}
document.getElementById('save-avatar-btn')?.addEventListener('click', async () => {
    const url = document.getElementById('avatar-url-input').value.trim();
    if (!url) return showToast('Ingresa una URL válida', 'error');
    try {
        await authFetch(`${API_URL}/api/admin/avatar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        document.getElementById('avatar-preview').src = url;
        showToast('Avatar guardado', 'success');
    } catch(e) { showToast('Error: ' + e.message, 'error'); }
});
document.getElementById('remove-avatar-btn')?.addEventListener('click', async () => {
    if (!confirm('¿Eliminar avatar?')) return;
    try {
        await authFetch(`${API_URL}/api/admin/avatar`, { method: 'DELETE' });
        document.getElementById('avatar-preview').src = '';
        document.getElementById('avatar-url-input').value = '';
        showToast('Avatar eliminado', 'success');
    } catch(e) { showToast('Error', 'error'); }
});

// ========== FANDUBS con orden, búsqueda y tags ==========
async function loadFandubs() {
    const res = await authFetch(`${API_URL}/api/admin/games`);
    currentFandubs = await res.json();
    renderFandubsList();
}
function renderFandubsList() {
    const searchTerm = document.getElementById('search-fandubs')?.value.toLowerCase() || '';
    const filtered = currentFandubs.filter(f => f.title.toLowerCase().includes(searchTerm));
    const container = document.getElementById('admin-fandubs-list');
    if (!container) return;
    container.innerHTML = filtered.map((g, idx) => `
        <div class="flex justify-between items-center bg-gray-800 p-4 rounded-2xl border border-gray-700">
            <div class="flex items-center gap-4 flex-1">
                <img src="${g.img}" class="w-16 h-12 object-cover rounded-lg">
                <div>
                    <div class="font-bold">${g.title}</div>
                    <div class="text-xs text-gray-400">${g.platform} | Tags: ${g.tags ? g.tags.join(', ') : 'ninguno'}</div>
                </div>
            </div>
            <div class="flex gap-2">
                <button onclick="moveFandub('${g.id}', 'up')" class="bg-gray-700 text-white p-2 rounded-lg hover:bg-gray-600"><i class="fa-solid fa-arrow-up"></i></button>
                <button onclick="moveFandub('${g.id}', 'down')" class="bg-gray-700 text-white p-2 rounded-lg hover:bg-gray-600"><i class="fa-solid fa-arrow-down"></i></button>
                <button onclick="editFandub('${g.id}')" class="bg-blue-700 text-white p-2 rounded-lg hover:bg-blue-800"><i class="fa-solid fa-pen"></i></button>
                <button onclick="deleteFandub('${g.id}')" class="bg-red-800 text-white p-2 rounded-lg hover:bg-red-700"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}
async function moveFandub(id, direction) {
    const index = currentFandubs.findIndex(f => f.id === id);
    if (index === -1) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= currentFandubs.length) return;
    const tempOrder = currentFandubs[index].order;
    currentFandubs[index].order = currentFandubs[newIndex].order;
    currentFandubs[newIndex].order = tempOrder;
    const idsOrdered = [...currentFandubs].sort((a,b) => a.order - b.order).map(f => f.id);
    try {
        await authFetch(`${API_URL}/api/admin/games/order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: idsOrdered })
        });
        showToast('Orden actualizado', 'success');
        loadFandubs();
    } catch(e) { showToast('Error al reordenar', 'error'); }
}
document.getElementById('form-fandub')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('fan-id').value;
    const tagsRaw = document.getElementById('fan-tags').value;
    const tags = tagsRaw.split(',').map(t => t.trim()).filter(t => t);
    const data = {
        title: document.getElementById('fan-title').value,
        img: document.getElementById('fan-img').value,
        url: document.getElementById('fan-url').value,
        platform: document.getElementById('fan-platform').value,
        tags: tags
    };
    if (id) data.id = id;
    if (!id) data.order = currentFandubs.length;
    await authFetch(`${API_URL}/api/admin/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    document.getElementById('form-fandub').reset();
    document.getElementById('fan-id').value = '';
    document.getElementById('btn-cancel-fan').classList.add('hidden');
    showToast('Fandub guardado', 'success');
    loadFandubs();
});
window.editFandub = (id) => {
    const fan = currentFandubs.find(f => f.id === id);
    if (!fan) return;
    document.getElementById('fan-id').value = fan.id;
    document.getElementById('fan-title').value = fan.title;
    document.getElementById('fan-img').value = fan.img;
    document.getElementById('fan-url').value = fan.url;
    document.getElementById('fan-platform').value = fan.platform;
    document.getElementById('fan-tags').value = fan.tags ? fan.tags.join(', ') : '';
    document.getElementById('btn-cancel-fan').classList.remove('hidden');
    document.getElementById('form-fandub').scrollIntoView({ behavior: 'smooth' });
};
window.deleteFandub = async (id) => {
    if (!confirm('¿Eliminar doblaje?')) return;
    await authFetch(`${API_URL}/api/admin/games/${id}`, { method: 'DELETE' });
    showToast('Eliminado', 'success');
    loadFandubs();
};
document.getElementById('btn-cancel-fan')?.addEventListener('click', () => {
    document.getElementById('form-fandub').reset();
    document.getElementById('fan-id').value = '';
    document.getElementById('btn-cancel-fan').classList.add('hidden');
});
document.getElementById('search-fandubs')?.addEventListener('input', () => renderFandubsList());

// ========== CLANDESTINOS ==========
async function loadClandestine() {
    const res = await authFetch(`${API_URL}/api/clandestine`);
    currentClan = await res.json();
    renderClanList();
}
function renderClanList() {
    const searchTerm = document.getElementById('search-clan')?.value.toLowerCase() || '';
    const filtered = currentClan.filter(c => c.title.toLowerCase().includes(searchTerm));
    const container = document.getElementById('admin-clan-list');
    if (!container) return;
    container.innerHTML = filtered.map(c => `
        <div class="flex justify-between items-center bg-gray-800 p-4 rounded-2xl border border-gray-700">
            <div class="flex items-center gap-4">
                <img src="${c.img || 'https://via.placeholder.com/64'}" class="w-16 h-12 object-cover rounded-lg">
                <span class="font-bold">${c.title}</span>
            </div>
            <div class="flex gap-2">
                <button onclick="editClan('${c.id}')" class="bg-blue-700 text-white p-2 rounded-lg"><i class="fa-solid fa-pen"></i></button>
                <button onclick="deleteClan('${c.id}')" class="bg-red-800 text-white p-2 rounded-lg"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}
document.getElementById('form-clan')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('clan-id').value;
    const data = {
        title: document.getElementById('clan-title').value,
        img: document.getElementById('clan-img').value,
        html_content: document.getElementById('clan-html').value
    };
    if (id) data.id = id;
    await authFetch(`${API_URL}/api/admin/clandestine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    document.getElementById('form-clan').reset();
    document.getElementById('clan-id').value = '';
    document.getElementById('btn-cancel-clan').classList.add('hidden');
    showToast('Video guardado', 'success');
    loadClandestine();
});
window.editClan = (id) => {
    const clan = currentClan.find(c => c.id === id);
    if (!clan) return;
    document.getElementById('clan-id').value = clan.id;
    document.getElementById('clan-title').value = clan.title;
    document.getElementById('clan-img').value = clan.img || '';
    document.getElementById('clan-html').value = clan.html_content;
    document.getElementById('btn-cancel-clan').classList.remove('hidden');
    document.getElementById('form-clan').scrollIntoView({ behavior: 'smooth' });
};
window.deleteClan = async (id) => {
    if (!confirm('¿Eliminar video?')) return;
    await authFetch(`${API_URL}/api/admin/clandestine/${id}`, { method: 'DELETE' });
    showToast('Eliminado', 'success');
    loadClandestine();
};
document.getElementById('btn-cancel-clan')?.addEventListener('click', () => {
    document.getElementById('form-clan').reset();
    document.getElementById('clan-id').value = '';
    document.getElementById('btn-cancel-clan').classList.add('hidden');
});
document.getElementById('search-clan')?.addEventListener('input', () => renderClanList());

// ========== LINKS ==========
async function loadLinks() {
    const res = await authFetch(`${API_URL}/api/admin/links`);
    currentLinks = await res.json();
    renderLinksList();
}
function renderLinksList() {
    const searchTerm = document.getElementById('search-links')?.value.toLowerCase() || '';
    const filtered = currentLinks.filter(l => l.name.toLowerCase().includes(searchTerm));
    const container = document.getElementById('admin-links-list');
    if (!container) return;
    container.innerHTML = filtered.map(l => `
        <div class="flex justify-between items-center bg-gray-800 p-4 rounded-2xl border border-gray-700">
            <span class="font-semibold flex items-center gap-3"><i class="${l.icon} text-lg"></i> ${l.name}</span>
            <div class="flex gap-2">
                <button onclick="editLink('${l.id}')" class="bg-blue-700 text-white p-2 rounded-lg"><i class="fa-solid fa-pen"></i></button>
                <button onclick="deleteLink('${l.id}')" class="bg-red-800 text-white p-2 rounded-lg"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}
document.getElementById('form-link')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('link-id').value;
    const data = {
        name: document.getElementById('link-name').value,
        icon: document.getElementById('link-icon').value,
        url: document.getElementById('link-url').value
    };
    if (id) data.id = id;
    await authFetch(`${API_URL}/api/admin/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    document.getElementById('form-link').reset();
    document.getElementById('link-id').value = '';
    document.getElementById('btn-cancel-link').classList.add('hidden');
    showToast('Enlace guardado', 'success');
    loadLinks();
});
window.editLink = (id) => {
    const link = currentLinks.find(l => l.id === id);
    if (!link) return;
    document.getElementById('link-id').value = link.id;
    document.getElementById('link-name').value = link.name;
    document.getElementById('link-icon').value = link.icon;
    document.getElementById('link-url').value = link.url;
    document.getElementById('btn-cancel-link').classList.remove('hidden');
    document.getElementById('form-link').scrollIntoView({ behavior: 'smooth' });
};
window.deleteLink = async (id) => {
    if (!confirm('¿Eliminar enlace?')) return;
    await authFetch(`${API_URL}/api/admin/links/${id}`, { method: 'DELETE' });
    showToast('Eliminado', 'success');
    loadLinks();
};
document.getElementById('btn-cancel-link')?.addEventListener('click', () => {
    document.getElementById('form-link').reset();
    document.getElementById('link-id').value = '';
    document.getElementById('btn-cancel-link').classList.add('hidden');
});
document.getElementById('search-links')?.addEventListener('input', () => renderLinksList());

// ========== IMPORT / EXPORT ==========
function setupImportExport() {
    document.getElementById('export-data-btn')?.addEventListener('click', async () => {
        const data = { games: currentFandubs, clandestine: currentClan, links: currentLinks };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'anymoons_backup.json';
        a.click();
        URL.revokeObjectURL(url);
        showToast('Backup exportado', 'success');
    });
    document.getElementById('import-data-btn')?.addEventListener('click', () => {
        document.getElementById('import-file').click();
    });
    document.getElementById('import-file')?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const backup = JSON.parse(ev.target.result);
                await authFetch(`${API_URL}/api/admin/import`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(backup)
                });
                showToast('Importación exitosa, recargando...', 'success');
                setTimeout(() => location.reload(), 1500);
            } catch(err) {
                showToast('Archivo inválido', 'error');
            }
        };
        reader.readAsText(file);
    });
}