// Theme Manager for Dark Mode
class ThemeManager {
    constructor() {
        this.isDarkMode = false;
        this.init();
    }
    
    init() {
        // Check localStorage for saved preference
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            this.enableDarkMode();
        }
        
        // No longer create separate toggle button - it's in settings menu now
    }
    
    toggleTheme() {
        if (this.isDarkMode) {
            this.disableDarkMode();
        } else {
            this.enableDarkMode();
        }
        
        // No longer need to update separate button text
    }
    
    enableDarkMode() {
        document.body.classList.add('dark-mode');
        this.isDarkMode = true;
        localStorage.setItem('theme', 'dark');
        
        // Update meta theme color for mobile browsers
        let metaTheme = document.querySelector('meta[name="theme-color"]');
        if (!metaTheme) {
            metaTheme = document.createElement('meta');
            metaTheme.name = 'theme-color';
            document.head.appendChild(metaTheme);
        }
        metaTheme.content = '#1a1a1a';
    }
    
    disableDarkMode() {
        document.body.classList.remove('dark-mode');
        this.isDarkMode = false;
        localStorage.setItem('theme', 'light');
        
        // Update meta theme color
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) {
            metaTheme.content = '#ffffff';
        }
    }
}

// Initialize theme manager when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    window.themeManager = new ThemeManager();
});