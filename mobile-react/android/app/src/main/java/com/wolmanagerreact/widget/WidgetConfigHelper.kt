package com.wolmanagerreact.widget

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONObject

/**
 * Helper class to manage widget configurations
 * Stores widget configurations in SharedPreferences
 */
object WidgetConfigHelper {
    private const val PREFS_NAME = "com.wolmanagerreact.widget.prefs"
    private const val KEY_WIDGET_CONFIG = "widget_config_"

    data class WidgetConfig(
        val widgetId: Int,
        val hostId: Int?,
        val hostName: String,
        val macAddress: String,
        val ipAddress: String?,
        val configType: String, // "server" or "publicHost"
        val serverUrl: String?,
        val publicHostUrl: String?,
        val token: String?,
        val serverBaseUrl: String?,
        val status: String = "unknown", // "online", "offline", "unknown", "waking"
        val cookies: String?,
        val csrfToken: String?,
        val createdAt: Long,
        val lastUpdated: Long
    ) {
        fun toJson(): String {
            return JSONObject().apply {
                put("widgetId", widgetId)
                put("hostId", hostId ?: -1)
                put("hostName", hostName)
                put("macAddress", macAddress)
                put("ipAddress", ipAddress ?: "")
                put("configType", configType)
                put("serverUrl", serverUrl ?: "")
                put("publicHostUrl", publicHostUrl ?: "")
                put("token", token ?: "")
                put("serverBaseUrl", serverBaseUrl ?: "")
                put("status", status)
                put("cookies", cookies ?: "")
                put("csrfToken", csrfToken ?: "")
                put("createdAt", createdAt)
                put("lastUpdated", lastUpdated)
            }.toString()
        }

        companion object {
            fun fromJson(json: String): WidgetConfig? {
                return try {
                    val obj = JSONObject(json)
                    WidgetConfig(
                        widgetId = obj.getInt("widgetId"),
                        hostId = obj.optInt("hostId", -1).takeIf { it != -1 },
                        hostName = obj.getString("hostName"),
                        macAddress = obj.getString("macAddress"),
                        ipAddress = obj.optString("ipAddress", "").takeIf { it.isNotEmpty() },
                        configType = obj.getString("configType"),
                        serverUrl = obj.optString("serverUrl", "").takeIf { it.isNotEmpty() },
                        publicHostUrl = obj.optString("publicHostUrl", "").takeIf { it.isNotEmpty() },
                        token = obj.optString("token", "").takeIf { it.isNotEmpty() },
                        serverBaseUrl = obj.optString("serverBaseUrl", "").takeIf { it.isNotEmpty() },
                        status = obj.optString("status", "unknown"),
                        cookies = obj.optString("cookies", "").takeIf { it.isNotEmpty() },
                        csrfToken = obj.optString("csrfToken", "").takeIf { it.isNotEmpty() },
                        createdAt = obj.getLong("createdAt"),
                        lastUpdated = obj.getLong("lastUpdated")
                    )
                } catch (e: Exception) {
                    e.printStackTrace()
                    null
                }
            }
        }
    }

    private fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    /**
     * Save widget configuration
     */
    fun saveWidgetConfig(context: Context, config: WidgetConfig) {
        val prefs = getPrefs(context)
        prefs.edit()
            .putString(KEY_WIDGET_CONFIG + config.widgetId, config.toJson())
            .apply()
    }

    /**
     * Get widget configuration
     */
    fun getWidgetConfig(context: Context, widgetId: Int): WidgetConfig? {
        val prefs = getPrefs(context)
        val json = prefs.getString(KEY_WIDGET_CONFIG + widgetId, null) ?: return null
        return WidgetConfig.fromJson(json)
    }

    /**
     * Delete widget configuration
     */
    fun deleteWidgetConfig(context: Context, widgetId: Int) {
        val prefs = getPrefs(context)
        prefs.edit()
            .remove(KEY_WIDGET_CONFIG + widgetId)
            .apply()
    }

    /**
     * Get all widget configurations
     */
    fun getAllWidgetConfigs(context: Context): List<WidgetConfig> {
        val prefs = getPrefs(context)
        val configs = mutableListOf<WidgetConfig>()
        
        prefs.all.forEach { (key, value) ->
            if (key.startsWith(KEY_WIDGET_CONFIG) && value is String) {
                WidgetConfig.fromJson(value)?.let { configs.add(it) }
            }
        }
        
        return configs
    }

    /**
     * Clear all widget configurations
     */
    fun clearAllWidgetConfigs(context: Context) {
        val prefs = getPrefs(context)
        val editor = prefs.edit()
        
        prefs.all.keys.filter { it.startsWith(KEY_WIDGET_CONFIG) }.forEach { key ->
            editor.remove(key)
        }
        
        editor.apply()
    }
}
