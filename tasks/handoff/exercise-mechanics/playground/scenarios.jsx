/* scenarios.jsx — demo content + edge-case scenarios for each mechanic.
   Every mechanic gets: a Standard case, plus stress cases (long text,
   many items), drawn from age-7-14 subject matter. */

const SCENARIOS = {
  quiz: {
    label: "Quiz",
    blurb: "One question at a time, multiple choice. Per-task hearts, streak, confetti on success.",
    scenarios: {
      standard: {
        label: "Standard",
        props: {
          eyebrow: "Space · Lesson 2",
          questions: [
            { question_text: "Which planet is closest to the Sun?", options: [{ text: "Venus" }, { text: "Mercury", is_correct: true }, { text: "Mars" }, { text: "Earth" }] },
            { question_text: "How many legs does a spider have?", options: [{ text: "6" }, { text: "8", is_correct: true }, { text: "10" }] },
            { question_text: "What do bees collect from flowers?", options: [{ text: "Nectar", is_correct: true }, { text: "Water" }, { text: "Leaves" }] },
          ],
        },
      },
      long: {
        label: "Long text",
        props: {
          eyebrow: "Reading · Edge case",
          questions: [
            {
              question_text: "A wildlife ranger counts 14 zebras on Monday. On Tuesday, 6 more zebras join the herd, but 3 wander off to find water. On Wednesday morning the ranger counts again. How many zebras should she expect to see?",
              options: [
                { text: "She should expect to see 17 zebras, because 14 plus 6 makes 20, and taking away the 3 that wandered off leaves 17 animals in the herd.", is_correct: true },
                { text: "She should expect to see 23 zebras, because every zebra that joins brings a friend along, so the herd always grows twice as fast." },
                { text: "She should expect to see 11 zebras, because you subtract both the 6 that joined and the 3 that left from the original count of 14." },
              ],
            },
          ],
        },
      },
      many: {
        label: "Many options",
        props: {
          eyebrow: "Animals · Edge case",
          questions: [
            {
              question_text: "Which of these animals is a mammal?",
              options: [
                { text: "Crocodile" }, { text: "Penguin" }, { text: "Dolphin", is_correct: true }, { text: "Octopus" },
                { text: "Goldfish" }, { text: "Gecko" }, { text: "Flamingo" }, { text: "Jellyfish" },
              ],
            },
          ],
        },
      },
      empty: {
        label: "Empty config",
        props: { eyebrow: "Edge case", questions: [] },
      },
    },
  },

  true_false: {
    label: "True / False",
    blurb: "Binary judgement with an explanation. Server-graded when the simulator is on — watch the spinner and the network-failure sheet.",
    scenarios: {
      standard: {
        label: "Standard",
        props: {
          eyebrow: "Nature · Lesson 4",
          statement: "Octopuses have three hearts.",
          correctAnswer: true,
          explain: "Two pump blood to the gills, one to the rest of the body.",
        },
      },
      long: {
        label: "Long statement",
        props: {
          eyebrow: "History · Edge case",
          statement: "The Great Wall of China is so enormous that astronauts can easily spot it with the naked eye from the surface of the Moon, which is about 384,000 kilometres away from Earth.",
          correctAnswer: false,
          explain: "It's a myth! The wall is long but narrow — from the Moon you can't see it at all.",
        },
      },
      tricky: {
        label: "Counter-intuitive",
        props: {
          eyebrow: "Science · Lesson 7",
          statement: "Hot water can freeze faster than cold water.",
          correctAnswer: true,
          explain: "It's called the Mpemba effect — scientists are still arguing about why!",
        },
      },
    },
  },

  matching: {
    label: "Matching",
    blurb: "Connect pairs by tap-tap, drag-a-thread, or keyboard. Deferred (check at the end) or instant grading via Tweaks.",
    scenarios: {
      standard: {
        label: "Standard",
        props: {
          eyebrow: "Animals · Lesson 1",
          title: "Match the animal to its baby",
          pairs: [
            { left: "cat", right: "kitten" },
            { left: "dog", right: "puppy" },
            { left: "cow", right: "calf" },
            { left: "frog", right: "tadpole" },
          ],
        },
      },
      many: {
        label: "Many pairs",
        props: {
          eyebrow: "Geography · Edge case",
          title: "Match the country to its capital",
          pairs: [
            { left: "France", right: "Paris" },
            { left: "Japan", right: "Tokyo" },
            { left: "Egypt", right: "Cairo" },
            { left: "Brazil", right: "Brasília" },
            { left: "Canada", right: "Ottawa" },
            { left: "Kenya", right: "Nairobi" },
            { left: "India", right: "New Delhi" },
            { left: "Norway", right: "Oslo" },
          ],
        },
      },
      long: {
        label: "Long phrases",
        props: {
          eyebrow: "Vocabulary · Edge case",
          title: "Match the word to what it means",
          pairs: [
            { left: "nocturnal", right: "an animal that sleeps in the day and is awake at night" },
            { left: "herbivore", right: "an animal that only eats plants, leaves and grass" },
            { left: "camouflage", right: "colours or patterns that help an animal hide in plain sight" },
            { left: "migration", right: "a long journey animals make when the seasons change" },
          ],
        },
      },
    },
  },

  ordering: {
    label: "Ordering",
    blurb: "Drag rows into sequence — or focus a row and use ↑/↓. Rows are measured, so long wrapped text stays draggable.",
    scenarios: {
      standard: {
        label: "Standard",
        props: {
          eyebrow: "Nature · Lesson 3",
          title: "Put the butterfly's life in order",
          items: ["Egg", "Caterpillar", "Chrysalis", "Butterfly"],
        },
      },
      long: {
        label: "Long sentences",
        props: {
          eyebrow: "Gardening · Edge case",
          title: "How do you grow a sunflower?",
          items: [
            "Find a sunny spot in the garden and dig a small hole about two centimetres deep",
            "Drop one sunflower seed into the hole and gently cover it back up with soil",
            "Water the spot every few days, especially when the weather is hot and dry",
            "Watch the seedling push out of the ground and grow taller than you by the end of summer",
          ],
        },
      },
      many: {
        label: "Many items",
        props: {
          eyebrow: "Numbers · Edge case",
          title: "Smallest to biggest",
          items: ["3", "7", "12", "19", "25", "31", "48", "56"],
        },
      },
    },
  },

  fill_blanks: {
    label: "Fill blanks",
    blurb: "Tap a word from the bank into a slot — the word flies in. Tap a filled slot to send it back.",
    scenarios: {
      standard: {
        label: "Standard",
        props: {
          eyebrow: "Nature · Lesson 5",
          text: "The {{blank}} rises in the {{blank}} and sets in the {{blank}}.",
          blanks: ["sun", "east", "west"],
          wordBank: ["west", "sun", "north", "east", "moon"],
        },
      },
      long: {
        label: "Long + many blanks",
        props: {
          eyebrow: "Science · Edge case",
          text: "Plants make their own food using {{blank}} from the sun. Their {{blank}} take in water from the soil, while the {{blank}} breathe in a gas called {{blank}}. This amazing trick is called {{blank}}.",
          blanks: ["light", "roots", "leaves", "carbon dioxide", "photosynthesis"],
          wordBank: ["leaves", "photosynthesis", "oxygen", "light", "flowers", "carbon dioxide", "roots", "sugar"],
        },
      },
      distractors: {
        label: "Distractor-heavy bank",
        props: {
          eyebrow: "Grammar · Edge case",
          text: "Yesterday we {{blank}} to the beach and {{blank}} sandcastles.",
          blanks: ["went", "built"],
          wordBank: ["go", "went", "gone", "going", "build", "built", "builds", "building", "swim", "swam"],
        },
      },
    },
  },

  categorize: {
    label: "Categorize",
    blurb: "Drag cards into group buckets — or tap a card, then tap its group. Deferred or instant grading via Tweaks.",
    scenarios: {
      standard: {
        label: "Standard",
        props: {
          eyebrow: "Food · Lesson 1",
          title: "Fruit or vegetable?",
          categories: [
            { name: "Fruits", items: ["apple", "banana", "grape"] },
            { name: "Vegetables", items: ["carrot", "broccoli", "potato"] },
          ],
        },
      },
      many: {
        label: "4 groups, 12 cards",
        props: {
          eyebrow: "Animals · Edge case",
          title: "Who belongs where?",
          categories: [
            { name: "Mammals", items: ["whale", "bat", "fox"] },
            { name: "Birds", items: ["owl", "puffin", "swan"] },
            { name: "Fish", items: ["salmon", "shark", "eel"] },
            { name: "Insects", items: ["ant", "moth", "beetle"] },
          ],
        },
      },
      long: {
        label: "Long labels",
        props: {
          eyebrow: "Science · Edge case",
          title: "Float or sink?",
          categories: [
            { name: "Floats on water", items: ["a wooden spoon", "an empty plastic bottle", "a beach ball"] },
            { name: "Sinks to the bottom", items: ["a metal house key", "a smooth river pebble", "a glass marble"] },
          ],
        },
      },
    },
  },
};

