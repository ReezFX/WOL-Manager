package com.wolmanagerreact.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import android.graphics.Color
import com.wolmanagerreact.R

import android.view.View

/**
 * WOL Widget Provider
 * Handles widget updates and click events
 */
class WOLWidgetProvider : AppWidgetProvider() {

        companion object {
        const val ACTION_WAKE_HOST = "com.wolmanagerreact.widget.WAKE_HOST"
        const val EXTRA_WIDGET_ID = "extra_widget_id"
        const val EXTRA_HOST_NAME = "extra_host_name"
        const val EXTRA_MAC_ADDRESS = "extra_mac_address"
        const val EXTRA_IP_ADDRESS = "extra_ip_address"
        const val EXTRA_CONFIG_TYPE = "extra_config_type"
        const val EXTRA_SERVER_URL = "extra_server_url"
        const val EXTRA_HOST_ID = "extra_host_id"
        const val EXTRA_PUBLIC_HOST_URL = "extra_public_host_url"
        const val EXTRA_TOKEN = "extra_token"
        const val EXTRA_SERVER_BASE_URL = "extra_server_base_url"
        const val EXTRA_COOKIES = "extra_cookies"
        const val EXTRA_CSRF_TOKEN = "extra_csrf_token"

        /**
         * Force update all widgets
         */
        fun updateAllWidgets(context: Context) {
            val intent = Intent(context, WOLWidgetProvider::class.java).apply {
                action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
            }
            
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val widgetIds = appWidgetManager.getAppWidgetIds(
                ComponentName(context, WOLWidgetProvider::class.java)
            )
            
            intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, widgetIds)
            context.sendBroadcast(intent)
        }

        /**
         * Update specific widget
         */
        fun updateWidget(context: Context, widgetId: Int, overrideStatus: String? = null, isLoading: Boolean = false, isSuccess: Boolean = false) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            
            // DIRECT UPDATE ONLY:
            // We intentionally DO NOT send a broadcast here because that triggers onUpdate(),
            // which would perform a standard update (loading=false) and overwrite our specific state immediately.
            // This caused the "flashing" issue where loading/success states vanished instantly.
            
