package com.visionbot.ai

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast

class MainActivity : Activity() {
    private lateinit var webView: WebView

    // Set with -PVISION_BOT_URL=https://your-real-host/ or in android/gradle.properties.
    private val appUrl = BuildConfig.VISION_BOT_URL

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = android.graphics.Color.rgb(3, 7, 17)
        window.navigationBarColor = android.graphics.Color.rgb(3, 7, 17)

        webView = WebView(this)
        webView.setBackgroundColor(android.graphics.Color.rgb(3, 7, 17))
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.mediaPlaybackRequiresUserGesture = true
        webView.settings.allowFileAccess = false
        webView.settings.allowContentAccess = true
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val url = request.url
                return if (url.host == Uri.parse(appUrl).host) {
                    false
                } else {
                    startActivity(Intent(Intent.ACTION_VIEW, url))
                    true
                }
            }
        }
        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                runOnUiThread {
                    val wantsAudio = request.resources.contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE)
                    if (wantsAudio && Build.VERSION.SDK_INT >= 23 &&
                        checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                        requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), 71)
                        pendingWebPermission = request
                    } else {
                        request.grant(request.resources)
                    }
                }
            }
        }
        setContentView(webView)

        if (Uri.parse(appUrl).host == null || Uri.parse(appUrl).host == "example.invalid") {
            Toast.makeText(this, "Set VISION_BOT_URL to your deployed HTTPS website before building.", Toast.LENGTH_LONG).show()
            webView.loadDataWithBaseURL(null, "<html><body style='background:#030711;color:#00eaff;font-family:sans-serif;text-align:center;padding:40px'><h1>VISION BOT</h1><p>Android wrapper is ready.</p><p>Set VISION_BOT_URL to your deployed HTTPS website, then rebuild.</p></body></html>", "text/html", "UTF-8", null)
        } else {
            webView.loadUrl(appUrl)
        }
    }

    private var pendingWebPermission: PermissionRequest? = null

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == 71) {
            val request = pendingWebPermission
            if (request != null) {
                if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                    request.grant(request.resources)
                } else {
                    request.deny()
                }
            }
            pendingWebPermission = null
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (::webView.isInitialized && webView.canGoBack()) webView.goBack() else super.onBackPressed()
    }
}
