# Kanye Ranker Algorithms Documentation

This document provides a detailed explanation of the three core algorithms powering the Kanye Ranker application:

1. **Song Pairing Algorithm** - Determines which songs to compare next
2. **ELO Rating System** - Calculates song rankings based on comparisons
3. **Album Ranking Algorithm** - Generates album rankings from individual song ratings

---

## 1. Song Pairing Algorithm

### Overview
The song pairing algorithm uses a dynamic, phase-based approach to intelligently select which songs to compare next. It balances exploration (discovering preferences) with exploitation (refining rankings).

### Key Components

#### A. Phase System
The algorithm progresses through 5 distinct phases based on the number of completed comparisons:

```javascript
Phase 1 (0-14 comparisons):    Top 20 most popular songs only
Phase 2 (15-29 comparisons):   Top 50 songs
Phase 3 (30-49 comparisons):   Top 100 songs  
Phase 4 (50-79 comparisons):   All songs
Phase 5 (80+ comparisons):     Finals mode - refining top rankings
```

**Rationale**: Starting with popular songs helps users quickly establish baseline preferences before exploring deeper cuts.

#### B. Carry-Over Mechanism
When a song wins a comparison, it has a 75% chance of appearing in the next comparison against a new opponent.

**Benefits**:
- Quickly establishes rating for songs the user likes
- Reduces cognitive load by maintaining context
- Allows for rapid rating convergence

**Fatigue Prevention**:
- Max 3 consecutive wins before forcing a new pair
- Mental break after 7 comparisons without a fresh pair
- Position consistency: carried-over songs maintain their visual position (left/right)

#### C. Album Diversity
In the first 40 comparisons, the algorithm ensures representation from different albums:

1. **Unshown Album Priority** (90% of the time in early comparisons)
   - Selects songs from albums not yet seen
   - Uses top 1-2 mainstream songs per album
   - Excludes interludes, skits, and deep cuts

2. **Classic Album Boost** (20-30% chance in phases 1-4)
   - Prioritizes songs from "golden era" albums
   - Includes: College Dropout, Late Registration, Graduation, 808s, MBDTF, etc.
   - 70% chance to pair two classic album songs together

#### D. Smart Opponent Selection
When carrying over a winner, the algorithm selects opponents based on:

1. **Rating Proximity** (50% of selections)
   - Finds songs within ±150 rating points
   - Creates competitive matchups
   - Helps establish accurate rankings

2. **Uncertainty Targeting** (30% of selections)
   - Prioritizes songs with few comparisons
   - High rating variance candidates
   - Helps gather more data on uncertain songs

3. **User Favorites** (20% of selections)
   - Matches against other songs the user has chosen as winners
   - Creates "championship" style matchups
   - Refines top-tier rankings

### Example Scenario

**User at comparison #8 (Phase 1):**
```
Current winner: "Stronger" (won last comparison, position: left)
Algorithm decision process:
1. Check carry-over: Yes (75% probability hit, only 1 consecutive win)
2. Select opponent pool: Top 20 songs only (Phase 1)
3. Choose selection strategy: Rating proximity (50% roll)
4. Find candidates: Songs rated 1450-1600 (Stronger is at 1525)
5. Filter: Remove already compared songs
6. Select: "Gold Digger" (rating: 1510)
7. Position: ["Gold Digger", "Stronger"] (maintain left position)
```

---

## 2. ELO Rating System

### Overview
The ELO system (adapted from chess) provides a mathematical framework for updating song ratings based on comparison outcomes. Each song starts at 1500 rating points.

### Core Formula

```
Expected Score = 1 / (1 + 10^((RatingB - RatingA) / 400))
New Rating = Old Rating + K × (Actual Score - Expected Score)
```

Where:
- **Actual Score**: 1 for winner, 0 for loser
- **K-factor**: Determines rating volatility (see below)

### Dynamic K-Factor System

The K-factor decreases as songs accumulate more comparisons, creating rating stability over time:

```
Comparisons    K-Factor    Effect
< 3            48          ±48 points max per comparison
3-6            32          ±32 points max per comparison  
7+             16          ±16 points max per comparison
```

**Rationale**: New songs need high volatility to quickly find their true rating, while established songs should have stable ratings.

### Rating Confidence Score

The system calculates confidence in each song's rating based on:

1. **Comparison Count** (60% weight)
   - More comparisons = higher confidence
   - Capped at 10 comparisons for full weight

2. **Win Rate Extremity** (30% weight)
   - Very high (>80%) or very low (<20%) win rates indicate clear preferences
   - Middle win rates (40-60%) suggest uncertain positioning