            val provider = WOLWidgetProvider()
            provider.updateAppWidget(context, appWidgetManager, widgetId, overrideStatus, isLoading, isSuccess)
        }
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (widgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, widgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        
        when (intent.action) {
            ACTION_WAKE_HOST -> {
                handleWakeHost(context, intent)
            }
        }
    }

    override fun onDeleted(context: Context, appWidgetIds: IntArray) {
        for (widgetId in appWidgetIds) {
            WidgetConfigHelper.deleteWidgetConfig(context, widgetId)
        }
    }

    override fun onEnabled(context: Context) {
        // First widget added
    }

    override fun onDisabled(context: Context) {
        // Last widget removed
    }

    private fun handleWakeHost(context: Context, intent: Intent) {
        val widgetId = intent.getIntExtra(EXTRA_WIDGET_ID, -1)
        val hostName = intent.getStringExtra(EXTRA_HOST_NAME) ?: "Unknown Host"
        val macAddress = intent.getStringExtra(EXTRA_MAC_ADDRESS) ?: return
        val ipAddress = intent.getStringExtra(EXTRA_IP_ADDRESS)
        val configType = intent.getStringExtra(EXTRA_CONFIG_TYPE) ?: "server"
        
        // Visual feedback: Show "Waking..." status and loading spinner immediately
        // Note: We do this BEFORE starting the service to ensure immediate UI feedback
        updateWidget(context, widgetId, "waking", isLoading = true)
        
        // Start WakeService to send WOL packet
        val serviceIntent = Intent(context, WakeService::class.java).apply {
            putExtra(EXTRA_WIDGET_ID, widgetId)
            putExtra(EXTRA_HOST_NAME, hostName)
            putExtra(EXTRA_MAC_ADDRESS, macAddress)
            putExtra(EXTRA_IP_ADDRESS, ipAddress)
            putExtra(EXTRA_CONFIG_TYPE, configType)
            
            if (configType == "server") {
                putExtra(EXTRA_SERVER_URL, intent.getStringExtra(EXTRA_SERVER_URL))
                putExtra(EXTRA_HOST_ID, intent.getIntExtra(EXTRA_HOST_ID, -1))
                putExtra(EXTRA_COOKIES, intent.getStringExtra(EXTRA_COOKIES))
                putExtra(EXTRA_CSRF_TOKEN, intent.getStringExtra(EXTRA_CSRF_TOKEN))
            } else if (configType == "publicHost") {
                putExtra(EXTRA_PUBLIC_HOST_URL, intent.getStringExtra(EXTRA_PUBLIC_HOST_URL))
                putExtra(EXTRA_TOKEN, intent.getStringExtra(EXTRA_TOKEN))
                putExtra(EXTRA_SERVER_BASE_URL, intent.getStringExtra(EXTRA_SERVER_BASE_URL))
            }
        }
        
        context.startService(serviceIntent)
    }

    // Public wrapper for updateAppWidget so WakeService can use it
    fun updateAppWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        widgetId: Int,
        overrideStatus: String? = null,
        isLoading: Boolean = false,
        isSuccess: Boolean = false
    ) {
        val config = WidgetConfigHelper.getWidgetConfig(context, widgetId)
        
        val views = RemoteViews(context.packageName, R.layout.widget_wol)
        
        if (config != null) {
            // Set host name
            views.setTextViewText(R.id.widget_host_name, config.hostName)
            
            // Set status
            val statusToShow = overrideStatus ?: config.status
            configureStatusViews(views, statusToShow)
            
            // Handle loading/success state
            if (isLoading) {
                views.setViewVisibility(R.id.widget_wake_button, View.GONE)
                views.setViewVisibility(R.id.widget_loading_indicator, View.VISIBLE)
                views.setViewVisibility(R.id.widget_success_indicator, View.GONE)
            } else if (isSuccess) {
                views.setViewVisibility(R.id.widget_wake_button, View.GONE)
                views.setViewVisibility(R.id.widget_loading_indicator, View.GONE)
                views.setViewVisibility(R.id.widget_success_indicator, View.VISIBLE)
            } else {
                views.setViewVisibility(R.id.widget_wake_button, View.VISIBLE)
                views.setViewVisibility(R.id.widget_loading_indicator, View.GONE)
                views.setViewVisibility(R.id.widget_success_indicator, View.GONE)
            }
            
            // Set wake button click handler
            val wakeIntent = Intent(context, WOLWidgetProvider::class.java).apply {
                action = ACTION_WAKE_HOST
                putExtra(EXTRA_WIDGET_ID, widgetId)
                putExtra(EXTRA_HOST_NAME, config.hostName)
                putExtra(EXTRA_MAC_ADDRESS, config.macAddress)
                putExtra(EXTRA_IP_ADDRESS, config.ipAddress)
                putExtra(EXTRA_CONFIG_TYPE, config.configType)
                
                if (config.configType == "server") {
                    putExtra(EXTRA_SERVER_URL, config.serverUrl)
                    putExtra(EXTRA_HOST_ID, config.hostId)
                    putExtra(EXTRA_COOKIES, config.cookies)
                    putExtra(EXTRA_CSRF_TOKEN, config.csrfToken)
                } else if (config.configType == "publicHost") {
                    putExtra(EXTRA_PUBLIC_HOST_URL, config.publicHostUrl)
                    putExtra(EXTRA_TOKEN, config.token)
                    putExtra(EXTRA_SERVER_BASE_URL, config.serverBaseUrl)
                }
            }
            
            val pendingIntent = PendingIntent.getBroadcast(
                context,
                widgetId,
                wakeIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            
            views.setOnClickPendingIntent(R.id.widget_wake_button, pendingIntent)
        } else {
            // No configuration - show placeholder and open app on click
            views.setTextViewText(R.id.widget_host_name, "Not Configured")
            views.setTextViewText(R.id.widget_status_text, "Tap to Setup")
            views.setTextColor(R.id.widget_status_indicator, Color.parseColor("#adb5bd")) // Colors.status.unknown
            
            // Create intent to open the app deep linked to widget management
            val openAppIntent = Intent(Intent.ACTION_VIEW, Uri.parse("wolmanager://widget-config/$widgetId")).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            
            val pendingIntent = PendingIntent.getActivity(
                context,
                widgetId,
                openAppIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            
            // Make the entire widget clickable to open the app
            views.setOnClickPendingIntent(R.id.widget_container, pendingIntent)
        }
        
        appWidgetManager.updateAppWidget(widgetId, views)
    }

    private fun configureStatusViews(views: RemoteViews, status: String) {
        val (color, text) = when (status.lowercase()) {
            "online" -> Pair("#28b485", "Online") // Colors.status.online
            "offline" -> Pair("#e25563", "Offline") // Colors.status.offline
            "waking" -> Pair("#5bc0de", "Waking...") // Colors.info.main (blue)
            else -> Pair("#adb5bd", "Unknown") // Colors.status.unknown
        }
        
        views.setTextColor(R.id.widget_status_indicator, Color.parseColor(color))
        views.setTextViewText(R.id.widget_status_text, text)
    }
}
