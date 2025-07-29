// Filter songs to only include top 200 from Spotify data
const fs = require('fs');
const path = require('path');

// Load the top songs data
const { topSongs, titleMap } = require('./parse-top-songs.js');

// Load current songs database
const songsPath = path.join(__dirname, '../data/songs.json');
const songsData = JSON.parse(fs.readFileSync(songsPath, 'utf8'));

// Create a map for faster lookup (normalized titles)
const topSongMap = new Map();
topSongs.forEach((song, index) => {
    const normalizedTitle = song.title.toLowerCase().replace(/[^\w\s]/g, '');
    topSongMap.set(normalizedTitle, { ...song, rank: index + 1 });
    
    // Also add mapped versions
    if (titleMap[song.title]) {
        const mappedNormalized = titleMap[song.title].toLowerCase().replace(/[^\w\s]/g, '');
        topSongMap.set(mappedNormalized, { ...song, rank: index + 1 });
    }
});

// Add some manual mappings for songs with different names in our database
const manualMappings = {
    "niggas in paris": "ni**as in paris",
    "i love it & lil pump": "i love it",
    "dont like1": "dont like",
    "pt 2": "father stretch my hands pt 2",
    "jail pt 2": "jail pt 2",
    "facts charlie heat version": "facts charlie heat version",
    "all of the lights interlude": "all of the lights interlude",
    "diamonds from sierra leone remix": "diamonds from sierra leone remix",
    "ham": "h•a•m",
    "ok ok": "ok ok",
    "cant tell me nothing": "can't tell me nothing",
    "everything i am": "everything i am",
    "wouldnt leave": "wouldn't leave"
};

// Filter songs
const filteredSongs = [];
const notFoundSongs = [];

songsData.songs.forEach(song => {
    const normalizedTitle = song.title.toLowerCase().replace(/[^\w\s]/g, '');
    
    // Check if this song is in top songs
    let topSongInfo = topSongMap.get(normalizedTitle);
    
    // Try manual mappings if not found
    if (!topSongInfo && manualMappings[normalizedTitle]) {
        const mappedTitle = manualMappings[normalizedTitle].replace(/[^\w\s]/g, '');
        topSongInfo = topSongMap.get(mappedTitle);
    }
    
    if (topSongInfo) {
        // Add ranking info to the song
        filteredSongs.push({
            ...song,
            spotifyRank: topSongInfo.rank,
            spotifyStreams: topSongInfo.streams
        });
    } else {
        notFoundSongs.push(song.title);
    }
});

// Sort filtered songs by Spotify rank
filteredSongs.sort((a, b) => a.spotifyRank - b.spotifyRank);

// Create new data structure
const filteredData = {
    ...songsData,
    songs: filteredSongs,
    totalSongs: filteredSongs.length,
    lastFiltered: new Date().toISOString()
};

// Save backup of original
const backupPath = path.join(__dirname, '../data/songs-backup.json');
if (!fs.existsSync(backupPath)) {
    fs.writeFileSync(backupPath, JSON.stringify(songsData, null, 2));
    console.log('Created backup at:', backupPath);
}

// Save filtered data
fs.writeFileSync(songsPath, JSON.stringify(filteredData, null, 2));

console.log(`\nFiltering complete!`);
console.log(`- Total songs before: ${songsData.songs.length}`);
console.log(`- Total songs after: ${filteredSongs.length}`);
console.log(`- Songs removed: ${songsData.songs.length - filteredSongs.length}`);
console.log(`\nTop 10 songs in filtered database:`);
filteredSongs.slice(0, 10).forEach(song => {
    console.log(`  ${song.spotifyRank}. ${song.title} (${song.spotifyStreams.toLocaleString()} streams)`);
});

// Log songs that weren't found in top list (for debugging)
if (notFoundSongs.length > 0 && notFoundSongs.length < 50) {
    console.log(`\nSongs not in top 200 (first 50):`, notFoundSongs.slice(0, 50));
}