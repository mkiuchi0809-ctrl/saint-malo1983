/* ============================================================
   Saint Malo  Cloudflare Worker
   - 静的アセット配信（env.ASSETS）
   - /api/news : Facebookページの最新投稿（FB Graph API）
   - /api/menu : Googleスプレッドシートのメニュー（Sheets API・税込自動計算）
   - /api/img/<ファイル名> : Googleドライブの写真を配信（Drive API）

   トークン類は Cloudflare の環境変数（Secret）に保存。ブラウザには出さない。
   必要な変数:
     FB_PAGE_ID / FB_PAGE_TOKEN
     GOOGLE_SA_EMAIL / GOOGLE_SA_PRIVATE_KEY / SHEET_ID / SHEET_TAB / DRIVE_FOLDER_ID
   ============================================================ */

const FB_API_VERSION = 'v21.0';
const POST_LIMIT = 6;
const EDGE_CACHE_SEC = 600;     // FB/メニューのキャッシュ（10分）
const IMG_CACHE_SEC = 86400;    // 画像キャッシュ（1日）

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const p = url.pathname;

    if (p === '/api/news') return handleNews(request, env, ctx);
    if (p === '/api/menu') return handleMenu(request, env, ctx);
    if (p === '/api/img' || p === '/api/img/') return handleImgList(env);
    if (p.startsWith('/api/img/')) {
      return handleImg(env, ctx, decodeURIComponent(p.slice('/api/img/'.length)));
    }
    return env.ASSETS.fetch(request);
  }
};

/* ---------- 共通ヘルパ ---------- */
function json(obj, extra) {
  return new Response(JSON.stringify(obj), {
    status: 200,
    headers: Object.assign({
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'cache-control': 'public, max-age=300'
    }, extra || {})
  });
}

/* ============================================================
   Google サービスアカウント認証（JWT → アクセストークン）
   ============================================================ */
let _tokenCache = { token: null, exp: 0 };

async function getGoogleToken(env) {
  const now = Math.floor(Date.now() / 1000);
  if (_tokenCache.token && _tokenCache.exp - 60 > now) return _tokenCache.token;

  const scope = [
    'https://www.googleapis.com/auth/spreadsheets.readonly',
    'https://www.googleapis.com/auth/drive.readonly'
  ].join(' ');

  const enc = (obj) => b64url(new TextEncoder().encode(JSON.stringify(obj)));
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: env.GOOGLE_SA_EMAIL,
    scope: scope,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  };
  const unsigned = enc(header) + '.' + enc(claim);

  const key = await importPrivateKey(env.GOOGLE_SA_PRIVATE_KEY);
  const sigBuf = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned)
  );
  const jwt = unsigned + '.' + b64url(new Uint8Array(sigBuf));

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=' + jwt
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('google_token_failed: ' + JSON.stringify(data));

  _tokenCache = { token: data.access_token, exp: now + (data.expires_in || 3600) };
  return data.access_token;
}

async function importPrivateKey(pem) {
  if (!pem) throw new Error('no_private_key');
  pem = pem.replace(/\\n/g, '\n').trim();
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const bin = atob(body);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return crypto.subtle.importKey(
    'pkcs8', buf.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  );
}

function b64url(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/* ============================================================
   /api/menu  — スプレッドシートのメニューを取得
   ============================================================ */
async function handleMenu(request, env, ctx) {
  const reqUrl = new URL(request.url);
  const debug = reqUrl.searchParams.has('debug');
  const fresh = debug || reqUrl.searchParams.has('fresh');

  if (!env.GOOGLE_SA_EMAIL || !env.GOOGLE_SA_PRIVATE_KEY || !env.SHEET_ID) {
    return json({ ok: false, error: 'not_configured', items: [] });
  }
  const cache = caches.default;
  const cacheKey = new Request('https://cache.local/api/menu');
  if (!fresh) {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  }

  try {
    const token = await getGoogleToken(env);

    // 実際のタブ名を取得（SHEET_TABが無効でも先頭シートにフォールバック）
    let titles = [], metaErr = null;
    try {
      const metaRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${env.SHEET_ID}?fields=sheets.properties.title`,
        { headers: { Authorization: 'Bearer ' + token } });
      const meta = await metaRes.json();
      metaErr = meta.error ? (meta.error.message || 'meta_error') : null;
      titles = (meta.sheets || []).map(s => s.properties && s.properties.title).filter(Boolean);
    } catch (e) { metaErr = String((e && e.message) || e); }

    const wanted = env.SHEET_TAB || 'メニュー';
    const tab = titles.indexOf(wanted) >= 0 ? wanted : (titles[0] || wanted);

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${env.SHEET_ID}/values/${encodeURIComponent(tab)}`;
    const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
    const data = await res.json();

    if (debug) {
      return json({
        debug: true, titles: titles, wantedTab: wanted, tabUsed: tab,
        metaError: metaErr, valueError: data.error || null,
        rowCount: (data.values || []).length, header: (data.values || [])[0] || null
      });
    }

    if (!data.values || !data.values.length) {
      return json({ ok: false, error: (data.error && data.error.message) || 'no_values', items: [], titles: titles, tabUsed: tab });
    }

    const rows = data.values;
    const head = rows[0].map(h => (h || '').replace(/\s/g, ''));
    const col = (kw) => head.findIndex(h => h.indexOf(kw) >= 0);
    const ci = {
      cat: col('カテゴリ'), name: col('名前'), price: col('価格'),
      desc: col('説明'), img: col('写真'), show: col('表示'),
      rec: col('おすすめ'), days: col('曜日')
    };

    const items = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i]; if (!r) continue;
      const name = (r[ci.name] || '').trim();
      if (!name) continue;
      const show = (r[ci.show] || '').trim();
      if (show !== '○' && show !== '〇') continue; // 空欄/×は非表示

      const raw = parseInt(String(r[ci.price] || '').replace(/[^0-9]/g, ''), 10);
      const taxIncl = isNaN(raw) ? null : Math.round(raw * 1.1);
      const recNum = parseInt(String(r[ci.rec] || '').replace(/[^0-9]/g, ''), 10);
      const daysStr = (r[ci.days] || '').trim();
      const days = daysStr ? daysStr.split(/[\s,、]*/).join('').split('').filter(c => '日月火水木金土'.indexOf(c) >= 0) : [];

      items.push({
        category: (r[ci.cat] || '').trim(),
        name: name,
        price: taxIncl,
        priceRaw: isNaN(raw) ? null : raw,
        desc: (r[ci.desc] || '').trim(),
        img: (r[ci.img] || '').trim(),
        rec: isNaN(recNum) ? null : recNum,
        days: days
      });
    }

    const out = json({ ok: true, items: items, generatedAt: new Date().toISOString() },
      { 'cache-control': `public, max-age=${EDGE_CACHE_SEC}` });
    ctx.waitUntil(cache.put(cacheKey, out.clone()));
    return out;
  } catch (err) {
    return json({ ok: false, error: String(err && err.message || err), items: [] });
  }
}

