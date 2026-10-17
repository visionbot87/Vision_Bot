# Vision Bot — Website + Android app project

This repository contains the Vision Bot web app and an Android WebView wrapper in one place. Deploy the website first; then set the website's HTTPS URL in the Android project and build the APK.

## What is included

- `public/` — website interface, CSS, JavaScript, PWA manifest, service worker and app icon
- `server.js` — Node.js/Express server and Gemini API proxy
- `package.json` — website dependencies and run commands
- `.env.example` — example local server configuration; never upload your real `.env`
- `android/` — Android Studio project that opens the deployed website as an Android app
- `.github/workflows/build-android.yml` — GitHub Actions workflow to compile a debug APK and attach it to the workflow run

## Part A — upload the project to GitHub

1. Download and extract this ZIP.
2. Go to https://github.com/new and create a repository, e.g. `vision-bot`.
3. Keep the repository **Private** while you are learning and configuring it.
4. Upload the *contents* of this extracted folder to the repository's top level. Upload `public`, `android`, `.github`, `server.js`, `package.json`, `build.gradle` is inside `android/`, etc. Do not upload the ZIP as the only file.
5. Never upload a real `.env` file or a Gemini API key. `.gitignore` excludes `.env`.

## Part B — deploy the website online (Render)

1. Sign in at https://render.com/ and choose **New → Web Service**.
2. Connect GitHub and select your `vision-bot` repository.
3. Configure:
   - **Root Directory:** leave blank (repository root)
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free, if available
4. Deploy. Render provides an HTTPS address similar to `https://your-service-name.onrender.com`. Use the exact URL Render gives you.
5. Open the HTTPS URL and test the website. Open Settings, enter your own Gemini API key, save it and send a test prompt.

The website's API key setting is stored in that browser's local storage and sent to the server for each Gemini request. Do not use a shared server-side `GEMINI_API_KEY` on a public unauthenticated site: it could let visitors consume your quota. Do not put keys in client code, GitHub, screenshots, or this repository.

## Part C — install the website on a phone (no APK needed)

Once the website works at its HTTPS URL:

- Android: open it in Chrome → menu (⋮) → **Install app** or **Add to Home screen**.
- iPhone: open it in Safari → Share → **Add to Home Screen**.

This PWA is the easiest way to get a Vision Bot icon on a phone. It needs internet for Gemini AI. Some features, especially speech recognition, depend on the browser/device.

## Part D — build a separate Android APK

The `android/` folder contains the Android Studio source project. It loads the website inside an Android WebView; the website must already be deployed.

1. In GitHub, open **Settings → Secrets and variables → Actions → Variables**.
2. Create a repository variable named `VISION_BOT_URL`, with the exact HTTPS URL from Render, e.g. `https://your-service-name.onrender.com/` (use your actual URL, not this example).
3. Open the **Actions** tab and run **Build Vision Bot Android APK** using **Run workflow**. A push changing files under `android/` also triggers the workflow.
4. Open the completed workflow run and download the `vision-bot-debug-apk` artifact. Extract it to find `app-debug.apk`.
5. Transfer the APK to your Android phone and open it. Android may ask you to allow installation from that source.

The workflow uses the repository variable `VISION_BOT_URL`. If it is not configured, the app displays setup instructions instead of loading a fake URL. A debug APK is for testing and direct sharing, not a signed Play Store release.

### Build APK locally with Android Studio

1. Install Android Studio and its recommended Android SDK/JDK components.
2. Open the `android/` folder as a project.
3. In `android/gradle.properties`, add this line with your actual URL:
   `VISION_BOT_URL=https://your-service-name.onrender.com/`
4. Select **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
5. The APK is normally at `android/app/build/outputs/apk/debug/app-debug.apk`.

## Local website testing (Windows)

Install Node.js 20 or newer. Open a terminal in this repository root and run:

```bat
npm install
npm start
```

Then open http://localhost:3000.

## Honest feature limits

- This is a starter project; it is not a published Play Store app.
- The Android APK wraps the hosted website, so it requires the website to be online.
- Always-on “Hey JARVIS” wake-word listening and a Windows floating taskbar command bar are not implemented. Browser microphone access is user-initiated and varies by platform.
- “Analyze image” is manual: the user selects an image. The app does not silently capture the screen.
- Voice output uses device/browser voices; a premium custom voice is not bundled.
- Gemini model access, rate limits and billing/quota depend on the Google AI Studio account and current model availability.

## Get Started / remembered-device upgrade

The landing screen now has an animated **Get Started** flow. A user can enter an optional display name and choose to remember this browser; the next visit skips the welcome screen. This is a remembered-device profile, **not secure account authentication**. Do not use it to protect private multi-user data. Real accounts require a trusted authentication provider and server-side sessions.

Recent chat messages are saved in this browser to improve continuity on the same device. Clearing chat removes the saved conversation history. Browser-local API-key entry remains intended only for personal testing; for a public deployment, configure `GEMINI_API_KEY` in the server environment/Replit Secrets and avoid sharing a browser key.

## Validation

The JavaScript files pass Node syntax checks. A live Gemini API call, deployment, and device-specific microphone support have not been verified as part of creating this archive.


## Website welcome animation and mobile install options

The landing screen includes an animated Vision Bot logo and a `Get Started` flow. The next step offers Android installation and iPhone Add to Home Screen guidance. The website footer contains an Install / Download App link. On browsers that support the PWA install prompt, the Android button opens that prompt; otherwise it shows the Chrome installation steps.

- Android PWA: open the deployed HTTPS website in Chrome and choose **Install app** / **Add to Home screen**.
- iPhone PWA: open the deployed HTTPS website in Safari → **Share** → **Add to Home Screen**.
- A standalone APK download cannot work until an APK has been built and uploaded to a stable download URL. This project includes a GitHub Actions workflow for building a test APK; after you build and host it, the bottom website section can be updated to point directly to that APK. The current install button does not pretend a native APK is already hosted.

### Preview locally

1. Extract the ZIP.
2. Install Node.js 20 or newer if it is not already installed.
3. Open a terminal in the extracted `vision-bot-complete` folder and run `npm install`, then `npm start`.
4. Open `http://localhost:3000` on that computer. For a phone preview on the same Wi-Fi, use the computer's local network IP with port `3000`; microphone/PWA installation generally requires HTTPS, so test those features on the deployed HTTPS site.
