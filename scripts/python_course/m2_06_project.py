"""Module 2, Lesson 6: Project — Rock-Paper-Scissors."""
from .helpers import (
    assemble, hero, why_it_matters, concept, code_example, try_it,
    exercise, mistakes, pro_tips, recap, section,
)


def build() -> str:
    return assemble([
        hero(
            "Project: Rock-Paper-Scissors",
            "Build a complete game using everything you have learned in Module 2.",
        ),

        why_it_matters(
            "<p>This capstone project brings together booleans, conditionals, for loops, "
            "while loops, and nested logic into a real, playable game. You will handle "
            "user input, generate random choices, determine winners, track scores, "
            "and build a game loop. These are the same patterns used in real applications "
            "&mdash; just with more fun.</p>"
        ),

        section("What we are building"),

        concept("Game features",
            "<p>Our Rock-Paper-Scissors game will include:</p>"
            "<ul>"
            "<li><strong>Player vs Computer</strong> &mdash; player types a choice, computer picks randomly</li>"
            "<li><strong>Winner detection</strong> &mdash; determine who wins each round</li>"
            "<li><strong>Score tracking</strong> &mdash; best of 5 rounds</li>"
            "<li><strong>Input validation</strong> &mdash; handle invalid input gracefully</li>"
            "<li><strong>Round-by-round display</strong> &mdash; show choices and results clearly</li>"
            "</ul>"
            "<p>We will build it step by step, just like a real developer would.</p>"
        ),

        section("Step 1: Import random and define choices"),

        code_example("Setting up",
            'import random\n'
            '\n'
            '# Valid choices\n'
            'CHOICES = ["rock", "paper", "scissors"]\n'
            '\n'
            '# What beats what: key beats value\n'
            'WINS = {\n'
            '    "rock": "scissors",\n'
            '    "scissors": "paper",\n'
            '    "paper": "rock",\n'
            '}\n'
            '\n'
            'print("Choices:", CHOICES)\n'
            'print("Rock beats:", WINS["rock"])',
            output="Choices: ['rock', 'paper', 'scissors']\nRock beats: scissors",
            explanation="Using a dictionary to define the win rules is cleaner than a long "
            "if-elif chain. To check if player beats computer, just check: "
            "<code>WINS[player] == computer</code>."
        ),

        section("Step 2: Get user choice with validation"),

        code_example("Input with validation",
            'def get_player_choice():\n'
            '    """Ask the player to choose rock, paper, or scissors."""\n'
            '    while True:\n'
            '        choice = input("Choose rock, paper, or scissors: ").strip().lower()\n'
            '\n'
            '        if choice in CHOICES:\n'
            '            return choice\n'
            '\n'
            '        # Allow abbreviations\n'
            '        if choice in ("r", "rock"):\n'
            '            return "rock"\n'
            '        elif choice in ("p", "paper"):\n'
            '            return "paper"\n'
            '        elif choice in ("s", "scissors"):\n'
            '            return "scissors"\n'
            '\n'
            '        print(f"  Invalid choice: \'{choice}\'. Try again.")',
            explanation="The while loop keeps asking until valid input is received. "
            "We accept abbreviations (r, p, s) for convenience. The <code>.strip().lower()</code> "
            "handles extra spaces and case differences."
        ),

        section("Step 3: Generate computer choice"),

        code_example("Random computer choice",
            'import random\n'
            '\n'
            '# Simple: pick a random item from the list\n'
            'computer_choice = random.choice(CHOICES)\n'
            'print(f"Computer chose: {computer_choice}")',
            output="Computer chose: paper",
            explanation="<code>random.choice()</code> picks one random item from a sequence. "
            "It is the simplest way to make the computer choose."
        ),

        section("Step 4: Determine the winner"),

        code_example("Win/lose/draw logic",
            'def determine_winner(player, computer):\n'
            '    """Return \'player\', \'computer\', or \'tie\'."""\n'
            '    if player == computer:\n'
            '        return "tie"\n'
            '    elif WINS[player] == computer:\n'
            '        return "player"\n'
            '    else:\n'
            '        return "computer"\n'
            '\n'
            '# Test it\n'
            'print(determine_winner("rock", "scissors"))    # player\n'
            'print(determine_winner("rock", "paper"))       # computer\n'
            'print(determine_winner("rock", "rock"))        # tie',
            output="player\ncomputer\ntie",
            explanation="The WINS dictionary does all the heavy lifting. If the thing your "
            "choice beats is the computer's choice, you win. Otherwise, the computer wins."
        ),

        section("Step 5: Display round results"),

        code_example("Formatted round display",
            'def display_round(round_num, player, computer, result):\n'
            '    """Show the results of a round."""\n'
            '    # Emoji mapping for fun\n'
            '    icons = {"rock": "\\U0001FAA8", "paper": "\\U0001F4C4", "scissors": "\\u2702\\uFE0F"}\n'
            '\n'
            '    print(f"\\n--- Round {round_num} ---")\n'
            '    print(f"  You:      {icons[player]} {player}")\n'
            '    print(f"  Computer: {icons[computer]} {computer}")\n'
            '\n'
            '    if result == "tie":\n'
            '        print("  Result:   It\'s a tie!")\n'
            '    elif result == "player":\n'
            '        print(f"  Result:   You win! {player} beats {computer}.")\n'
            '    else:\n'
            '        print(f"  Result:   You lose. {computer} beats {player}.")',
            explanation="Good formatting makes the game feel polished. We use emojis for "
            "visual appeal and show the reasoning behind the result."
        ),

        section("Step 6: Score tracking with best of 5"),

        code_example("The game loop",
            'def play_game(rounds_to_win=3):\n'
            '    """Play a best-of-5 (first to 3 wins) game."""\n'
            '    player_score = 0\n'
            '    computer_score = 0\n'
            '    round_num = 0\n'
            '    ties = 0\n'
            '\n'
            '    print("=" * 40)\n'
            '    print("   ROCK  PAPER  SCISSORS")\n'
            '    print(f"   First to {rounds_to_win} wins!")\n'
            '    print("=" * 40)\n'
            '\n'
            '    while player_score < rounds_to_win and computer_score < rounds_to_win:\n'
            '        round_num += 1\n'
            '\n'
            '        # Get choices\n'
            '        player = get_player_choice()\n'
            '        computer = random.choice(CHOICES)\n'
            '\n'
            '        # Determine winner\n'
            '        result = determine_winner(player, computer)\n'
            '\n'
            '        # Update scores\n'
            '        if result == "player":\n'
            '            player_score += 1\n'
            '        elif result == "computer":\n'
            '            computer_score += 1\n'
            '        else:\n'
            '            ties += 1\n'
            '\n'
            '        # Display\n'
            '        display_round(round_num, player, computer, result)\n'
            '        print(f"  Score:    You {player_score} - {computer_score} Computer")\n'
            '\n'
            '    # Game over\n'
            '    print("\\n" + "=" * 40)\n'
            '    if player_score > computer_score:\n'
            '        print("  *** YOU WIN THE MATCH! ***")\n'
            '    else:\n'
            '        print("  *** COMPUTER WINS THE MATCH ***")\n'
            '\n'
            '    print(f"\\n  Final Score: You {player_score} - {computer_score} Computer")\n'
            '    print(f"  Rounds played: {round_num} (Ties: {ties})")\n'
            '    print("=" * 40)',
            explanation="The while loop continues until either player reaches 3 wins. "
            "Ties do not count toward the win total, so the game could take more than 5 rounds."
        ),

        section("Step 7: The complete program"),

        code_example("Full Rock-Paper-Scissors game",
            'import random\n'
            '\n'
            '# === Configuration ===\n'
            'CHOICES = ["rock", "paper", "scissors"]\n'
            'WINS = {\n'
            '    "rock": "scissors",\n'
            '    "scissors": "paper",\n'
            '    "paper": "rock",\n'
            '}\n'
            '\n'
            '\n'
            'def get_player_choice():\n'
            '    """Get and validate player input."""\n'
            '    while True:\n'
            '        choice = input("\\nChoose (r)ock, (p)aper, or (s)cissors: ").strip().lower()\n'
            '        if choice in ("r", "rock"):\n'
            '            return "rock"\n'
            '        elif choice in ("p", "paper"):\n'
            '            return "paper"\n'
            '        elif choice in ("s", "scissors"):\n'
            '            return "scissors"\n'
            '        else:\n'
            '            print(f"  Invalid: \'{choice}\'. Enter r, p, or s.")\n'
            '\n'
            '\n'
            'def determine_winner(player, computer):\n'
            '    """Return \'player\', \'computer\', or \'tie\'."""\n'
            '    if player == computer:\n'
            '        return "tie"\n'
            '    elif WINS[player] == computer:\n'
            '        return "player"\n'
            '    else:\n'
            '        return "computer"\n'
            '\n'
            '\n'
            'def play_game():\n'
            '    """Main game loop — best of 5."""\n'
            '    rounds_to_win = 3\n'
            '    p_score = 0\n'
            '    c_score = 0\n'
            '    round_num = 0\n'
            '\n'
            '    print("=" * 40)\n'
            '    print("   ROCK  PAPER  SCISSORS")\n'
            '    print(f"   First to {rounds_to_win} wins!")\n'
            '    print("=" * 40)\n'
            '\n'
            '    while p_score < rounds_to_win and c_score < rounds_to_win:\n'
            '        round_num += 1\n'
            '        player = get_player_choice()\n'
            '        computer = random.choice(CHOICES)\n'
            '        result = determine_winner(player, computer)\n'
            '\n'
            '        if result == "player":\n'
            '            p_score += 1\n'
            '        elif result == "computer":\n'
            '            c_score += 1\n'
            '\n'
            '        print(f"\\n  Round {round_num}: You={player}, CPU={computer}")\n'
            '        if result == "tie":\n'
            '            print("  -> Tie!")\n'
            '        elif result == "player":\n'
            '            print(f"  -> You win! {player} beats {computer}")\n'
            '        else:\n'
            '            print(f"  -> CPU wins! {computer} beats {player}")\n'
            '        print(f"  Score: You {p_score} - {c_score} CPU")\n'
            '\n'
            '    print("\\n" + "=" * 40)\n'
            '    if p_score > c_score:\n'
            '        print("  YOU WIN THE MATCH!")\n'
            '    else:\n'
            '        print("  COMPUTER WINS THE MATCH!")\n'
            '    print(f"  Final: You {p_score} - {c_score} CPU ({round_num} rounds)")\n'
            '    print("=" * 40)\n'
            '\n'
            '\n'
            '# === Play! ===\n'
            'while True:\n'
            '    play_game()\n'
            '    again = input("\\nPlay again? (y/n): ").strip().lower()\n'
            '    if again != "y":\n'
            '        print("Thanks for playing!")\n'
            '        break',
            explanation="This is the complete, working game. Copy it, run it, and play! "
            "Notice how each function handles one job: getting input, determining the winner, "
            "running the game loop. This is clean, modular code."
        ),

        section("Sample session"),

        code_example("What a game looks like",
            '# ========================================\n'
            '#    ROCK  PAPER  SCISSORS\n'
            '#    First to 3 wins!\n'
            '# ========================================\n'
            '#\n'
            '# Choose (r)ock, (p)aper, or (s)cissors: r\n'
            '#\n'
            '#   Round 1: You=rock, CPU=scissors\n'
            '#   -> You win! rock beats scissors\n'
            '#   Score: You 1 - 0 CPU\n'
            '#\n'
            '# Choose (r)ock, (p)aper, or (s)cissors: p\n'
            '#\n'
            '#   Round 2: You=paper, CPU=paper\n'
            '#   -> Tie!\n'
            '#   Score: You 1 - 0 CPU\n'
            '#\n'
            '# Choose (r)ock, (p)aper, or (s)cissors: s\n'
            '#\n'
            '#   Round 3: You=scissors, CPU=rock\n'
            '#   -> CPU wins! rock beats scissors\n'
            '#   Score: You 1 - 1 CPU\n'
            '#\n'
            '# Choose (r)ock, (p)aper, or (s)cissors: r\n'
            '#\n'
            '#   Round 4: You=rock, CPU=scissors\n'
            '#   -> You win! rock beats scissors\n'
            '#   Score: You 2 - 1 CPU\n'
            '#\n'
            '# Choose (r)ock, (p)aper, or (s)cissors: p\n'
            '#\n'
            '#   Round 5: You=paper, CPU=rock\n'
            '#   -> You win! paper beats rock\n'
            '#   Score: You 3 - 1 CPU\n'
            '#\n'
            '# ========================================\n'
            '#   YOU WIN THE MATCH!\n'
            '#   Final: You 3 - 1 CPU (5 rounds)\n'
            '# ========================================',
            explanation="Your game should produce output similar to this. "
            "The exact results will vary since the computer chooses randomly."
        ),

        try_it("Copy the complete program above, run it, and play a few matches."),

        section("Extension: Rock-Paper-Scissors-Lizard-Spock"),

        concept("Adding Lizard and Spock",
            "<p>The expanded version has 5 choices with these rules:</p>"
            "<ul>"
            "<li><strong>Scissors</strong> cuts Paper, decapitates Lizard</li>"
            "<li><strong>Paper</strong> covers Rock, disproves Spock</li>"
            "<li><strong>Rock</strong> crushes Scissors, crushes Lizard</li>"
            "<li><strong>Lizard</strong> eats Paper, poisons Spock</li>"
            "<li><strong>Spock</strong> vaporizes Rock, smashes Scissors</li>"
            "</ul>"
            "<p>Each choice beats exactly 2 others and loses to exactly 2 others.</p>"
        ),

        code_example("RPSLS configuration",
            '# Extended rules\n'
            'CHOICES = ["rock", "paper", "scissors", "lizard", "spock"]\n'
            '\n'
            '# Each choice maps to the set of choices it beats\n'
            'WINS = {\n'
            '    "rock": {"scissors", "lizard"},\n'
            '    "paper": {"rock", "spock"},\n'
            '    "scissors": {"paper", "lizard"},\n'
            '    "lizard": {"paper", "spock"},\n'
            '    "spock": {"rock", "scissors"},\n'
            '}\n'
            '\n'
            'def determine_winner(player, computer):\n'
            '    """Updated for RPSLS."""\n'
            '    if player == computer:\n'
            '        return "tie"\n'
            '    elif computer in WINS[player]:\n'
            '        return "player"\n'
            '    else:\n'
            '        return "computer"\n'
            '\n'
            '# Test\n'
            'print(determine_winner("lizard", "spock"))   # player\n'
            'print(determine_winner("spock", "paper"))    # computer',
            output="player\ncomputer",
            explanation="By changing WINS to use sets of what each choice beats, the "
            "<code>determine_winner</code> function barely changes. The data structure "
            "does the work, not the code. This is a key design principle."
        ),

        section("Exercises"),

        exercise("starter", "Add round history",
            "Modify the game to keep a history of every round. After the match ends, "
            "print a recap showing each round's choices and result. Number them "
            "and show who won each round.",
            hint="Use <code>history = []</code>. After each round, "
            "<code>history.append((round_num, player, computer, result))</code>. "
            "After the game, loop through history with a for loop."
        ),

        exercise("medium", "Win streak tracker",
            "Add a win streak counter. Track the current streak and the best streak "
            "for both player and computer. Display the current streak after each round "
            "and the best streaks at the end. A streak is consecutive wins by the same side "
            "(ties reset both streaks).",
            hint="Use variables <code>p_streak</code>, <code>c_streak</code>, "
            "<code>p_best_streak</code>, <code>c_best_streak</code>. On player win: "
            "<code>p_streak += 1; c_streak = 0; p_best_streak = max(p_best_streak, p_streak)</code>."
        ),

        exercise("medium", "Implement RPSLS",
            "Extend the full game to support Rock-Paper-Scissors-Lizard-Spock. "
            "Update the input validation to accept all 5 choices (with abbreviations: "
            "r, p, s, l, k for Spock). Update the display to show what beats what "
            "(e.g., \"Lizard poisons Spock\"). Use the WINS dictionary approach shown above.",
            hint="Create a VERBS dictionary: <code>{(\"rock\", \"scissors\"): \"crushes\", ...}</code> "
            "to get the action word for the display."
        ),

        exercise("real-world", "Tournament mode",
            "Build a tournament mode where the user enters 2-8 player names. "
            "The program runs a single-elimination bracket: pair players up, "
            "each pair plays best-of-3 (computer makes choices for all players). "
            "Winners advance to the next round. Display the bracket and crown a champion.<br>"
            "Handle odd numbers by giving one player a \"bye\" (automatic advance).",
            hint="Store players in a list. Each round: pair them up with "
            "<code>zip(players[::2], players[1::2])</code>. If odd count, last player "
            "gets a bye. Winners form the list for the next round. Repeat until one remains."
        ),

        mistakes([
            ("Forgetting to import random",
             "<code>random.choice()</code> requires <code>import random</code> at the top. "
             "You will get <code>NameError: name 'random' is not defined</code> without it."),
            ("Not handling ties in the score",
             "Ties should not count as wins for either side. Make sure your while loop "
             "condition checks win counts, not round counts."),
            ("Comparing strings with wrong case",
             "\"Rock\" != \"rock\". Always normalize input with <code>.lower()</code> "
             "before comparing."),
            ("Infinite loop from missing break or wrong condition",
             "If neither score reaches the target, the game loop never ends. "
             "Test with a small number of rounds first."),
        ]),

        pro_tips([
            "<strong>Data-driven design.</strong> The WINS dictionary approach is extensible. "
            "To add a new choice, just update the dictionary &mdash; the game logic stays the same.",
            "<strong>Functions make code reusable.</strong> The <code>determine_winner</code> function "
            "works for both RPS and RPSLS with a tiny change. This is the power of abstraction.",
            "<strong>Separate concerns.</strong> Input handling, game logic, and display are "
            "separate functions. Each does one thing. This makes the code easy to test and modify.",
            "<strong>Test edge cases.</strong> What if the player types nothing? What about ties "
            "for 10 rounds straight? Good code handles weird scenarios gracefully.",
            "<strong>This project is portfolio-worthy.</strong> Add a README, put it on GitHub, "
            "and mention it in interviews. It demonstrates loops, conditionals, input validation, "
            "data structures, and clean code architecture.",
        ]),

        recap([
            "Built a complete, interactive game from scratch",
            "Used <code>random.choice()</code> to generate computer moves",
            "Used a dictionary to define win rules (data-driven design)",
            "Validated input with a while loop and string methods",
            "Tracked scores and determined match winners",
            "Extended the game with Lizard and Spock variants",
            "Module 2 is complete &mdash; you can make your programs think and decide",
        ]),
    ])
