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
                quote: "Nothing in life is promised except death.",
                type: "philosophical"
            },
            {
                quote: "If you have the opportunity to play this game called life, you have to appreciate every moment.",
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
                quote: "I feel like I'm too busy writing history to read it.",
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
                quote: "I'm a creative genius and there's no other way to word it.",
                type: "confident"
            },
            {
                quote: "We all self-conscious. I'm just the first to admit it.",
                type: "honest"
            },
            {
                quote: "The time is now to express yourself.",
                type: "inspirational"
            },
            {
                quote: "I'm like a vessel, and God has chosen me to be the voice.",
                type: "spiritual"
            },
            {
                quote: "One of my biggest Achilles heels has been my ego.",
                type: "honest"
            },
            {
                quote: "Keep your nose out the sky, keep your heart to God, and keep your face to the rising sun.",
                type: "inspirational"
            },
            {
                quote: "Believe in your flyness, conquer your shyness.",
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