# LYNX CHAT — Chat To Strangers (REAL PEOPLE)

Full working Omegle-style chat: real strangers, text + video + voice.
One deploy on Render = everything works (server serves the site too).

## What's inside
- `server.js` — Express + Socket.IO backend: matchmaking, text relay, typing indicators, WebRTC signaling (video/voice), online count
- `package.json` — dependencies
- `public/index.html` — the LYNX CHAT site (already wired to the server, no URL editing needed)

## Deploy on Render (free, from your iPad)
1. Go to **render.com** → sign up free (GitHub or email)
2. **New +** → **Web Service**
3. Choose **"Public Git repository"** OR upload via Render's dashboard (or push to GitHub first — easiest on iPad: create repo at github.com/new, upload these 3 files there, then connect it in Render)
4. Render detects Node automatically. Settings:
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Instance Type: **Free**
5. Click **Create Web Service** → wait ~2 minutes
6. You get a URL like `https://lynx-chat-abc.onrender.com`
7. Open that URL in two phones/tabs → click Find on both → you're connected to each other (text + video + voice)

## Important notes
- **Open the site from your Render URL**, not from the local file — the socket connects to the same origin.
- Free Render instances sleep after 15 min idle; first load takes ~30s to wake up.
- Video/voice uses WebRTC with Google's free STUN server. On strict networks it may fail — text always works.
- For more than 2 concurrent users, the queue handles it (matches one pair at a time).
- To add moderation / reporting / accounts, extend `server.js`.

## Local test (if you ever get a PC)
```bash
npm install
npm start
# open http://localhost:3000 in two tabs
```