/* ════════════════ Batch 2 · Math ════════════════ */

SCENARIOS.numeric_input = {
  label: "Numeric input",
  blurb: "Type the answer on a kid-sized number pad. Negative answers, decimals and comma-typing all handled.",
  scenarios: {
    standard: {
      label: "Standard",
      props: {
        eyebrow: "Math · Lesson 6",
        problem: "7 × 6 = ?",
        correct: 42,
        example: { q: "What is 7 × 5?", work: "7 + 7 + 7 + 7 + 7", a: 35 },
      },
    },
    decimal: {
      label: "Decimal answer",
      props: {
        eyebrow: "Math · Edge case",
        title: "Type the answer",
        problem: "Half of 5 = ?",
        correct: 2.5,
        explain: "Half of 5 is 2.5 — typing 2,5 works too!",
      },
    },
    negative: {
      label: "Negative answer",
      props: {
        eyebrow: "Math · Edge case",
        title: "Brrr — type the temperature",
        problem: "It was 3°. It got 7° colder. Now it's …?",
        correct: -4,
        explain: "3 − 7 = −4. The ± key flips the sign.",
      },
    },
  },
};

SCENARIOS.mc_math = {
  label: "MC math",
  blurb: "Multiple choice with a big serif expression card. No answer leaks, eliminated picks stay crossed out.",
  scenarios: {
    standard: {
      label: "Standard",
      props: {
        eyebrow: "Fractions · Lesson 2",
        prompt: "Which fraction is the same as…",
        expr: "²⁄₄",
        options: ["¹⁄₂", "¹⁄₃", "²⁄₃", "³⁄₄"],
        correct: 0,
        explain: "2 out of 4 parts is the same as 1 out of 2.",
      },
    },
    long: {
      label: "Long options",
      props: {
        eyebrow: "Math · Edge case",
        prompt: "A pizza is cut into 8 slices. You eat 2.",
        expr: "8 − 2 = ?",
        options: ["6 slices are left for everyone else to share", "There are 10 slices now because pizza multiplies", "4 slices are left if you count only the cheesy ones", "All the slices are gone, time to order more"],
        correct: 0,
      },
    },
  },
};

SCENARIOS.number_line = {
  label: "Number line",
  blurb: "Drag the marker, tap the line, or steer with arrow keys. Tick labels thin out when they'd collide.",
  scenarios: {
    standard: {
      label: "Standard",
      props: {
        eyebrow: "Numbers · Lesson 1",
        title: "Where does 7 live?",
        min: 0, max: 10, correct: 7,
      },
    },
    fractions: {
      label: "Fractions (step 0.5)",
      props: {
        eyebrow: "Fractions · Edge case",
        title: "Find 2.5 on the line",
        min: 0, max: 5, step: 0.5, correct: 2.5,
      },
    },
    dense: {
      label: "Dense ticks (−10…10)",
      props: {
        eyebrow: "Negative numbers · Edge case",
        title: "Find −6 on the line",
        min: -10, max: 10, correct: -6,
      },
    },
  },
};

