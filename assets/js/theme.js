// Theme management functionality
(function() {
  'use strict';

  // Theme configuration
  const THEMES = {
    light: {
      icon: '🌙',
      name: 'light'
    },
    dark: {
      icon: '☀️',
      name: 'dark'
    }
  };

  // DOM elements
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  const html = document.documentElement;
  const hamburger = document.getElementById('hamburger');
  const navbarLinks = document.getElementById('navbar-links');
  const mobileOverlay = document.getElementById('mobile-overlay');

  // localStorage can throw (e.g. blocked storage), so never let it break the page
  function getSavedTheme() {
    try {
      return localStorage.getItem('theme');
    } catch (e) {
      return null;
    }
  }

  function saveTheme(theme) {
    try {
      localStorage.setItem('theme', theme);
    } catch (e) {}
  }

  // Initialize theme: dark by default, light only if the user chose it
  function initTheme() {
    const savedTheme = getSavedTheme();
    applyTheme(THEMES[savedTheme] ? savedTheme : 'dark');
  }

  // Apply theme to the page without saving it
  function applyTheme(theme) {
    if (!THEMES[theme]) return;
    
    html.setAttribute('data-theme', theme);
    updateThemeIcon(theme);
    
    // Dispatch custom event for other scripts
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
  }

  // Set theme and remember the user's choice
  function setTheme(theme) {
    if (!THEMES[theme]) return;
    applyTheme(theme);
    saveTheme(theme);
  }

  // Update theme icon
  function updateThemeIcon(theme) {
    if (themeIcon && THEMES[theme]) {
      themeIcon.textContent = THEMES[theme].icon;
    }
  }

  // Toggle theme
  function toggleTheme() {
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  }

  // Mobile menu functionality
  function toggleMobileMenu() {
    const isOpen = hamburger.classList.toggle('active');
    hamburger.setAttribute('aria-expanded', isOpen);
    navbarLinks.classList.toggle('active');
    mobileOverlay.classList.toggle('active');
  }

  function closeMobileMenu() {
    hamburger.classList.remove('active');
    hamburger.setAttribute('aria-expanded', 'false');
    navbarLinks.classList.remove('active');
    mobileOverlay.classList.remove('active');
  }

  // Event listeners
  function setupEventListeners() {
    if (themeToggle) {
      themeToggle.addEventListener('click', toggleTheme);
    }

    // Mobile menu event listeners
    if (hamburger) {
      hamburger.addEventListener('click', toggleMobileMenu);
    }

    if (mobileOverlay) {
      mobileOverlay.addEventListener('click', closeMobileMenu);
    }

    // Close mobile menu when clicking on a link
    if (navbarLinks) {
      const links = navbarLinks.querySelectorAll('a');
      links.forEach(link => {
        link.addEventListener('click', closeMobileMenu);
      });
    }

    // Close mobile menu on window resize (if screen becomes larger)
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) {
        closeMobileMenu();
      }
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      initTheme();
      setupEventListeners();
    });
  } else {
    initTheme();
    setupEventListeners();
  }

  // Expose functions globally for debugging
  window.themeManager = {
    setTheme,
    toggleTheme,
    getCurrentTheme: () => html.getAttribute('data-theme')
  };

})(); 