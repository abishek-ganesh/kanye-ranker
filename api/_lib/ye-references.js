// Kanye's own words for the taste card to riff on: one short, famous line per entry, never a verse.
// Only lines that are easy to verify belong here; the model is told to use nothing outside this file.
// `songs` is keyed by the exact title in data/songs.json (tests check every key exists).
module.exports = {
    songs: {
        'All Falls Down': ["We all self-conscious, I'm just the first to admit it"],
        'Through the Wire': ['I drink a Boost for breakfast, an Ensure for dessert'],
        'Jesus Walks': ['They say you can rap about anything except for Jesus'],
        'Spaceship': ['I wish I could buy me a spaceship and fly past the sky'],
        "We Don't Care": ["We wasn't supposed to make it past 25, joke's on you, we still alive"],
        'Last Call': ['Mayonnaise-colored Benz, I push Miracle Whips'],
        'Gold Digger': ["I ain't saying she a gold digger", 'We want prenup!'],
        'Touch the Sky': ['I gotta testify, come up in the spot looking extra fly'],
        "Heard 'Em Say": ["Nothing's ever promised tomorrow today"],
        'Stronger': ["That that don't kill me can only make me stronger", 'Bow in the presence of greatness'],
        'Flashing Lights': ["She don't believe in shooting stars, but she believe in shoes and cars"],
        "Can't Tell Me Nothing": ["Wait 'til I get my money right", "You can't tell me nothing"],
        'Good Life': ['Welcome to the good life'],
        'Good Morning': ['On this day we become legendary'],
        'Everything I Am': ["Everything I'm not made me everything I am"],
        'Champion': ['Did you realize that you were a champion in their eyes?'],
        'Homecoming': ['Do you think about me now and then?'],
        'Heartless': ['How could you be so heartless?'],
        'Love Lockdown': ['Keep your love locked down'],
        'Welcome to Heartbreak': ['My friend showed me pictures of his kids, and all I could show him was pictures of my cribs'],
        'POWER': ['No one man should have all that power', 'I guess every superhero need his theme music'],
        'Runaway': ["Let's have a toast for the douchebags", 'Run away fast as you can'],
        'All of the Lights': ['Turn up the lights in here, baby'],
        'Monster': ['My presence is a present'],
        'Dark Fantasy': ['Can we get much higher?'],
        'Niggas in Paris': ['That s*** cray', 'Ball so hard'],
        'Otis': ["Sounds so soulful, don't you agree?"],
        'Who Gon Stop Me': ['Who gon stop me, huh?'],
        'Bound 2': ['Uh-huh, honey'],
        'I Am a God': ['Hurry up with my damn croissants'],
        'New Slaves': ["You see it's leaders and it's followers"],
        'Ultralight Beam': ['This is a God dream, this is everything'],
        'Father Stretch My Hands, Pt. 1': ['I just wanna feel liberated'],
        'Waves': ["Waves don't die"],
        'No More Parties in LA': ['No more parties in L.A.'],
        'I Love Kanye': ['I miss the old Kanye', 'I love you like Kanye loves Kanye'],
        'Real Friends': ['Real friends, how many of us?'],
        'Feedback': ["Name one genius that ain't crazy"],
        'Facts (Charlie Heat Version)': ['Yeezy just jumped over Jumpman'],
        'Ghost Town': ['I feel kinda free'],
        'Closed on Sunday': ["Closed on Sunday, you're my Chick-fil-A"],
        'Jail': ["Guess who's going to jail tonight?"]
    },

    // Running gags from the skits, described rather than quoted
    skits: {
        cd: 'The College Dropout skits mock college: a man brags about stacking degree after degree while staying broke, and Lil Jimmy inherits nothing from his father but degrees.',
        lr: 'The Late Registration skits follow Broke Phi Broke, a fraternity proud of having no money that throws Kanye out for owning new shoes and making beats on the side.'
    },

    // Facts a fan knows about the newer albums, in our own words (no lyrics on file for these); offered when the album is on the list
    albums: {
        donda2: 'Donda 2 (2022) launched only on his own Stem Player, a $200 handheld gadget, with no Apple Music, Spotify or YouTube. On release day buyers got just four songs; the rest came later.',
        v1: 'Vultures 1 (2024) brought back explicit lyrics after two clean albums. Carnival, built on a chant sung by a couple of hundred Inter Milan football ultras, hit #1 on the Billboard Hot 100, his first #1 song in 13 years.',
        v2: 'Vultures 2 (2024) missed release dates for months, then dropped by surprise in the middle of the night, and critics panned it for sounding unfinished.',
        bully: 'Bully (2026) is mostly him singing, not rapping, over sample-heavy beats that nod to his early records. Rough versions came out a year early, it was delayed several times, and critics split on whether it was a return to form or a copy of his own past.'
    },

    // Tweets and interview moments
    sayings: [
        "I'ma let you finish, but...",
        "You ain't got the answers!",
        'I am Shakespeare in the flesh.',
        'Sometimes I get emotional over fonts.',
        'Fur pillows are hard to actually sleep on.',
        'I specifically ordered persian rugs with cherub imagery!!!',
        'I make awesome decisions in bike stores!!!',
        'Poopy-di scoop. Scoop-diddy-whoop.',
        'Yeezy season approaching.'
    ]
};
