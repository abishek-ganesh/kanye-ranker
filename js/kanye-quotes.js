// Kanye West Quote Cycling System
(function() {
    // Collection of Kanye quotes
    const kanyeQuotes = {
        main: [
            {
                quote: "My greatest pain in life is that I will never be able to see myself perform live.",
                type: "humorous"
            },
            {
                quote: "I am the number one human being in music. That means any person that's living or breathing is number two.",
                type: "confident"
            },
            {
                quote: "When I think of competition it's like I try to create against the past. I think about Michelangelo and Picasso, you know, the pyramids.",
                type: "inspirational"
            },
            {
                quote: "50 is Eminem's favorite rapper. I'm my favorite rapper.",
                type: "humorous"
            },
            {
                quote: "I hate when I'm on a plane and I wake up with a water bottle next to me like oh great now I gotta be responsible for this water bottle.",
                type: "philosophical"
            },
            {
                quote: "People will have a problem with whatever you do. At the end of the day, nobody can determine what you need to do in order to be successful and why would you listen to someone who is not successful tell you what you need to do?",
                type: "inspirational"
            },
            {
                quote: "My music isn't just music – it's medicine.",
                type: "confident"
            },
            {
                quote: "I don't even listen to rap. My apartment is too nice to listen to rap in.",
                type: "humorous"
            },
            {
                quote: "People always tell you to be humble. When was the last time someone told you to be amazing?",
                type: "inspirational"
            },
            {
                quote: "If you're a Kanye West fan, you're not a fan of me; you're a fan of yourself. You will believe in yourself. I'm just the espresso. I'm just the shot in the morning to get you going. Make you believe that you can overcome that situation that you're dealing with all the time.",
                type: "inspirational"
            },
            {
                quote: "Look at Gaga she's the creative director of Polaroid. I like some of the Gaga songs but what the f*** does she know about cameras?",
                type: "confident"
            }
        ],
        bottom: [
            {
                quote: "I still think I am the greatest.",
                type: "confident"
            },
            {
                quote: "Name one genius that ain't crazy.",
                type: "philosophical"
            },
            {
                quote: "Everything I'm not made me everything I am.",
                type: "inspirational"
            },
            {
                quote: "Everybody want to know what I'd do if I didn't win. I guess we'll never know.",
                type: "confident"
            },
            {
                quote: "We all self-conscious. I'm just the first to admit it.",
                type: "honest"
            },
            {
                quote: "If I got any cooler I would freeze to death.",
                type: "inspirational"
            },
            {
                quote: "I'm like a vessel, and God has chosen me to be the voice.",
                type: "spiritual"
            },
            {
                quote: "People talk so much s*** about me in barbershops, they forget to get their hair cut",
                type: "honest"
            },
            {
                quote: "I no longer have a manager. I can’t be managed.",
                type: "inspirational"
            },
            {
                quote: "I need a room full of mirrors so I can be surrounded by winners.",
                type: "inspirational"
            }
        ]
    };

    // Function to get a random quote
    function getRandomQuote(quoteArray) {
        return quoteArray[Math.floor(Math.random() * quoteArray.length)];
    }

    // Function to set the main quote (called once on load)
    function setMainQuote() {
        const mainQuoteElement = document.querySelector('.main-quote');
        
        if (mainQuoteElement) {
            const mainQuote = getRandomQuote(kanyeQuotes.main);
            mainQuoteElement.textContent = `"${mainQuote.quote}"`;
            mainQuoteElement.dataset.quoteType = mainQuote.type;
        }
    }

    // Function to update bottom quote only
    function updateBottomQuote() {
        const bottomQuoteElement = document.querySelector('.bottom-quote p');
        
        if (bottomQuoteElement) {
            const bottomQuote = getRandomQuote(kanyeQuotes.bottom);
            bottomQuoteElement.textContent = `"${bottomQuote.quote}"`;
            bottomQuoteElement.dataset.quoteType = bottomQuote.type;
        }
    }

    // Function to cycle bottom quote with fade effect
    function cycleBottomQuote() {
        const bottomQuoteElement = document.querySelector('.bottom-quote p');
        
        // Fade out
        if (bottomQuoteElement) {
            bottomQuoteElement.style.transition = 'opacity 0.5s ease';
            bottomQuoteElement.style.opacity = '0';
        }
        
        // Update quote after fade out
        setTimeout(() => {
            updateBottomQuote();
            
            // Fade in
            if (bottomQuoteElement) {
                bottomQuoteElement.style.opacity = '1';
            }
        }, 500);
    }

    // Initialize when DOM is ready
    function init() {
        // Set the main quote once (random on page load)
        setMainQuote();
        
        // Start cycling bottom quote after a delay
        setTimeout(() => {
            cycleBottomQuote();
            // Then cycle every 10 seconds
            setInterval(cycleBottomQuote, 10000);
        }, 5000); // Start cycling after 5 seconds
    }

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();