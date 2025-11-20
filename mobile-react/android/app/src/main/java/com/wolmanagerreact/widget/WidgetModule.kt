package com.wolmanagerreact.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableNativeArray
import com.facebook.react.bridge.WritableNativeMap

/**
 * React Native module for Widget management
 */
class WidgetModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "WidgetModule"
    }

    /**
     * Configure a widget with host information
     */
    @ReactMethod
    fun configureWidget(widgetId: Int, hostData: ReadableMap, promise: Promise) {
        try {
            val context = reactApplicationContext
            
            val config = WidgetConfigHelper.WidgetConfig(
                widgetId = widgetId,
                hostId = if (hostData.hasKey("hostId")) hostData.getInt("hostId") else null,
                hostName = hostData.getString("hostName") ?: "Unknown Host",
                macAddress = hostData.getString("macAddress") ?: "",
                ipAddress = if (hostData.hasKey("ipAddress")) hostData.getString("ipAddress") else null,
                configType = hostData.getString("configType") ?: "server",
                serverUrl = if (hostData.hasKey("serverUrl")) hostData.getString("serverUrl") else null,
                publicHostUrl = if (hostData.hasKey("publicHostUrl")) hostData.getString("publicHostUrl") else null,
                token = if (hostData.hasKey("token")) hostData.getString("token") else null,
                serverBaseUrl = if (hostData.hasKey("serverBaseUrl")) hostData.getString("serverBaseUrl") else null,
                status = if (hostData.hasKey("status")) hostData.getString("status") ?: "unknown" else "unknown",
                cookies = if (hostData.hasKey("cookies")) hostData.getString("cookies") else null,
                csrfToken = if (hostData.hasKey("csrfToken")) hostData.getString("csrfToken") else null,
                createdAt = System.currentTimeMillis(),
                lastUpdated = System.currentTimeMillis()
            )
            
            // Save configuration
            WidgetConfigHelper.saveWidgetConfig(context, config)
            
            // Update widget UI
            WOLWidgetProvider.updateWidget(context, widgetId)
            
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to configure widget: ${e.message}", e)
        }
    }

    /**
     * Get configuration for a specific widget
     */
    @ReactMethod
    fun getWidgetConfig(widgetId: Int, promise: Promise) {
        try {
            val context = reactApplicationContext
            val config = WidgetConfigHelper.getWidgetConfig(context, widgetId)
            
            if (config != null) {
                val map = WritableNativeMap().apply {
                    putInt("widgetId", config.widgetId)
                    config.hostId?.let { putInt("hostId", it) }
                    putString("hostName", config.hostName)
                    putString("macAddress", config.macAddress)
                    config.ipAddress?.let { putString("ipAddress", it) }
                    putString("configType", config.configType)
                    config.serverUrl?.let { putString("serverUrl", it) }
                    config.publicHostUrl?.let { putString("publicHostUrl", it) }
                    config.token?.let { putString("token", it) }
                    config.serverBaseUrl?.let { putString("serverBaseUrl", it) }
                    putString("status", config.status)
                    putDouble("createdAt", config.createdAt.toDouble())
                    putDouble("lastUpdated", config.lastUpdated.toDouble())
                }
                promise.resolve(map)
            } else {
                promise.resolve(null)
            }
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to get widget config: ${e.message}", e)
        }
    }

    /**
     * Get all widget configurations
     */
    @ReactMethod
    fun getAllWidgetConfigs(promise: Promise) {
        try {
            val context = reactApplicationContext
            val configs = WidgetConfigHelper.getAllWidgetConfigs(context)
            
            val array = WritableNativeArray()
            for (config in configs) {
                val map = WritableNativeMap().apply {
                    putInt("widgetId", config.widgetId)
                    config.hostId?.let { putInt("hostId", it) }
                    putString("hostName", config.hostName)
                    putString("macAddress", config.macAddress)
                    config.ipAddress?.let { putString("ipAddress", it) }
                    putString("configType", config.configType)
                    config.serverUrl?.let { putString("serverUrl", it) }
                    config.publicHostUrl?.let { putString("publicHostUrl", it) }
                    config.token?.let { putString("token", it) }
                    config.serverBaseUrl?.let { putString("serverBaseUrl", it) }
                    putString("status", config.status)
                    putDouble("createdAt", config.createdAt.toDouble())
                    putDouble("lastUpdated", config.lastUpdated.toDouble())
                }
                array.pushMap(map)
            }
            
            promise.resolve(array)
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to get widget configs: ${e.message}", e)
        }
    }

    /**
     * Delete widget configuration
     */
    @ReactMethod
    fun deleteWidget(widgetId: Int, promise: Promise) {
        try {
            val context = reactApplicationContext
            WidgetConfigHelper.deleteWidgetConfig(context, widgetId)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to delete widget: ${e.message}", e)
        }
    }

    /**
     * Get list of all widget IDs currently placed on home screen
     */
    @ReactMethod
    fun getActiveWidgetIds(promise: Promise) {
        try {
            val context = reactApplicationContext
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val widgetIds = appWidgetManager.getAppWidgetIds(
                ComponentName(context, WOLWidgetProvider::class.java)
            )
            
            val array = WritableNativeArray()
            for (widgetId in widgetIds) {
                array.pushInt(widgetId)
            }
            
            promise.resolve(array)
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to get active widgets: ${e.message}", e)
        }
    }

    /**
     * Update all widgets
     */
    @ReactMethod
    fun updateAllWidgets(promise: Promise) {
        try {
            val context = reactApplicationContext
            WOLWidgetProvider.updateAllWidgets(context)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to update widgets: ${e.message}", e)
        }
    }

    /**
     * Request to pin a widget to the home screen
     * Note: This requires Android O (API 26+) and launcher support
     */
    @ReactMethod
    fun requestPinWidget(promise: Promise) {
        try {
            val context = reactApplicationContext
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                val appWidgetManager = AppWidgetManager.getInstance(context)
                val myProvider = ComponentName(context, WOLWidgetProvider::class.java)
                
                if (appWidgetManager.isRequestPinAppWidgetSupported) {
                    val success = appWidgetManager.requestPinAppWidget(myProvider, null, null)
                    promise.resolve(success)
                } else {
                    promise.reject("UNSUPPORTED", "Widget pinning is not supported on this device")
                }
            } else {
                promise.reject("UNSUPPORTED", "Widget pinning requires Android O (API 26) or higher")
            }
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to request pin widget: ${e.message}", e)
        }
    }
}
