/**
 * Navigation Dock JavaScript
 * Handles panel interactions, scroll behavior, and theme integration
 */

// Navigation state
let currentNavPanel = null;
let isDockCollapsed = false;
let lastScrollY = 0;
let collapseThreshold = 30; // Collapse after 10px of scrolling down
let expandThreshold = 50; // Expand when within 15px of top
let expandDelay = null; // Delay timer for expanding

/**
 * Opens a navigation panel
 * @param {string} panelName - The name of the panel to open
 */
function openNavPanel(panelName) {
    // Close current panel if open
    if (currentNavPanel) {
        const currentPanelElement = document.getElementById(`${currentNavPanel}-panel`);
        if (currentPanelElement) {
            currentPanelElement.classList.remove('active');
        }
    }
    
    // Open new panel
    const panel = document.getElementById(`${panelName}-panel`);
    if (panel) {
        panel.classList.add('active');
        document.querySelector('.nav-overlay').classList.add('active');
        currentNavPanel = panelName;
        
        // Add escape key listener
        document.addEventListener('keydown', handleEscapeKey);
        
        // Prevent body scroll when panel is open
        document.body.style.overflow = 'hidden';
    }
}

/**
 * Closes the currently open navigation panel
 */
function closeNavPanel() {
    if (currentNavPanel) {
        const panel = document.getElementById(`${currentNavPanel}-panel`);
        if (panel) {
            panel.classList.remove('active');
        }
        document.querySelector('.nav-overlay').classList.remove('active');
        currentNavPanel = null;
        
        // Remove escape key listener
        document.removeEventListener('keydown', handleEscapeKey);
        
        // Restore body scroll
        document.body.style.overflow = '';
    }
}

/**
 * Handle escape key to close panel
 * @param {KeyboardEvent} e - The keyboard event
 */
function handleEscapeKey(e) {
    if (e.key === 'Escape') {
        closeNavPanel();
    }
}

/**
 * Toggle theme with integration to existing theme system
 */
function toggleNavTheme() {
    // Check if the existing toggleTheme function exists
    if (typeof window.toggleTheme === 'function') {
        // Use the existing theme toggle function
        window.toggleTheme();
        updateNavThemeIcon();
    } else {
        // Fallback: Implement our own theme toggle
        const THEME_STORAGE_KEY = 'preferred-theme';
        const currentTheme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        applyNavTheme(newTheme);
        localStorage.setItem(THEME_STORAGE_KEY, newTheme);
        updateNavThemeIcon();
    }
}

/**
 * Apply theme to the document (fallback function)
 * @param {string} theme - The theme to apply ('light' or 'dark')
 */
function applyNavTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.classList.remove('light-theme');
        document.documentElement.classList.add('dark-theme');
        document.documentElement.setAttribute('data-bs-theme', 'dark');
        
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
        document.body.setAttribute('data-bs-theme', 'dark');
    } else {
        document.documentElement.classList.remove('dark-theme');
        document.documentElement.classList.add('light-theme');
        document.documentElement.setAttribute('data-bs-theme', 'light');
        
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
        document.body.setAttribute('data-bs-theme', 'light');
    }
}

/**
 * Update the theme toggle icon based on current theme
 */
function updateNavThemeIcon() {
    const icon = document.getElementById('nav-theme-icon');
    if (icon) {
        const isDark = document.body.classList.contains('dark-theme') || 
                      document.documentElement.getAttribute('data-bs-theme') === 'dark';
        
        if (isDark) {
            icon.className = 'ph ph-sun';
        } else {
            icon.className = 'ph ph-moon';
        }
    }
}

/**
 * Collapse the navigation dock to minimal circle
 */
function collapseNavDock() {
    const wrapper = document.getElementById('navbarDock');
    const expanded = document.getElementById('navbarDockExpanded');
    const collapsed = document.getElementById('navbarDockCollapsed');
    
    if (wrapper && expanded && collapsed && !isDockCollapsed) {
        expanded.classList.add('hidden');
        collapsed.classList.add('visible');
        wrapper.classList.add('collapsed');
        isDockCollapsed = true;
    }
}

/**
 * Expand the navigation dock from minimal circle
 */
function expandNavDock() {
    const wrapper = document.getElementById('navbarDock');
    const expanded = document.getElementById('navbarDockExpanded');
    const collapsed = document.getElementById('navbarDockCollapsed');
    
    if (wrapper && expanded && collapsed && isDockCollapsed) {
        expanded.classList.remove('hidden');
        collapsed.classList.remove('visible');
        wrapper.classList.remove('collapsed');
        isDockCollapsed = false;
        
        // Clear any pending collapse
        if (expandDelay) {
            clearTimeout(expandDelay);
            expandDelay = null;
        }
    }
}

