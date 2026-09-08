async function loadVideo() {
    const params = new URLSearchParams(window.location.search);
    const videoId = params.get('id');

    const wrapper = document.getElementById('video-wrapper');
    const titleEl = document.getElementById('video-title');

    if (!videoId) {
        wrapper.classList.remove('animate-pulse');
        wrapper.innerHTML = '<p class="absolute inset-0 flex items-center justify-center text-gray-400">No se especificó ningún video.</p>';
        titleEl.textContent = "Error";
        return;
    }

    try {
        const res = await fetch(`${API_URL}/api/clandestine`);
        if (!res.ok) throw new Error();
        const videos = await res.json();

        const video = videos.find(v => v.id === videoId);

        wrapper.classList.remove('animate-pulse');

        if (video) {
            titleEl.textContent = video.title;
            const sanitized = sanitizeHtml(video.html_content);
            wrapper.innerHTML = `<div class="video-container">${sanitized}</div>`;
        } else {
            wrapper.innerHTML = '<p class="absolute inset-0 flex items-center justify-center text-gray-400">El video no existe o fue eliminado.</p>';
            titleEl.textContent = "No encontrado";
        }

    } catch(e) {
        wrapper.classList.remove('animate-pulse');
        wrapper.innerHTML = '<p class="absolute inset-0 flex items-center justify-center text-red-400">Error de conexión con el servidor.</p>';
        titleEl.textContent = "Error";
    }
}

function sanitizeHtml(str) {
    if (!str) return '';
    const allowed = str.match(/<iframe[^>]*src="[^"]*"[^>]*><\/iframe>/gi);
    if (!allowed) return '';
    return allowed[0];
}

document.addEventListener('DOMContentLoaded', loadVideo);