SCENARIOS.equation_solver = {
  label: "Equation solver",
  blurb: "Pick the right move at each step and watch the equation chain grow. Wrong moves cost a heart and get crossed out.",
  scenarios: {
    standard: {
      label: "Standard (2 steps)",
      props: {
        eyebrow: "Algebra · Lesson 1",
        title: "Get x by itself",
        initial: { left: "2x + 3", right: "11" },
        steps: [
          {
            label: "What should we do first?",
            options: [
              { id: "a", label: "subtract 3 from both sides", ok: true, after: { left: "2x", right: "8" } },
              { id: "b", label: "divide both sides by 2" },
              { id: "c", label: "add 3 to both sides" },
            ],
          },
          {
            label: "And now?",
            options: [
              { id: "d", label: "subtract 2 from both sides" },
              { id: "e", label: "divide both sides by 2", ok: true, after: { left: "x", right: "4" } },
            ],
          },
        ],
      },
    },
    long: {
      label: "3 steps",
      props: {
        eyebrow: "Algebra · Edge case",
        title: "Solve for x",
        initial: { left: "3(x − 1)", right: "12" },
        steps: [
          {
            label: "First move?",
            options: [
              { id: "a", label: "divide both sides by 3", ok: true, after: { left: "x − 1", right: "4" } },
              { id: "b", label: "subtract 1 from both sides" },
              { id: "c", label: "multiply out the bracket… the long way" },
            ],
          },
          {
            label: "Next?",
            options: [
              { id: "d", label: "add 1 to both sides", ok: true, after: { left: "x", right: "5" } },
              { id: "e", label: "subtract 1 from both sides" },
            ],
          },
          {
            label: "Last check — is x = 5 right?",
            options: [
              { id: "f", label: "yes: 3 × (5 − 1) = 12 ✓", ok: true, after: { left: "x", right: "5 ✓" } },
              { id: "g", label: "no, let's try x = 4" },
            ],
          },
        ],
      },
    },
  },
};

SCENARIOS.math_stepwise = {
  label: "Math stepwise",
  blurb: "Type each line of working. Correct lines lock green on retry; x=5.0 counts as x=5.",
  scenarios: {
    standard: {
      label: "Standard",
      props: {
        eyebrow: "Algebra · Lesson 3",
        title: "Show your working",
        problem: "Solve: 4x − 6 = 10",
        steps: [
          { label: "Step 1", expected: "4x = 16", hint: "move the 6 over" },
          { label: "Step 2", expected: "x = 4", hint: "divide by 4" },
        ],
      },
    },
    numericEq: {
      label: "Equivalent forms",
      props: {
        eyebrow: "Math · Edge case",
        title: "Halve it, then halve again",
        problem: "Start with 10. Halve it twice.",
        steps: [
          { label: "Half", expected: "5", hint: "10 ÷ 2" },
          { label: "Again", expected: "2.5", hint: "5 ÷ 2" },
        ],
      },
    },
  },
};

/* ════════════════ Batch 3 · Language ════════════════ */

SCENARIOS.sentence_builder = {
  label: "Sentence builder",
  blurb: "Tap word tiles into the strip — tap a placed word to send it back. Duplicate words behave.",
  scenarios: {
    standard: {
      label: "Standard",
      props: {
        eyebrow: "English · Lesson 2",
        words: ["likes", "dog", "My", "bones"],
        correct: ["My", "dog", "likes", "bones"],
      },
    },
    duplicates: {
      label: "Duplicate words",
      props: {
        eyebrow: "English · Edge case",
        title: "Build it — careful, two “the”s!",
        words: ["the", "cat", "saw", "the", "dog"],
        correct: ["the", "cat", "saw", "the", "dog"],
      },
    },
    long: {
      label: "Long sentence",
      props: {
        eyebrow: "English · Edge case",
        words: ["every", "morning", "before", "school", "I", "brush", "my", "teeth", "and", "eat", "breakfast"],
        correct: ["every", "morning", "before", "school", "I", "brush", "my", "teeth", "and", "eat", "breakfast"],
      },
    },
  },
};

SCENARIOS.translation = {
  label: "Translation",
  blurb: "Free-text translation. Forgiving about caps and full stops; 1-typo near-misses are free.",
  scenarios: {
    standard: {
      label: "Standard",
      props: {
        eyebrow: "Spanish · Lesson 3",
        source: "El gato bebe leche.",
        sourceLang: "Spanish", targetLang: "English",
        accepted: ["The cat drinks milk", "The cat is drinking milk"],
      },
    },
    long: {
      label: "Long sentence",
      props: {
        eyebrow: "Spanish · Edge case",
        source: "Mi familia y yo vamos a la playa todos los veranos porque nos encanta nadar en el mar.",
        sourceLang: "Spanish", targetLang: "English",
        accepted: [
          "My family and I go to the beach every summer because we love swimming in the sea",
          "My family and I go to the beach every summer because we love to swim in the sea",
        ],
      },
    },
  },
};

SCENARIOS.conjugation = {
  label: "Conjugation",
  blurb: "Fill the verb table. Correct rows lock green on retry; accents are forgiven but coached.",
  scenarios: {
    standard: {
      label: "Standard (hablar)",
      props: {
        eyebrow: "Spanish · Lesson 5",
        infinitive: "hablar", tense: "present", language: "Spanish",
        rows: [
          { pronoun: "yo", answer: "hablo" },
          { pronoun: "tú", answer: "hablas" },
          { pronoun: "él / ella", answer: "habla" },
          { pronoun: "nosotros", answer: "hablamos" },
          { pronoun: "ellos", answer: "hablan" },
        ],
      },
    },
    accents: {
      label: "Accent coaching",
      props: {
        eyebrow: "French · Edge case",
        infinitive: "préférer", tense: "present", language: "French",
        title: "Conjugate “préférer” — accents matter (a little)",
        rows: [
          { pronoun: "je", answer: "préfère" },
          { pronoun: "tu", answer: "préfères" },
          { pronoun: "nous", answer: "préférons" },
        ],
      },
    },
  },
};

