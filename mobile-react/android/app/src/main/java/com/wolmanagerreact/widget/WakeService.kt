package com.wolmanagerreact.widget

import android.app.Service
import android.content.Intent
import android.os.IBinder
import android.widget.Toast
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

/**
 * Service to send Wake-on-LAN packets via API
 */
class WakeService : Service() {
    private val serviceJob = Job()
    private val serviceScope = CoroutineScope(Dispatchers.IO + serviceJob)

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent != null) {
            val hostName = intent.getStringExtra(WOLWidgetProvider.EXTRA_HOST_NAME) ?: "Unknown Host"
            val configType = intent.getStringExtra(WOLWidgetProvider.EXTRA_CONFIG_TYPE) ?: "server"
            
            serviceScope.launch {
                try {
                    var success = false
                    
                    if (configType == "server") {
                        val serverUrl = intent.getStringExtra(WOLWidgetProvider.EXTRA_SERVER_URL)
                        val hostId = intent.getIntExtra(WOLWidgetProvider.EXTRA_HOST_ID, -1)
                        val cookies = intent.getStringExtra(WOLWidgetProvider.EXTRA_COOKIES)
                        val csrfToken = intent.getStringExtra(WOLWidgetProvider.EXTRA_CSRF_TOKEN)
                        
                        if (serverUrl != null && hostId != -1 && cookies != null && csrfToken != null) {
                            success = wakeServerHost(serverUrl, hostId, cookies, csrfToken)
                        }
                    } else if (configType == "publicHost") {
                        val publicHostUrl = intent.getStringExtra(WOLWidgetProvider.EXTRA_PUBLIC_HOST_URL)
                        val serverBaseUrl = intent.getStringExtra(WOLWidgetProvider.EXTRA_SERVER_BASE_URL)
                        val token = intent.getStringExtra(WOLWidgetProvider.EXTRA_TOKEN)
                        
                        if (publicHostUrl != null && serverBaseUrl != null && token != null) {
                            success = wakePublicHost(serverBaseUrl, token, publicHostUrl)
                        }
                    }
                    
                    withContext(Dispatchers.Main) {
                        if (success) {
                            Toast.makeText(
                                applicationContext,
                                "Waking $hostName...",
                                Toast.LENGTH_SHORT
                            ).show()
                            
                            // Schedule status update after a delay (e.g. 5 seconds)
                            // For now, we just keep it as "Waking..." until the app updates it or next poll
                        } else {
                            Toast.makeText(
                                applicationContext,
                                "Failed to wake $hostName",
                                Toast.LENGTH_SHORT
                            ).show()
                            
                            // Revert widget status
                            val widgetId = intent.getIntExtra(WOLWidgetProvider.EXTRA_WIDGET_ID, -1)
                            if (widgetId != -1) {
                                WOLWidgetProvider.updateWidget(applicationContext, widgetId)
                            }
                        }
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                    withContext(Dispatchers.Main) {
                        Toast.makeText(
                            applicationContext,
                            "Error: ${e.message}",
                            Toast.LENGTH_SHORT
                        ).show()
                        
                        // Revert widget status
                        val widgetId = intent.getIntExtra(WOLWidgetProvider.EXTRA_WIDGET_ID, -1)
                        if (widgetId != -1) {
                            WOLWidgetProvider.updateWidget(applicationContext, widgetId)
                        }
                    }
                } finally {
                    stopSelf(startId)
                }
            }
        } else {
            stopSelf(startId)
        }
        
        return START_NOT_STICKY
    }

    private suspend fun wakeServerHost(
        serverUrl: String,
        hostId: Int,
        cookies: String,
        csrfToken: String
    ): Boolean {
        return withContext(Dispatchers.IO) {
            try {
                // Construct URL: serverUrl/wol/wake/{hostId}
                // serverUrl might already have / at the end or not, handled in basic way here
                val baseUrl = if (serverUrl.endsWith("/")) serverUrl.dropLast(1) else serverUrl
                val url = URL("$baseUrl/wol/wake/$hostId")
                
                val conn = url.openConnection() as HttpURLConnection
                conn.requestMethod = "POST"
                conn.doOutput = true
                conn.connectTimeout = 10000
                conn.readTimeout = 10000
                
                // Set headers
                conn.setRequestProperty("Cookie", cookies)
                conn.setRequestProperty("Content-Type", "application/x-www-form-urlencoded")
                
                // Body
                val postData = "csrf_token=${URLEncoder.encode(csrfToken, "UTF-8")}"
                
                OutputStreamWriter(conn.outputStream).use { writer ->
                    writer.write(postData)
                    writer.flush()
                }
                
                val responseCode = conn.responseCode
                conn.disconnect()
                
                // Check for 200 OK or 302 Redirect (success)
                responseCode == 200 || responseCode == 302
            } catch (e: Exception) {
                e.printStackTrace()
                false
            }
        }
    }

    private suspend fun wakePublicHost(
        serverBaseUrl: String,
        token: String,
        publicHostUrl: String
    ): Boolean {
        return withContext(Dispatchers.IO) {
            try {
                // 1. GET public host page to fetch CSRF token
                val pageUrl = URL(publicHostUrl)
                val pageConn = pageUrl.openConnection() as HttpURLConnection
                pageConn.requestMethod = "GET"
                pageConn.connectTimeout = 10000
                pageConn.readTimeout = 10000
                
                val pageResponseCode = pageConn.responseCode
                if (pageResponseCode != 200) return@withContext false
                
                // Extract CSRF and Cookies
                val cookiesList = pageConn.headerFields["Set-Cookie"]
                val cookies = cookiesList?.joinToString("; ") { it.split(";")[0] } ?: ""
                
                val html = BufferedReader(InputStreamReader(pageConn.inputStream)).use { it.readText() }
                pageConn.disconnect()
                
                // Extract CSRF token using Regex
                val csrfPattern = "name=\"csrf_token\"[^>]*value=\"([^\"]+)\"".toRegex()
                val matchResult = csrfPattern.find(html)
                val csrfToken = matchResult?.groups?.get(1)?.value ?: return@withContext false
                
                // Extract Host ID from HTML
                val idPattern = "data-host-id=\"(\\d+)\"".toRegex()
                val idMatch = idPattern.find(html)
                val hostId = idMatch?.groups?.get(1)?.value ?: return@withContext false
                
                // 2. POST to wake endpoint
                val baseUrl = if (serverBaseUrl.endsWith("/")) serverBaseUrl.dropLast(1) else serverBaseUrl
                val wakeUrl = URL("$baseUrl/public/host/wake")
                
                val wakeConn = wakeUrl.openConnection() as HttpURLConnection
                wakeConn.requestMethod = "POST"
                wakeConn.doOutput = true
                wakeConn.connectTimeout = 10000
                wakeConn.readTimeout = 10000
                
                // Set headers
                wakeConn.setRequestProperty("Cookie", cookies)
                wakeConn.setRequestProperty("Content-Type", "application/x-www-form-urlencoded")
                
                val postData = "csrf_token=${URLEncoder.encode(csrfToken, "UTF-8")}&host_id=$hostId"
                
                OutputStreamWriter(wakeConn.outputStream).use { writer ->
                    writer.write(postData)
                    writer.flush()
                }
                
                val wakeResponseCode = wakeConn.responseCode
                wakeConn.disconnect()
                
                wakeResponseCode == 200 || wakeResponseCode == 302
            } catch (e: Exception) {
                e.printStackTrace()
                false
            }
        }
    }
}
