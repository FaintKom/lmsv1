"""Module 6, Lesson 6: Project — Weather Dashboard CLI."""
from .helpers import (
    assemble, hero, why_it_matters, concept, code_example, try_it,
    exercise, mistakes, pro_tips, recap, section,
)


def build() -> str:
    return assemble([
        hero(
            "Project: Weather Dashboard CLI",
            "Build a complete weather dashboard that fetches data from an API, saves history to JSON, and displays formatted results.",
        ),

        why_it_matters(
            "<p>This project combines everything from Module 6: file I/O, JSON, error handling, "
            "modules, and HTTP requests. You will build a real CLI tool that fetches weather data, "
            "displays it beautifully, and persists search history. This is the kind of project "
            "that demonstrates real-world Python skills to employers.</p>"
        ),

        section("What we are building"),

        concept("Weather dashboard features",
            "<ul>"
            "<li><strong>Fetch weather data</strong> &mdash; from a public API (with mock fallback)</li>"
            "<li><strong>Display current weather</strong> &mdash; temperature, conditions, humidity, wind</li>"
            "<li><strong>Show forecast</strong> &mdash; next 3-5 days</li>"
            "<li><strong>Save search history</strong> &mdash; persist to a JSON file</li>"
            "<li><strong>View history</strong> &mdash; show recent searches</li>"
            "<li><strong>Error handling</strong> &mdash; network failures, invalid cities, API errors</li>"
            "</ul>"
        ),

        section("Step 1: Mock weather data"),

        concept("Starting with mock data",
            "<p>We will start with mock data so the program works without an API key. "
            "Once the structure is solid, you can swap in a real API like OpenWeatherMap.</p>"
        ),

        code_example("Mock weather provider",
            'import random\n'
            'from datetime import datetime, timedelta\n'
            '\n'
            'def get_mock_weather(city):\n'
            '    """Generate realistic mock weather data."""\n'
            '    conditions = ["Clear", "Partly Cloudy", "Cloudy", "Light Rain",\n'
            '                  "Heavy Rain", "Snow", "Fog", "Thunderstorm"]\n'
            '    base_temp = {"london": 12, "tokyo": 18, "new york": 8,\n'
            '                 "sydney": 24, "paris": 14, "mumbai": 30}\n'
            '    temp = base_temp.get(city.lower(), random.randint(5, 35))\n'
            '\n'
            '    current = {\n'
            '        "city": city.title(),\n'
            '        "temperature": temp + random.randint(-3, 3),\n'
            '        "feels_like": temp + random.randint(-5, 2),\n'
            '        "condition": random.choice(conditions),\n'
            '        "humidity": random.randint(30, 90),\n'
            '        "wind_speed": round(random.uniform(5, 30), 1),\n'
            '        "wind_direction": random.choice(["N", "NE", "E", "SE",\n'
            '                                         "S", "SW", "W", "NW"]),\n'
            '        "timestamp": datetime.now().isoformat(),\n'
            '    }\n'
            '\n'
            '    forecast = []\n'
            '    for i in range(1, 6):\n'
            '        day = datetime.now() + timedelta(days=i)\n'
            '        forecast.append({\n'
            '            "date": day.strftime("%A, %b %d"),\n'
            '            "high": temp + random.randint(0, 5),\n'
            '            "low": temp + random.randint(-5, 0),\n'
            '            "condition": random.choice(conditions),\n'
            '            "rain_chance": random.randint(0, 100),\n'
            '        })\n'
            '\n'
            '    return {"current": current, "forecast": forecast}\n'
            '\n'
            '\n'
            'data = get_mock_weather("London")\n'
            'print(f"City: {data[\'current\'][\'city\']}")\n'
            'print(f"Temp: {data[\'current\'][\'temperature\']}C")\n'
            'print(f"Condition: {data[\'current\'][\'condition\']}")',
            output="City: London\nTemp: 13C\nCondition: Partly Cloudy",
        ),

        section("Step 2: Display formatting"),

        code_example("Beautiful terminal output",
            'def display_current(data):\n'
            '    """Display current weather in a formatted box."""\n'
            '    c = data["current"]\n'
            '    w = 44\n'
            '    print(f"\\n{\'=\' * w}")\n'
            '    print(f"{\'WEATHER DASHBOARD\':^{w}}")\n'
            '    print(f"{\'=\' * w}")\n'
            '    print(f"  City:        {c[\'city\']}")\n'
            '    print(f"  Temperature: {c[\'temperature\']}C (feels like {c[\'feels_like\']}C)")\n'
            '    print(f"  Condition:   {c[\'condition\']}")\n'
            '    print(f"  Humidity:    {c[\'humidity\']}%")\n'
            '    print(f"  Wind:        {c[\'wind_speed\']} km/h {c[\'wind_direction\']}")\n'
            '    print(f"  Updated:     {c[\'timestamp\'][:19]}")\n'
            '    print(f"{\'-\' * w}")\n'
            '\n'
            '\n'
            'def display_forecast(data):\n'
            '    """Display the 5-day forecast."""\n'
            '    print(f"\\n  {\'5-DAY FORECAST\':^40}")\n'
            '    print(f"  {\'Day\':<18} {\'High\':>5} {\'Low\':>5} {\'Rain\':>5}  {\'Condition\'}")\n'
            '    print(f"  {\'-\' * 52}")\n'
            '    for day in data["forecast"]:\n'
            '        print(f"  {day[\'date\']:<18} {day[\'high\']:>4}C {day[\'low\']:>4}C"\n'
            '              f" {day[\'rain_chance\']:>4}%  {day[\'condition\']}")\n'
            '    print()\n'
            '\n'
            '\n'
            '# Demo:\n'
            'weather = get_mock_weather("Tokyo")\n'
            'display_current(weather)\n'
            'display_forecast(weather)',
            output="============================================\n"
            "            WEATHER DASHBOARD\n"
            "============================================\n"
            "  City:        Tokyo\n"
            "  Temperature: 19C (feels like 17C)\n"
            "  Condition:   Clear\n"
            "  Humidity:    45%\n"
            "  Wind:        12.3 km/h NE\n"
            "  Updated:     2024-01-15 14:30\n"
            "--------------------------------------------\n\n"
            "                5-DAY FORECAST\n"
            "  Day                 High   Low  Rain  Condition\n"
            "  ----------------------------------------------------\n"
            "  Tuesday, Jan 16      21C   16C   25%  Partly Cloudy\n"
            "  Wednesday, Jan 17    20C   15C   60%  Light Rain\n"
            "  Thursday, Jan 18     22C   17C   10%  Clear\n"
            "  Friday, Jan 19       19C   14C   45%  Cloudy\n"
            "  Saturday, Jan 20     23C   18C    5%  Clear",
        ),

        section("Step 3: History management"),

        code_example("Saving and loading search history",
            'import json\n'
            'from pathlib import Path\n'
            '\n'
            'HISTORY_FILE = "weather_history.json"\n'
            '\n'
            'def load_history():\n'
            '    """Load search history from JSON file."""\n'
            '    path = Path(HISTORY_FILE)\n'
            '    if not path.exists():\n'
            '        return []\n'
            '    try:\n'
            '        with open(HISTORY_FILE) as f:\n'
            '            return json.load(f)\n'
            '    except (json.JSONDecodeError, IOError):\n'
            '        print("Warning: Could not load history. Starting fresh.")\n'
            '        return []\n'
            '\n'
            '\n'
            'def save_history(history):\n'
            '    """Save search history to JSON file."""\n'
            '    try:\n'
            '        with open(HISTORY_FILE, "w") as f:\n'
            '            json.dump(history, f, indent=2)\n'
            '    except IOError as e:\n'
            '        print(f"Warning: Could not save history: {e}")\n'
            '\n'
            '\n'
            'def add_to_history(history, weather_data):\n'
            '    """Add a search to history (keep last 20)."""\n'
            '    entry = {\n'
            '        "city": weather_data["current"]["city"],\n'
            '        "temperature": weather_data["current"]["temperature"],\n'
            '        "condition": weather_data["current"]["condition"],\n'
            '        "searched_at": weather_data["current"]["timestamp"],\n'
            '    }\n'
            '    history.append(entry)\n'
            '    # Keep only last 20 entries:\n'
            '    if len(history) > 20:\n'
            '        history[:] = history[-20:]\n'
            '    save_history(history)\n'
            '    return history\n'
            '\n'
            '\n'
            'def display_history(history):\n'
            '    """Show recent search history."""\n'
            '    if not history:\n'
            '        print("\\nNo search history yet.")\n'
            '        return\n'
            '    print(f"\\n--- Recent Searches ({len(history)}) ---")\n'
            '    for i, entry in enumerate(reversed(history[-10:]), 1):\n'
            '        print(f"  {i}. {entry[\'city\']}: {entry[\'temperature\']}C, "\n'
            '              f"{entry[\'condition\']} ({entry[\'searched_at\'][:16]})")\n'
            '\n'
            '\n'
            '# Demo:\n'
            'history = load_history()\n'
            'weather = get_mock_weather("London")\n'
            'history = add_to_history(history, weather)\n'
            'weather = get_mock_weather("Tokyo")\n'
            'history = add_to_history(history, weather)\n'
            'display_history(history)',
            output="--- Recent Searches (2) ---\n"
            "  1. Tokyo: 19C, Clear (2024-01-15 14:3)\n"
            "  2. London: 13C, Cloudy (2024-01-15 14:3)",
        ),

        section("Step 4: The complete program"),

        code_example("Full weather dashboard CLI",
            'import json\n'
            'import random\n'
            'from datetime import datetime, timedelta\n'
            'from pathlib import Path\n'
            '\n'
            'HISTORY_FILE = "weather_history.json"\n'
            '\n'
            '# --- Weather Provider ---\n'
            'def get_weather(city):\n'
            '    """Fetch weather data. Uses mock data (swap for real API)."""\n'
            '    # To use a real API, replace this function body with:\n'
            '    # import requests\n'
            '    # response = requests.get(API_URL, params={...}, timeout=10)\n'
            '    # return response.json()\n'
            '    return get_mock_weather(city)\n'
            '\n'
            '# --- History ---\n'
            '# (load_history, save_history, add_to_history as above)\n'
            '\n'
            '# --- Main Application ---\n'
            'def main():\n'
            '    """Run the weather dashboard."""\n'
            '    print("=" * 44)\n'
            '    print(f"{\"WEATHER DASHBOARD\":^44}")\n'
            '    print("=" * 44)\n'
            '\n'
            '    history = load_history()\n'
            '\n'
            '    while True:\n'
            '        print("\\n--- Menu ---")\n'
            '        print("1. Check weather for a city")\n'
            '        print("2. View search history")\n'
            '        print("3. Clear history")\n'
            '        print("4. Quit")\n'
            '\n'
            '        choice = input("\\nChoose (1-4): ").strip()\n'
            '\n'
            '        if choice == "1":\n'
            '            city = input("Enter city name: ").strip()\n'
            '            if not city:\n'
            '                print("City name cannot be empty.")\n'
            '                continue\n'
            '\n'
            '            print(f"\\nFetching weather for {city}...")\n'
            '            try:\n'
            '                data = get_weather(city)\n'
            '                display_current(data)\n'
            '                display_forecast(data)\n'
            '                history = add_to_history(history, data)\n'
            '            except Exception as e:\n'
            '                print(f"Error fetching weather: {e}")\n'
            '                print("Please check the city name and try again.")\n'
            '\n'
            '        elif choice == "2":\n'
            '            display_history(history)\n'
            '\n'
            '        elif choice == "3":\n'
            '            history = []\n'
            '            save_history(history)\n'
            '            print("History cleared.")\n'
            '\n'
            '        elif choice == "4":\n'
            '            print("\\nGoodbye! Stay weather-aware!")\n'
            '            break\n'
            '\n'
            '        else:\n'
            '            print("Invalid choice. Please enter 1-4.")\n'
            '\n'
            'if __name__ == "__main__":\n'
            '    main()',
            explanation="The complete program ties everything together: mock weather data, "
            "formatted display, JSON-based history, and a menu loop with error handling. "
            "The <code>get_weather()</code> function is the single point to swap in a real API."
        ),

        section("Step 5: Connecting to a real API"),

        concept("Using OpenWeatherMap",
            "<p>To use real weather data, sign up for a free API key at "
            "<code>openweathermap.org</code> and replace the mock function:</p>"
        ),

        code_example("Real API integration (optional)",
            'import os\n'
            'import requests\n'
            '\n'
            'def get_real_weather(city):\n'
            '    """Fetch real weather from OpenWeatherMap API."""\n'
            '    api_key = os.environ.get("WEATHER_API_KEY")\n'
            '    if not api_key:\n'
            '        raise ValueError("Set WEATHER_API_KEY environment variable")\n'
            '\n'
            '    # Current weather:\n'
            '    url = "https://api.openweathermap.org/data/2.5/weather"\n'
            '    params = {"q": city, "appid": api_key, "units": "metric"}\n'
            '\n'
            '    try:\n'
            '        response = requests.get(url, params=params, timeout=10)\n'
            '        response.raise_for_status()\n'
            '        data = response.json()\n'
            '    except requests.exceptions.HTTPError as e:\n'
            '        if e.response.status_code == 404:\n'
            '            raise ValueError(f"City \'{city}\' not found")\n'
            '        raise\n'
            '    except requests.exceptions.ConnectionError:\n'
            '        raise ConnectionError("No internet connection")\n'
            '    except requests.exceptions.Timeout:\n'
            '        raise TimeoutError("API request timed out")\n'
            '\n'
            '    # Convert to our standard format:\n'
            '    current = {\n'
            '        "city": data["name"],\n'
            '        "temperature": round(data["main"]["temp"]),\n'
            '        "feels_like": round(data["main"]["feels_like"]),\n'
            '        "condition": data["weather"][0]["description"].title(),\n'
            '        "humidity": data["main"]["humidity"],\n'
            '        "wind_speed": round(data["wind"]["speed"] * 3.6, 1),\n'
            '        "wind_direction": "N",    # simplified\n'
            '        "timestamp": datetime.now().isoformat(),\n'
            '    }\n'
            '\n'
            '    return {"current": current, "forecast": []}\n'
            '\n'
            '# Usage:\n'
            '# export WEATHER_API_KEY=your_key_here\n'
            '# python weather_dashboard.py\n'
            'print("Real API ready. Set WEATHER_API_KEY to use.")',
            output="Real API ready. Set WEATHER_API_KEY to use.",
            explanation="The real API function converts the OpenWeatherMap response into the "
            "same format our display functions expect. This is the adapter pattern &mdash; "
            "change the data source without changing the rest of the program."
        ),

        section("Extension ideas"),

        concept("Taking it further",
            "<ul>"
            "<li><strong>5-day forecast</strong> &mdash; use the OpenWeatherMap forecast endpoint</li>"
            "<li><strong>Multiple units</strong> &mdash; let users switch between Celsius and Fahrenheit</li>"
            "<li><strong>Favorite cities</strong> &mdash; save a list of favorites to check quickly</li>"
            "<li><strong>Weather alerts</strong> &mdash; highlight extreme temperatures or conditions</li>"
            "<li><strong>Export to CSV</strong> &mdash; save history as a spreadsheet-friendly CSV</li>"
            "<li><strong>ASCII art</strong> &mdash; add weather icons using text art (sun, cloud, rain)</li>"
            "<li><strong>Comparison mode</strong> &mdash; compare weather in two cities side by side</li>"
            "</ul>"
        ),

        section("Exercises"),

        exercise("starter", "Add temperature conversion",
            "Add a menu option to toggle between Celsius and Fahrenheit display. "
            "Store the preference in the history JSON file. Update <code>display_current</code> "
            "and <code>display_forecast</code> to respect the setting.",
            hint="Add a <code>unit</code> key to the saved settings: "
            "<code>{\"unit\": \"C\", \"history\": [...]}</code>. "
            "Convert with <code>f = c * 9/5 + 32</code>."
        ),

        exercise("medium", "Favorite cities",
            "Add the ability to save favorite cities. New menu options: "
            "<code>Check all favorites</code> (fetches weather for each), "
            "<code>Add favorite</code>, <code>Remove favorite</code>. "
            "Store favorites in the JSON file. Display a summary table of all favorites.",
            hint="Store favorites as a list in the JSON: "
            "<code>{\"favorites\": [\"London\", \"Tokyo\"], \"history\": [...]}</code>. "
            "Loop through and call <code>get_weather</code> for each."
        ),

        exercise("real-world", "Full dashboard with real API",
            "Connect to the OpenWeatherMap API (free tier). Implement both current weather "
            "and 5-day forecast. Add caching: save the last response for each city with a "
            "timestamp, and only make a new API call if the cache is older than 10 minutes. "
            "Add a <code>--city</code> command-line argument using <code>sys.argv</code> "
            "for quick lookups without the menu.",
            hint="Check cache: <code>if city in cache and time.time() - cache[city][\"timestamp\"] < 600</code>. "
            "For CLI args: <code>if len(sys.argv) > 1: city = sys.argv[1]</code>."
        ),

        mistakes([
            ("Not caching API responses",
             "Free API tiers have rate limits (60 calls/minute for OpenWeatherMap). "
             "Cache responses to avoid hitting limits."),
            ("Hardcoding the API key",
             "Use <code>os.environ.get(\"WEATHER_API_KEY\")</code>. Never commit API keys to git."),
            ("Not handling network errors",
             "The internet is unreliable. Always wrap API calls in try/except with "
             "<code>ConnectionError</code>, <code>Timeout</code>, and <code>HTTPError</code>."),
            ("Crashing on malformed JSON history",
             "If the history file gets corrupted, the program should not crash. "
             "Handle <code>JSONDecodeError</code> and start with an empty history."),
        ]),

        pro_tips([
            "<strong>Adapter pattern.</strong> Keep your display logic separate from your data "
            "source. The <code>get_weather()</code> function converts any API response into your "
            "standard format. Switching providers means changing one function.",
            "<strong>Graceful degradation.</strong> If the API is down, show cached data with "
            "a warning. If no cache, show mock data. Never leave the user with nothing.",
            "<strong>Module 6 complete.</strong> You can now read/write files, work with JSON and CSV, "
            "handle errors gracefully, organize code into modules, and talk to web APIs. "
            "These are the skills that turn you from a learner into a builder.",
            "<strong>The entire course is complete.</strong> You have variables, control flow, "
            "data structures, functions, OOP, and real-world Python. "
            "Build something. Ship it. That is how you become a developer.",
        ]),

        recap([
            "Built a complete CLI application combining all Module 6 skills",
            "Used mock data with a clean swap point for real API integration",
            "Saved and loaded history from a JSON file with error handling",
            "Formatted terminal output into readable dashboards",
            "Handled network errors, missing files, and invalid data",
            "Structured code into focused functions with clear responsibilities",
            "Module 6 and the entire Python course complete",
        ]),
    ])
