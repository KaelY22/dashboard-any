let currentFandubs = [];
let activeTag = null;

const avatarImg = document.getElementById('avatar-img');
function setAvatarWithLoading(url) {
    if (!url) {
        avatarImg.src = 'https://ui-avatars.com/api/?name=Any+Moon&background=1e1e2a&color=ffffff&bold=true&size=128';
        return;
    }
    const tempImg = new Image();
    tempImg.onload = () => { avatarImg.src = url; };
    tempImg.onerror = () => {
        avatarImg.src = 'https://ui-avatars.com/api/?name=Any+Moon&background=1e1e2a&color=ffffff&size=128';
    };
    tempImg.src = url;
}

async function loadGlobalAvatar() {
    try {
        const res = await fetch(`${API_URL}/api/avatar`);
        if (res.ok) {
            const data = await res.json();
            setAvatarWithLoading(data.url);
        } else { setAvatarWithLoading(null); }
    } catch(e) { setAvatarWithLoading(null); }
}

function renderFilters() {
    const allTags = new Set();
    currentFandubs.forEach(item => {
        if (item.tags && Array.isArray(item.tags)) {
            item.tags.forEach(tag => allTags.add(tag));
        }
    });
    const filtersContainer = document.getElementById('filters-container');
    if (!filtersContainer) return;
    if (allTags.size === 0) {
        filtersContainer.innerHTML = '<span class="text-gray-500 text-sm">Sin etiquetas aún</span>';
        return;
    }
    filtersContainer.innerHTML = `
        <button class="filter-tag ${activeTag === null ? 'active' : ''}" data-tag="">✨ Todos</button>
        ${Array.from(allTags).map(tag => `<button class="filter-tag ${activeTag === tag ? 'active' : ''}" data-tag="${tag}">#${tag}</button>`).join('')}
    `;
    document.querySelectorAll('.filter-tag').forEach(btn => {
        btn.addEventListener('click', (e) => {
            activeTag = btn.getAttribute('data-tag') || null;
            renderFandubs();
            renderFilters();
        });
    });
}

async function renderFandubs() {
    const container = document.getElementById('fandubs-container');
    if (!container) return;
    if (currentFandubs.length === 0) {
        container.innerHTML = '<div class="col-span-full text-center py-8"><i class="fa-solid fa-spinner fa-spin text-2xl text-gray-500"></i></div>';
        try {
            const res = await fetch(`${API_URL}/api/games`);
            if (!res.ok) throw new Error();
            currentFandubs = await res.json();
            renderFilters();
        } catch(e) {
            container.innerHTML = '<div class="col-span-full text-red-400">Error cargando fandubs.</div>';
            return;
        }
    }
    let items = currentFandubs;
    if (activeTag) {
        items = items.filter(item => item.tags && item.tags.includes(activeTag));
    }
    if (!items.length) {
        container.innerHTML = '<div class="col-span-full text-center py-12 text-gray-400">✨ No hay fandubs con este tag aún.</div>';
        return;
    }
    container.innerHTML = items.map(item => `
        <article class="glass-card overflow-hidden flex flex-col p-5 rounded-2xl h-full transition-all">
            <div class="relative w-full aspect-video overflow-hidden rounded-xl mb-4 bg-gray-900/50">
                <img src="${item.img}" alt="${item.title}" class="w-full h-full object-cover transition duration-500 hover:scale-105" loading="lazy">
                <span class="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-xs px-3 py-1 rounded-full font-medium">${item.platform || 'Media'}</span>
            </div>
            <h3 class="font-bold text-xl mb-3 line-clamp-2">${item.title}</h3>
            <a href="${item.url}" target="_blank" class="btn-black mt-auto text-center py-3 rounded-xl font-semibold flex items-center justify-center gap-2 group">
                Ver video <i class="fa-solid fa-arrow-right group-hover:translate-x-1 transition"></i>
            </a>
        </article>
    `).join('');
}

async function renderClandestine() {
    const container = document.getElementById('clandestine-container');
    if (!container) return;
    container.innerHTML = '<div class="col-span-full text-center py-8"><i class="fa-solid fa-spinner fa-spin text-2xl text-gray-500"></i></div>';
    try {
        const res = await fetch(`${API_URL}/api/clandestine`);
        if (!res.ok) throw new Error();
        const videos = await res.json();
        if (!videos.length) {
            container.innerHTML = '<div class="col-span-full text-center py-12 text-gray-400">📭 Pronto más contenido secreto.</div>';
            return;
        }
        container.innerHTML = videos.map(vid => `
            <a href="video.html?id=${encodeURIComponent(vid.id)}" class="glass-card clan-card p-0 overflow-hidden block group">
                <div class="relative aspect-video w-full clan-thumb">
                    <img src="${vid.img || 'https://placehold.co/640x360/1e1e2a/ffffff?text=Próximamente'}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy">
                    <div class="clan-overlay">
                        <div class="play-icon">
                            <i class="fa-solid fa-play ml-1"></i>
                        </div>
                    </div>
                </div>
                <div class="p-4">
                    <h3 class="font-bold text-lg line-clamp-2">${escHtml(vid.title)}</h3>
                </div>
            </a>
        `).join('');
    } catch(e) {
        container.innerHTML = '<div class="col-span-full text-center py-8 text-red-400">Error cargando contenido clandestino.</div>';
    }
}

function escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
}

async function renderLinks() {
    const container = document.getElementById('links-container');
    if (!container) return;
    container.innerHTML = '<div class="text-center py-4"><i class="fa-solid fa-spinner fa-spin text-xl text-gray-500"></i></div>';
    try {
        const res = await fetch(`${API_URL}/api/links`);
        if (!res.ok) throw new Error();
        const links = await res.json();
        if (!links.length) {
            container.innerHTML = '<div class="text-center text-gray-400 py-4">🌐 Pronto más redes.</div>';
            return;
        }
        const colorMap = {
            'YouTube': '#FF0000',
            'Twitter': '#1DA1F2',
            'X': '#1DA1F2',
            'Instagram': '#E4405F',
            'TikTok': '#000000',
            'Twitch': '#9146FF',
            'Spotify': '#1DB954',
            'Apple Music': '#FA233B',
            'SoundCloud': '#FF5500',
            'Discord': '#5865F2',
            'GitHub': '#181717',
            'Ko-fi': '#FF5E5B',
            'Patreon': '#FF424D'
        };
        const getColor = (name) => {
            const found = Object.keys(colorMap).find(key => name.toLowerCase().includes(key.toLowerCase()));
            return found ? colorMap[found] : '#6b7280';
        };
        container.innerHTML = links.map(link => {
            const color = getColor(link.name);
            return `
                <a href="${link.url}" target="_blank" class="social-link flex items-center justify-between p-3 rounded-xl transition-all" style="border-left-color: ${color};">
                    <div class="flex items-center gap-3">
                        <div class="platform-icon" style="background: ${color}20; color: ${color};">
                            <i class="${link.icon}"></i>
                        </div>
                        <span class="font-medium">${escHtml(link.name)}</span>
                    </div>
                    <i class="fa-solid fa-arrow-right text-gray-500 transition group-hover:text-cyan-300"></i>
                </a>
            `;
        }).join('');
    } catch(e) {
        container.innerHTML = '<div class="text-center py-4 text-red-400">Error cargando redes.</div>';
    }
}

async function renderDiscordWidget() {
    const container = document.getElementById('discord-widget-custom');
    if (!container) return;

    container.innerHTML = `
        <div class="text-center py-4 text-gray-400 flex items-center gap-3">
            <i class="fa-solid fa-spinner fa-spin text-indigo-400"></i> Cargando servidor...
        </div>
    `;

    try {
        const res = await fetch('https://discord.com/api/guilds/1522685328157184020/widget.json');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();

        if (!data || !data.name) {
            container.innerHTML = `
                <div class="text-center py-6 text-gray-400">
                    <i class="fa-brands fa-discord text-5xl block mb-4 opacity-30"></i>
                    <p class="text-sm">El servidor no tiene el widget activado.</p>
                    <a href="https://discord.gg/tu-invitacion" target="_blank" class="btn-black inline-block mt-4 px-6 py-2.5 rounded-xl font-semibold">
                        <i class="fa-solid fa-right-to-bracket mr-2"></i> Unirse al servidor
                    </a>
                </div>
            `;
            return;
        }

        const serverName = data.name;
        const inviteUrl = data.instant_invite || 'https://discord.gg/3PzDFnpTs6';
        const members = data.members || [];
        const onlineCount = members.length;

        const maxAvatars = 12;
        const visibleMembers = members.slice(0, maxAvatars);
        const extraCount = members.length - maxAvatars;

        let avatarsHtml = '';
        if (visibleMembers.length === 0) {
            avatarsHtml = `<span class="text-gray-500 text-sm">No hay miembros en línea ahora</span>`;
        } else {
            avatarsHtml = visibleMembers.map(m => {
                const avatarUrl = m.avatar_url;
                if (avatarUrl) {
                    return `<img src="${avatarUrl}" alt="${escHtml(m.username)}" class="w-9 h-9 rounded-full border-2 border-indigo-500/40 shadow-lg hover:scale-110 hover:border-indigo-400 transition-all duration-200" title="${escHtml(m.username)}">`;
                } else {
                    const initial = m.username ? m.username.charAt(0).toUpperCase() : '?';
                    return `<div class="w-9 h-9 rounded-full bg-gray-700 border-2 border-gray-600 flex items-center justify-center text-xs font-bold text-gray-300 hover:scale-110 transition-all">${initial}</div>`;
                }
            }).join('');

            if (extraCount > 0) {
                avatarsHtml += `<span class="text-xs text-gray-400 px-2">+${extraCount} más</span>`;
            }
        }

        container.innerHTML = `
            <div class="discord-widget-container flex flex-col md:flex-row items-center gap-4 p-4 rounded-2xl transition-all">
                <div class="flex-shrink-0">
                    <div class="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-600/30 to-purple-600/30 flex items-center justify-center text-2xl border-2 border-indigo-400/50 shadow-lg shadow-indigo-500/30">
                        <i class="fa-brands fa-discord text-indigo-300"></i>
                    </div>
                </div>

                <div class="flex-1 text-center md:text-left">
                    <div class="flex items-center justify-center md:justify-start gap-3 flex-wrap">
                        <h3 class="text-base md:text-lg font-bold">${escHtml(serverName)}</h3>
                        <span class="text-xs bg-green-500/20 text-green-400 px-3 py-0.5 rounded-full font-medium flex items-center gap-1">
                            <span class="online-dot inline-block w-2 h-2 rounded-full animate-pulse"></span>
                            ${onlineCount} online
                        </span>
                    </div>
                    <div class="flex flex-wrap gap-2 mt-2 justify-center md:justify-start">
                        ${avatarsHtml}
                    </div>
                </div>

                <div class="flex-shrink-0">
                    <a href="${inviteUrl}" target="_blank" class="btn-discord px-5 py-2 rounded-xl font-bold flex items-center gap-2 text-sm md:text-base">
                        <i class="fa-solid fa-right-to-bracket"></i> Unirse
                    </a>
                </div>
            </div>
        `;
    } catch (error) {
        container.innerHTML = `
            <div class="text-center py-6 text-red-400/60">
                <i class="fa-solid fa-triangle-exclamation text-3xl block mb-3"></i>
                <p class="text-sm">No se pudo cargar el estado del servidor.</p>
                <a href="https://discord.gg/tu-invitacion" target="_blank" class="text-indigo-400 hover:underline mt-2 inline-block font-medium">
                    Únete directamente aquí <i class="fa-solid fa-arrow-right ml-1"></i>
                </a>
            </div>
        `;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadGlobalAvatar();
    renderFandubs();
    renderClandestine();
    renderLinks();
    renderDiscordWidget();
});
