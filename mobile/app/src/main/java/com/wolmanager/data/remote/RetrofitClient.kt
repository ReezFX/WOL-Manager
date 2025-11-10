package com.wolmanager.data.remote

import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object RetrofitClient {
    
    // Create a new cookie jar instance each time to ensure clean state
    private var cookieJar = createCookieJar()
    private var cachedClient: OkHttpClient? = null
    
    private fun createCookieJar(): CookieJar {
        return object : CookieJar {
            private val cookieStore = mutableMapOf<String, List<Cookie>>()
            
            override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
                cookieStore[url.host] = cookies
            }
            
            override fun loadForRequest(url: HttpUrl): List<Cookie> {
                return cookieStore[url.host] ?: emptyList()
            }
        }
    }
    
    private fun createOkHttpClient(): OkHttpClient {
        // Return cached client if available, otherwise create new one
        if (cachedClient != null) {
            return cachedClient!!
        }
        
        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }
        
        val client = OkHttpClient.Builder()
            .cookieJar(cookieJar)
            .addInterceptor(loggingInterceptor)
            .followRedirects(false)  // Don't follow redirects - we want to see 302
            .followSslRedirects(false)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()
        
        cachedClient = client
        return client
    }
    
    fun getApiService(baseUrl: String): WolManagerApiService {
        val retrofit = Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(createOkHttpClient())
            .addConverterFactory(GsonConverterFactory.create())
            .build()
        
        return retrofit.create(WolManagerApiService::class.java)
    }
    
    fun clearCookies() {
        // Create a completely new cookie jar to ensure all cookies are cleared
        cookieJar = createCookieJar()
        // Invalidate cached client so a new one will be created with the new cookieJar
        cachedClient = null
    }
}
