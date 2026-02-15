
# Shiksha Coach AI - Setup & Android Build

## 1. Local Setup
1. Run `npm install`
2. Run `npm run dev` to start the web server.

## 2. Converting to Android APK (Native)
This project is configured with **Capacitor** to run natively on Android.

### Prerequisites
*   Install **Android Studio** on your computer.

### Build Steps
1.  **Build Web Assets**:
    ```bash
    npm run build
    ```
2.  **Add Android Platform** (First time only):
    ```bash
    npx cap add android
    ```
3.  **Sync Changes**:
    ```bash
    npx cap sync
    ```
4.  **Open Android Studio**:
    ```bash
    npx cap open android
    ```
5.  **Generate APK**:
    *   In Android Studio, wait for Gradle to sync.
    *   Connect your Android phone via USB.
    *   Click the green **Play** button to install directly.
    *   OR go to **Build > Build Bundle(s) / APK(s) > Build APK** to get the file.

## 3. Web Usage (No APK)
If you just want to use it in Chrome on your phone:
1.  Deploy to Vercel/Netlify.
2.  Open the link (HTTPS is required for Microphone).
3.  The app now has a **Wake Lock** feature to keep the screen ON while studying.