3. **Recency** (10% weight)
   - Recently compared songs have higher confidence
   - Confidence decays over 50 comparisons

### Example Calculation

**Scenario**: "Runaway" (1550) defeats "Heartless" (1480)

```
1. Expected Scores:
   - Runaway: 1 / (1 + 10^((1480-1550)/400)) = 0.61
   - Heartless: 1 / (1 + 10^((1550-1480)/400)) = 0.39

2. K-Factors:
   - Runaway: 5 previous comparisons → K = 32
   - Heartless: 2 previous comparisons → K = 48

3. New Ratings:
   - Runaway: 1550 + 32 × (1 - 0.61) = 1550 + 12.48 = 1562
   - Heartless: 1480 + 48 × (0 - 0.39) = 1480 - 18.72 = 1461
```

---

## 3. Album Ranking Algorithm

### Overview
The album ranking algorithm generates a composite score that balances both song quality and quantity, preventing albums with single standout tracks from dominating.

### Scoring Components

The final score is calculated using four weighted factors:

```
Final Score = Quality Score × Song Count Penalty

Quality Score = 
  (40% × Normalized Average Rating) +
  (30% × Normalized Median Rating) +
  (20% × Top Songs Ratio) +
  (10% × Good Songs Ratio)

Song Count Penalty = 0.8 + 0.2 × min(1, compared_songs / 5)
```

### Factor Explanations

#### 1. Average Rating (40% weight)
- Traditional metric: sum of ratings / number of songs
- Vulnerable to outliers but represents overall quality

#### 2. Median Rating (30% weight)
- Middle song rating when sorted
- Robust against single outliers
- Better represents "typical" song quality

#### 3. Top Songs Ratio (20% weight)
- Percentage of album songs in top 20% of all rankings
- Identifies albums with multiple standout tracks
- Dynamically calculated based on user's ranking distribution

#### 4. Good Songs Ratio (10% weight)
- Percentage of album songs in top 40% of all rankings
- Rewards consistent quality across the album

#### 5. Song Count Penalty
- Albums need 5+ compared songs for full score
- 2 songs: 20% penalty (0.84 multiplier)
- 3 songs: 12% penalty (0.88 multiplier)
- 4 songs: 4% penalty (0.96 multiplier)
- 5+ songs: No penalty (1.0 multiplier)

### Example Calculation

**Album: "ye" (Ghost Town scenario)**
```
Compared Songs: 3 (Ghost Town, Violent Crimes, Yikes)
Ratings: [1750, 1420, 1380]
User's top 20% threshold: 1650
User's top 40% threshold: 1500

1. Average Rating: (1750 + 1420 + 1380) / 3 = 1516.67
2. Median Rating: 1420
3. Top Songs: 1/3 (only Ghost Town > 1650) = 33.3%
4. Good Songs: 1/3 (only Ghost Town > 1500) = 33.3%

5. Normalized Scores:
   - Avg: (1516.67 - 1000) / 1000 = 0.517
   - Median: (1420 - 1000) / 1000 = 0.420

6. Quality Score:
   (0.4 × 0.517) + (0.3 × 0.420) + (0.2 × 0.333) + (0.1 × 0.333)
   = 0.207 + 0.126 + 0.067 + 0.033 = 0.433

7. Song Count Penalty: 0.8 + 0.2 × (3/5) = 0.92

8. Final Score: 0.433 × 0.92 = 0.398
```

**Album: "MBDTF" (Multiple hits scenario)**
```
Compared Songs: 8 (Power, Runaway, All of the Lights, etc.)
Ratings: [1780, 1750, 1720, 1680, 1650, 1620, 1580, 1550]
Top/Good songs: 5/8 = 62.5% top tier, 8/8 = 100% good tier

Quality Score: 0.685
Song Count Penalty: 1.0 (8 > 5)
Final Score: 0.685
```

**Result**: MBDTF ranks significantly higher due to consistent quality across multiple songs.

### Edge Case Handling

1. **Minimum Threshold**: Albums need 2+ compared songs to be ranked
2. **Percentile Calculation**: Uses actual user rankings, not fixed thresholds
3. **Normalization**: Assumes ratings typically range 1000-2000
4. **Robustness**: Median rating prevents single songs from skewing results

---

## Summary

These three algorithms work together to create a personalized, mathematically-sound ranking system:

1. **Pairing Algorithm**: Ensures efficient preference discovery through phased exploration
2. **ELO System**: Provides stable, confidence-weighted rankings based on comparisons
3. **Album Algorithm**: Balances quality and quantity for fair album-level insights

The system adapts to user behavior, prevents fatigue, and produces rankings that reflect both individual song quality and overall album consistency.