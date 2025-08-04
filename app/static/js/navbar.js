/**
 * Mobile Navigation Enhancement for WoL Manager
 * Handles navbar collapse, dropdown animations, and responsive behavior
 * Optimized for performance with throttling and event delegation
 */

document.addEventListener('DOMContentLoaded', function() {
    // Cache DOM elements for better performance
    const navbar = document.getElementById('main-navbar');
    const navbarCollapse = document.getElementById('navbarNav');
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
    const dropdownItems = document.querySelectorAll('.dropdown-item');
    
    // Throttle function to limit frequency of expensive operations
    function throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    // Cache breakpoint check for mobile
    let isMobile = window.innerWidth < 992;
    
    // Optimized mobile navbar behavior setup
    function setupMobileNavbar() {
        if (isMobile) {
            // Use event delegation for better performance
            navbar.addEventListener('click', handleNavbarClick);
        } else {
            navbar.removeEventListener('click', handleNavbarClick);
        }
    }
    
    // Handle navbar clicks with event delegation
    function handleNavbarClick(event) {
        const target = event.target.closest('.nav-link, .dropdown-item');
        if (!target) return;
        
        // Skip dropdown toggles
        if (target.classList.contains('dropdown-toggle')) return;
        
        // Close navbar collapse
        const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse);
        if (bsCollapse && navbarCollapse.classList.contains('show')) {
            setTimeout(() => bsCollapse.hide(), 150);
        }
    }
    
    // Handle responsive layout changes
    function handleResize() {
        const wasMobile = isMobile;
        isMobile = window.innerWidth < 992;
        
        // Only setup mobile behavior if mobile state changed
        if (wasMobile !== isMobile) {
            setupMobileNavbar();
        }
    }
    
    // Throttled resize handler to improve performance
    const throttledResize = throttle(handleResize, 250);
    
    // Initial setup
    setupMobileNavbar();
    
    // Event listeners with performance optimizations
    window.addEventListener('resize', throttledResize, { passive: true });
    
    // Handle orientation changes with debouncing
    window.addEventListener('orientationchange', function() {
        setTimeout(throttledResize, 100);
    }, { passive: true });
    
    // Clean up event listeners on page unload
    window.addEventListener('beforeunload', function() {
        window.removeEventListener('resize', throttledResize);
        navbar.removeEventListener('click', handleNavbarClick);
    });
});
