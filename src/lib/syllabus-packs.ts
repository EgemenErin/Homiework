export type SyllabusResource = {
  url: string;
  label: string;
  kind: "read" | "watch" | "listen" | "other";
  minutes: number;
};

export type SyllabusExamQuestion = {
  prompt: string;
  options: [string, string, string, string];
  correct_index: number;
};

export type SyllabusWeek = {
  weekNumber: number;
  topic_title: string;
  why: string;
  resources: SyllabusResource[];
  exam_questions: SyllabusExamQuestion[];
};

export type SyllabusPack = {
  id: string;
  title: string;
  subject: string;
  tagline: string;
  weeksCount: number;
  estimatedMonths: string;
  tier: "free" | "paid";
  priceLabel: string;
  weeks: SyllabusWeek[];
};

export const SYLLABUS_PACKS: readonly SyllabusPack[] = [
  {
    id: "money-and-central-banks",
    title: "How Money & Central Banks Actually Work",
    subject: "Economics",
    tagline:
      "Master where money comes from, how commercial banks create credit, how the Fed steers inflation, and why sovereign debt crises happen.",
    weeksCount: 4,
    estimatedMonths: "~1 month (4 weeks)",
    tier: "free",
    priceLabel: "Free Starter Pack",
    weeks: [
      {
        weekNumber: 1,
        topic_title: "Where does new money actually come from when a bank makes a loan?",
        why: "Most people think banks lend out other people's savings. The Bank of England wrote a famous paper explaining why that's backwards.",
        resources: [
          {
            url: "https://www.bankofengland.co.uk/quarterly-bulletin/2014/q1/money-creation-in-the-modern-economy",
            label: "Bank of England: Money Creation in the Modern Economy",
            kind: "read",
            minutes: 15,
          },
          {
            url: "https://bookshop.org/p/books/lords-of-easy-money-christopher-leonard/17213305",
            label: "Lords of Easy Money — How the Fed Broke the American Economy",
            kind: "read",
            minutes: 20,
          },
        ],
        exam_questions: [
          {
            prompt: "According to the Bank of England, what creates the majority of broad money in a modern economy?",
            options: [
              "The government printing physical banknotes",
              "Commercial banks making new loans and crediting deposits",
              "Gold reserves held in central vaults",
              "Foreign trade surpluses",
            ],
            correct_index: 1,
          },
          {
            prompt: "When you repay a principal loan balance to a commercial bank, what happens to that money supply?",
            options: [
              "It goes into the bank CEO's bonus pool",
              "It is transferred to the Treasury",
              "Both the loan asset and the deposit liability are extinguished",
              "It is locked in reserve for 10 years",
            ],
            correct_index: 2,
          },
          {
            prompt: "What is the primary constraint on how much money commercial banks can create via lending?",
            options: [
              "The amount of physical paper cash in ATMs",
              "Interest rate policy, capital adequacy rules, and borrower demand",
              "The number of bank branches in a city",
              "A fixed 10% gold ratio",
            ],
            correct_index: 1,
          },
        ],
      },
      {
        weekNumber: 2,
        topic_title: "How does the Federal Reserve set interest rates and steer inflation?",
        why: "We keep arguing about rate cuts and inflation—let's understand the exact transmission mechanism from FOMC votes to mortgages.",
        resources: [
          {
            url: "https://www.federalreserve.gov/monetarypolicy/fomc.htm",
            label: "What the FOMC is and how it votes",
            kind: "read",
            minutes: 10,
          },
          {
            url: "https://www.npr.org/sections/money/",
            label: "Planet Money: How the Fed steers overnight rates",
            kind: "listen",
            minutes: 22,
          },
        ],
        exam_questions: [
          {
            prompt: "How many voting members sit on the Federal Open Market Committee (FOMC)?",
            options: [
              "7 Governors only",
              "12 (7 Board Governors + 5 regional Reserve Bank presidents)",
              "50 (one per US state)",
              "3 (Chair, Treasury Secretary, President)",
            ],
            correct_index: 1,
          },
          {
            prompt: "Which regional Fed president has a permanent voting seat on the FOMC?",
            options: ["Chicago", "San Francisco", "New York", "Atlanta"],
            correct_index: 2,
          },
          {
            prompt: "Why does raising the overnight federal funds rate cool down inflation?",
            options: [
              "It makes borrowing costlier across the economy, slowing spending and investment",
              "It outlaw price increases by grocery stores",
              "It forces the government to raise income taxes automatically",
              "It deletes 5% of every checking account",
            ],
            correct_index: 0,
          },
        ],
      },
      {
        weekNumber: 3,
        topic_title: "What triggers a classic bank run, and why did SVB collapse in 36 hours?",
        why: "Maturity transformation is the magic trick of banking—and also its fatal flaw when depositors panic in a group chat.",
        resources: [
          {
            url: "https://www.federalreserve.gov/publications/files/svb-review-20230428.pdf",
            label: "Fed Post-Mortem on Silicon Valley Bank (Executive Summary)",
            kind: "read",
            minutes: 18,
          },
          {
            url: "https://bookshop.org/p/books/lombard-street-a-description-of-the-money-market-walter-bagehot/16613942",
            label: "Walter Bagehot's Lombard Street & the Lender of Last Resort rule",
            kind: "read",
            minutes: 15,
          },
        ],
        exam_questions: [
          {
            prompt: "What is 'Bagehot's Dictum' for how a central bank should stop a liquidity panic?",
            options: [
              "Let every bank fail immediately",
              "Lend freely, at a penalty rate, against good collateral",
              "Freeze all withdrawals for 6 months",
              "Print money and mail checks to shareholders",
            ],
            correct_index: 1,
          },
          {
            prompt: "What caused the unrealized losses on SVB's balance sheet before the run?",
            options: [
              "Subprime home mortgages",
              "Long-dated Treasury and agency bonds losing market value as interest rates rose",
              "Crypto trading losses",
              "Embezzlement at branches",
            ],
            correct_index: 1,
          },
        ],
      },
      {
        weekNumber: 4,
        topic_title: "Why do some countries survive huge national debt while others hit hyperinflation?",
        why: "Japan's debt-to-GDP is over 250% with low inflation, while others spiral at 60%. What is the difference?",
        resources: [
          {
            url: "https://bookshop.org/p/books/this-time-is-different-eight-centuries-of-financial-folly-carmen-m-reinhart/8686214",
            label: "This Time Is Different: Sovereign Debt & Currency Denominations",
            kind: "read",
            minutes: 20,
          },
          {
            url: "https://www.imf.org/en/Publications/fandd",
            label: "IMF Finance & Development: Original Sin in Sovereign Borrowing",
            kind: "read",
            minutes: 12,
          },
        ],
        exam_questions: [
          {
            prompt: "In sovereign debt economics, what is 'Original Sin'?",
            options: [
              "Running a budget deficit during wartime",
              "Being forced to borrow in a foreign currency you cannot print",
              "Charging income tax above 30%",
              "Leaving the gold standard",
            ],
            correct_index: 1,
          },
          {
            prompt: "When does printing domestic currency to pay off fiscal deficits trigger hyperinflation?",
            options: [
              "Whenever debt exceeds 50% of GDP",
              "When money growth outstrips real productive capacity and destroys trust in the currency",
              "Only when gold prices drop",
              "Never",
            ],
            correct_index: 1,
          },
        ],
      },
    ],
  },
  {
    id: "everyday-game-theory",
    title: "Everyday Game Theory & Strategic Incentives",
    subject: "Economics & Psychology",
    tagline:
      "Learn how auctions, Schelling points, credible threats, and cooperation traps silently govern everyday life.",
    weeksCount: 4,
    estimatedMonths: "~1 month (4 weeks)",
    tier: "free",
    priceLabel: "Free Starter Pack",
    weeks: [
      {
        weekNumber: 1,
        topic_title: "Why do smart people get trapped in Prisoner's Dilemmas—and how does Tit-for-Tat beat them?",
        why: "Robert Axelrod ran a computer tournament to see which strategy wins repeated interactions. The winner was shockingly simple.",
        resources: [
          {
            url: "https://ncase.me/trust/",
            label: "The Evolution of Trust (Interactive Essay by Nicky Case)",
            kind: "read",
            minutes: 25,
          },
          {
            url: "https://bookshop.org/p/books/the-evolution-of-cooperation-revised-robert-axelrod/8055068",
            label: "The Evolution of Cooperation by Robert Axelrod",
            kind: "read",
            minutes: 15,
          },
        ],
        exam_questions: [
          {
            prompt: "What are the four traits of successful strategies in Axelrod's repeated Prisoner's Dilemma tournament?",
            options: [
              "Ruthless, unpredictable, secretive, greedy",
              "Nice (never defect first), forgiving, retaliatory when provoked, and clear",
              "Always defect on turn 1, then apologize",
              "Randomly flip a coin every round",
            ],
            correct_index: 1,
          },
          {
            prompt: "What happens to cooperation when players know the exact final round of a game in advance?",
            options: [
              "Cooperation doubles on the last round",
              "Backward induction unravels cooperation starting from the final round",
              "Both players win a bonus",
              "Nothing changes",
            ],
            correct_index: 1,
          },
        ],
      },
      {
        weekNumber: 2,
        topic_title: "What is a Schelling Focal Point, and how do strangers coordinate without talking?",
        why: "If you have to meet a friend in New York tomorrow at noon with zero communication, where do you go?",
        resources: [
          {
            url: "https://bookshop.org/p/books/the-strategy-of-conflict-thomas-c-schelling/11484534",
            label: "Thomas Schelling's The Strategy of Conflict (Focal Points)",
            kind: "read",
            minutes: 20,
          },
        ],
        exam_questions: [
          {
            prompt: "What makes a solution a 'Schelling Point' (focal point)?",
            options: [
              "It is legally mandated by a referee",
              "It stands out as salient, unique, or culturally obvious when communication is impossible",
              "It always maximizes the payout of the slowest player",
              "It requires encrypted messaging",
            ],
            correct_index: 1,
          },
        ],
      },
      {
        weekNumber: 3,
        topic_title: "Why does adding a new highway lane sometimes make traffic slower (Braess's Paradox)?",
        why: "Selfish routing in networks—from city traffic to basketball offenses—produces counterintuitive bottlenecks.",
        resources: [
          {
            url: "https://plato.stanford.edu/entries/game-theory/",
            label: "Stanford Encyclopedia: Nash Equilibrium & Network Routing",
            kind: "read",
            minutes: 18,
          },
        ],
        exam_questions: [
          {
            prompt: "What is Braess's Paradox in a congested network?",
            options: [
              "Adding extra capacity/shortcuts can shift the Nash equilibrium so everyone's travel time gets worse",
              "Trains are always slower than buses",
              "Toll roads never reduce traffic",
              "Drivers prefer longer scenic routes",
            ],
            correct_index: 0,
          },
        ],
      },
      {
        weekNumber: 4,
        topic_title: "How does the 'Winner's Curse' ruin auctions, house bidding, and corporate acquisitions?",
        why: "When everyone bids on something with uncertain value, the winner is almost always the person who overestimated it the most.",
        resources: [
          {
            url: "https://bookshop.org/p/books/the-winner-s-curse-paradoxes-and-anomalies-of-economic-life-richard-h-thaler/11334420",
            label: "Richard Thaler: The Winner's Curse in Common-Value Auctions",
            kind: "read",
            minutes: 20,
          },
        ],
        exam_questions: [
          {
            prompt: "How should a rational bidder avoid the Winner's Curse in a common-value auction?",
            options: [
              "Bid 20% higher than your private estimate to scare competitors",
              "Shade your bid downward assuming that winning means everyone else thought it was worth less",
              "Wait until the last 2 seconds to bid",
              "Only bid odd numbers",
            ],
            correct_index: 1,
          },
        ],
      },
    ],
  },
  {
    id: "how-cities-get-built",
    title: "How Cities, Subways & Megaprojects Actually Get Built",
    subject: "Urbanism & History",
    tagline:
      "Why Tokyo builds transit cheaply, how Robert Moses reshaped New York, why rent control and zoning collide, and why megaprojects blow budgets.",
    weeksCount: 6,
    estimatedMonths: "~1.5 months (6 weeks)",
    tier: "paid",
    priceLabel: "$7 Pack · Included in Club Pass",
    weeks: [
      {
        weekNumber: 1,
        topic_title: "Why can Spain and Japan build subways for a tenth of the cost of New York?",
        why: "The Second Avenue Subway cost over $2.5 billion per mile while Madrid built lines for $100M/mile. Where does the money go?",
        resources: [
          {
            url: "https://transitcosts.com/",
            label: "NYU Marron Institute: Transit Costs Project Findings",
            kind: "read",
            minutes: 20,
          },
          {
            url: "https://bookshop.org/p/books/how-big-things-get-done-the-surprising-factors-that-determine-the-fate-of-every-project-from-home-renovations-to-space-exploration-bent-flyvbjerg/18653841",
            label: "How Big Things Get Done by Bent Flyvbjerg",
            kind: "read",
            minutes: 18,
          },
        ],
        exam_questions: [
          {
            prompt: "According to the NYU Transit Costs Project, what is one of the biggest drivers of US subway cost inflation?",
            options: [
              "Harder bedrock in American cities",
              "Over-engineered gigantic station caverns, bespoke designs, and procurement friction",
              "The cost of steel rails",
              "Lack of tunnel boring machines",
            ],
            correct_index: 1,
          },
        ],
      },
      {
        weekNumber: 2,
        topic_title: "Who was right about what makes a neighborhood alive: Jane Jacobs or Robert Moses?",
        why: "The greatest urban battle of the 20th century shaped every street corner we walk on today.",
        resources: [
          {
            url: "https://bookshop.org/p/books/the-death-and-life-of-great-american-cities-jane-jacobs/6704462",
            label: "The Death and Life of Great American Cities (Sidewalk Ballet chapter)",
            kind: "read",
            minutes: 22,
          },
          {
            url: "https://bookshop.org/p/books/the-power-broker-robert-moses-and-the-fall-of-new-york-robert-a-caro/8467229",
            label: "The Power Broker by Robert Caro (Introduction)",
            kind: "read",
            minutes: 25,
          },
        ],
        exam_questions: [
          {
            prompt: "What did Jane Jacobs mean by 'eyes on the street'?",
            options: [
              "Police CCTV cameras on every lamppost",
              "Mixed-use buildings and active shopfronts keeping sidewalks naturally safe around the clock",
              "Gated suburban cul-de-sacs",
              "High-rise towers set back in parks",
            ],
            correct_index: 1,
          },
        ],
      },
      {
        weekNumber: 3,
        topic_title: "How did Tokyo keep housing affordable while growing into the world's largest metropolis?",
        why: "While London, Berlin, and San Francisco face acute housing shortages, Tokyo builds more homes than entire countries.",
        resources: [
          {
            url: "https://www.ft.com/content/023562e2-54a6-11e6-befd-2fc0c26b3c60",
            label: "Why Tokyo is the land of rising home construction",
            kind: "read",
            minutes: 15,
          },
        ],
        exam_questions: [
          {
            prompt: "How does Japanese residential zoning differ from typical North American single-family zoning?",
            options: [
              "Zoning is set nationally with broad 'by-right' mixed residential/commercial allowances",
              "Every neighbor can veto any new apartment building",
              "Buildings over 2 stories are banned",
              "There are no building safety codes",
            ],
            correct_index: 0,
          },
        ],
      },
      {
        weekNumber: 4,
        topic_title: "How do parking minimums secretly dictate the shape of modern cities?",
        why: "Donald Shoup showed how a single municipal spreadsheet rule turned downtowns into asphalt seas.",
        resources: [
          {
            url: "https://bookshop.org/p/books/the-high-cost-of-free-parking-updated-edition-donald-shoup/15666114",
            label: "The High Cost of Free Parking by Donald Shoup",
            kind: "read",
            minutes: 20,
          },
        ],
        exam_questions: [
          {
            prompt: "What occupancy rate does Donald Shoup recommend targeting for curb parking pricing?",
            options: [
              "100% full at all times",
              "Around 85% occupancy (leaving 1–2 open spaces per block)",
              "0% (ban all street parking)",
              "50% flat rate",
            ],
            correct_index: 1,
          },
        ],
      },
      {
        weekNumber: 5,
        topic_title: "Why did Barcelona's Cerdà Eixample blocks become the gold standard of urban design?",
        why: "Octagonal chamfered corners, interior courtyards, and human-scale density—designed in 1859 and still unmatched.",
        resources: [
          {
            url: "https://www.theguardian.com/cities/2016/apr/01/story-cities-13-barcelona-ildefons-cerda-planner-urbanisation",
            label: "Ildefons Cerdà and the invention of 'urbanisation' in Barcelona",
            kind: "read",
            minutes: 16,
          },
        ],
        exam_questions: [
          {
            prompt: "Why did Ildefons Cerdà cut off the corners of Barcelona's Eixample blocks at 45-degree angles?",
            options: [
              "To save brick costs",
              "To improve visibility, airflow, sunlight, and turning space at intersections",
              "To create space for medieval watchtowers",
              "By accident on the original map",
            ],
            correct_index: 1,
          },
        ],
      },
      {
        weekNumber: 6,
        topic_title: "What separates the 1% of megaprojects that finish on time and on budget ('Think Slow, Act Fast')?",
        why: "From the Empire State Building (built in 410 days) to the Bilbao Guggenheim—how modularity beats bespoke chaos.",
        resources: [
          {
            url: "https://bookshop.org/p/books/how-big-things-get-done-the-surprising-factors-that-determine-the-fate-of-every-project-from-home-renovations-to-space-exploration-bent-flyvbjerg/18653841",
            label: "Bent Flyvbjerg: Modularity & 'Think Slow, Act Fast'",
            kind: "read",
            minutes: 20,
          },
        ],
        exam_questions: [
          {
            prompt: "What does 'Think Slow, Act Fast' mean in megaproject management?",
            options: [
              "Start digging immediately and figure out the blueprints later",
              "Spend exhaustive time iterating in cheap simulations/prototypes, then execute construction rapidly with repeatable modules",
              "Pause construction every 6 months for a committee review",
              "Hire 10x more contractors halfway through",
            ],
            correct_index: 1,
          },
        ],
      },
    ],
  },
  {
    id: "philosophy-of-mind",
    title: "Philosophy of Mind, Consciousness & AI",
    subject: "Philosophy & Cognitive Science",
    tagline:
      "Tackle the Hard Problem of Consciousness, Searle's Chinese Room, split-brain experiments, and personal identity.",
    weeksCount: 6,
    estimatedMonths: "~1.5 months (6 weeks)",
    tier: "paid",
    priceLabel: "$7 Pack · Included in Club Pass",
    weeks: [
      {
        weekNumber: 1,
        topic_title: "What is it like to be a bat—and why is subjective experience so hard for physics to explain?",
        why: "Thomas Nagel and David Chalmers drew the line between the 'easy' problems of brain mechanics and the 'Hard Problem' of qualia.",
        resources: [
          {
            url: "https://www.jstor.org/stable/2183914",
            label: "Thomas Nagel: What Is It Like to Be a Bat? (1974)",
            kind: "read",
            minutes: 22,
          },
        ],
        exam_questions: [
          {
            prompt: "Why did Thomas Nagel choose bats for his famous thought experiment on consciousness?",
            options: [
              "Bats are mammals that almost certainly have experience, yet echolocation is radically alien to human senses",
              "Bats do not have brains",
              "Bats can speak in ultrasonic language",
              "Because of Batman",
            ],
            correct_index: 0,
          },
        ],
      },
      {
        weekNumber: 2,
        topic_title: "Does syntax ever become semantics? (John Searle's Chinese Room Argument)",
        why: "Can a system that manipulates symbols flawlessly ever actually understand what it is saying?",
        resources: [
          {
            url: "https://plato.stanford.edu/entries/chinese-room/",
            label: "Stanford Encyclopedia: The Chinese Room Argument",
            kind: "read",
            minutes: 20,
          },
        ],
        exam_questions: [
          {
            prompt: "What is the 'Systems Reply' to Searle's Chinese Room?",
            options: [
              "While the person inside doesn't understand Chinese, the whole room system (person + rulebook + memory) does",
              "Chinese is harder than English",
              "Computers use binary, not paper slips",
              "Nobody understands any language",
            ],
            correct_index: 0,
          },
        ],
      },
      {
        weekNumber: 3,
        topic_title: "When a split-brain patient's left and right hemispheres disagree, how many people are in the skull?",
        why: "Roger Sperry and Michael Gazzaniga's callosotomy patients revealed the left hemisphere's 'Interpreter' module.",
        resources: [
          {
            url: "https://www.nature.com/articles/483260a",
            label: "Gazzaniga on Split-Brain Research & the Left-Brain Interpreter",
            kind: "read",
            minutes: 15,
          },
        ],
        exam_questions: [
          {
            prompt: "What did Gazzaniga discover when the right hemisphere followed a command the left hemisphere hadn't seen?",
            options: [
              "The left hemisphere calmly admitted it didn't know why the body stood up",
              "The left hemisphere instantly confabulated a plausible story and believed it",
              "The patient fell asleep",
              "Both hands fought each other every time",
            ],
            correct_index: 1,
          },
        ],
      },
      {
        weekNumber: 4,
        topic_title: "If a teletransporter scans and rebuilds you atom-for-atom on Mars, did you travel or die?",
        why: "Derek Parfit's 'Reasons and Persons' forces you to confront what actually holds your identity together across time.",
        resources: [
          {
            url: "https://bookshop.org/p/books/reasons-and-persons-derek-parfit/8914394",
            label: "Derek Parfit: Teletransportation & Psychological Continuity",
            kind: "read",
            minutes: 25,
          },
        ],
        exam_questions: [
          {
            prompt: "What was Derek Parfit's conclusion about personal identity over time?",
            options: [
              "Identity is an indivisible Cartesian soul",
              "What matters in survival is Relation R (psychological connectedness and continuity), not strict numerical identity",
              "Only your DNA matters",
              "You are a brand new legal person every 5 minutes",
            ],
            correct_index: 1,
          },
        ],
      },
      {
        weekNumber: 5,
        topic_title: "Does your smartphone literally count as part of your mind? (Clark & Chalmers' Extended Mind)",
        why: "If Otto uses a notebook the exact same way Inga uses biological memory, where does the mind stop and the world begin?",
        resources: [
          {
            url: "https://www.jstor.org/stable/3328150",
            label: "Andy Clark & David Chalmers: The Extended Mind (1998)",
            kind: "read",
            minutes: 20,
          },
        ],
        exam_questions: [
          {
            prompt: "What is the 'Parity Principle' in the Extended Mind thesis?",
            options: [
              "All brains weigh the same",
              "If an external process would count as cognitive were it done inside the head, then it is part of the cognitive process",
              "Phones are smarter than humans",
              "Memory cannot be written down",
            ],
            correct_index: 1,
          },
        ],
      },
      {
        weekNumber: 6,
        topic_title: "Is consciousness a controlled hallucination generated by a prediction machine?",
        why: "Predictive processing (Karl Friston, Anil Seth, Andy Clark) flips perception upside-down: the brain guesses first and only reads error signals.",
        resources: [
          {
            url: "https://bookshop.org/p/books/being-you-a-new-science-of-consciousness-anil-seth/15870910",
            label: "Being You: A New Science of Consciousness by Anil Seth",
            kind: "read",
            minutes: 20,
          },
        ],
        exam_questions: [
          {
            prompt: "In predictive processing, what travels upward from sensory organs to higher cortex?",
            options: [
              "A raw HD video stream of the outside world",
              "Prediction errors (the gap between what the brain expected and what the senses detected)",
              "Motor commands",
              "Nothing",
            ],
            correct_index: 1,
          },
        ],
      },
    ],
  },
  {
    id: "modern-energy-and-grid",
    title: "Modern Energy, the Grid & Resource Geopolitics",
    subject: "Science & Geopolitics",
    tagline:
      "Master how the AC power grid balances every millisecond, lithium and copper supply chains, nuclear economics, and the Duck Curve.",
    weeksCount: 8,
    estimatedMonths: "~2 months (8 weeks)",
    tier: "paid",
    priceLabel: "$7 Pack · Included in Club Pass",
    weeks: Array.from({ length: 8 }, (_, i) => ({
      weekNumber: i + 1,
      topic_title:
        [
          "How does the electrical grid balance supply and demand to the exact millisecond at 50/60 Hz?",
          "What is the 'Duck Curve', and why does solar power make 6:00 PM the hardest hour on the grid?",
          "Why did nuclear power plants get 5x more expensive to build after the 1970s?",
          "How did the shale revolution turn the US into the world's largest oil & gas producer?",
          "Where do lithium, cobalt, and rare earths actually get refined—and what is the bottleneck?",
          "Why does high-voltage transmission take 10+ years to permit while batteries take 18 months?",
          "Can green hydrogen and industrial heat ever compete on physics and thermodynamics?",
          "How will AI data centers reshape electricity demand over the next decade?",
        ][i] ?? `Energy Mastery Week ${i + 1}`,
      why: "Electricity is the master resource of civilization, yet almost nobody knows what happens behind the wall socket.",
      resources: [
        {
          url: "https://bookshop.org/p/books/how-the-world-really-works-the-science-behind-how-we-got-here-and-where-we-re-going-vaclav-smil/17213654",
          label: "Vaclav Smil: How the World Really Works (Energy Pillars)",
          kind: "read" as const,
          minutes: 20,
        },
        {
          url: "https://bookshop.org/p/books/the-grid-the-fraying-wires-between-americans-and-our-energy-future-gretchen-bakke/8444061",
          label: "The Grid by Gretchen Bakke",
          kind: "read" as const,
          minutes: 18,
        },
      ],
      exam_questions: [
        {
          prompt: "What happens if electricity generation on an AC grid drops significantly below load without reserve response?",
          options: [
            "Grid frequency (50/60 Hz) falls, risking cascading generator trips and blackouts",
            "Wi-Fi routers speed up",
            "Wall outlets switch to DC automatically",
            "Nothing for 48 hours",
          ] as [string, string, string, string],
          correct_index: 0,
        },
      ],
    })),
  },
  {
    id: "psychology-of-taste",
    title: "The Sociology & Psychology of Taste, Status & Subcultures",
    subject: "Culture & Sociology",
    tagline:
      "Why fashions cycle, Pierre Bourdieu's cultural capital, how scenes form and sell out, and why algorithms flatten aesthetics.",
    weeksCount: 4,
    estimatedMonths: "~1 month (4 weeks)",
    tier: "paid",
    priceLabel: "$7 Pack · Included in Club Pass",
    weeks: [
      {
        weekNumber: 1,
        topic_title: "What did Pierre Bourdieu mean by 'Cultural Capital'—and why is 'effortless' taste the most expensive status symbol?",
        why: "When rich people ditch flashy logos for worn-in linen and obscure natural wine, they're playing a centuries-old status game.",
        resources: [
          {
            url: "https://bookshop.org/p/books/distinction-a-social-critique-of-the-judgement-of-taste-pierre-bourdieu/6693954",
            label: "Pierre Bourdieu's Distinction (Summary & Key Concepts)",
            kind: "read",
            minutes: 20,
          },
        ],
        exam_questions: [
          {
            prompt: "In sociology, what is 'countersignaling'?",
            options: [
              "Using turn signals in a roundabout",
              "When the highest-status group deliberately avoids obvious status symbols to distinguish themselves from the aspiring middle",
              "Buying counterfeit luxury goods",
              "Wearing uniform colors",
            ],
            correct_index: 1,
          },
        ],
      },
      {
        weekNumber: 2,
        topic_title: "What is 'Scenius'—and why do breakthroughs happen in tiny scenes of 10–30 friends rather than lone geniuses?",
        why: "From Florentine workshops and Inklings at Oxford to early punk and Homebrew Computer Club: Brian Eno's theory of collective genius.",
        resources: [
          {
            url: "https://kk.org/thetechnium/scenius-or-comm/",
            label: "Kevin Kelly & Brian Eno on 'Scenius' (Communal Genius)",
            kind: "read",
            minutes: 12,
          },
        ],
        exam_questions: [
          {
            prompt: "According to Brian Eno, what are the ingredients that sustain 'scenius'?",
            options: [
              "Corporate venture capital and NDAs",
              "Mutual appreciation, rapid exchange of tools/ideas, local competition, and tolerance for weirdness",
              "Working alone in a cabin for 10 years",
              "Standardized university exams",
            ],
            correct_index: 1,
          },
        ],
      },
      {
        weekNumber: 3,
        topic_title: "Why do coffee shops, book covers, and Airbnbs around the world all start looking identical?",
        why: "Kyle Chayka's 'Filterworld' and algorithmic convergence: how recommendation feeds reward the frictionless average.",
        resources: [
          {
            url: "https://bookshop.org/p/books/filterworld-how-algorithms-flattened-culture-kyle-chayka/19901841",
            label: "Filterworld: How Algorithms Flattened Culture by Kyle Chayka",
            kind: "read",
            minutes: 20,
          },
        ],
        exam_questions: [
          {
            prompt: "What drives 'AirSpace'—the global homogenization of cafes and interiors?",
            options: [
              "A single furniture monopoly",
              "Engagement-optimized visual feeds rewarding instantly legible, low-friction aesthetics across cities",
              "International building treaties",
              "Lack of paint colors",
            ],
            correct_index: 1,
          },
        ],
      },
      {
        weekNumber: 4,
        topic_title: "How does a subculture die when it goes mainstream—and how do 'Geeks, MOPs, and Sociopaths' explain the lifecycle?",
        why: "Every scene you've ever loved went through the exact same three-stage sociological lifecycle.",
        resources: [
          {
            url: "https://meaningness.com/geeks-mops-sociopaths",
            label: "Geeks, MOPs, and Sociopaths in Subculture Evolution",
            kind: "read",
            minutes: 18,
          },
        ],
        exam_questions: [
          {
            prompt: "In David Chapman's subculture model, why do creators ('geeks') eventually leave the scene they founded?",
            options: [
              "They run out of money",
              "Extractive status-seekers dilute the scene's original craft and turn it into a commodified costume",
              "The venue closes",
              "They forget how to make art",
            ],
            correct_index: 1,
          },
        ],
      },
    ],
  },
];

export function getSyllabusPack(packId: string | null | undefined): SyllabusPack | null {
  if (!packId) return null;
  return SYLLABUS_PACKS.find((p) => p.id === packId) ?? null;
}

export function isPackUnlockedForGroup(
  pack: SyllabusPack,
  group: { plan_tier?: "free" | "club_pass"; unlocked_packs?: string[] | null },
): boolean {
  if (pack.tier === "free") return true;
  if (group.plan_tier === "club_pass") return true;
  return Boolean(group.unlocked_packs?.includes(pack.id));
}

export function letterGrade(
  score: number,
  total: number,
): {
  grade: string;
  remark: string;
} {
  if (total <= 0) return { grade: "—", remark: "" };
  const ratio = score / total;
  if (ratio === 1) return { grade: "A+", remark: "Dean's List" };
  if (ratio >= 0.8) return { grade: "A", remark: "Did the reading" };
  if (ratio >= 0.65) return { grade: "B", remark: "Solid effort" };
  if (ratio >= 0.5) return { grade: "C", remark: "Skimmed the intro" };
  return { grade: "F", remark: "See me after class" };
}
