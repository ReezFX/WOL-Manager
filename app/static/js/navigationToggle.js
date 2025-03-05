document.addEventListener('DOMContentLoaded', function() {
    const body = document.body;
    const mobileBreakpoint = 768;
    
    // Create backdrop element for mobile nav (used by first implementation)
    const backdrop = document.createElement('div');
    backdrop.className = 'nav-backdrop';
    document.body.appendChild(backdrop);
    
    // First implementation - Hamburger button and navigation
    const hamburgerBtn = document.querySelector('.apple-hamburger-button');
    const hamburgerNavMenu = document.querySelector('.apple-nav');
    
    // Second implementation - Nav toggle and nav links
    const navToggle = document.querySelector('#apple-nav-toggle');
    const navLinksMenu = document.querySelector('.apple-nav-links');
    
    // Handle first implementation (hamburger menu)
    if (hamburgerBtn && hamburgerNavMenu) {
        // Toggle hamburger menu
        hamburgerBtn.addEventListener('click', function() {
            hamburgerBtn.classList.toggle('active');
            hamburgerNavMenu.classList.toggle('active');
            backdrop.classList.toggle('active');
            body.classList.toggle('nav-open');
            
            // Add accessibility attribute
            const expanded = hamburgerBtn.getAttribute('aria-expanded') === 'true' || false;
            hamburgerBtn.setAttribute('aria-expanded', !expanded);
        });
        
        // Close menu when clicking backdrop
        backdrop.addEventListener('click', function() {
            hamburgerBtn.classList.remove('active');
            hamburgerNavMenu.classList.remove('active');
            backdrop.classList.remove('active');
            body.classList.remove('nav-open');
            hamburgerBtn.setAttribute('aria-expanded', 'false');
        });
    }
    
    // Handle second implementation (nav toggle)
    if (navToggle && navLinksMenu) {
        // Function to toggle the navigation menu
        function toggleNavigation() {
            navLinksMenu.classList.toggle('active');
            
            // Toggle the aria-expanded attribute for accessibility
            const expanded = navToggle.getAttribute('aria-expanded') === 'true' || false;
            navToggle.setAttribute('aria-expanded', !expanded);
            
            // Toggle the active class on the toggle button
            navToggle.classList.toggle('active');
        }
        
        // Add click event listener to the toggle button
        navToggle.addEventListener('click', toggleNavigation);
        
        // Close the menu when clicking outside
        document.addEventListener('click', function(event) {
            const isClickInside = navToggle.contains(event.target) || navLinksMenu.contains(event.target);
            
            if (!isClickInside && navLinksMenu.classList.contains('active')) {
                toggleNavigation();
            }
        });
    }
    
    // Close both menus when window is resized beyond mobile breakpoint
    window.addEventListener('resize', function() {
        if (window.innerWidth > mobileBreakpoint) {
            // Reset first implementation
            if (hamburgerBtn && hamburgerNavMenu) {
                hamburgerBtn.classList.remove('active');
                hamburgerNavMenu.classList.remove('active');
                backdrop.classList.remove('active');
                body.classList.remove('nav-open');
                hamburgerBtn.setAttribute('aria-expanded', 'false');
            }
            
            // Reset second implementation
            if (navToggle && navLinksMenu && navLinksMenu.classList.contains('active')) {
                navLinksMenu.classList.remove('active');
                navToggle.classList.remove('active');
                navToggle.setAttribute('aria-expanded', 'false');
            }
        }
    });
});
