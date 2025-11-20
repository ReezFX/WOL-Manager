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
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress

/**
 * Service to send Wake-on-LAN packets in the background
 */
class WakeService : Service() {
    private val serviceJob = Job()
    private val serviceScope = CoroutineScope(Dispatchers.IO + serviceJob)

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent != null) {
            val hostName = intent.getStringExtra(WOLWidgetProvider.EXTRA_HOST_NAME) ?: "Unknown Host"
            val macAddress = intent.getStringExtra(WOLWidgetProvider.EXTRA_MAC_ADDRESS)
            val ipAddress = intent.getStringExtra(WOLWidgetProvider.EXTRA_IP_ADDRESS)
            
            if (macAddress != null) {
                serviceScope.launch {
                    try {
                        sendWakeOnLan(macAddress, ipAddress)
                        withContext(Dispatchers.Main) {
                            Toast.makeText(
                                applicationContext,
                                "Waking $hostName...",
                                Toast.LENGTH_SHORT
                            ).show()
                        }
                    } catch (e: Exception) {
                        e.printStackTrace()
                        withContext(Dispatchers.Main) {
                            Toast.makeText(
                                applicationContext,
                                "Failed to wake $hostName",
                                Toast.LENGTH_SHORT
                            ).show()
                        }
                    } finally {
                        stopSelf(startId)
                    }
                }
            } else {
                stopSelf(startId)
            }
        } else {
            stopSelf(startId)
        }
        
        return START_NOT_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        serviceJob.cancel()
    }

    /**
     * Send Wake-on-LAN magic packet
     * @param macAddress MAC address in format XX:XX:XX:XX:XX:XX
     * @param ipAddress Optional IP address for directed broadcast
     */
    private suspend fun sendWakeOnLan(macAddress: String, ipAddress: String?) {
        withContext(Dispatchers.IO) {
            // Parse MAC address
            val macBytes = macAddress.split(":")
                .map { it.toInt(16).toByte() }
                .toByteArray()

            if (macBytes.size != 6) {
                throw IllegalArgumentException("Invalid MAC address format")
            }

            // Create magic packet
            // Magic packet: 6 bytes of 0xFF followed by 16 repetitions of the MAC address
            val magicPacket = ByteArray(102)
            
            // Fill first 6 bytes with 0xFF
            for (i in 0..5) {
                magicPacket[i] = 0xFF.toByte()
            }
            
            // Repeat MAC address 16 times
            for (i in 1..16) {
                System.arraycopy(macBytes, 0, magicPacket, i * 6, 6)
            }

            // Send packet
            DatagramSocket().use { socket ->
                socket.broadcast = true
                
                // Determine broadcast address
                val broadcastAddress = if (!ipAddress.isNullOrEmpty()) {
                    // Use directed broadcast to specific subnet
                    try {
                        InetAddress.getByName(ipAddress)
                    } catch (e: Exception) {
                        InetAddress.getByName("255.255.255.255")
                    }
                } else {
                    // Use limited broadcast
                    InetAddress.getByName("255.255.255.255")
                }
                
                // Standard WOL port
                val port = 9
                
                // Create and send packet
                val packet = DatagramPacket(magicPacket, magicPacket.size, broadcastAddress, port)
                socket.send(packet)
                
                // Send to additional common WOL ports for better compatibility
                val additionalPorts = listOf(7, 2304)
                for (additionalPort in additionalPorts) {
                    try {
                        val additionalPacket = DatagramPacket(
                            magicPacket,
                            magicPacket.size,
                            broadcastAddress,
                            additionalPort
                        )
                        socket.send(additionalPacket)
                    } catch (e: Exception) {
                        // Ignore errors for additional ports
                    }
                }
            }
        }
    }
}
