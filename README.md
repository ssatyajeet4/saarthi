# Shiksha Coach AI - Android Setup

## ⚠️ Critical: Microphone Requirements
Browsers **BLOCK** microphone access on insecure connections (like `http://192.168.x.x`).
To use this app on mobile, you must use **HTTPS** or **Localhost**.

## How to Run on Android

### Option 1: Deploy (Recommended)
1. Deploy this code to **Vercel** or **Netlify**.
2. Set your `API_KEY` in the deployment settings.
3. Open the secure link (`https://...`) on your phone.
4. Tap **Chrome Menu > Add to Home Screen**.

### Option 2: USB Debugging (Local Dev)
1. Connect Android phone to PC via USB.
2. Enable **USB Debugging** in Developer Options.
3. On PC Chrome, go to `chrome://inspect/#devices`.
4. Click **Port Forwarding**.
5. Add Rule: Port `5173` -> `localhost:5173`.
6. Run `npm run dev` on PC.
7. Open `http://localhost:5173` on your **phone**.
