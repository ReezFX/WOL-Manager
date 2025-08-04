/**
 * Mobile Navigation Enhancement for WoL Manager
 * Handles navbar collapse, dropdown animations, and responsive behavior
 */

document.addEventListener('DOMContentLoaded', function() {
    const navbar = document.getElementById('main-navbar');
    const navbarCollapse = document.getElementById('navbarNav');
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
    const dropdownItems = document.querySelectorAll('.dropdown-item');
    
    // Add icon animations for dropdown items
    dropdownItems.forEach(item => {
        const icon = item.querySelector('i');
        if (icon) {
            item.addEventListener('mouseover', () => {
                icon.style.transform = 'translateX(3px)';
            });
            
            item.addEventListener('mouseout', () => {
                icon.style.transform = 'translateX(0)';
            });
        }
    });
    
    // Adjust navbar padding for mobile
    function adjustNavbarPadding() {
        if (window.innerWidth < 992) {
            navbar.style.paddingBottom = '0.9rem';
        } else {
            navbar.style.paddingBottom = '0.8rem';
        }
    }
    
    // Setup mobile navbar behavior
    function setupMobileNavbar() {
        if (window.innerWidth < 992) {
            // Close navbar when nav links are clicked (exclude dropdown toggles)
            navLinks.forEach(link => {
                if (!link.classList.contains('dropdown-toggle')) {
                    link.addEventListener('click', () => {
                        const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse);
                        if (bsCollapse && navbarCollapse.classList.contains('show')) {
                            setTimeout(() => {
                                bsCollapse.hide();
                            }, 150);
                        }
                    });
                }
            });
            
            // Close navbar when dropdown items are clicked
            dropdownItems.forEach(item => {
                item.addEventListener('click', () => {
                    const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse);
                    if (bsCollapse && navbarCollapse.classList.contains('show')) {
                        setTimeout(() => {
                            bsCollapse.hide();
                        }, 150);
                    }
                });
            });
        }
    }
    
    // Initial setup
    adjustNavbarPadding();
    setupMobileNavbar();
    
    // Handle responsive behavior
    window.addEventListener('resize', function() {
        adjustNavbarPadding();
        setupMobileNavbar();
    });
    
    window.addEventListener('orientationchange', function() {
        setTimeout(function() {
            adjustNavbarPadding();
            setupMobileNavbar();
        }, 100);
    });
});
