/**
 * Host ping functionality for WOL Manager
 * Handles automatic status checks of hosts
 */

// Main ping controller
class PingController {
  constructor() {
    this.pingInterval = 60000; // Default ping interval: 60 seconds
    this.pingTimeout = 3000;   // Default ping timeout: 3 seconds
    this.activeTimers = new Map();
    this.initialized = false;
  }

  /**
   * Initialize ping functionality for hosts on the page
   */
  init() {
    if (this.initialized) return;
    
    // Find all ping-enabled elements
    const pingableHosts = document.querySelectorAll('[data-ping-enabled="true"]');
    
    if (pingableHosts.length === 0) return;
    
    console.log(`[Ping] Initializing ping for ${pingableHosts.length} hosts`);
    
    // Set up pinging for each host
    pingableHosts.forEach(host => {
      const hostId = host.getAttribute('data-host-id');
      const hostMac = host.getAttribute('data-host-mac');
      const hostIp = host.getAttribute('data-host-ip');
      const badgeId = host.getAttribute('data-status-badge-id');
      
      if (hostIp && badgeId) {
        this.setupHostPing(hostId, hostMac, hostIp, badgeId);
      }
    });
    
    this.initialized = true;
  }

  /**
   * Set up periodic ping checks for a specific host
   */
  setupHostPing(hostId, hostMac, hostIp, badgeId) {
    // Initial ping
    this.pingHost(hostId, hostMac, hostIp, badgeId);
    
    // Set up interval
    const timerId = setInterval(() => {
      this.pingHost(hostId, hostMac, hostIp, badgeId);
    }, this.pingInterval);
    
    // Store timer reference
    this.activeTimers.set(hostId, timerId);
  }

  /**
   * Perform actual host ping and update status
   */
  pingHost(hostId, hostMac, hostIp, badgeId) {
    // Get badge element
    const badge = document.getElementById(badgeId);
    if (!badge) return;
    
    console.log(`[Ping] Pinging host ${hostId} (${hostIp})`);
    
    // Show pending status
    badge.setAttribute('data-status', 'unknown');
    if (typeof window.updateStatusBadgeAnimation === 'function') {
      window.updateStatusBadgeAnimation(badgeId, 'unknown');
    }
    
    // Make ping request
    fetch(`/api/ping/${hostIp}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      timeout: this.pingTimeout
    })
    .then(response => response.json())
    .then(data => {
      // Update status based on ping result
      const status = data.online ? 'online' : 'offline';
      badge.setAttribute('data-status', status);
      
      // Update animation if available
      if (typeof window.updateStatusBadgeAnimation === 'function') {
        window.updateStatusBadgeAnimation(badgeId, status);
      }
      
      console.log(`[Ping] Host ${hostId} (${hostIp}) status: ${status}`);
    })
    .catch(error => {
      console.error(`[Ping] Error pinging host ${hostId}:`, error);
      
      // Set to unknown on error
      badge.setAttribute('data-status', 'unknown');
      if (typeof window.updateStatusBadgeAnimation === 'function') {
        window.updateStatusBadgeAnimation(badgeId, 'unknown');
      }
    });
  }

  /**
   * Stop pinging a specific host
   */
  stopPing(hostId) {
    if (this.activeTimers.has(hostId)) {
      clearInterval(this.activeTimers.get(hostId));
      this.activeTimers.delete(hostId);
    }
  }

  /**
   * Stop all pings
   */
  stopAll() {
    this.activeTimers.forEach((timerId, hostId) => {
      clearInterval(timerId);
    });
    this.activeTimers.clear();
  }
}

// Create global ping controller
const pingController = new PingController();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize with a slight delay to ensure all other scripts are loaded
  setTimeout(() => {
    pingController.init();
  }, 1000);
});

// Export controller to global scope
window.pingController = pingController; 