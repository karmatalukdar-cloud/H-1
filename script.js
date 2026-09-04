/* ============================================================
   CONFIG — read the note in chat: you must add this exact
   redirect URI to your app at developer.spotify.com/dashboard
   ============================================================ */
const CLIENT_ID = "fd3494ecff284faaaab838996b9d387b";
const REDIRECT_URI = window.location.origin + window.location.pathname;
const SCOPES = "playlist-modify-public playlist-modify-private user-read-private user-read-email";

/* ---------------- loading screen messages ---------------- */
const loveMessages = [
  "she's the prettiest girl to ever open a webpage",
  "loading… almost as beautiful as you, almost",
  "one second, gathering songs worthy of you",
  "hi Harshita. yes, this whole thing is for you",
  "you make ordinary days feel like a favorite song",
  "putting this together with the same care you deserve",
  "still loading, still thinking about how lucky I am"
];
const msgEl = document.getElementById('loading-msg');
let mi = 0;
function cycleMsg(){
  msgEl.style.animation = 'none';
  void msgEl.offsetWidth;
  msgEl.textContent = loveMessages[mi % loveMessages.length];
  msgEl.style.animation = 'fadeMsg 3.4s ease-in-out infinite';
  mi++;
}
cycleMsg();
const msgInterval = setInterval(cycleMsg, 3400);

/* ---------------- PKCE helpers ---------------- */
function base64url(buf){
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
async function sha256(str){
  const data = new TextEncoder().encode(str);
  return await crypto.subtle.digest('SHA-256', data);
}
function randomString(len){
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return base64url(arr.buffer).slice(0, len);
}

async function startAuth(){
  const verifier = randomString(64);
  sessionStorage.setItem('pkce_verifier', verifier);
  const challenge = base64url(await sha256(verifier));
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: challenge
  });
  window.location.href = 'https://accounts.spotify.com/authorize?' + params.toString();
}

async function exchangeCodeForToken(code){
  const verifier = sessionStorage.getItem('pkce_verifier');
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: verifier
  });
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {'Content-Type':'application/x-www-form-urlencoded'},
    body
  });
  if(!res.ok) throw new Error('Token exchange failed');
  const data = await res.json();
  localStorage.setItem('sp_access_token', data.access_token);
  localStorage.setItem('sp_refresh_token', data.refresh_token || '');
  localStorage.setItem('sp_token_expiry', Date.now() + (data.expires_in*1000));
}

async function refreshToken(){
  const refresh = localStorage.getItem('sp_refresh_token');
  if(!refresh) return false;
  const body = new URLSearchParams({
    grant_type:'refresh_token',
    refresh_token: refresh,
    client_id: CLIENT_ID
  });
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body
  });
  if(!res.ok) return false;
  const data = await res.json();
  localStorage.setItem('sp_access_token', data.access_token);
  if(data.refresh_token) localStorage.setItem('sp_refresh_token', data.refresh_token);
  localStorage.setItem('sp_token_expiry', Date.now() + (data.expires_in*1000));
  return true;
}

async function getValidToken(){
  const expiry = Number(localStorage.getItem('sp_token_expiry') || 0);
  if(Date.now() > expiry - 30000){
    const ok = await refreshToken();
    if(!ok) return null;
  }
  return localStorage.getItem('sp_access_token');
}

async function spotifyFetch(url, opts={}){
  const token = await getValidToken();
  if(!token) throw new Error('not authenticated');
  const res = await fetch(url, {
    ...opts,
    headers:{
      ...(opts.headers||{}),
      Authorization: 'Bearer ' + token
    }
  });
  if(res.status === 401){
    localStorage.removeItem('sp_access_token');
    throw new Error('token expired');
  }
  return res;
}

/* ---------------- moods -> curated seed pool ---------------- */
const ARTIST_POOL = ["ASAP Rocky","Drake","Travis Scott","Kanye West","Daniel Caesar","The 1975","SZA","Frank Ocean","Bryson Tiller","H.E.R.","6LACK","Jhene Aiko","PARTYNEXTDOOR","Tyler The Creator","Kid Cudi","Post Malone"];
const RETRO_POOL = ["Whitney Houston","Prince","Michael Jackson","Toni Braxton","TLC","Mariah Carey","Boyz II Men","George Michael","Sade","Tears for Fears","No Doubt","Backstreet Boys","Aaliyah","Lauryn Hill"];

