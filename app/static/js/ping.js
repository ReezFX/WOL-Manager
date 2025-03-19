/**
 * Host status checker
 * 
 * This script automatically checks the status of hosts every 15 seconds
 * when the user is on either the dashboard or hosts list pages.
 */

// Global cache to store host statuses between checks
// This helps reduce flickering by requiring consecutive offline states
// before displaying a host as offline
let hostStatusCache = {};

// Store timeout IDs for each host to allow individual scheduling
let hostIntervals = {};

// Ping intervals based on host status (in milliseconds)
const OFFLINE_CHECK_INTERVAL = 15000; // 15 seconds for offline hosts
const ONLINE_CHECK_INTERVAL = 30000;  // 30 seconds for online hosts

// Key for storing host statuses in localStorage
const HOST_STATUS_STORAGE_KEY = 'wolHostStatuses';

// Constants for smoothing status changes
// Number of consecutive offline checks before showing as offline
const OFFLINE_THRESHOLD = 3; 
// Once online, keep showing as online for at least 15 seconds (reduced from 30 seconds)
const ONLINE_STABILITY_PERIOD = 15000;
// Maximum time to show a host as online since last successful ping (in milliseconds)
const MAX_OFFLINE_DETECTION_TIME = 45000; // 45 seconds max even within stability period

// Initialize the host status checker
document.addEventListener('DOMContentLoaded', function() {
    // Only run on dashboard or hosts pages
    const currentPath = window.location.pathname;
    if (currentPath === '/dashboard' || currentPath === '/hosts' || currentPath === '/hosts/') {
        initHostStatusChecks();
        
        // Add debug info to help with troubleshooting
        const hostElements = document.querySelectorAll('[data-host-id]');
    }
});

/**
 * Initialize host status checks - runs immediately and sets up intervals for each host
 */
function initHostStatusChecks() {
    // Load host statuses from localStorage before first API call
    loadHostStatusesFromStorage();
    
    // Update UI based on restored statuses
    applyStoredStatusesToUI();
    
    // Run immediately for all hosts on page load
    checkAllHostStatuses();
    
    // Then schedule individual checks for each host
    scheduleHostChecks();
}

/**
 * Schedule status checks for each host with appropriate intervals
 */
function scheduleHostChecks() {
    // Clear any existing intervals
    for (const hostId in hostIntervals) {
        clearTimeout(hostIntervals[hostId]);
        delete hostIntervals[hostId];
    }
    
    // Get all host IDs from the page
    const hostElements = document.querySelectorAll('[data-host-id]');
    if (hostElements.length === 0) {
        return;
    }
    
    // Schedule each host with appropriate interval
    hostElements.forEach(hostElement => {
        const hostId = hostElement.getAttribute('data-host-id');
        scheduleHostCheck(hostId);
    });
}

/**
 * Schedule a check for a specific host with an interval based on its status
 * @param {string} hostId - The ID of the host to schedule
 */
function scheduleHostCheck(hostId) {
    // Clear existing timeout if any
    if (hostIntervals[hostId]) {
        clearTimeout(hostIntervals[hostId]);
    }
    
    // Determine interval based on host status
    let interval = OFFLINE_CHECK_INTERVAL; // Default to offline interval
    
    // If we have cached data for this host and it's online, use longer interval
    if (hostStatusCache[hostId] && hostStatusCache[hostId].lastKnownStatus) {
        interval = ONLINE_CHECK_INTERVAL;
    }
    
    // Schedule the check
    hostIntervals[hostId] = setTimeout(() => {
        checkHostStatus([hostId]);
    }, interval);
}

/**
 * Start the status checking interval - alias for backward compatibility
 */
function startStatusChecking() {
    // Just call initHostStatusChecks for backward compatibility
    initHostStatusChecks();
}

/**
 * Update the ping interval for a specific host based on its status
 * @param {string} hostId - The ID of the host
 * @param {boolean} isOnline - Whether the host is online
 */
function updateHostInterval(hostId, isOnline) {
    // Schedule with the appropriate interval based on status
    scheduleHostCheck(hostId);
}

/**
 * Check the status of all hosts visible on the current page
 */
