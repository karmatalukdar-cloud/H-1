# for Harshita 💗

A mood-based playlist generator — pick (or describe) a mood, and it builds a real
playlist directly on your Spotify account using live search results, then hands
you a link to open it in the Spotify app.

## Files

```
index.html   – markup
style.css    – all styling (black/pink theme, animations)
script.js    – Spotify auth (PKCE) + search + playlist creation logic
```

No build step, no dependencies, no server code — it's a static site.

## 1. Set up the Spotify app

1. Go to https://developer.spotify.com/dashboard and log in.
2. Open your app (the one with client ID `fd3494ecff284faaaab838996b9d387b`),
   or create a new one if you don't have it anymore.
3. Click **Settings**.
4. Under **Redirect URIs**, add the exact URL this site will be hosted at.
   You'll get that URL in step 3 below (Netlify) — come back and add it once
   you have it. It must match exactly, including `https://` and no trailing
   slash mismatch, e.g.:
   ```
   https://your-site-name.netlify.app/
   ```
5. Save.

## 2. Push to GitHub

```bash
cd harshita-playlist
git init
git add .
git commit -m "for Harshita"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

(Or just create a new repo on github.com and use "Add file → Upload files" to
drag these three files in — no terminal required.)

## 3. Deploy on Netlify

1. Go to https://app.netlify.com and log in (GitHub login is easiest).
2. **Add new site → Import an existing project → Deploy with GitHub**.
3. Pick the repo you just pushed.
4. Build settings: leave everything blank/default — there's no build command,
   the **publish directory** is the repo root (`.` or leave empty).
5. Click **Deploy**. Netlify gives you a URL like `https://random-name-123.netlify.app`.
   You can rename it under **Site settings → Change site name** to get something
   like `https://for-harshita.netlify.app`.
6. Copy that exact URL and go back to step 1 — add it to your Spotify app's
   Redirect URIs (with a trailing slash, matching whatever `window.location`
   will actually be).

## 4. Test it

Open your Netlify URL, click **Connect with Spotify**, log in, pick a mood.
The playlist gets created privately on the logged-in Spotify account and a
link appears to open it in the app.

## Notes

- Auth uses PKCE — no client secret needed, safe to run fully client-side.
- Playlists are created as **private** by default (change `public: false` to
  `true` in `script.js` inside `createSpotifyPlaylist` if you want them public).
- Tracks are pulled live from Spotify's search API each time, weighted toward
  the artist list in `script.js` (`ARTIST_POOL` / `RETRO_POOL`) — edit those
  arrays to tune the taste further.
