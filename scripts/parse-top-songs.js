// Parse top songs from the Spotify data and filter our database

const topSongs = [
    { title: "Heartless", streams: 1703659856 },
    { title: "Ni**as In Paris", streams: 1653280180 },
    { title: "Stronger", streams: 1617804444 },
    { title: "Flashing Lights", streams: 1419689793 },
    { title: "Gold Digger", streams: 1366080931 },
    { title: "Father Stretch My Hands Pt. 1", streams: 1365716444 },
    { title: "FourFiveSeconds", streams: 1268258826 },
    { title: "Bound 2", streams: 1182667292 },
    { title: "POWER", streams: 1061129135 },
    { title: "I Wonder", streams: 965849281 },
    { title: "Runaway", streams: 960713094 },
    { title: "American Boy", streams: 909694392 },
    { title: "Homecoming", streams: 883755986 },
    { title: "All Falls Down", streams: 881463162 },
    { title: "All Of The Lights", streams: 821348106 },
    { title: "Violent Crimes", streams: 812676995 },
    { title: "Can't Tell Me Nothing", streams: 792747992 },
    { title: "CARNIVAL", streams: 778447451 },
    { title: "I Love It", streams: 745397293 },
    { title: "Forever", streams: 698833428 },
    { title: "Black Skinhead", streams: 672648490 },
    { title: "Famous", streams: 663462566 },
    { title: "Ghost Town", streams: 657756299 },
    { title: "Run This Town", streams: 653122433 },
    { title: "Devil In A New Dress", streams: 599129950 },
    { title: "All Mine", streams: 558561823 },
    { title: "Good Life", streams: 524117767 },
    { title: "Praise God", streams: 521896956 },
    { title: "Waves", streams: 494270654 },
    { title: "Follow God", streams: 489917477 },
    { title: "No Church In The Wild", streams: 489372089 },
    { title: "Mixed Personalities", streams: 455307539 },
    { title: "Hurricane", streams: 449594999 },
    { title: "Mercy", streams: 437798036 },
    { title: "Touch The Sky", streams: 437262415 },
    { title: "Through The Wire", streams: 423721025 },
    { title: "Monster", streams: 414728473 },
    { title: "Knock You Down", streams: 412496203 },
    { title: "Ultralight Beam", streams: 382774828 },
    { title: "Good Morning", streams: 369027775 },
    { title: "True Love", streams: 363288970 },
    { title: "Moon", streams: 356009473 },
    { title: "Erase Me", streams: 353429540 },
    { title: "Clique", streams: 347694700 },
    { title: "Champions", streams: 308449381 },
    { title: "Off The Grid", streams: 304585431 },
    { title: "Jesus Walks", streams: 302585879 },
    { title: "Everything I Am", streams: 301646541 },
    { title: "Wolves", streams: 299127312 },
    { title: "Champion", streams: 297257543 },
    { title: "No More Parties In LA", streams: 293639502 },
    { title: "Otis", streams: 292425174 },
    { title: "Put On", streams: 287688126 },
    { title: "E.T.", streams: 287060771 },
    { title: "Don't Like", streams: 264545852 },
    { title: "Pt. 2", streams: 264531165 },
    { title: "Slow Jamz", streams: 261842114 },
    { title: "Gorgeous", streams: 260731482 },
    { title: "Fade", streams: 260308396 },
    { title: "Gotta Have It", streams: 259014575 },
    { title: "Jukebox Joints", streams: 258927557 },
    { title: "Dark Fantasy", streams: 255533255 },
    { title: "Yikes", streams: 241609388 },
    { title: "BURN", streams: 240595207 },
    { title: "FML", streams: 237767184 },
    { title: "THat Part", streams: 236169839 },
    { title: "Saint Pablo", streams: 228098225 },
    { title: "Real Friends", streams: 222685380 },
    { title: "Love Lockdown", streams: 221491750 },
    { title: "Watch", streams: 219457067 },
    { title: "Blood On The Leaves", streams: 213557386 },
    { title: "Why I Love You", streams: 209729702 },
    { title: "FUK SUMN", streams: 204301204 },
    { title: "On Sight", streams: 195505180 },
    { title: "God Is", streams: 185152131 },
    { title: "FIELD TRIP", streams: 178227077 },
    { title: "Amazing", streams: 178179631 },
    { title: "All We Got", streams: 176808803 },
    { title: "All Day", streams: 172187223 },
    { title: "Ego Death", streams: 170225945 },
    { title: "Heard 'Em Say", streams: 163679316 },
    { title: "SMUCKERS", streams: 163498472 },
    { title: "New Slaves", streams: 159797098 },
    { title: "One Man Can Change The World", streams: 152265520 },
    { title: "Jail", streams: 149249989 },
    { title: "MAMA", streams: 146769411 },
    { title: "Hold My Liquor", streams: 143236393 },
    { title: "Believe What I Say", streams: 141844072 },
    { title: "Go2DaMoon", streams: 140177686 },
    { title: "Drunk in Love Remix", streams: 138869958 },
    { title: "City of Gods", streams: 133087694 },
    { title: "Family Business", streams: 132473268 },
    { title: "30 Hours", streams: 131998113 },
    { title: "Feedback", streams: 130843938 },
    { title: "I Love Kanye", streams: 129809326 },
    { title: "Wouldn't Leave", streams: 128479370 },
    { title: "Closed On Sunday", streams: 128464773 },
    { title: "Lost In The World", streams: 121416342 },
    { title: "No Mistakes", streams: 121194237 },
    { title: "Hey Mama", streams: 120738569 },
    { title: "Spaceship", streams: 120559781 },
    { title: "I Thought About Killing You", streams: 116887200 },
    { title: "Hell Of A Life", streams: 116060142 },
    { title: "Paranoid", streams: 115600571 },
    { title: "We Don't Care", streams: 114180765 },
    { title: "Only One", streams: 113844185 },
    { title: "No Child Left Behind", streams: 113013970 },
    { title: "BACK TO ME", streams: 112930831 },
    { title: "Highlights", streams: 112925243 },
    { title: "Eazy", streams: 111814055 },
    { title: "Tell The Vision", streams: 107027233 },
    { title: "Who Gon Stop Me", streams: 106927981 },
    { title: "Hot Shit", streams: 106494700 },
    { title: "Make Her Say", streams: 106158742 },
    { title: "Selah", streams: 105154357 },
    { title: "The Glory", streams: 105042111 },
    { title: "Drive Slow", streams: 104681368 },
    { title: "The New Workout Plan", streams: 104189771 },
    { title: "On God", streams: 103636010 },
    { title: "Heaven and Hell", streams: 101394984 },
    { title: "Facts (Charlie Heat Version)", streams: 101318943 },
    { title: "So Appalled", streams: 100833361 },
    { title: "Pure Souls", streams: 100358001 },
    { title: "Lift Yourself", streams: 100331521 },
    { title: "Blame Game", streams: 100323551 },
    { title: "Use This Gospel", streams: 98498251 },
    { title: "I Won", streams: 94946071 },
    { title: "Welcome To Heartbreak", streams: 91356050 },
    { title: "Everything We Need", streams: 91185726 },
    { title: "Street Lights", streams: 90943001 },
    { title: "U Mad", streams: 90653874 },
    { title: "Frank's Track", streams: 90485239 },
    { title: "DO IT", streams: 90382750 },
    { title: "Never Let Me Down", streams: 89668713 },
    { title: "Alors On Danse - Remix", streams: 88042208 },
    { title: "Freestyle 4", streams: 87496051 },
    { title: "I Am A God", streams: 87467824 },
    { title: "Roses", streams: 87103382 },
    { title: "Diamonds From Sierra Leone - Remix", streams: 86738262 },
    { title: "24", streams: 86173694 },
    { title: "Glow", streams: 85164100 },
    { title: "Birthday Song", streams: 84884428 },
    { title: "STARS", streams: 84392420 },
    { title: "Big Brother", streams: 81919293 },
    { title: "We Major", streams: 81320917 },
    { title: "All Of The Lights (Interlude)", streams: 80631171 },
    { title: "Wash Us In The Blood", streams: 78517068 },
    { title: "Barry Bonds", streams: 78406024 },
    { title: "Life Of The Party", streams: 77483522 },
    { title: "Jonah", streams: 76421320 },
    { title: "Come to Life", streams: 76115677 },
    { title: "One Minute", streams: 75208022 },
    { title: "Remote Control", streams: 73112190 },
    { title: "Send It Up", streams: 72429520 },
    { title: "I'm In It", streams: 71456389 },
    { title: "Low Lights", streams: 70735823 },
    { title: "Jail pt 2", streams: 70104819 },
    { title: "New Again", streams: 69313531 },
    { title: "Lift Off", streams: 68778814 },
    { title: "Two Words", streams: 68346181 },
    { title: "Drunk and Hot Girls", streams: 67461183 },
    { title: "Get Em High", streams: 66804395 },
    { title: "Selfish", streams: 66734075 },
    { title: "Blessings - Extended Version", streams: 66460118 },
    { title: "Junya", streams: 66118389 },
    { title: "Keep My Spirit Alive", streams: 66032695 },
    { title: "TALKING", streams: 65839541 },
    { title: "Ok Ok", streams: 63814705 },
    { title: "H•A•M", streams: 63624324 },
    { title: "PAID", streams: 63005559 },
    { title: "VULTURES", streams: 62558467 },
    { title: "Murder To Excellence", streams: 61950724 },
    { title: "All Your Fault", streams: 61604930 },
    { title: "Every Hour", streams: 61387691 },
    { title: "Last Call", streams: 60627052 },
    { title: "Water", streams: 60591138 },
    { title: "Lord I Need You", streams: 60042783 },
    { title: "Guilt Trip", streams: 59904512 },
    { title: "PAPERWORK", streams: 58083820 },
    { title: "Tiimmy Turner - Remix", streams: 57290726 },
    { title: "Hands On", streams: 56961807 },
    { title: "KANGA", streams: 56452239 },
    { title: "Gone", streams: 56057575 },
    { title: "God Breathed", streams: 55123317 },
    { title: "Coldest Winter", streams: 54808356 },
    { title: "Marvin & Chardonnay", streams: 54408970 },
    { title: "Jesus Lord", streams: 54323068 },
    { title: "Piss On Your Grave", streams: 53510850 },
    { title: "Addiction", streams: 52968257 }
];