SCENARIOS.dialogue = {
  label: "Dialogue",
  blurb: "Chat with a character — typing dots, bubbles pop in, wrong replies bounce back out.",
  scenarios: {
    standard: {
      label: "Standard (café)",
      props: {
        eyebrow: "English · Speaking practice",
        partner: "Maya", scenario: "Order at the café",
        turns: [
          {
            partner: "Hi! Welcome to the Green Leaf Café. What can I get you?",
            options: [
              { text: "I'd like a hot chocolate, please.", ok: true },
              { text: "Give chocolate now." },
              { text: "Yes." },
            ],
          },
          {
            partner: "Sure! Anything to eat with that?",
            options: [
              { text: "Bread me." },
              { text: "Could I have a croissant too?", ok: true },
              { text: "Eat? Never." },
            ],
          },
          {
            partner: "Here you go — that's €5.50 please.",
            options: [
              { text: "Here you are. Thank you!", ok: true },
              { text: "Money is for losers." },
            ],
          },
        ],
      },
    },
    long: {
      label: "Long replies",
      props: {
        eyebrow: "English · Edge case",
        partner: "Sam", scenario: "Making weekend plans",
        turns: [
          {
            partner: "Hey! A few of us are going hiking on Saturday morning and then having a picnic by the lake afterwards — do you want to come along?",
            options: [
              { text: "That sounds amazing! I love hiking, and I can bring some sandwiches and fruit for the picnic if that helps.", ok: true },
              { text: "Saturday is a day that exists in the week, yes, I have heard of it and acknowledge it." },
              { text: "Picnic lake hiking Saturday come along want to do you?" },
            ],
          },
        ],
      },
    },
  },
};

SCENARIOS.reading = {
  label: "Reading",
  blurb: "Passage beside the questions — stacks above them on narrow screens. Per-question hearts.",
  scenarios: {
    standard: {
      label: "Standard",
      props: {
        eyebrow: "Reading · Lesson 1",
        passageTitle: "The Lighthouse Keeper's Cat",
        passage: [
          "Old Tom kept the lighthouse on Gull Island, and his cat Biscuit kept Old Tom. Every evening, when the great lamp began to turn, Biscuit climbed the ninety-nine steps to sit beside it.",
          "One foggy night the lamp sputtered and died. Old Tom hunted for his matches, but it was Biscuit who found them — batting the box out from under the bed with a triumphant meow.",
          "“You're the real keeper,” laughed Old Tom, striking a match. By the time the fishing boats came round the point, the light was sweeping the waves again.",
        ],
        questions: [
          {
            question: "Where did the matches turn up?",
            options: [
              { text: "In Old Tom's coat pocket" },
              { text: "Under the bed", ok: true },
              { text: "Beside the great lamp" },
              { text: "On the ninety-ninth step" },
            ],
          },
          {
            question: "Why does Old Tom call Biscuit “the real keeper”?",
            options: [
              { text: "Biscuit saved the night by finding the matches", ok: true },
              { text: "Biscuit owns the lighthouse" },
              { text: "Biscuit lit the lamp with a match" },
            ],
          },
        ],
      },
    },
    long: {
      label: "Long passage",
      props: {
        eyebrow: "Reading · Edge case",
        passageTitle: "How Honey Happens",
        passage: [
          "A single jar of honey is the work of thousands of bees and millions of flowers. It starts when a forager bee finds a patch of blossoms and drinks their nectar, storing it in a special second stomach called the honey crop.",
          "Back at the hive, she passes the nectar mouth-to-mouth to house bees, who add enzymes that begin turning it into honey. They spread it in thin layers inside wax cells, then fan it with their wings for hours — sometimes all night — to dry it out.",
          "When the honey is thick enough, the bees seal each cell with a wax cap, like putting a lid on a tiny jar. A strong hive can make a hundred kilograms of honey in a year — far more than it needs — which is why beekeepers can share some without harming the colony.",
          "The colour and flavour of honey depend on the flowers it came from: clover makes pale, mild honey; buckwheat makes it dark and bold; and orange blossoms leave a hint of citrus behind.",
        ],
        questions: [
          {
            question: "Why do bees fan the nectar with their wings?",
            options: [
              { text: "To dry it out so it thickens into honey", ok: true },
              { text: "To keep the hive cool in summer" },
              { text: "To mix in pollen from the flowers" },
              { text: "To call other bees to the cell" },
            ],
          },
          {
            question: "What decides what a honey tastes like?",
            options: [
              { text: "How long the bees fan it" },
              { text: "The flowers the nectar came from", ok: true },
              { text: "The shape of the wax cells" },
            ],
          },
        ],
      },
    },
  },
};

SCENARIOS.crossword = {
  label: "Crossword",
  blurb: "Type straight through each word — auto-advance, backspace walks back, crossing cells toggle direction.",
  scenarios: {
    standard: {
      label: "Standard (animals)",
      props: {
        eyebrow: "Vocabulary · Lesson 4",
        title: "Animal crossword",
        words: [
          { word: "CAT", clue: "Says meow", row: 0, col: 0, dir: "a" },
          { word: "COW", clue: "Gives us milk", row: 0, col: 0, dir: "d" },
          { word: "OWL", clue: "Hoots at night", row: 1, col: 0, dir: "a" },
          { word: "WOLF", clue: "Howls at the moon", row: 1, col: 1, dir: "d" },
        ],
      },
    },
    big: {
      label: "Bigger grid",
      props: {
        eyebrow: "Vocabulary · Edge case",
        title: "Space crossword",
        words: [
          { word: "STAR", clue: "Twinkles in the night sky", row: 0, col: 2, dir: "d" },
          { word: "SUN", clue: "Our closest star", row: 0, col: 2, dir: "a" },
          { word: "MARS", clue: "The red planet", row: 3, col: 0, dir: "a" },
          { word: "MOON", clue: "Lights up the night", row: 3, col: 0, dir: "d" },
          { word: "ORBIT", clue: "The path a planet follows", row: 6, col: 0, dir: "a" },
          { word: "NOVA", clue: "An exploding star", row: 3, col: 3, dir: "d" },
        ],
      },
    },
  },
};

/* ════════════════ Batch 4 · Cards & tables ════════════════ */

