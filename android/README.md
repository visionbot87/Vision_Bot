# Vision Bot Android wrapper

This Android Studio project wraps the hosted Vision Bot website in a WebView. Deploy the website first, then set `VISION_BOT_URL` to its HTTPS URL.

For local builds, add this to `android/gradle.properties`:

`VISION_BOT_URL=https://your-actual-service.onrender.com/`

Then open this `android/` folder in Android Studio and use **Build → Build Bundle(s) / APK(s) → Build APK(s)**.

For GitHub Actions, create a repository **variable** named `VISION_BOT_URL` with the actual HTTPS URL, then run the **Build Vision Bot Android APK** workflow. Download the `vision-bot-debug-apk` artifact from the workflow run.

This is a debug APK for testing and direct sharing. It is not signed for a Play Store release.