function checkAllHostStatuses() {
    // Get all host IDs from the page
    const hostElements = document.querySelectorAll('[data-host-id]');
    if (hostElements.length === 0) {
        return;
    }
    
    // Extract host IDs from the DOM
    const hostIds = Array.from(hostElements).map(el => el.getAttribute('data-host-id'));
    
    // Check all hosts
    checkHostStatus(hostIds);
}

/**
 * Check the status of specified hosts
 * @param {string[]} hostIds - Array of host IDs to check
 */
function checkHostStatus(hostIds) {
    if (!hostIds || hostIds.length === 0) {
        return;
    }
    // Call the API to check host statuses
    // Get CSRF token from meta tag or form input
    const getCSRFToken = () => {
        // Try to get the token from the meta tag first
        const metaToken = document.querySelector('meta[name="csrf-token"]');
        if (metaToken && metaToken.getAttribute('content')) {
            return metaToken.getAttribute('content');
        }
        
        // Fall back to finding it in a form input if meta tag is not available
        const tokenInput = document.querySelector('input[name="csrf_token"]');
        if (tokenInput && tokenInput.value) {
            return tokenInput.value;
        }
        
        // If neither is found, return null
        return null;
    };
    
    const csrfToken = getCSRFToken();
    
    fetch('/api/ping_hosts', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken
        },
        body: JSON.stringify({ host_ids: hostIds }),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        updateHostStatusUI(data.hosts);
        
        // Reschedule the checked hosts with appropriate intervals
        for (const hostId of hostIds) {
            scheduleHostCheck(hostId);
        }
    })
    .catch(error => {
        console.error('Error checking host status:', error);
    });
}

/**
 * Apply smoothing logic to host statuses to prevent flickering
 * @param {Object} rawStatuses - Raw host statuses from the API
 * @returns {Object} - Smoothed host statuses
 */
function smoothHostStatuses(rawStatuses) {
    const smoothedStatuses = {};
    const now = Date.now();
    
    for (const [hostId, status] of Object.entries(rawStatuses)) {
        // Initialize cache entry if it doesn't exist
        if (!hostStatusCache[hostId]) {
            hostStatusCache[hostId] = {
                lastKnownStatus: status.is_online,
                offlineCount: 0,
                lastResponseTime: status.response_time,
                lastError: status.error,
                lastOnlineTime: status.is_online ? now : null,
                lastStatusChangeTime: now
            };
        }
        
        let smoothedStatus = {...status};
        const cache = hostStatusCache[hostId];
        const timeSinceLastOnline = cache.lastOnlineTime ? now - cache.lastOnlineTime : Infinity;
        
        // Handle online status - simple case
        if (status.is_online) {
            // Host is online - update cache and reset counters
            const wasOffline = !cache.lastKnownStatus;
            cache.lastKnownStatus = true;
            cache.offlineCount = 0;
            cache.lastResponseTime = status.response_time;
            cache.lastOnlineTime = now;
            
            // Log status change if needed
            if (wasOffline) {
                cache.lastStatusChangeTime = now;
                updateHostInterval(hostId, true);
            }
        } 
        // Handle offline status - apply smoothing logic
        else {
            // Update error and increment offline counter
            cache.lastError = status.error;
            cache.offlineCount++;
            
            // Determine if we should show as offline based on conditions
            const exceededOfflineThreshold = cache.offlineCount >= OFFLINE_THRESHOLD;
            const exceededMaxOfflineTime = timeSinceLastOnline > MAX_OFFLINE_DETECTION_TIME;
            const outsideStabilityPeriod = timeSinceLastOnline > ONLINE_STABILITY_PERIOD;
            const tooManyConsecutiveFailures = cache.offlineCount >= OFFLINE_THRESHOLD * 2;
            
            // Show as offline if any of these conditions are true
            if (exceededOfflineThreshold || exceededMaxOfflineTime || 
                (outsideStabilityPeriod && !cache.lastKnownStatus) || 
                tooManyConsecutiveFailures) {
                
                smoothedStatus.is_online = false;
                
                // Only update status and interval if this is a change
                if (cache.lastKnownStatus) {
                    cache.lastKnownStatus = false;
                    cache.lastStatusChangeTime = now;
                    updateHostInterval(hostId, false);
                }
            } 
            // Otherwise keep showing as online (within stability period)
            else {
                smoothedStatus.is_online = true;
                smoothedStatus.response_time = cache.lastResponseTime;
            }
        }
        
        smoothedStatuses[hostId] = smoothedStatus;
    }
    
    return smoothedStatuses;
}