/**
 * Handle scroll events for auto-collapse/expand
 */
function handleNavScroll() {
    const currentScrollY = window.scrollY;
    const scrollingUp = currentScrollY < lastScrollY;
    
    // Scrolling down - collapse after threshold
    if (currentScrollY > collapseThreshold && !isDockCollapsed) {
        collapseNavDock();
    }
    // Scrolling up and near top - expand early for smooth experience
    else if (scrollingUp && currentScrollY <= expandThreshold && isDockCollapsed) {
        // Clear any pending delays
        if (expandDelay) clearTimeout(expandDelay);
        
        // Immediate expansion when scrolling up near top
        expandNavDock();
    }
    // Also handle case when already at top (page load or direct jump)
    else if (currentScrollY === 0 && isDockCollapsed) {
        expandNavDock();
    }
    
    lastScrollY = currentScrollY;
}

/**
 * Initialize navigation dock
 */
function initNavigationDock() {
    // Update theme icon on load
    updateNavThemeIcon();
    
    // Add initial state class
    const wrapper = document.getElementById('navbarDock');
    if (wrapper) {
        wrapper.classList.add('initial');
        
        // Remove initial animation class after animation completes
        setTimeout(() => {
            wrapper.classList.remove('initial');
        }, 500);
    }
    
    // Set up scroll listener - responsive and immediate
    let ticking = false;
    function requestTick() {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                handleNavScroll();
                ticking = false;
            });
            ticking = true;
        }
    }
    window.addEventListener('scroll', requestTick, { passive: true });
    
    // Ensure we start at the top of the page
    if (window.scrollY > 0) {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }
    
    // Handle initial scroll position
    handleNavScroll();
    
    // Add click handlers for panel items to close panel when navigating
    document.querySelectorAll('.nav-panel-item').forEach(item => {
        if (item.tagName === 'A') {
            item.addEventListener('click', (e) => {
                // Don't prevent default for links
                // Just close the panel
                setTimeout(() => closeNavPanel(), 100);
            });
        }
    });
    
    // Handle swipe gestures on mobile
    let touchStartX = 0;
    let touchEndX = 0;
    
    document.querySelectorAll('.nav-slide-panel').forEach(panel => {
        panel.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, false);
        
        panel.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipeGesture();
        }, false);
    });
    
    function handleSwipeGesture() {
        // Swipe right to close panel
        if (touchEndX > touchStartX + 50) {
            closeNavPanel();
        }
    }
    
    // Update active states based on current page
    updateActiveNavItems();
    
    // Listen for theme changes from other sources
    if (window.MutationObserver) {
        const observer = new MutationObserver(() => {
            updateNavThemeIcon();
        });
        
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class', 'data-bs-theme']
        });
    }
}

/**
 * Update active state of navigation items based on current URL
 */
function updateActiveNavItems() {
    const currentPath = window.location.pathname;
    
    document.querySelectorAll('.nav-dock-item').forEach(item => {
        if (item.tagName === 'A') {
            const itemPath = new URL(item.href).pathname;
            if (currentPath === itemPath) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        }
    });
}

/**
 * Add notification badge to a nav item
 * @param {string} itemType - The type of nav item ('hosts', 'wake', etc.)
 * @param {number} count - The notification count
 */
function updateNavBadge(itemType, count) {
    const navItem = document.querySelector(`.nav-dock-item[onclick*="${itemType}"]`);
    if (navItem) {
        let badge = navItem.querySelector('.nav-badge');
        
        if (count > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'nav-badge';
                navItem.appendChild(badge);
            }
            badge.textContent = count > 99 ? '99+' : count.toString();
        } else if (badge) {
            badge.remove();
        }
    }
}

/**
 * Show a temporary pulse animation on a nav item
 * @param {string} itemType - The type of nav item to pulse
 */
function pulseNavItem(itemType) {
    const navItem = document.querySelector(`.nav-dock-item[onclick*="${itemType}"]`);
    if (navItem) {
        navItem.classList.add('pulse');
        setTimeout(() => {
            navItem.classList.remove('pulse');
        }, 2000);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavigationDock);
} else {
    initNavigationDock();
}

// Export functions for external use
window.navDock = {
    open: openNavPanel,
    close: closeNavPanel,
    updateBadge: updateNavBadge,
    pulse: pulseNavItem
};
