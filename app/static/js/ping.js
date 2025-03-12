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
        console.log('Host status checker initialized on ' + currentPath);
        initHostStatusChecks();
        
        // Add debug info to help with troubleshooting
        const hostElements = document.querySelectorAll('[data-host-id]');
        console.log(`Found ${hostElements.length} host elements on the page`);
    }
});

/**
 * Initialize host status checks - runs immediately and sets up interval
 */
function initHostStatusChecks() {
    // Run immediately on page load
    checkHostStatus();
    // Then run every 15 seconds
    setInterval(checkHostStatus, 15000);
    
    console.log(`Host status checker configured with offline threshold of ${OFFLINE_THRESHOLD} checks and online stability period of ${ONLINE_STABILITY_PERIOD/1000} seconds`);
}

/**
 * Start the status checking interval - alias for backward compatibility
 */
function startStatusChecking() {
    // Just call initHostStatusChecks for backward compatibility
    initHostStatusChecks();
}

/**
 * Check the status of all hosts visible on the current page
 */
function checkHostStatus() {
    // Get all host IDs from the page
    const hostElements = document.querySelectorAll('[data-host-id]');
    if (hostElements.length === 0) {
        return;
    }
    
    // Extract host IDs from the DOM
    const hostIds = Array.from(hostElements).map(el => el.getAttribute('data-host-id'));
    
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
    
    for (const [hostId, status] of Object.entries(rawStatuses)) {
        // Initialize cache entry if it doesn't exist
        if (!hostStatusCache[hostId]) {
            hostStatusCache[hostId] = {
                lastKnownStatus: status.is_online,
                offlineCount: 0,
                lastResponseTime: status.response_time,
                lastError: status.error,
                lastOnlineTime: status.is_online ? Date.now() : null,
                lastStatusChangeTime: Date.now()
            };
        }
        
        let smoothedStatus = {...status};
        const now = Date.now();
        const timeSinceLastOnline = hostStatusCache[hostId].lastOnlineTime ? 
            now - hostStatusCache[hostId].lastOnlineTime : Infinity;
        
        // Apply enhanced smoothing logic
        if (status.is_online) {
            // If host is online, immediately update UI and reset offline counter
            hostStatusCache[hostId].lastKnownStatus = true;
            hostStatusCache[hostId].offlineCount = 0;
            hostStatusCache[hostId].lastResponseTime = status.response_time;
            hostStatusCache[hostId].lastOnlineTime = now;
            
            // If this is a change from offline to online, log it
            if (!hostStatusCache[hostId].lastKnownStatus) {
                console.log(`Host ${hostId} is back online`);
                hostStatusCache[hostId].lastStatusChangeTime = now;
            }
        } else {
            // Check if we're within the stability period of a previous online state
            if (hostStatusCache[hostId].lastOnlineTime && 
                timeSinceLastOnline < ONLINE_STABILITY_PERIOD && 
                hostStatusCache[hostId].lastKnownStatus) {
                
                // Even within stability period, ensure we don't keep a host online too long
                // if it's been consistently failing checks
                if (hostStatusCache[hostId].offlineCount >= OFFLINE_THRESHOLD * 2) {
                    // Host has failed too many consecutive checks, override stability period
                    smoothedStatus.is_online = false;
                    console.log(`Host ${hostId} has failed ${hostStatusCache[hostId].offlineCount} consecutive checks, overriding stability period and showing as offline`);
                    
                    // Update the last known status
                    if (hostStatusCache[hostId].lastKnownStatus) {
                        console.log(`Host ${hostId} is now offline (multiple consecutive failures)`);
                        hostStatusCache[hostId].lastKnownStatus = false;
                        hostStatusCache[hostId].lastStatusChangeTime = now;
                    }
                } 
                // Also check if it's been an excessive amount of time since last successful ping
                else if (timeSinceLastOnline > MAX_OFFLINE_DETECTION_TIME) {
                    // It's been too long since the last successful ping, show as offline
                    smoothedStatus.is_online = false;
                    console.log(`Host ${hostId} hasn't been reachable for ${Math.round(timeSinceLastOnline/1000)}s (exceeds max ${MAX_OFFLINE_DETECTION_TIME/1000}s), showing as offline`);
                    
                    // Update the last known status
                    if (hostStatusCache[hostId].lastKnownStatus) {
                        console.log(`Host ${hostId} is now offline (exceeded maximum offline detection time)`);
                        hostStatusCache[hostId].lastKnownStatus = false;
                        hostStatusCache[hostId].lastStatusChangeTime = now;
                    }
                }
                else {
                    // Within stability period and not too many failures, keep showing as online
                    smoothedStatus.is_online = true;
                    smoothedStatus.response_time = hostStatusCache[hostId].lastResponseTime;
                    
                    console.log(`Host ${hostId} appears offline but within stability period (${Math.round(timeSinceLastOnline/1000)}s < ${ONLINE_STABILITY_PERIOD/1000}s), showing as online`);
                    
                    // Still increment the offline counter for tracking purposes
                    hostStatusCache[hostId].offlineCount++;
                }
            } else {
                // Beyond stability period, apply normal threshold logic
                hostStatusCache[hostId].offlineCount++;
                hostStatusCache[hostId].lastError = status.error;
                
                // Only show as offline if we've seen it offline multiple times consecutively
                if (hostStatusCache[hostId].offlineCount < OFFLINE_THRESHOLD) {
                    // Keep showing as online until threshold is reached, but only if recently online
                    if (timeSinceLastOnline < MAX_OFFLINE_DETECTION_TIME) {
                        smoothedStatus.is_online = hostStatusCache[hostId].lastKnownStatus;
                        smoothedStatus.response_time = hostStatusCache[hostId].lastResponseTime;
                        
                        console.log(`Host ${hostId} appears offline but showing as ${smoothedStatus.is_online ? 'online' : 'offline'} (${hostStatusCache[hostId].offlineCount}/${OFFLINE_THRESHOLD})`);
                    } else {
                        // It's been too long since last successful ping, show as offline regardless
                        smoothedStatus.is_online = false;
                        console.log(`Host ${hostId} hasn't been reachable for ${Math.round(timeSinceLastOnline/1000)}s (exceeds max ${MAX_OFFLINE_DETECTION_TIME/1000}s), showing as offline`);
                        
                        if (hostStatusCache[hostId].lastKnownStatus) {
                            hostStatusCache[hostId].lastKnownStatus = false;
                            hostStatusCache[hostId].lastStatusChangeTime = now;
                        }
                    }
                } else {
                    // Threshold reached, show as offline
                    // Only log a state change if this is a new change
                    if (hostStatusCache[hostId].lastKnownStatus) {
                        console.log(`Host ${hostId} is now offline (confirmed after ${hostStatusCache[hostId].offlineCount} checks)`);
                        hostStatusCache[hostId].lastStatusChangeTime = now;
                    }
                    
                    hostStatusCache[hostId].lastKnownStatus = false;
                }
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
function updateHostStatusUI(hostStatuses) {
    // Apply smoothing to prevent status flickering
    const smoothedStatuses = smoothHostStatuses(hostStatuses);
    // Detect current page - different layouts for dashboard vs hosts page
    const isDashboard = window.location.pathname === '/dashboard';
    const isHostsList = window.location.pathname === '/hosts' || window.location.pathname === '/hosts/';
    
    // Update status on both dashboard cards and the host list table
    for (const [hostId, status] of Object.entries(smoothedStatuses)) {
        // Find elements for this host
        const hostElements = document.querySelectorAll(`[data-host-id="${hostId}"]`);
        
        hostElements.forEach(hostElement => {
            // Dashboard cards and host list table rows have different structures
            // Find status badge element within this host element
            let statusBadge;
            
            // Check if we're in a table row (hosts list) or a card (dashboard)
            if (hostElement.tagName === 'TR') {
                // This is likely a table row in the hosts list
                statusBadge = hostElement.querySelector('.status-badge');
                // Some implementations might put the badge in a specific status cell
                if (!statusBadge) {
                    const statusCell = hostElement.querySelector('td.host-status');
                    if (statusCell) {
                        statusBadge = statusCell.querySelector('.badge') || statusCell.querySelector('.status-badge');
                    }
                }
            } else {
                // This is likely a card on the dashboard
                statusBadge = hostElement.querySelector('.status-badge');
                // If not found, look deeper in card structure
                if (!statusBadge) {
                    statusBadge = hostElement.querySelector('.card-body .status-badge') || 
                                 hostElement.querySelector('.card .status-badge');
                }
            }
            
            if (!statusBadge) return;
            
            // Remove all existing status classes
            statusBadge.classList.remove('bg-success', 'bg-danger', 'bg-warning', 'bg-secondary',
                'badge-success', 'badge-danger', 'badge-warning', 'badge-secondary',
                'text-bg-success', 'text-bg-danger', 'text-bg-warning', 'text-bg-secondary');
            
            // Determine if using new Bootstrap 5 (with "text-bg-*" classes) or older versions
            const isBootstrap5 = document.documentElement.getAttribute('data-bs-theme') !== null ||
                document.querySelector('.btn-close') !== null;
                
            // Prepare class sets for different Bootstrap versions
            let onlineClass, offlineClass;
            
            if (isBootstrap5) {
                // Bootstrap 5+ classes
                onlineClass = 'text-bg-success';
                offlineClass = 'text-bg-danger';
            } else if (statusBadge.classList.contains('badge') || 
                      statusBadge.classList.contains('badge-pill')) {
                // Bootstrap 4 classes
                onlineClass = 'badge-success';
                offlineClass = 'badge-danger';
            } else {
                // Default to newer bg-* classes
                onlineClass = 'bg-success';
                offlineClass = 'bg-danger';
            }
            
            // Update status badge text and class
            if (status.is_online) {
                statusBadge.textContent = 'Online';
                statusBadge.classList.add(onlineClass);
                
                // If we have response time info, add it
                if (status.response_time) {
                    const responseTime = Math.round(status.response_time * 1000); // Convert to ms
                    statusBadge.textContent = `Online (${responseTime}ms)`;
                }
            } else {
                statusBadge.textContent = 'Offline';
                statusBadge.classList.add(offlineClass);
                
                // If we have error info, add it to title tooltip
                if (status.error) {
                    statusBadge.title = status.error;
                }
            }
            
            // Find and update any detailed status elements if they exist
            const detailedStatus = hostElement.querySelector('.host-detailed-status');
            if (detailedStatus) {
                if (status.is_online) {
                    detailedStatus.innerHTML = `<i class="fas fa-check-circle text-success"></i> Online`;
                    if (status.response_time) {
                        const responseTime = Math.round(status.response_time * 1000); // Convert to ms
                        detailedStatus.innerHTML += ` <small>(${responseTime}ms)</small>`;
                    }
                } else {
                    detailedStatus.innerHTML = `<i class="fas fa-times-circle text-danger"></i> Offline`;
                    if (status.error) {
                        detailedStatus.innerHTML += ` <small class="text-muted">${status.error}</small>`;
                    }
                }
            }
            
            // Update any row-specific UI elements for table rows
            if (hostElement.tagName === 'TR') {
                // Some tables might have a dedicated status icon column
                const statusIcon = hostElement.querySelector('.status-icon');
                if (statusIcon) {
                    statusIcon.className = 'status-icon';
                    if (status.is_online) {
                        statusIcon.classList.add('text-success', 'fa', 'fa-check-circle');
                    } else {
                        statusIcon.classList.add('text-danger', 'fa', 'fa-times-circle');
                    }
                }
                
                // Update the whole row styling (optional)
                if (status.is_online) {
                    hostElement.classList.remove('table-danger');
                } else {
                    hostElement.classList.add('table-danger');
                }
            }
            
            // Update any card-specific UI elements
            if (hostElement.classList.contains('card') || hostElement.closest('.card')) {
                // Update card border if needed
                const card = hostElement.classList.contains('card') ? 
                    hostElement : hostElement.closest('.card');
                    
                if (card) {
                    card.classList.remove('border-success', 'border-danger');
                    if (status.is_online) {
                        card.classList.add('border-success');
                    } else {
                        card.classList.add('border-danger');
                    }
                }
            }
        });
    }
}