SCENARIOS.card_sort = {
  label: "Card sort",
  blurb: "Sort equation cards into columns — pointer-drag or tap-to-arm. Wrong cards hop back on retry.",
  scenarios: {
    standard: {
      label: "Standard (3 columns)",
      props: {
        eyebrow: "Algebra · Lesson 4",
        title: "How many solutions?",
        categories: [
          { id: "one", label: "One solution" },
          { id: "none", label: "No solution" },
          { id: "inf", label: "Infinitely many" },
        ],
        cards: [
          { id: "c1", text: "x + 3 = 7", cat: "one" },
          { id: "c2", text: "x = x + 1", cat: "none" },
          { id: "c3", text: "2x = x + x", cat: "inf" },
          { id: "c4", text: "3x = 12", cat: "one" },
          { id: "c5", text: "x + 1 = x + 1", cat: "inf" },
          { id: "c6", text: "0 · x = 5", cat: "none" },
        ],
      },
    },
    two: {
      label: "2 columns, simple",
      props: {
        eyebrow: "Numbers · Lesson 1",
        title: "Odd or even?",
        categories: [
          { id: "odd", label: "Odd" },
          { id: "even", label: "Even" },
        ],
        cards: [
          { id: "n7", text: "7", cat: "odd" },
          { id: "n12", text: "12", cat: "even" },
          { id: "n25", text: "25", cat: "odd" },
          { id: "n40", text: "40", cat: "even" },
          { id: "n33", text: "33", cat: "odd" },
          { id: "n18", text: "18", cat: "even" },
        ],
      },
    },
  },
};

SCENARIOS.srs_flashcard = {
  label: "SRS flashcards",
  blurb: "Flip & self-rate. “Again” cards come back later in the deck. Space flips, 1–4 rate.",
  scenarios: {
    standard: {
      label: "Standard (Spanish)",
      props: {
        eyebrowPrefix: "Spanish · Deck",
        frontLabel: "Spanish", backLabel: "English",
        title: "Flip & rate yourself",
        cards: [
          { front: "perro", back: "dog" },
          { front: "gato", back: "cat" },
          { front: "pájaro", back: "bird" },
          { front: "caballo", back: "horse" },
        ],
      },
    },
    hanzi: {
      label: "Hanzi + hint",
      props: {
        eyebrowPrefix: "Chinese · Deck",
        frontLabel: "Hanzi", backLabel: "Meaning",
        cards: [
          { front: "水", back: "water", hint: "shuǐ" },
          { front: "火", back: "fire", hint: "huǒ" },
          { front: "山", back: "mountain", hint: "shān" },
        ],
      },
    },
    long: {
      label: "Long phrases",
      props: {
        eyebrowPrefix: "Idioms · Deck",
        frontLabel: "Idiom", backLabel: "Meaning",
        cards: [
          { front: "break the ice", back: "to make people feel comfortable when they first meet" },
          { front: "piece of cake", back: "something that is very easy to do" },
        ],
      },
    },
  },
};

SCENARIOS.venn_diagram = {
  label: "Venn (numbers)",
  blurb: "Count each region of the Venn diagram. Correct regions lock green between tries.",
  scenarios: {
    standard: {
      label: "Standard",
      props: {
        eyebrow: "Sets · Lesson 2",
        setA: "Plays football", setB: "Plays chess",
        total: 30,
        given: { intersection: 5 },
        answers: { a_only: 12, b_only: 8, neither: 5 },
        prompt: "30 students were asked. 17 play football, 13 play chess, and 5 play both. How many play neither?",
      },
    },
    allBlank: {
      label: "All regions blank",
      props: {
        eyebrow: "Sets · Edge case",
        setA: "Has a bike", setB: "Has a scooter",
        total: 24,
        answers: { a_only: 9, intersection: 4, b_only: 6, neither: 5 },
        prompt: "24 kids: 13 have a bike, 10 have a scooter, 4 have both. Fill in every region.",
      },
    },
  },
};

SCENARIOS.venn_elements = {
  label: "Venn (items)",
  blurb: "Drag items into the right region — pointer-drag or tap-to-arm. Works on touch.",
  scenarios: {
    standard: {
      label: "Standard (numbers)",
      props: {
        eyebrow: "Numbers · Lesson 3",
        setA: "Even", setB: "Bigger than 10",
        items: [4, 8, 12, 18, 7, 15, 3],
        correct: { "4": "a_only", "8": "a_only", "12": "intersection", "18": "intersection", "15": "b_only", "7": "neither", "3": "neither" },
      },
    },
    words: {
      label: "Words",
      props: {
        eyebrow: "Animals · Edge case",
        setA: "Can fly", setB: "Lays eggs",
        items: ["bat", "owl", "snake", "dog", "bee"],
        correct: { bat: "a_only", owl: "intersection", snake: "b_only", dog: "neither", bee: "intersection" },
        hint: "think carefully about the bat!",
      },
    },
  },
};

SCENARIOS.two_way_table = {
  label: "Two-way table",
  blurb: "Fill the missing cells so every row and column total checks out.",
  scenarios: {
    standard: {
      label: "Standard",
      props: {
        eyebrow: "Data · Lesson 2",
        rowLabels: ["Cats", "Dogs", "Total"],
        colLabels: ["Boys", "Girls", "Total"],
        cells: [
          [4, null, 9],
          [null, 3, null],
          [10, 8, 18],
        ],
        answers: { "0,1": 5, "1,0": 6, "1,2": 9 },
        hint: "every row and column must add up to its total",
      },
    },
    dense: {
      label: "4×4 dense",
      props: {
        eyebrow: "Data · Edge case",
        rowLabels: ["Football", "Chess", "Art", "Total"],
        colLabels: ["Y5", "Y6", "Total"],
        cells: [
          [7, null, 12],
          [null, 4, 7],
          [2, null, null],
          [12, 12, 24],
        ],
        answers: { "0,1": 5, "1,0": 3, "2,1": 3, "2,2": 5 },
        hint: "start with the rows that have only one blank",
      },
    },
  },
};

SCENARIOS.table_pattern = {
  label: "Table pattern",
  blurb: "Fill the f(x) blanks and name the rule. “2x+1”, “f(x)=2x+1”, “y=2x+1” all count.",
  scenarios: {
    standard: {
      label: "Standard",
      props: {
        eyebrow: "Patterns · Lesson 1",
        xValues: [1, 2, 3, 4, 5],
        yGiven: [3, 5, null, 9, null],
        answers: { 2: 7, 4: 11 },
        ruleAccepted: ["2x+1", "2*x+1", "1+2x", "x*2+1", "x+x+1"],
        ruleDisplay: "f(x) = 2x + 1",
        ruleExample: "like: 3x − 2",
      },
    },
    negative: {
      label: "Decreasing pattern",
      props: {
        eyebrow: "Patterns · Edge case",
        xValues: [0, 1, 2, 3],
        yGiven: [10, null, 6, null],
        answers: { 1: 8, 3: 4 },
        ruleAccepted: ["10-2x", "-2x+10", "10-x*2", "10-2*x"],
        ruleDisplay: "f(x) = 10 − 2x",
        ruleExample: "like: 8 − 3x",
      },
    },
  },
};