/* ============================================================
   /api/img  — ドライブフォルダ内のファイル名一覧（診断用）
   ============================================================ */
async function handleImgList(env) {
  if (!env.GOOGLE_SA_EMAIL || !env.DRIVE_FOLDER_ID) {
    return json({ ok: false, error: 'not_configured', files: [] });
  }
  try {
    const token = await getGoogleToken(env);
    const q = "'" + env.DRIVE_FOLDER_ID + "' in parents and trashed=false";
    const url = 'https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(q)
      + '&fields=files(name,mimeType)&pageSize=200';
    const r = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
    const d = await r.json();
    return json({
      ok: !d.error, error: d.error ? (d.error.message || 'drive_error') : null,
      count: (d.files || []).length, files: (d.files || []).map(function (f) { return f.name; })
    });
  } catch (e) {
    return json({ ok: false, error: String((e && e.message) || e), files: [] });
  }
}

/* ============================================================
   /api/img/<ファイル名>  — ドライブの写真を配信
   ============================================================ */
async function handleImg(env, ctx, name) {
  if (!env.GOOGLE_SA_EMAIL || !env.DRIVE_FOLDER_ID || !name) {
    return new Response('not found', { status: 404 });
  }
  const cache = caches.default;
  const cacheKey = new Request('https://cache.local/api/img/' + encodeURIComponent(name));
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  try {
    const token = await getGoogleToken(env);
    const safe = name.replace(/'/g, "\\'");
    const q = `'${env.DRIVE_FOLDER_ID}' in parents and name='${safe}' and trashed=false`;
    const listUrl = 'https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(q) + '&fields=files(id,mimeType,name)';
    const lr = await fetch(listUrl, { headers: { Authorization: 'Bearer ' + token } });
    const ld = await lr.json();
    const file = ld.files && ld.files[0];
    if (!file) return new Response('not found', { status: 404 });

    const mr = await fetch('https://www.googleapis.com/drive/v3/files/' + file.id + '?alt=media',
      { headers: { Authorization: 'Bearer ' + token } });
    const resp = new Response(mr.body, {
      status: 200,
      headers: {
        'content-type': file.mimeType || 'image/jpeg',
        'cache-control': `public, max-age=${IMG_CACHE_SEC}`,
        'access-control-allow-origin': '*'
      }
    });
    ctx.waitUntil(cache.put(cacheKey, resp.clone()));
    return resp;
  } catch (err) {
    return new Response('error', { status: 500 });
  }
}

/* ============================================================
   /api/news  — Facebookページの最新投稿
   ============================================================ */
async function handleNews(request, env, ctx) {
  if (!env.FB_PAGE_ID || !env.FB_PAGE_TOKEN) {
    return json({ ok: false, error: 'not_configured', posts: [] });
  }
  const cache = caches.default;
  const cacheKey = new Request('https://cache.local/api/news');
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  try {
    const fields = 'id,message,story,created_time,full_picture,permalink_url';
    const api = `https://graph.facebook.com/${FB_API_VERSION}/${encodeURIComponent(env.FB_PAGE_ID)}/posts`
      + `?fields=${fields}&limit=${POST_LIMIT}&access_token=${encodeURIComponent(env.FB_PAGE_TOKEN)}`;
    const res = await fetch(api, { cf: { cacheTtl: EDGE_CACHE_SEC } });
    const data = await res.json();
    if (data.error) return json({ ok: false, error: data.error.message || 'fb_error', posts: [] });

    const posts = (data.data || [])
      .filter(p => (p.message && p.message.trim()) || p.story || p.full_picture)
      .map(p => ({
        id: p.id, message: p.message || p.story || '',
        date: p.created_time || null, image: p.full_picture || null, link: p.permalink_url || null
      }));

    const out = json({ ok: true, posts: posts }, { 'cache-control': `public, max-age=${EDGE_CACHE_SEC}` });
    ctx.waitUntil(cache.put(cacheKey, out.clone()));
    return out;
  } catch (err) {
    return json({ ok: false, error: 'fetch_failed', posts: [] });
  }
}