/**
 * Update the UI with the latest host status information
 * @param {Object} hostStatuses - Object with host IDs as keys and status data as values
 */
/**
 * Helper function to update a status badge element
 * @param {HTMLElement} badge - The status badge element to update
 * @param {boolean} isOnline - Whether the host is online
 * @param {number|null} responseTime - Response time in ms (only for online hosts)
 * @param {string|null} error - Error message (only for offline hosts)
 */
function updateStatusBadge(badge, isOnline, responseTime, error) {
    if (!badge) return;
    
    // Remove all status classes
    badge.classList.remove(
        'bg-success', 'bg-danger', 'bg-warning', 'bg-secondary',
        'badge-success', 'badge-danger', 'badge-warning', 'badge-secondary',
        'text-bg-success', 'text-bg-danger', 'text-bg-warning', 'text-bg-secondary'
    );
    
    // Apply appropriate status class (works with any Bootstrap version)
    const statusClasses = ['bg-success', 'badge-success', 'text-bg-success'].filter(cls => 
        document.querySelector(`.${cls}`) !== null || badge.classList.contains(cls.replace('success', ''))
    );
    
    const dangerClasses = ['bg-danger', 'badge-danger', 'text-bg-danger'].filter(cls => 
        document.querySelector(`.${cls}`) !== null || badge.classList.contains(cls.replace('danger', ''))
    );
    
    // Add the first found class or default to bg-* classes if none found
    if (isOnline) {
        badge.classList.add(statusClasses.length > 0 ? statusClasses[0] : 'bg-success');
        badge.setAttribute('data-status', 'online');
        badge.textContent = responseTime ? `Online (${Math.round(responseTime)}ms)` : 'Online';
    } else {
        badge.classList.add(dangerClasses.length > 0 ? dangerClasses[0] : 'bg-danger');
        badge.setAttribute('data-status', 'offline');
        badge.textContent = 'Offline';
        if (error) {
            badge.title = error;
        }
    }
}

function updateHostStatusUI(hostStatuses) {
    // Apply smoothing to prevent status flickering
    const smoothedStatuses = smoothHostStatuses(hostStatuses);
    
    // Save the updated statuses to localStorage
    saveHostStatusesToStorage(smoothedStatuses);
    
    // Detect current page - different layouts for dashboard vs hosts page
    const isHostsList = window.location.pathname === '/hosts' || window.location.pathname === '/hosts/';
    
    // Update status on both dashboard cards and the host list table
    for (const [hostId, status] of Object.entries(smoothedStatuses)) {
        // Find all elements for this host
        const hostElements = document.querySelectorAll(`[data-host-id="${hostId}"]`);
        
        hostElements.forEach(hostElement => {
            // Find status badge regardless of element type (card or table row)
            let statusBadge = hostElement.querySelector('.status-badge');
            
            // Try alternative selectors if not found
            if (!statusBadge) {
                if (hostElement.tagName === 'TR') {
                    const statusCell = hostElement.querySelector('td.host-status');
                    if (statusCell) {
                        statusBadge = statusCell.querySelector('.badge') || statusCell.querySelector('.status-badge');
                    }
                } else {
                    statusBadge = hostElement.querySelector('.card-body .status-badge') || 
                                 hostElement.querySelector('.card .status-badge');
                }
            }
            
            // Update the status badge
            updateStatusBadge(statusBadge, status.is_online, status.response_time, status.error);
            
            // Find and update any detailed status elements if they exist
            const detailedStatus = hostElement.querySelector('.host-detailed-status');
            if (detailedStatus) {
                if (status.is_online) {
                    detailedStatus.innerHTML = `<i class="fas fa-check-circle text-success"></i> Online`;
                    if (status.response_time) {
                        const responseTime = Math.round(status.response_time);
                        detailedStatus.innerHTML += ` <small>(${responseTime}ms)</small>`;
                    }
                } else {
                    detailedStatus.innerHTML = `<i class="fas fa-times-circle text-danger"></i> Offline`;
                    if (status.error) {
                        detailedStatus.innerHTML += ` <small class="text-muted">${status.error}</small>`;
                    }
                }
            }
            
            // Handle row-specific or card-specific UI updates
            if (hostElement.tagName === 'TR') {
                // Update status icon if present
                const statusIcon = hostElement.querySelector('.status-icon');
                if (statusIcon) {
                    statusIcon.className = 'status-icon';
                    statusIcon.classList.add(status.is_online ? 'text-success fa fa-check-circle' : 'text-danger fa fa-times-circle');
                }
                // Remove table-danger class to improve contrast
                hostElement.classList.remove('table-danger');
            } else {
                // Update card border if this is a card
                const card = hostElement.classList.contains('card') ? hostElement : hostElement.closest('.card');
                if (card) {
                    card.classList.remove('border-success', 'border-danger');
                    
                    // Only add colored borders on dashboard, not on hosts list page
                    if (!isHostsList) {
                        card.classList.add(status.is_online ? 'border-success' : 'border-danger');
                    }
                }
            }
        });
    }
}
/**
 * Save host statuses to localStorage
 * @param {Object} statuses - Object with host IDs as keys and status data as values
 */
