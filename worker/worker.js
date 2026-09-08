export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;
    
    // Headers CORS consistentes
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Password',
    };
    
    // Responder inmediatamente a OPTIONS
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    
    // Función auxiliar para responder con JSON y CORS
    function jsonResponse(data, status = 200) {
      return new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Función para comprobar autenticación (solo rutas admin)
    const isAdminRoute = url.pathname.startsWith('/api/admin');
    if (isAdminRoute) {
      const password = request.headers.get('X-Admin-Password');
      const correctPassword = env.ADMIN_PASSWORD || "admin";
      if (password !== correctPassword) {
        return jsonResponse({ error: 'No autorizado' }, 401);
      }
    }
    
    try {
      // ========== RUTAS PÚBLICAS ==========
      
      // Avatar público
      if (url.pathname === '/api/avatar' && method === 'GET') {
        const result = await env.DB.prepare("SELECT value FROM config WHERE key = 'avatar_url'").first();
        return jsonResponse({ url: result?.value || null });
      }
      
      // Fandubs públicos (ordenados)
      if (url.pathname === '/api/games' && method === 'GET') {
        const result = await env.DB.prepare('SELECT * FROM fandubs ORDER BY `order` ASC').all();
        const fandubs = result.results.map(f => ({
          ...f,
          tags: f.tags ? JSON.parse(f.tags) : []
        }));
        return jsonResponse(fandubs);
      }
      
      // Enlaces públicos
      if (url.pathname === '/api/links' && method === 'GET') {
        const result = await env.DB.prepare('SELECT * FROM links').all();
        return jsonResponse(result.results);
      }
      
      // Clandestinos públicos
      if (url.pathname === '/api/clandestine' && method === 'GET') {
        const result = await env.DB.prepare('SELECT * FROM clandestine').all();
        return jsonResponse(result.results);
      }
      
      // ========== RUTAS ADMIN ==========
      if (isAdminRoute) {
        
        // Avatar admin
        if (url.pathname === '/api/admin/avatar' && method === 'GET') {
          const result = await env.DB.prepare("SELECT value FROM config WHERE key = 'avatar_url'").first();
          return jsonResponse({ url: result?.value || null });
        }
        if (url.pathname === '/api/admin/avatar' && method === 'POST') {
          const { url: avatarUrl } = await request.json();
          await env.DB.prepare("INSERT OR REPLACE INTO config (key, value) VALUES ('avatar_url', ?)").bind(avatarUrl).run();
          return jsonResponse({ success: true, url: avatarUrl });
        }
        if (url.pathname === '/api/admin/avatar' && method === 'DELETE') {
          await env.DB.prepare("DELETE FROM config WHERE key = 'avatar_url'").run();
          return jsonResponse({ success: true });
        }
        
        // Fandubs admin (GET con tags)
        if (url.pathname === '/api/admin/games' && method === 'GET') {
          const result = await env.DB.prepare('SELECT * FROM fandubs ORDER BY `order` ASC').all();
          const fandubs = result.results.map(f => ({
            ...f,
            tags: f.tags ? JSON.parse(f.tags) : []
          }));
          return jsonResponse(fandubs);
        }
        
        // Crear/actualizar fandub
        if (url.pathname === '/api/admin/games' && method === 'POST') {
          const game = await request.json();
          const id = game.id || `f_${Date.now()}`;
          const order = game.order ?? 999;
          const tags = JSON.stringify(game.tags || []);
          await env.DB.prepare(`
            INSERT INTO fandubs (id, title, img, url, platform, \`order\`, tags) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET 
              title = excluded.title, img = excluded.img, url = excluded.url, 
              platform = excluded.platform, \`order\` = excluded.\`order\`, tags = excluded.tags
          `).bind(id, game.title, game.img, game.url, game.platform, order, tags).run();
          return jsonResponse({ success: true, id });
        }
        
        // Eliminar fandub
        if (url.pathname.match(/^\/api\/admin\/games\/[^\/]+$/) && method === 'DELETE') {
          const id = url.pathname.split('/').pop();
          await env.DB.prepare('DELETE FROM fandubs WHERE id = ?').bind(id).run();
          return jsonResponse({ success: true });
        }
        
        // Reordenar fandubs
        if (url.pathname === '/api/admin/games/order' && method === 'POST') {
          const { ids } = await request.json();
          for (let i = 0; i < ids.length; i++) {
            await env.DB.prepare('UPDATE fandubs SET `order` = ? WHERE id = ?').bind(i, ids[i]).run();
          }
          return jsonResponse({ success: true });
        }
        
        // Enlaces admin
        if (url.pathname === '/api/admin/links' && method === 'POST') {
          const link = await request.json();
          const id = link.id || `l_${Date.now()}`;
          await env.DB.prepare(`
            INSERT INTO links (id, name, icon, url) VALUES (?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET name = excluded.name, icon = excluded.icon, url = excluded.url
          `).bind(id, link.name, link.icon, link.url).run();
          return jsonResponse({ success: true, id });
        }
        
        if (url.pathname.match(/^\/api\/admin\/links\/[^\/]+$/) && method === 'DELETE') {
          const id = url.pathname.split('/').pop();
          await env.DB.prepare('DELETE FROM links WHERE id = ?').bind(id).run();
          return jsonResponse({ success: true });
        }
        
        // Clandestinos admin
        if (url.pathname === '/api/admin/clandestine' && method === 'POST') {
          const data = await request.json();
          const id = data.id || `c_${Date.now()}`;
          await env.DB.prepare(`
            INSERT INTO clandestine (id, title, img, html_content) VALUES (?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET title = excluded.title, img = excluded.img, html_content = excluded.html_content
          `).bind(id, data.title, data.img, data.html_content).run();
          return jsonResponse({ success: true, id });
        }
        
        if (url.pathname.match(/^\/api\/admin\/clandestine\/[^\/]+$/) && method === 'DELETE') {
          const id = url.pathname.split('/').pop();
          await env.DB.prepare('DELETE FROM clandestine WHERE id = ?').bind(id).run();
          return jsonResponse({ success: true });
        }
        
        // Importar datos
        if (url.pathname === '/api/admin/import' && method === 'POST') {
          const { games, clandestine, links } = await request.json();
          
          await env.DB.prepare('DELETE FROM fandubs').run();
          await env.DB.prepare('DELETE FROM links').run();
          await env.DB.prepare('DELETE FROM clandestine').run();
          
          for (const game of games) {
            const id = game.id || `f_${Date.now()}`;
            const order = game.order ?? 0;
            const tags = JSON.stringify(game.tags || []);
            await env.DB.prepare(`
              INSERT INTO fandubs (id, title, img, url, platform, \`order\`, tags) 
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `).bind(id, game.title, game.img, game.url, game.platform, order, tags).run();
          }
          for (const link of links) {
            const id = link.id || `l_${Date.now()}`;
            await env.DB.prepare(`
              INSERT INTO links (id, name, icon, url) VALUES (?, ?, ?, ?)
            `).bind(id, link.name, link.icon, link.url).run();
          }
          for (const clan of clandestine) {
            const id = clan.id || `c_${Date.now()}`;
            await env.DB.prepare(`
              INSERT INTO clandestine (id, title, img, html_content) VALUES (?, ?, ?, ?)
            `).bind(id, clan.title, clan.img, clan.html_content).run();
          }
          return jsonResponse({ success: true });
        }
      }
      
      return jsonResponse({ error: 'Ruta no encontrada' }, 404);
      
    } catch (error) {
      console.error(error);
      return jsonResponse({ error: 'Error interno del servidor', details: error.message }, 500);
    }
  }
}