const MOODS = [
  { key:"happy", emoji:"✨", label:"Happy & glowing", query:["feel good", "upbeat"], eras:['now','retro'] },
  { key:"inlove", emoji:"💗", label:"In love / soft", query:["love songs", "romantic r&b"], eras:['now'] },
  { key:"missing", emoji:"🌙", label:"Missing someone", query:["missing you", "longing"], eras:['now','retro'] },
  { key:"sad", emoji:"🖤", label:"A little sad", query:["sad r&b", "heartbreak"], eras:['now'] },
  { key:"chill", emoji:"🌸", label:"Chill / relaxed", query:["chill r&b", "mellow"], eras:['now','retro'] },
  { key:"hype", emoji:"🔥", label:"Hype / confident", query:["hype rap", "confident"], eras:['now'] },
  { key:"nostalgic", emoji:"📼", label:"Nostalgic", query:["90s r&b", "80s pop"], eras:['retro'] },
  { key:"dreamy", emoji:"🌊", label:"Dreamy / lost in thought", query:["dreamy", "atmospheric"], eras:['now'] }
];

const grid = document.getElementById('mood-grid');
let selectedMood = null;
MOODS.forEach(m=>{
  const card = document.createElement('div');
  card.className = 'mood-card';
  card.innerHTML = `<span class="emoji">${m.emoji}</span><span class="label">${m.label}</span>`;
  card.addEventListener('click', ()=>{
    document.querySelectorAll('.mood-card').forEach(c=>c.classList.remove('active'));
    card.classList.add('active');
    selectedMood = m;
    document.getElementById('custom-mood').value = '';
  });
  grid.appendChild(card);
});

/* ---------------- building state messages ---------------- */
const buildMsgs = [
  "reading through what you're feeling…",
  "pulling songs that match your mood…",
  "picking covers that feel right…",
  "arranging the order so it flows…",
  "almost done, love…"
];
let buildInterval;
function startBuildingMsgs(){
  const el = document.getElementById('building-msg');
  let i=0;
  el.textContent = buildMsgs[0];
  buildInterval = setInterval(()=>{
    i = (i+1)%buildMsgs.length;
    el.style.opacity = 0;
    setTimeout(()=>{ el.textContent = buildMsgs[i]; el.style.opacity = 1; }, 250);
  }, 1400);
}
function stopBuildingMsgs(){ clearInterval(buildInterval); }

/* ---------------- search + playlist creation ---------------- */
async function searchTracks(query, limit=6){
  const url = 'https://api.spotify.com/v1/search?' + new URLSearchParams({
    q: query, type:'track', limit: String(limit)
  });
  const res = await spotifyFetch(url);
  if(!res.ok) return [];
  const data = await res.json();
  return data.tracks ? data.tracks.items : [];
}

async function buildTrackPool(mood){
  const artistPool = [...ARTIST_POOL];
  if(mood.eras.includes('retro')) artistPool.push(...RETRO_POOL);
  // shuffle and take a subset of artists to query against the mood keyword
  const shuffled = artistPool.sort(()=>Math.random()-0.5).slice(0, 9);
  const seenIds = new Set();
  const results = [];
  const moodWord = mood.query[Math.floor(Math.random()*mood.query.length)];
  for(const artist of shuffled){
    const tracks = await searchTracks(`${moodWord} artist:"${artist}"`, 4);
    for(const t of tracks){
      if(!seenIds.has(t.id) && t.album && t.album.images && t.album.images.length){
        seenIds.add(t.id);
        results.push(t);
      }
    }
    if(results.length >= 24) break;
  }
  // fallback: broaden search if too few results
  if(results.length < 10){
    const fallback = await searchTracks(moodWord, 20);
    for(const t of fallback){
      if(!seenIds.has(t.id) && t.album && t.album.images && t.album.images.length){
        seenIds.add(t.id);
        results.push(t);
      }
    }
  }
  return results.sort(()=>Math.random()-0.5).slice(0, 18);
}

async function createSpotifyPlaylist(mood, customText, tracks){
  const meRes = await spotifyFetch('https://api.spotify.com/v1/me');
  const me = await meRes.json();
  const title = customText
    ? `for Harshita — ${customText.slice(0,40)}`
    : `for Harshita — feeling ${mood.label.toLowerCase()}`;
  const desc = customText
    ? `Made for Harshita, in the mood: "${customText}". Built with love.`
    : `Made for Harshita when she's feeling ${mood.label.toLowerCase()}. Built with love.`;

  const createRes = await spotifyFetch(`https://api.spotify.com/v1/users/${me.id}/playlists`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ name: title, description: desc, public: false })
  });
  const playlist = await createRes.json();

  const uris = tracks.map(t=>t.uri);
  for(let i=0; i<uris.length; i+=100){
    await spotifyFetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ uris: uris.slice(i, i+100) })
    });
  }
  return { playlist, title, desc };
}