function saveHostStatusesToStorage(statuses) {
    try {
        // Don't save if we have no statuses
        if (!statuses || Object.keys(statuses).length === 0) {
            return;
        }
        
        // Prepare storage data with timestamp
        const storageData = {
            timestamp: Date.now(),
            statuses: {}
        };
        
        // Store only necessary data (not the full status objects)
        for (const [hostId, status] of Object.entries(statuses)) {
            storageData.statuses[hostId] = {
                is_online: status.is_online,
                response_time: status.response_time,
                error: status.error
            };
        }
        
        // Save to localStorage
        localStorage.setItem(HOST_STATUS_STORAGE_KEY, JSON.stringify(storageData));
    } catch (error) {
        console.error('Error saving host statuses to localStorage:', error);
    }
}

/**
 * Load host statuses from localStorage
 * @returns {Object} - Retrieved host statuses or empty object if none found
 */
function loadHostStatusesFromStorage() {
    try {
        // Get stored data
        const storedData = localStorage.getItem(HOST_STATUS_STORAGE_KEY);
        if (!storedData) {
            return;
        }
        
        // Parse stored data
        const parsedData = JSON.parse(storedData);
        
        // Check if data is too old (15 minutes)
        const MAX_STORAGE_AGE = 15 * 60 * 1000; // 15 minutes
        const now = Date.now();
        if (now - parsedData.timestamp > MAX_STORAGE_AGE) {
            // Data is too old, remove it
            localStorage.removeItem(HOST_STATUS_STORAGE_KEY);
            return;
        }
        
        // Initialize hostStatusCache with stored data
        for (const [hostId, status] of Object.entries(parsedData.statuses)) {
            hostStatusCache[hostId] = {
                lastKnownStatus: status.is_online,
                offlineCount: status.is_online ? 0 : OFFLINE_THRESHOLD, // Preserve offline state
                lastResponseTime: status.response_time,
                lastError: status.error,
                lastOnlineTime: status.is_online ? parsedData.timestamp : null,
                lastStatusChangeTime: parsedData.timestamp
            };
        }
        
        return parsedData.statuses;
    } catch (error) {
        console.error('Error loading host statuses from localStorage:', error);
        return {};
    }
}

/**
 * Apply stored statuses to the UI immediately on page load
 */
function applyStoredStatusesToUI() {
    // Get all host IDs from the page
    const hostElements = document.querySelectorAll('[data-host-id]');
    if (hostElements.length === 0) {
        return;
    }
    
    // Build status object from cache
    const statuses = {};
    
    hostElements.forEach(hostElement => {
        const hostId = hostElement.getAttribute('data-host-id');
        
        // Only include hosts that we have cached statuses for
        if (hostStatusCache[hostId]) {
            statuses[hostId] = {
                is_online: hostStatusCache[hostId].lastKnownStatus,
                response_time: hostStatusCache[hostId].lastResponseTime,
                error: hostStatusCache[hostId].lastError
            };
        }
    });
    
    // Only update if we have any statuses
    if (Object.keys(statuses).length > 0) {
        updateHostStatusUI(statuses);
    }
}