// Map of common title variations
const titleMap = {
    "Ni**as In Paris": "Niggas In Paris",
    "POWER": "Power",
    "Father Stretch My Hands Pt. 1": "Father Stretch My Hands, Pt. 1",
    "I Love It": "I Love It",
    "Can't Tell Me Nothing": "Can't Tell Me Nothing",
    "All Of The Lights": "All of the Lights",
    "THat Part": "THat Part",
    "Don't Like": "Don't Like.1",
    "Slow Jamz": "Slow Jamz",
    "BURN": "Burn",
    "FUK SUMN": "Fuck Sumn",
    "FIELD TRIP": "Field Trip",
    "SMUCKERS": "Smuckers",
    "MAMA": "Mama",
    "Go2DaMoon": "Go2DaMoon",
    "BACK TO ME": "Back to Me",
    "Tell The Vision": "Tell the Vision",
    "Hot Shit": "Hot Shit",
    "Facts (Charlie Heat Version)": "Facts (Charlie Heat Version)",
    "I Won": "I Won",
    "U Mad": "U Mad",
    "DO IT": "Do It",
    "Alors On Danse - Remix": "Alors on Danse",
    "Diamonds From Sierra Leone - Remix": "Diamonds from Sierra Leone (Remix)",
    "STARS": "Stars",
    "All Of The Lights (Interlude)": "All of the Lights (Interlude)",
    "Life Of The Party": "Life of the Party",
    "Jail pt 2": "Jail, Pt. 2",
    "Ok Ok": "Ok Ok",
    "H•A•M": "H•A•M",
    "PAID": "Paid",
    "VULTURES": "Vultures",
    "Murder To Excellence": "Murder to Excellence",
    "All Your Fault": "All Your Fault",
    "PAPERWORK": "Paperwork",
    "Tiimmy Turner - Remix": "Tiimmy Turner (Remix)",
    "KANGA": "Kanga",
    "Marvin & Chardonnay": "Marvin & Chardonnay",
    "Piss On Your Grave": "Piss on Your Grave"
};

// Create a set of top song titles for faster lookup
const topSongTitles = new Set();
topSongs.forEach(song => {
    topSongTitles.add(song.title.toLowerCase());
    // Also add mapped versions
    if (titleMap[song.title]) {
        topSongTitles.add(titleMap[song.title].toLowerCase());
    }
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { topSongs, topSongTitles, titleMap };
}

console.log(`Parsed ${topSongs.length} top songs from Spotify data`);