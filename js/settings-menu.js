// Settings Menu Manager
class SettingsMenu {
    constructor() {
        this.isOpen = false;
        this.init();
    }
    
    init() {
        // Create settings button and menu
        this.createSettingsButton();
        this.createSettingsMenu();
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.settings-button') && !e.target.closest('.settings-menu')) {
                this.closeMenu();
            }
        });
    }
    
    createSettingsButton() {
        const settingsBtn = document.createElement('button');
        settingsBtn.className = 'settings-button';
        settingsBtn.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M12 1v6m0 6v6m3.9-10.4l4.2-4.2m-4.2 13.2l4.2 4.2M1 12h6m6 0h6m-10.4-3.9l-4.2-4.2m4.2 13.2l-4.2 4.2"></path>
            </svg>
        `;
        settingsBtn.setAttribute('aria-label', 'Settings');
        settingsBtn.onclick = () => this.toggleMenu();
        
        document.body.appendChild(settingsBtn);
    }
    
    createSettingsMenu() {
        const menu = document.createElement('div');
        menu.className = 'settings-menu';
        menu.innerHTML = `
            <div class="settings-menu-content">
                <button class="settings-menu-item" id="settings-dark-mode">
                    <span class="settings-icon" id="theme-icon">${window.themeManager?.isDarkMode ? '☀️' : '🌙'}</span>
                    <span id="theme-text">${window.themeManager?.isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                </button>
                <button class="settings-menu-item" id="settings-feedback">
                    <span class="settings-icon">💬</span>
                    <span>Send Feedback</span>
                </button>
            </div>
        `;
        
        // Add event listeners
        menu.querySelector('#settings-dark-mode').onclick = () => {
            if (window.themeManager) {
                window.themeManager.toggleTheme();
                // Update the menu text and icon
                document.getElementById('theme-icon').textContent = window.themeManager.isDarkMode ? '☀️' : '🌙';
                document.getElementById('theme-text').textContent = window.themeManager.isDarkMode ? 'Light Mode' : 'Dark Mode';
            }
        };
        
        menu.querySelector('#settings-feedback').onclick = () => {
            this.closeMenu();
            // Trigger feedback modal
            if (window.feedbackManager) {
                window.feedbackManager.open();
            }
        };
        
        document.body.appendChild(menu);
    }
    
    toggleMenu() {
        if (this.isOpen) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    }
    
    openMenu() {
        const menu = document.querySelector('.settings-menu');
        const button = document.querySelector('.settings-button');
        
        if (menu && button) {
            menu.classList.add('open');
            button.classList.add('active');
            this.isOpen = true;
            
            // Position menu above button
            const btnRect = button.getBoundingClientRect();
            menu.style.bottom = `${window.innerHeight - btnRect.top + 10}px`;
            menu.style.right = `${window.innerWidth - btnRect.right}px`;
        }
    }
    
    closeMenu() {
        const menu = document.querySelector('.settings-menu');
        const button = document.querySelector('.settings-button');
        
        if (menu && button) {
            menu.classList.remove('open');
            button.classList.remove('active');
            this.isOpen = false;
        }
    }
}

// Initialize settings menu when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    window.settingsMenu = new SettingsMenu();
});