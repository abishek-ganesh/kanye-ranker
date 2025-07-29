// Album color mappings and fonts based on Kanye's visual aesthetics
const albumColors = {
    // The College Dropout - Brown/Gold - Classic serif font
    'cd': {
        primary: '#8B4513',
        secondary: '#D4AF37',
        background: '#2C1810',
        text: '#FFFFFF',
        tertiary: '#5D2F00',  // Rich Dark Brown
        headerFont: 'Georgia, "Times New Roman", serif',
        bodyFont: 'Georgia, serif'
    },
    // Late Registration - Brown/Black - Elegant serif
    'lr': {
        primary: '#D4AF37',  // Gold for better visibility on dark background
        secondary: '#8B4513',  // Saddle Brown as secondary
        background: '#1A0F08',
        text: '#FFFFFF',
        tertiary: '#8B4513',  // Saddle Brown
        headerFont: '"Palatino Linotype", Palatino, serif',
        bodyFont: '"Palatino Linotype", Palatino, serif'
    },
    // Graduation - Pink/Purple - Futuristic/playful
    'grad': {
        primary: '#E91E63',
        secondary: '#9C27B0',
        background: '#4A148C',
        text: '#FFFFFF',
        tertiary: '#FFC107',  // Amber
        headerFont: '"Comic Sans MS", "Marker Felt", sans-serif',
        bodyFont: '"Arial Rounded MT Bold", Arial, sans-serif'
    },
    // 808s & Heartbreak - Red/Grey - Digital/cold
    '808s': {
        primary: '#F44336',  // Red as primary instead of grey
        secondary: '#757575',  // Darker grey as secondary
        background: '#212121',
        text: '#FFFFFF',
        tertiary: '#E91E63',  // Pink
        headerFont: '"Courier New", Courier, monospace',
        bodyFont: '"Lucida Console", Monaco, monospace'
    },
    // My Beautiful Dark Twisted Fantasy - Red/Gold - Luxurious
    'mbdtf': {
        primary: '#DC143C',
        secondary: '#FFD700',
        background: '#8B0000',
        text: '#FFFFFF',
        tertiary: '#4169E1',  // Royal Blue
        headerFont: '"Cinzel", "Didot", "Bodoni MT", serif',
        bodyFont: '"Cinzel", "Baskerville", "Times New Roman", serif'
    },
    // Watch the Throne - Gold - Royal/luxury
    'wtt': {
        primary: '#FFD700',
        secondary: '#FFA500',
        background: '#B8860B',
        text: '#000000',
        tertiary: '#FFC700',  // Rich Gold
        headerFont: '"Playfair Display", "Didot", serif',
        bodyFont: '"Playfair Display", Georgia, serif'
    },
    // Cruel Summer - Silver/Black - Modern/sleek
    'cruel': {
        primary: '#C0C0C0',  // Silver
        secondary: '#1A1A1A',  // Near black
        background: '#000000',  // Black background
        text: '#FFFFFF',
        tertiary: '#808080',  // Grey for lyrics button
        headerFont: '"Futura", "Trebuchet MS", sans-serif',
        bodyFont: '"Futura", "Trebuchet MS", sans-serif'
    },
    // Yeezus - Black/Red - Industrial/minimal
    'yeezus': {
        primary: '#FF0000',  // Red as primary for better visibility
        secondary: '#FF0000',
        background: '#1A1A1A',  // Very dark grey instead of pure black
        text: '#FFFFFF',
        tertiary: '#FF4500',  // Orange Red
        headerFont: '"Impact", "Arial Black", sans-serif',
        bodyFont: '"Arial", "Helvetica Neue", sans-serif'
    },
    // The Life of Pablo - Orange/Black - Handwritten/chaotic
    'tlop': {
        primary: '#FF6F00',
        secondary: '#000000',
        background: '#E65100',
        text: '#FFFFFF',
        tertiary: '#FFEB3B',  // Yellow
        headerFont: '"Marker Felt", "Comic Sans MS", cursive',
        bodyFont: '"Helvetica Neue", Arial, sans-serif'
    },
    // Ye - Blue/Light Blue - Simple/handwritten
    'ye': {
        primary: '#2196F3',
        secondary: '#64B5F6',  // Changed from white to light blue for better readability
        background: '#1565C0',
        text: '#FFFFFF',
        tertiary: '#29E753',  // Neon green from album cover
        headerFont: '"Marker Felt", "Bradley Hand", cursive',
        bodyFont: '"Arial", sans-serif'
    },
    // Kids See Ghosts - Pink/Orange/Purple - Psychedelic
    'ksg': {
        primary: '#FF1493',
        secondary: '#FF8C00',
        background: '#8B008B',
        text: '#FFFFFF',
        tertiary: '#00CED1',  // Dark Turquoise
        headerFont: '"Papyrus", "Bradley Hand", fantasy',
        bodyFont: '"Comic Sans MS", cursive'
    },
    // Jesus Is King - Blue - Gospel/spiritual
    'jik': {
        primary: '#0000CD',
        secondary: '#4169E1',
        background: '#000080',
        text: '#FFFFFF',
        tertiary: '#FFD700',  // Gold
        headerFont: '"Book Antiqua", "Palatino", serif',
        bodyFont: '"Book Antiqua", Georgia, serif'
    },
    // Donda - Black - Minimal/stark
    'donda': {
        primary: '#FF6B35',  // Orange hue similar to album cover
        secondary: '#FF8C42',  // Lighter orange as secondary
        background: '#000000',
        text: '#FFFFFF',
        tertiary: '#4B0082',  // Indigo
        headerFont: '"Arial Black", "Impact", sans-serif',
        bodyFont: '"Arial", sans-serif'
    },
    // Donda 2 - Black - Digital/futuristic
    'donda2': {
        primary: '#8B008B',  // Dark Magenta as primary for visibility
        secondary: '#666666',  // Grey as secondary
        background: '#0A0A0A',
        text: '#FFFFFF',
        tertiary: '#8B008B',  // Dark Magenta
        headerFont: '"Orbitron", "Courier New", monospace',
        bodyFont: '"Roboto Mono", monospace'
    },
    // Vultures 1 - Black/Brown - Gothic/heavy
    'v1': {
        primary: '#D2691E',  // Chocolate brown as primary for visibility
        secondary: '#8B4513',
        background: '#1A0F08',
        text: '#FFFFFF',
        tertiary: '#D2691E',  // Chocolate
        headerFont: '"Franklin Gothic Heavy", "Impact", sans-serif',
        bodyFont: '"Franklin Gothic Medium", Arial, sans-serif'
    },
    // Vultures 2 - Black/Brown - Gothic/heavy
    'v2': {
        primary: '#CD853F',  // Peru/tan as primary for visibility
        secondary: '#654321',
        background: '#0F0A05',
        text: '#FFFFFF',
        tertiary: '#CD853F',  // Peru
        headerFont: '"Franklin Gothic Heavy", "Impact", sans-serif',
        bodyFont: '"Franklin Gothic Medium", Arial, sans-serif'
    }
};

// Function to get album colors with fallback
function getAlbumColors(albumId) {
    return albumColors[albumId] || {
        primary: '#000000',
        secondary: '#D4AF37',
        background: '#1A1A1A',
        text: '#FFFFFF',
        tertiary: '#666666',
        headerFont: '"Helvetica Neue", Arial, sans-serif',
        bodyFont: '"Helvetica Neue", Arial, sans-serif'
    };
}

// Export for use in other modules
window.albumColors = albumColors;
window.getAlbumColors = getAlbumColors;