SCENARIOS.area_model = {
  label: "Area model",
  blurb: "Break a big multiplication into easy boxes, then add them up.",
  scenarios: {
    standard: {
      label: "Standard (23 × 14)",
      props: {
        eyebrow: "Multiplication · Lesson 5",
        a: 23, b: 14,
        splits: { a: [20, 3], b: [10, 4] },
      },
    },
    big: {
      label: "3×2 split (134 × 56)",
      props: {
        eyebrow: "Multiplication · Edge case",
        a: 134, b: 56,
        splits: { a: [100, 30, 4], b: [50, 6] },
      },
    },
  },
};

/* ════════════════ Batch 5 · Graphs ════════════════ */

SCENARIOS.coordinate_plane = {
  label: "Coordinate plane",
  blurb: "Drag labeled points to their coordinates — crosshair guides, dashed rings on misses, arrow-key support.",
  scenarios: {
    standard: {
      label: "Standard (3 points)",
      props: {
        eyebrow: "Coordinates · Lesson 2",
        targets: [
          { x: 2, y: 3, label: "A" },
          { x: -4, y: 1, label: "B" },
          { x: 3, y: -5, label: "C" },
        ],
      },
    },
    one: {
      label: "Single point (range 4)",
      props: {
        eyebrow: "Coordinates · Lesson 1",
        title: "Take A to (3, −2)",
        range: 4,
        targets: [{ x: 3, y: -2, label: "A" }],
      },
    },
    many: {
      label: "4 points (dense range 8)",
      props: {
        eyebrow: "Coordinates · Edge case",
        range: 8,
        targets: [
          { x: 6, y: 7, label: "A" },
          { x: -7, y: 3, label: "B" },
          { x: -2, y: -6, label: "C" },
          { x: 5, y: -4, label: "D" },
        ],
      },
    },
  },
};

SCENARIOS.function_graph = {
  label: "Function graph",
  blurb: "Steer y = mx + b onto the dashed target line. Misses tell you WHICH dial is off.",
  scenarios: {
    standard: {
      label: "Standard",
      props: { eyebrow: "Algebra · Lesson 6", target: { m: 2, b: -1 } },
    },
    fractions: {
      label: "Half slopes",
      props: { eyebrow: "Algebra · Edge case", target: { m: -1.5, b: 3 }, mStep: 0.5 },
    },
  },
};

SCENARIOS.graph_transform = {
  label: "Graph transform",
  blurb: "Slide & stretch a parabola onto the dashed target.",
  scenarios: {
    standard: {
      label: "Standard",
      props: { eyebrow: "Functions · Lesson 3", target: { h: 2, v: -3, a: 1 } },
    },
    stretch: {
      label: "With stretch",
      props: { eyebrow: "Functions · Edge case", target: { h: -1, v: 2, a: 2 } },
    },
  },
};

SCENARIOS.inequality_graph = {
  label: "Inequality graph",
  blurb: "Four dials — slope, intercept, symbol, shading. Misses count how many are right.",
  scenarios: {
    standard: {
      label: "Standard",
      props: { eyebrow: "Algebra · Lesson 8", target: { m: 1, b: 2, op: ">=" } },
    },
    strict: {
      label: "Strict < (dashed line)",
      props: { eyebrow: "Algebra · Edge case", target: { m: -2, b: -1, op: "<" } },
    },
  },
};

SCENARIOS.scatter_plot = {
  label: "Scatter plot",
  blurb: "Drag two handles to fit a line through the dot cloud — now with touch & keyboard.",
  scenarios: {
    standard: {
      label: "Standard",
      props: {
        eyebrow: "Data · Lesson 4",
        points: [
          { x: 1, y: 2.2 }, { x: 2, y: 2.8 }, { x: 3, y: 4.1 }, { x: 4, y: 4.6 },
          { x: 5, y: 6.2 }, { x: 6, y: 6.5 }, { x: 7, y: 7.9 }, { x: 8, y: 8.3 }, { x: 9, y: 9.8 },
        ],
        target: { m: 0.95, b: 1.2 },
      },
    },
    noisy: {
      label: "Noisy data",
      props: {
        eyebrow: "Data · Edge case",
        points: [
          { x: 1, y: 4 }, { x: 2, y: 2 }, { x: 3, y: 5.5 }, { x: 4, y: 3.5 },
          { x: 5, y: 7 }, { x: 6, y: 5 }, { x: 7, y: 8.5 }, { x: 8, y: 6.5 }, { x: 9, y: 10 },
        ],
        target: { m: 0.8, b: 1.8 },
        mTolerance: 0.4, bTolerance: 1.5,
      },
    },
  },
};

SCENARIOS.function_machine = {
  label: "Function machine",
  blurb: "Feed numbers in, watch what comes out, crack the secret rule.",
  scenarios: {
    standard: {
      label: "Standard (3x − 2)",
      props: {
        eyebrow: "Patterns · Lesson 4",
        rule: (x) => 3 * x - 2,
        ruleAccepted: ["3x-2", "3*x-2", "x*3-2", "-2+3x"],
        ruleDisplay: "f(x) = 3x − 2",
        sampleInputs: [0, 1, 2, 5],
      },
    },
    square: {
      label: "Squares (x²)",
      props: {
        eyebrow: "Patterns · Edge case",
        rule: (x) => x * x,
        ruleAccepted: ["x^2", "x²", "xx", "x*x"],
        ruleDisplay: "f(x) = x²",
        sampleInputs: [1, 2, 3, -2],
        minRuns: 4,
      },
    },
  },
};

