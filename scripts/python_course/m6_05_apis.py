"""Module 6, Lesson 5: HTTP Requests & APIs."""
from .helpers import (
    assemble, hero, why_it_matters, concept, code_example, try_it,
    exercise, mistakes, pro_tips, recap, section,
)


def build() -> str:
    return assemble([
        hero(
            "HTTP Requests &amp; APIs",
            "Connect your Python code to the world. Fetch data from web APIs, send data to servers, and handle responses.",
        ),

        why_it_matters(
            "<p>APIs (Application Programming Interfaces) are how programs talk to each other. "
            "Weather data, stock prices, social media posts, payment processing, AI services "
            "&mdash; they all work through APIs. The <code>requests</code> library makes HTTP "
            "calls simple, and understanding REST APIs is a must-have skill for any developer.</p>"
        ),

        section("HTTP basics"),

        concept("How the web works",
            "<p>HTTP (HyperText Transfer Protocol) is the language of the web. "
            "Every API call is an HTTP request with:</p>"
            "<ul>"
            "<li><strong>Method</strong> &mdash; GET (read), POST (create), PUT (update), DELETE (remove)</li>"
            "<li><strong>URL</strong> &mdash; where to send the request</li>"
            "<li><strong>Headers</strong> &mdash; metadata (authentication, content type)</li>"
            "<li><strong>Body</strong> &mdash; data to send (for POST/PUT)</li>"
            "</ul>"
            "<p>The server responds with a <strong>status code</strong> and <strong>body</strong> (usually JSON).</p>"
        ),

        concept("Status codes",
            "<ul>"
            "<li><code>200</code> &mdash; OK (success)</li>"
            "<li><code>201</code> &mdash; Created (resource created successfully)</li>"
            "<li><code>400</code> &mdash; Bad Request (your fault)</li>"
            "<li><code>401</code> &mdash; Unauthorized (need authentication)</li>"
            "<li><code>404</code> &mdash; Not Found (resource does not exist)</li>"
            "<li><code>500</code> &mdash; Internal Server Error (server's fault)</li>"
            "</ul>"
        ),

        section("Making GET requests"),

        code_example("Basic GET request with requests",
            'import requests\n'
            '\n'
            '# Fetch data from a public API:\n'
            'response = requests.get("https://httpbin.org/get")\n'
            '\n'
            'print(f"Status: {response.status_code}")\n'
            'print(f"OK: {response.ok}")\n'
            'print(f"Content-Type: {response.headers[\'content-type\']}")\n'
            '\n'
            '# Parse JSON response:\n'
            'data = response.json()\n'
            'print(f"Origin IP: {data[\'origin\']}")\n'
            'print(f"URL: {data[\'url\']}")',
            output="Status: 200\nOK: True\n"
            "Content-Type: application/json\n"
            "Origin IP: 203.0.113.42\nURL: https://httpbin.org/get",
            explanation="<code>requests.get(url)</code> sends a GET request. "
            "<code>response.json()</code> parses the JSON body into a Python dictionary. "
            "<code>response.ok</code> is True for status codes 200-299."
        ),

        code_example("Query parameters",
            'import requests\n'
            '\n'
            '# Pass parameters in the URL:\n'
            'params = {\n'
            '    "q": "python programming",\n'
            '    "page": 1,\n'
            '    "per_page": 5,\n'
            '}\n'
            '\n'
            'response = requests.get("https://httpbin.org/get", params=params)\n'
            'data = response.json()\n'
            '\n'
            '# The library builds the URL for you:\n'
            'print(f"Full URL: {data[\'url\']}")\n'
            'print(f"Args received: {data[\'args\']}")',
            output="Full URL: https://httpbin.org/get?q=python+programming&page=1&per_page=5\n"
            "Args received: {'page': '1', 'per_page': '5', 'q': 'python programming'}",
            explanation="Never build query strings manually. Pass a dictionary to "
            "<code>params=</code> and <code>requests</code> handles URL encoding for you."
        ),

        section("Making POST requests"),

        code_example("Sending data with POST",
            'import requests\n'
            'import json\n'
            '\n'
            '# Send JSON data:\n'
            'user_data = {\n'
            '    "name": "Alice Smith",\n'
            '    "email": "alice@example.com",\n'
            '    "role": "developer",\n'
            '}\n'
            '\n'
            'response = requests.post(\n'
            '    "https://httpbin.org/post",\n'
            '    json=user_data,    # automatically sets Content-Type: application/json\n'
            ')\n'
            '\n'
            'result = response.json()\n'
            'print(f"Status: {response.status_code}")\n'
            'print(f"Sent data: {result[\'json\']}")\n'
            'print(f"Content-Type sent: {result[\'headers\'][\'Content-Type\']}")',
            output="Status: 200\n"
            "Sent data: {'name': 'Alice Smith', 'email': 'alice@example.com', 'role': 'developer'}\n"
            "Content-Type sent: application/json",
            explanation="<code>json=data</code> automatically serializes the dictionary to JSON "
            "and sets the correct Content-Type header. Use <code>data=</code> for form-encoded data."
        ),

        section("Headers and authentication"),

        code_example("Custom headers and API keys",
            'import requests\n'
            '\n'
            '# API key in headers (common pattern):\n'
            'headers = {\n'
            '    "Authorization": "Bearer your-api-key-here",\n'
            '    "Accept": "application/json",\n'
            '    "User-Agent": "MyPythonApp/1.0",\n'
            '}\n'
            '\n'
            'response = requests.get(\n'
            '    "https://httpbin.org/headers",\n'
            '    headers=headers,\n'
            ')\n'
            '\n'
            'data = response.json()\n'
            'print("Headers received by server:")\n'
            'for key, value in data["headers"].items():\n'
            '    print(f"  {key}: {value}")',
            output="Headers received by server:\n"
            "  Accept: application/json\n"
            "  Authorization: Bearer your-api-key-here\n"
            "  Host: httpbin.org\n"
            "  User-Agent: MyPythonApp/1.0",
            explanation="Most APIs require an API key for authentication. "
            "The standard pattern is <code>Authorization: Bearer YOUR_KEY</code>. "
            "Never hardcode API keys &mdash; use environment variables."
        ),

        section("Error handling for APIs"),

        code_example("Robust API error handling",
            'import requests\n'
            '\n'
            'def api_get(url, params=None, timeout=10):\n'
            '    """Make a GET request with proper error handling."""\n'
            '    try:\n'
            '        response = requests.get(url, params=params, timeout=timeout)\n'
            '        response.raise_for_status()    # raises HTTPError for 4xx/5xx\n'
            '        return {"ok": True, "data": response.json(), "status": response.status_code}\n'
            '\n'
            '    except requests.exceptions.ConnectionError:\n'
            '        return {"ok": False, "error": "Connection failed", "status": 0}\n'
            '    except requests.exceptions.Timeout:\n'
            '        return {"ok": False, "error": "Request timed out", "status": 0}\n'
            '    except requests.exceptions.HTTPError as e:\n'
            '        return {"ok": False, "error": f"HTTP {e.response.status_code}",\n'
            '                "status": e.response.status_code}\n'
            '    except requests.exceptions.JSONDecodeError:\n'
            '        return {"ok": False, "error": "Invalid JSON response",\n'
            '                "status": response.status_code}\n'
            '\n'
            '# Test with valid URL:\n'
            'result = api_get("https://httpbin.org/get")\n'
            'print(f"Valid: ok={result[\'ok\']}, status={result[\'status\']}")\n'
            '\n'
            '# Test with 404:\n'
            'result = api_get("https://httpbin.org/status/404")\n'
            'print(f"404: ok={result[\'ok\']}, error={result[\'error\']}")\n'
            '\n'
            '# Test with timeout:\n'
            'result = api_get("https://httpbin.org/delay/5", timeout=1)\n'
            'print(f"Timeout: ok={result[\'ok\']}, error={result[\'error\']}")',
            output="Valid: ok=True, status=200\n"
            "404: ok=False, error=HTTP 404\n"
            "Timeout: ok=False, error=Request timed out",
            explanation="Always set a <code>timeout</code> to prevent hanging forever. "
            "Use <code>response.raise_for_status()</code> to convert HTTP errors into exceptions. "
            "Handle each error type specifically."
        ),

        section("Building an API client class"),

        code_example("A reusable API client",
            'import requests\n'
            '\n'
            'class APIClient:\n'
            '    """A simple, reusable API client."""\n'
            '\n'
            '    def __init__(self, base_url, api_key=None, timeout=10):\n'
            '        self.base_url = base_url.rstrip("/")\n'
            '        self.timeout = timeout\n'
            '        self.session = requests.Session()\n'
            '        if api_key:\n'
            '            self.session.headers["Authorization"] = f"Bearer {api_key}"\n'
            '        self.session.headers["Accept"] = "application/json"\n'
            '\n'
            '    def get(self, endpoint, params=None):\n'
            '        """GET request to an endpoint."""\n'
            '        url = f"{self.base_url}/{endpoint.lstrip(\"/\")}"\n'
            '        response = self.session.get(url, params=params, timeout=self.timeout)\n'
            '        response.raise_for_status()\n'
            '        return response.json()\n'
            '\n'
            '    def post(self, endpoint, data=None):\n'
            '        """POST request to an endpoint."""\n'
            '        url = f"{self.base_url}/{endpoint.lstrip(\"/\")}"\n'
            '        response = self.session.post(url, json=data, timeout=self.timeout)\n'
            '        response.raise_for_status()\n'
            '        return response.json()\n'
            '\n'
            '\n'
            '# Usage:\n'
            'client = APIClient("https://httpbin.org")\n'
            '\n'
            'result = client.get("get", params={"q": "python"})\n'
            'print(f"GET: {result[\'args\']}")\n'
            '\n'
            'result = client.post("post", data={"message": "Hello!"})\n'
            'print(f"POST: {result[\'json\']}")',
            output="GET: {'q': 'python'}\nPOST: {'message': 'Hello!'}",
            explanation="A <code>Session</code> object reuses connections and maintains headers "
            "across requests. This is faster and cleaner than passing headers every time."
        ),

        section("Working with real APIs"),

        code_example("Fetching GitHub user data",
            'import requests\n'
            '\n'
            'def get_github_user(username):\n'
            '    """Fetch public info about a GitHub user."""\n'
            '    url = f"https://api.github.com/users/{username}"\n'
            '    headers = {"Accept": "application/vnd.github.v3+json"}\n'
            '\n'
            '    try:\n'
            '        response = requests.get(url, headers=headers, timeout=10)\n'
            '        response.raise_for_status()\n'
            '        data = response.json()\n'
            '\n'
            '        return {\n'
            '            "username": data["login"],\n'
            '            "name": data.get("name", "N/A"),\n'
            '            "bio": data.get("bio", "N/A"),\n'
            '            "public_repos": data["public_repos"],\n'
            '            "followers": data["followers"],\n'
            '            "created": data["created_at"][:10],\n'
            '        }\n'
            '    except requests.exceptions.HTTPError as e:\n'
            '        if e.response.status_code == 404:\n'
            '            return {"error": f"User \'{username}\' not found"}\n'
            '        raise\n'
            '\n'
            '# This would work with a real connection:\n'
            '# user = get_github_user("python")\n'
            '# print(f"Username: {user[\'username\']}")\n'
            '# print(f"Repos: {user[\'public_repos\']}")\n'
            '# print(f"Followers: {user[\'followers\']}")\n'
            '\n'
            '# Simulated output:\n'
            'print("Username: python")\n'
            'print("Name: Python")\n'
            'print("Public repos: 55")\n'
            'print("Followers: 12,000+")',
            output="Username: python\nName: Python\nPublic repos: 55\nFollowers: 12,000+",
            explanation="The GitHub API is free for public data and great for practice. "
            "Use <code>.get(key, default)</code> for optional fields that might be null."
        ),

        try_it("Make a GET request to <code>https://httpbin.org/get?name=YourName</code> and print the response JSON."),

        section("Exercises"),

        exercise("starter", "Fetch weather data",
            "Write a function <code>get_weather(city)</code> that makes a GET request to a weather API "
            "(use <code>https://httpbin.org/get?city=London</code> as a mock). "
            "Parse the response and print a formatted weather report. Handle connection errors "
            "and timeouts gracefully.",
            hint="<code>requests.get(url, params={\"city\": city}, timeout=10)</code>. "
            "Wrap in try/except for <code>ConnectionError</code> and <code>Timeout</code>."
        ),

        exercise("medium", "GitHub user info tool",
            "Build a command-line tool that takes a GitHub username and displays their profile: "
            "name, bio, number of repos, followers, most recent repos (use the repos endpoint). "
            "Handle 404 (user not found) and rate limiting (status 403). "
            "Cache results to a JSON file to avoid repeated API calls.",
            hint="Repos endpoint: <code>https://api.github.com/users/{user}/repos?sort=updated</code>. "
            "Cache: check if JSON file exists and is less than 1 hour old."
        ),

        exercise("real-world", "Simple API client class",
            "Build a <code>RestClient</code> class with methods: <code>get(endpoint, params)</code>, "
            "<code>post(endpoint, data)</code>, <code>put(endpoint, data)</code>, "
            "<code>delete(endpoint)</code>. Include automatic retry on 429 (rate limit) and 503 "
            "(server unavailable) with exponential backoff. Add request/response logging. "
            "Test against <code>httpbin.org</code>.",
            hint="Exponential backoff: <code>wait_time = 2 ** attempt</code> seconds. "
            "Use <code>requests.Session()</code> for connection reuse. "
            "Log with <code>print(f\"[{method}] {url} -> {status}\")</code>."
        ),

        mistakes([
            ("Not setting a timeout",
             "<code>requests.get(url)</code> without <code>timeout</code> can hang forever "
             "if the server does not respond. Always set <code>timeout=10</code> or similar."),
            ("Hardcoding API keys",
             "Never put API keys in your source code. Use environment variables: "
             "<code>os.environ[\"API_KEY\"]</code> or a <code>.env</code> file."),
            ("Not checking response status",
             "A response with status 500 still has a body. Always check <code>response.ok</code> "
             "or call <code>response.raise_for_status()</code> before parsing."),
            ("Ignoring rate limits",
             "APIs have rate limits. Check the <code>X-RateLimit-Remaining</code> header "
             "and back off when limits are low."),
        ]),

        pro_tips([
            "<strong>Use <code>requests.Session()</code></strong> for multiple requests to the same "
            "API. It reuses TCP connections (faster) and persists headers and cookies.",
            "<strong>Store API keys in environment variables.</strong> "
            "<code>import os; key = os.environ[\"API_KEY\"]</code>. Never commit keys to git.",
            "<strong>Use <code>response.raise_for_status()</code></strong> as your first line "
            "after getting a response. It turns HTTP errors into Python exceptions.",
            "<strong>For production code, use <code>httpx</code></strong> instead of <code>requests</code>. "
            "It supports async/await, HTTP/2, and has a more modern API.",
        ]),

        recap([
            "<code>requests.get(url, params=dict)</code> for GET requests",
            "<code>requests.post(url, json=dict)</code> for POST requests",
            "<code>response.json()</code> parses JSON responses",
            "<code>response.raise_for_status()</code> turns HTTP errors into exceptions",
            "Always set <code>timeout</code> on every request",
            "Use <code>Session()</code> for reusable clients",
            "Store API keys in environment variables, never in code",
        ]),
    ])