/* ---------------- UI wiring ---------------- */
document.getElementById('connect-btn').addEventListener('click', startAuth);

document.getElementById('generate-btn').addEventListener('click', async ()=>{
  const customText = document.getElementById('custom-mood').value.trim();
  const errorBox = document.getElementById('error-box');
  errorBox.classList.remove('show');

  let mood = selectedMood;
  if(!mood && customText){
    mood = MOODS.find(m=> customText.toLowerCase().includes(m.key)) || MOODS[3];
  }
  if(!mood){
    errorBox.textContent = "pick a mood or tell me how you're feeling first 🤍";
    errorBox.classList.add('show');
    return;
  }

  document.getElementById('mood-section').classList.remove('show');
  document.getElementById('building').classList.add('show');
  startBuildingMsgs();

  try{
    const tracks = await buildTrackPool(mood);
    if(tracks.length === 0) throw new Error('No tracks found for this mood — try another.');
    const { playlist, title, desc } = await createSpotifyPlaylist(mood, customText, tracks);
    renderResult(mood, playlist, title, desc, tracks);
  }catch(err){
    console.error(err);
    errorBox.textContent = "something went wrong reaching Spotify — try connecting again or pick another mood.";
    errorBox.classList.add('show');
    document.getElementById('mood-section').classList.add('show');
  }finally{
    stopBuildingMsgs();
    document.getElementById('building').classList.remove('show');
  }
});

document.getElementById('remake-btn').addEventListener('click', ()=>{
  document.getElementById('result').classList.remove('show');
  document.getElementById('mood-section').classList.add('show');
  document.querySelectorAll('.mood-card').forEach(c=>c.classList.remove('active'));
  selectedMood = null;
  document.getElementById('custom-mood').value = '';
});

function renderResult(mood, playlist, title, desc, tracks){
  document.getElementById('mood-echo').textContent = 'FOR ' + mood.label.toUpperCase();
  document.getElementById('playlist-title').textContent = title;
  document.getElementById('playlist-desc').textContent = desc;
  document.getElementById('open-spotify-btn').href = playlist.external_urls.spotify;

  const collage = document.getElementById('cover-collage');
  collage.innerHTML = '';
  tracks.slice(0,4).forEach(t=>{
    const img = document.createElement('img');
    img.src = t.album.images[t.album.images.length>1?1:0].url;
    img.alt = t.album.name;
    collage.appendChild(img);
  });

  const list = document.getElementById('track-list');
  list.innerHTML = '';
  tracks.forEach(t=>{
    const li = document.createElement('li');
    const cover = t.album.images[t.album.images.length-1] ? t.album.images[t.album.images.length-1].url : (t.album.images[0]?t.album.images[0].url:'');
    const mins = Math.floor(t.duration_ms/60000);
    const secs = String(Math.floor((t.duration_ms%60000)/1000)).padStart(2,'0');
    li.innerHTML = `
      <img src="${cover}" alt="">
      <div class="track-info">
        <div class="t-name">${t.name}</div>
        <div class="t-artist">${t.artists.map(a=>a.name).join(', ')}</div>
      </div>
      <div class="t-dur">${mins}:${secs}</div>
    `;
    list.appendChild(li);
  });

  document.getElementById('result').classList.add('show');
}

/* ---------------- boot ---------------- */
async function boot(){
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');

  if(code){
    try{
      await exchangeCodeForToken(code);
      window.history.replaceState({}, document.title, REDIRECT_URI);
    }catch(e){
      console.error(e);
    }
  }

  const token = await getValidToken();
  if(token){
    document.getElementById('connect-view').style.display = 'none';
    document.getElementById('mood-section').classList.add('show');
    const statusEl = document.getElementById('auth-status');
    statusEl.textContent = 'connected';
    statusEl.classList.add('connected');
    try{
      const meRes = await spotifyFetch('https://api.spotify.com/v1/me');
      const me = await meRes.json();
      if(me.display_name){
        document.getElementById('auth-status').textContent = 'connected as ' + me.display_name;
      }
    }catch(e){}
  }

  setTimeout(()=>{
    clearInterval(msgInterval);
    document.getElementById('loading').classList.add('hide');
  }, 2600);
}
boot();