SCENARIOS.probability_wheel = {
  label: "Probability wheel",
  blurb: "Spin, tally, and predict the most frequent slice. ×5 quick-spin saves little thumbs.",
  scenarios: {
    standard: {
      label: "Standard (12 spins)",
      props: {
        eyebrow: "Probability · Lesson 1",
        targetSpins: 12,
        segments: [
          { label: "Red", color: "#ff7a5c", weight: 3 },
          { label: "Blue", color: "#2b91ff", weight: 1 },
          { label: "Green", color: "#3fb04b", weight: 2 },
        ],
      },
    },
    fair: {
      label: "Fair wheel (4 equal)",
      props: {
        eyebrow: "Probability · Edge case",
        targetSpins: 16,
        segments: [
          { label: "A", color: "#ff7a5c" },
          { label: "B", color: "#2b91ff" },
          { label: "C", color: "#3fb04b" },
          { label: "D", color: "#f5b800" },
        ],
      },
    },
  },
};

SCENARIOS.equation_balance = {
  label: "Equation balance",
  blurb: "Keep the scale balanced while you peel everything away from x. Undo included.",
  scenarios: {
    standard: {
      label: "Standard (3x + 4 = 10)",
      props: {
        eyebrow: "Algebra · Lesson 2",
        initial: { leftX: 3, leftW: 4, rightX: 0, rightW: 10 },
        target: { leftX: 1, leftW: 0, rightX: 0, rightW: 2 },
        explain: "3x + 4 = 10 → 3x = 6 → x = 2",
      },
    },
    xboth: {
      label: "x on both sides",
      props: {
        eyebrow: "Algebra · Edge case",
        title: "x on BOTH sides — still works!",
        initial: { leftX: 3, leftW: 1, rightX: 1, rightW: 7 },
        target: { leftX: 1, leftW: 0, rightX: 0, rightW: 3 },
        explain: "3x + 1 = x + 7 → 2x = 6 → x = 3",
      },
    },
  },
};

/* ════════════════ Batch 6 · Special ════════════════ */

/* tiny simulated python-ish runner for the playground */
function simRunner(expected) {
  return {
    onRun: async (code) => {
      await new Promise((r) => setTimeout(r, 600));
      if (!code.includes("return")) return "⚠ your function never returns anything";
      return "ran ok — no output (use Submit to run the tests)";
    },
    onSubmit: async (code) => {
      await new Promise((r) => setTimeout(r, 900));
      const hasReturn = code.includes("return");
      const looksRight = expected.every((t) => t.trigger.some((k) => code.includes(k)));
      return expected.map((t, i) => ({
        id: i + 1,
        name: t.name,
        hidden: t.hidden,
        passed: hasReturn && (looksRight || t.easy),
        time: 3 + Math.floor(Math.random() * 20),
        expected: t.expected,
        actual: hasReturn ? (looksRight || t.easy ? t.expected : t.wrongActual) : "nothing",
      }));
    },
  };
}

SCENARIOS.code_challenge = {
  label: "Code challenge",
  blurb: "Editor + tests in the lesson shell. Tab indents, failing tests show expected vs actual.",
  scenarios: {
    standard: {
      label: "Standard (double it)",
      props: {
        eyebrow: "Python · Lesson 1",
        hint: "multiply by 2 — or add the number to itself",
        problem: {
          title: "Write double(n)",
          desc: "Write a function that returns its number doubled. double(4) should give 8.",
          starter: "def double(n):\n    # your code here\n    return",
          language: "Python 3",
          filename: "double.py",
          examples: [
            { input: "double(4)", output: "8" },
            { input: "double(0)", output: "0" },
          ],
        },
        __sim: [
          { name: "double(4) == 8", trigger: ["* 2", "*2", "n + n", "n+n"], expected: "8", wrongActual: "None" },
          { name: "double(0) == 0", trigger: ["* 2", "*2", "n + n", "n+n"], expected: "0", wrongActual: "None", easy: false },
          { name: "negative numbers", trigger: ["* 2", "*2", "n + n", "n+n"], expected: "-6", wrongActual: "None", hidden: true },
        ],
      },
    },
  },
};

SCENARIOS.robot_2d = {
  label: "Robot 2D",
  blurb: "Block programming on a grid — active block highlights, wall bumps go BONK.",
  scenarios: {
    standard: {
      label: "Standard (no coins)",
      props: {
        eyebrow: "Coding · Lesson 1",
        size: 5,
        start: { r: 4, c: 0, dir: 1 },
        goal: { r: 1, c: 3 },
      },
    },
    coins: {
      label: "With coins",
      props: {
        eyebrow: "Coding · Lesson 3",
        title: "Collect both coins, then reach the flag",
        size: 6,
        start: { r: 5, c: 0, dir: 1 },
        goal: { r: 0, c: 5 },
        coins: [{ r: 5, c: 3 }, { r: 2, c: 5 }],
      },
    },
  },
};

SCENARIOS.arithmetic_puzzle = {
  label: "Arithmetic puzzle",
  blurb: "Fill equation blanks from a number bank — duplicates welcome, tap a slot to undo.",
  scenarios: {
    standard: {
      label: "Standard",
      props: {
        eyebrow: "Math · Lesson 2",
        equations: [
          { cells: ["7", "+", "_", "=", "12"], answer: 5 },
          { cells: ["_", "−", "4", "=", "9"], answer: 13 },
          { cells: ["6", "×", "_", "=", "18"], answer: 3 },
        ],
        bank: [3, 5, 8, 13],
      },
    },
    duplicates: {
      label: "Duplicate numbers",
      props: {
        eyebrow: "Math · Edge case",
        title: "Two answers are the same — the bank has two 4s",
        equations: [
          { cells: ["2", "+", "_", "=", "6"], answer: 4 },
          { cells: ["12", "÷", "_", "=", "3"], answer: 4 },
          { cells: ["_", "+", "3", "=", "10"], answer: 7 },
        ],
        bank: [4, 4, 7, 9],
      },
    },
  },
};

