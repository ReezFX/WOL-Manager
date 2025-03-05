document.addEventListener('DOMContentLoaded', () => {
  const themeToggleBtn = document.getElementById('theme-toggle');
  const rootElement = document.documentElement;
  const moonIcon = document.querySelector('.apple-moon-icon');
  const sunIcon = document.querySelector('.apple-sun-icon');
  
  // Check for saved user preference, if any
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    rootElement.classList.add('dark-theme');
    updateToggleButton(true);
  } else {
    rootElement.classList.remove('dark-theme');
    updateToggleButton(false);
  }
  
  // Toggle theme when button is clicked
  themeToggleBtn.addEventListener('click', () => {
    const isDarkMode = rootElement.classList.toggle('dark-theme');
    
    // Save user preference to localStorage
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    
    // Update toggle button appearance/text based on current mode
    updateToggleButton(isDarkMode);
  });
  
  // Function to update toggle button appearance
  function updateToggleButton(isDarkMode) {
    // Update button aria-label based on current theme
    if (isDarkMode) {
      themeToggleBtn.setAttribute('aria-label', 'Switch to light mode');
      // Update button classes for CSS-based animations
      themeToggleBtn.classList.add('dark-active');
      themeToggleBtn.classList.remove('light-active');
    } else {
      themeToggleBtn.setAttribute('aria-label', 'Switch to dark mode');
      // Update button classes for CSS-based animations
      themeToggleBtn.classList.add('light-active');
      themeToggleBtn.classList.remove('dark-active');
    }
  }
  
  // Check for system preference on initial load
  function checkSystemPreference() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      // Only apply if the user hasn't already set a preference
      if (!localStorage.getItem('theme')) {
        rootElement.classList.add('dark-theme');
        updateToggleButton(true);
        localStorage.setItem('theme', 'dark');
      }
    }
  }
  
  // Check system preference on load
  checkSystemPreference();
  
  // Listen for system preference changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
    // Only apply if the user hasn't already set a preference
    if (!localStorage.getItem('theme')) {
      const isDarkMode = event.matches;
      rootElement.classList.toggle('dark-theme', isDarkMode);
      updateToggleButton(isDarkMode);
    }
  });
});