SCENARIOS.bubble_sheet = {
  label: "Bubble sheet",
  blurb: "SAT-style sheet — answer everything, then check. Right answers lock green on retry.",
  scenarios: {
    standard: {
      label: "Standard (4 questions)",
      props: {
        eyebrow: "Quick quiz · Week 12",
        questions: [
          { n: 1, q: "9 × 6 = ?", opts: ["52", "54", "56", "58"], correct: 1 },
          { n: 2, q: "100 − 37 = ?", opts: ["73", "67", "63", "57"], correct: 2 },
          { n: 3, q: "Half of 90?", opts: ["40", "45", "50", "55"], correct: 1 },
          { n: 4, q: "8 + 7 + 5 = ?", opts: ["19", "20", "21", "22"], correct: 1 },
        ],
      },
    },
    long: {
      label: "Long options",
      props: {
        eyebrow: "Reading · Edge case",
        questions: [
          { n: 1, q: "Which sentence is correct?", opts: ["Him and me went to the park yesterday", "He and I went to the park yesterday", "Me and him goes to the park yesterday"], correct: 1 },
          { n: 2, q: "Pick the best opening for a story:", opts: ["The end.", "It was a normal Tuesday — until the fridge started humming a song.", "In conclusion, dragons."], correct: 1 },
        ],
      },
    },
  },
};

/* simple island map for the pin scenarios */
function IslandMap() {
  return (
    <svg viewBox="0 0 560 400" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} aria-hidden="true">
      <path d="M 90 240 Q 70 170 140 140 Q 180 80 280 95 Q 380 70 430 130 Q 500 160 480 230 Q 490 300 400 320 Q 330 360 240 340 Q 130 330 90 240 Z" fill="#a8d5a2" stroke="#7bb876" strokeWidth="3"></path>
      <path d="M 200 180 Q 240 150 300 165 Q 350 175 360 215 Q 340 250 280 245 Q 220 240 200 180 Z" fill="#8cc985"></path>
      <circle cx="160" cy="210" r="5" fill="#5a8f55"></circle>
      <circle cx="172" cy="222" r="5" fill="#5a8f55"></circle>
      <circle cx="150" cy="225" r="5" fill="#5a8f55"></circle>
      <path d="M 395 250 l 12 22 h -24 Z" fill="#8a7350"></path>
      <path d="M 380 268 l 10 18 h -20 Z" fill="#9d8460"></path>
      <path d="M 250 290 q 12 -16 24 0 q -12 14 -24 0 Z" fill="#4f7fbf"></path>
      <text x="160" y="195" fontFamily="Manrope, sans-serif" fontSize="13" fontWeight="700" fill="#3c6437" textAnchor="middle">Palm Woods</text>
      <text x="395" y="245" fontFamily="Manrope, sans-serif" fontSize="13" fontWeight="700" fill="#6e5a3e" textAnchor="middle">Twin Peaks</text>
      <text x="262" y="315" fontFamily="Manrope, sans-serif" fontSize="13" fontWeight="700" fill="#2d5e9e" textAnchor="middle">Blue Lagoon</text>
      <text x="285" y="205" fontFamily="Manrope, sans-serif" fontSize="12" fontWeight="600" fill="#56784f" textAnchor="middle" opacity="0.8">Old Meadow</text>
    </svg>
  );
}

SCENARIOS.map_pin = {
  label: "Map pin",
  blurb: "Drop a pin on the right spot — misses give a compass hint; final reveal shows the tolerance ring.",
  scenarios: {
    standard: {
      label: "Standard (lagoon)",
      props: {
        eyebrow: "Geography · Island unit",
        title: "Drop the pin on Blue Lagoon",
        target: { x: 46.5, y: 73 },
        tolerance: 8,
        mapContent: <IslandMap />,
        correctHint: "Blue Lagoon — the little bay at the south of the island",
      },
    },
    precise: {
      label: "Tight tolerance",
      props: {
        eyebrow: "Geography · Edge case",
        title: "Find Twin Peaks — be precise!",
        target: { x: 70, y: 64 },
        tolerance: 4.5,
        mapContent: <IslandMap />,
        correctHint: "the two brown mountains, east side",
      },
    },
  },
};

SCENARIOS.file_upload = {
  label: "File upload",
  blurb: "Drag-drop or browse, type-checked, with upload progress. Wrong type gets a friendly nudge.",
  scenarios: {
    standard: {
      label: "Standard",
      props: {
        eyebrow: "Project · My pet report",
        title: "Hand in your pet report",
        accept: ".pdf,.docx,.txt",
      },
    },
    images: {
      label: "Images only",
      props: {
        eyebrow: "Art · Edge case",
        title: "Upload a photo of your drawing",
        accept: ".jpg,.jpeg,.png",
        dropLabel: "Drop your photo here, or tap to browse",
      },
    },
  },
};

SCENARIOS.scorm = {
  label: "SCORM module",
  blurb: "Embedded module player — now with a Back button for re-reading.",
  scenarios: {
    standard: {
      label: "Standard (4 slides)",
      props: {
        eyebrow: "SCORM 2004 · v1.2",
        packageName: "water-cycle.zip",
        slides: [
          { title: "What is the water cycle?" },
          { title: "Evaporation — water goes up" },
          { title: "Condensation — clouds form" },
          { title: "Precipitation — rain comes down" },
        ],
        finalScore: 95,
      },
    },
  },
};

const MECH_GROUPS = [
  { label: "Batch 1 · Basics", ids: ["quiz", "true_false", "matching", "ordering", "fill_blanks", "categorize"] },
  { label: "Batch 2 · Math", ids: ["numeric_input", "mc_math", "number_line", "equation_solver", "math_stepwise"] },
  { label: "Batch 3 · Language", ids: ["sentence_builder", "translation", "conjugation", "dialogue", "reading", "crossword"] },
  { label: "Batch 4 · Cards & tables", ids: ["card_sort", "srs_flashcard", "venn_diagram", "venn_elements", "two_way_table", "table_pattern", "area_model"] },
  { label: "Batch 5 · Graphs", ids: ["coordinate_plane", "function_graph", "graph_transform", "inequality_graph", "scatter_plot", "function_machine", "probability_wheel", "equation_balance"] },
  { label: "Batch 6 · Special", ids: ["code_challenge", "robot_2d", "arithmetic_puzzle", "bubble_sheet", "map_pin", "file_upload", "scorm"] },
];
const MECH_ORDER = MECH_GROUPS.flatMap((g) => g.ids);

Object.assign(window, { SCENARIOS, MECH_ORDER, MECH_GROUPS });
