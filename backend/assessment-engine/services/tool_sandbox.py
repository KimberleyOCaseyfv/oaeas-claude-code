"""
tool_sandbox.py
===============
Pure-Python in-memory tool sandbox for the OAEAS assessment engine.

Simulates 12 standard tools without any real network I/O.  All randomness
is seeded from the task seed so that repeated calls with the same seed
produce deterministic output.

Supported tools
---------------
weather_query, calculator, web_search, file_read, file_write,
code_execute, database_query, http_request, email_send,
calendar_query, translate, sentiment_analyze
"""

import ast
import math
import random
import re
import time
import uuid


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

_WEATHER_CONDITIONS = [
    "Sunny", "Partly Cloudy", "Cloudy", "Overcast",
    "Light Rain", "Heavy Rain", "Thunderstorm", "Snow",
    "Fog", "Windy", "Clear",
]

_SENTIMENTS = ["positive", "negative", "neutral"]

_LANG_NAMES = {
    "en": "English", "es": "Spanish", "fr": "French",
    "de": "German", "zh": "Chinese", "ja": "Japanese",
    "ko": "Korean", "ar": "Arabic", "pt": "Portuguese",
    "ru": "Russian", "it": "Italian", "hi": "Hindi",
}

_CALENDAR_EVENT_TEMPLATES = [
    ("Team Standup", "09:00", "09:30"),
    ("Product Review", "10:00", "11:00"),
    ("Lunch with {user}", "12:00", "13:00"),
    ("Design Sync", "14:00", "14:30"),
    ("Engineering All-Hands", "15:00", "16:00"),
    ("1:1 with Manager", "16:00", "16:30"),
    ("Sprint Planning", "09:30", "11:00"),
    ("Code Review Session", "13:00", "14:00"),
    ("Client Call", "11:00", "12:00"),
]

_SANDBOX_FILE_TEMPLATES = {
    "data.txt": (
        "OAEAS Sandbox Data File\n"
        "=======================\n"
        "Task ID  : {task_id}\n"
        "Case ID  : {case_id}\n"
        "Generated: 2026-03-01\n\n"
        "Sample records:\n"
        "  record_1: alpha=0.42, beta=1.73\n"
        "  record_2: alpha=0.87, beta=0.19\n"
        "  record_3: alpha=0.55, beta=2.01\n"
    ),
    "config.json": (
        '{{\n'
        '  "task_id": "{task_id}",\n'
        '  "case_id": "{case_id}",\n'
        '  "version": "1.0.0",\n'
        '  "debug": false,\n'
        '  "timeout_seconds": 30\n'
        '}}\n'
    ),
    "report.md": (
        "# Assessment Report\n\n"
        "**Task:** {task_id}  \n"
        "**Case:** {case_id}  \n\n"
        "## Summary\n\n"
        "This report contains the automated assessment output.\n\n"
        "## Findings\n\n"
        "- Finding A: within expected range\n"
        "- Finding B: nominal\n"
        "- Finding C: requires review\n"
    ),
    "output.csv": (
        "id,name,value,timestamp\n"
        "1,alpha,0.42,2026-03-01T08:00:00Z\n"
        "2,beta,1.73,2026-03-01T08:05:00Z\n"
        "3,gamma,0.87,2026-03-01T08:10:00Z\n"
    ),
}

_DEFAULT_FILE_CONTENT = (
    "Sandbox file: {path}\n"
    "Task: {task_id} | Case: {case_id}\n"
    "(auto-generated placeholder content)\n"
)

# AST node types allowed in calculator expressions
_SAFE_AST_NODES = (
    ast.Expression, ast.BinOp, ast.UnaryOp, ast.Num, ast.Constant,
    ast.Add, ast.Sub, ast.Mult, ast.Div, ast.Pow, ast.Mod,
    ast.FloorDiv, ast.USub, ast.UAdd, ast.Call, ast.Attribute,
    ast.Name, ast.Load,
)

_SAFE_MATH_NAMES = {
    name: getattr(math, name)
    for name in dir(math)
    if not name.startswith("_")
}
_SAFE_MATH_NAMES["abs"] = abs
_SAFE_MATH_NAMES["round"] = round
_SAFE_MATH_NAMES["min"] = min
_SAFE_MATH_NAMES["max"] = max

# Eval namespace: exposes math functions both as top-level names (e.g.
# ``sqrt(4)``) and via the ``math`` module object (e.g. ``math.sqrt(4)``).
_EVAL_NAMESPACE: dict = {**_SAFE_MATH_NAMES, "math": math}

# Names that are valid ast.Name references inside a calculator expression.
_ALLOWED_NAMES: frozenset = frozenset(_EVAL_NAMESPACE)


def _is_safe_expression(expr_str: str) -> bool:
    """Return True if *expr_str* contains only arithmetic / math operations.

    Permits both top-level math names (``sqrt``, ``pi``, …) and qualified
    ``math.<attr>`` references (``math.sqrt``, ``math.pi``, …).  Any other
    name or AST node type causes the expression to be rejected.
    """
    try:
        tree = ast.parse(expr_str, mode="eval")
    except SyntaxError:
        return False
    for node in ast.walk(tree):
        if not isinstance(node, _SAFE_AST_NODES):
            return False
        # ast.Name nodes must be known safe identifiers
        if isinstance(node, ast.Name) and node.id not in _ALLOWED_NAMES:
            return False
        # ast.Attribute nodes are only allowed as math.<known_attr>
        if isinstance(node, ast.Attribute):
            if node.attr not in _SAFE_MATH_NAMES:
                return False
    return True


def _is_safe_code(code: str) -> bool:
    """
    Return True if *code* passes a basic AST safety check.

    Disallows imports, exec/eval calls, and attribute access that looks
    like an attempted escape from the sandbox.
    """
    try:
        tree = ast.parse(code)
    except SyntaxError:
        return False

    _BANNED_NAMES = {"exec", "eval", "compile", "__import__", "open",
                     "breakpoint", "input", "memoryview"}

    for node in ast.walk(tree):
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            return False
        if isinstance(node, ast.Call):
            # Ban calls to forbidden builtins
            func = node.func
            if isinstance(func, ast.Name) and func.id in _BANNED_NAMES:
                return False
        if isinstance(node, ast.Attribute):
            # Disallow dunder attribute access
            if node.attr.startswith("__"):
                return False
    return True


def _fake_url(rng: random.Random, query: str, index: int) -> str:
    """Generate a plausible-looking fake URL for a search result."""
    domains = ["example.com", "docs.io", "reference.net", "wiki.org",
               "learn.dev", "knowledge.co", "info.tech"]
    slug = re.sub(r"[^a-z0-9]+", "-", query.lower()).strip("-")[:40]
    domain = rng.choice(domains)
    return f"https://www.{domain}/{slug}-{index + 1}"


def _fake_title(rng: random.Random, query: str, index: int) -> str:
    """Generate a plausible search result title."""
    prefixes = ["Introduction to", "Complete Guide:", "Understanding",
                "How to Use", "Overview of", "Deep Dive into",
                "Best Practices for", "Getting Started with"]
    suffixes = ["- Official Docs", "| Tutorial", "| Reference",
                "| Examples", "- Explained", "in 2026"]
    prefix = rng.choice(prefixes)
    suffix = rng.choice(suffixes)
    return f"{prefix} {query.title()} {suffix}"


def _fake_snippet(rng: random.Random, query: str) -> str:
    """Generate a plausible search result snippet."""
    intros = [
        f"This comprehensive resource covers everything you need to know about {query}.",
        f"Learn how {query} works and explore real-world examples.",
        f"A detailed explanation of {query} with step-by-step instructions.",
        f"Discover the key concepts behind {query} and best practices.",
        f"Find answers to common questions about {query} with clear examples.",
    ]
    return rng.choice(intros)


# ---------------------------------------------------------------------------
# Main class
# ---------------------------------------------------------------------------

class ToolSandbox:
    """
    Simulated tool sandbox for the OAEAS assessment engine.

    All 12 tools are implemented in pure Python with no real network I/O.
    Randomness is seeded from *seed* so that calls with identical inputs
    produce deterministic outputs within a single session.

    Parameters
    ----------
    seed : int
        Integer seed used to initialise the internal ``random.Random``
        instance.  Derived per-call seeds are generated from this root
        together with the tool name to keep tools independent.
    """

    def __init__(self, seed: int) -> None:
        self._root_seed = seed
        # Master RNG used only to derive per-call seeds
        self._master_rng = random.Random(seed)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def execute(
        self,
        tool_name: str,
        params: dict,
        task_id: str,
        case_id: str,
    ) -> dict:
        """
        Dispatch *params* to the named tool and return a standardised result.

        Parameters
        ----------
        tool_name : str
            One of the 12 supported tool names.
        params : dict
            Keyword arguments forwarded to the tool implementation.
        task_id : str
            Identifier for the current assessment task (used by some tools).
        case_id : str
            Identifier for the current case (used by some tools).

        Returns
        -------
        dict
            Always contains ``{"success": bool, "result": ..., "duration_ms": int}``.
            On unknown tool: ``{"success": False, "error": str}``.
        """
        _dispatch = {
            "weather_query":    self._weather_query,
            "calculator":       self._calculator,
            "web_search":       self._web_search,
            "file_read":        self._file_read,
            "file_write":       self._file_write,
            "code_execute":     self._code_execute,
            "database_query":   self._database_query,
            "http_request":     self._http_request,
            "email_send":       self._email_send,
            "calendar_query":   self._calendar_query,
            "translate":        self._translate,
            "sentiment_analyze": self._sentiment_analyze,
        }

        if tool_name not in _dispatch:
            return {"success": False, "error": f"Unknown tool: {tool_name}"}

        # Derive a per-call RNG so each tool invocation is independently
        # deterministic even when called in different orders.
        call_seed = self._master_rng.randint(0, 2**31)
        rng = random.Random(call_seed)
        duration_ms = rng.randint(50, 2000)

        try:
            result = _dispatch[tool_name](rng, task_id, case_id, **params)
            return {"success": True, "result": result, "duration_ms": duration_ms}
        except TypeError as exc:
            # Invalid parameter signature
            return {
                "success": False,
                "error": f"Invalid parameters for {tool_name}: {exc}",
                "duration_ms": duration_ms,
            }
        except Exception as exc:  # noqa: BLE001
            return {
                "success": False,
                "error": str(exc),
                "duration_ms": duration_ms,
            }

    # ------------------------------------------------------------------
    # Tool implementations
    # ------------------------------------------------------------------

    def _weather_query(
        self,
        rng: random.Random,
        task_id: str,
        case_id: str,
        city: str,
        date: str = "today",
    ) -> dict:
        """
        Simulate a weather query for *city* on *date*.

        Returns temperature (°C), sky condition, humidity (%), and
        wind speed (km/h) with plausible values seeded by the RNG.
        """
        return {
            "temp": rng.randint(-10, 40),
            "condition": rng.choice(_WEATHER_CONDITIONS),
            "humidity": rng.randint(20, 95),
            "wind_speed": rng.randint(0, 80),
        }

    def _calculator(
        self,
        rng: random.Random,
        task_id: str,
        case_id: str,
        expression: str,
    ) -> dict:
        """
        Safely evaluate an arithmetic or math-library expression.

        Only standard arithmetic operators and ``math.*`` functions are
        permitted.  Any expression that fails the AST safety check raises
        a ``ValueError``.
        """
        if not isinstance(expression, str) or not expression.strip():
            raise ValueError("expression must be a non-empty string")

        if not _is_safe_expression(expression):
            raise ValueError(
                f"Unsafe or unsupported expression: {expression!r}"
            )

        result = eval(  # noqa: S307  (safe: namespace is restricted)
            expression,
            {"__builtins__": {}},
            _EVAL_NAMESPACE,
        )
        return {"result": float(result), "expression": expression}

    def _web_search(
        self,
        rng: random.Random,
        task_id: str,
        case_id: str,
        query: str,
        max_results: int = 3,
    ) -> dict:
        """
        Simulate a web search for *query* and return up to *max_results* results.

        Result titles, snippets, and URLs are generated deterministically
        from the query string.
        """
        count = min(max(1, max_results), 10)
        results = [
            {
                "title": _fake_title(rng, query, i),
                "snippet": _fake_snippet(rng, query),
                "url": _fake_url(rng, query, i),
            }
            for i in range(count)
        ]
        return {"results": results, "total": count}

    def _file_read(
        self,
        rng: random.Random,
        task_id: str,
        case_id: str,
        path: str,
    ) -> dict:
        """
        Simulate reading a file at *path* within the task sandbox.

        Recognises well-known file names (data.txt, config.json, report.md,
        output.csv) and returns templated content; all other paths receive a
        generic placeholder.
        """
        filename = path.split("/")[-1] if "/" in path else path
        template = _SANDBOX_FILE_TEMPLATES.get(filename, _DEFAULT_FILE_CONTENT)
        content = template.format(path=path, task_id=task_id, case_id=case_id)
        return {"content": content, "size": len(content.encode())}

    def _file_write(
        self,
        rng: random.Random,
        task_id: str,
        case_id: str,
        path: str,
        content: str,
    ) -> dict:
        """
        Simulate writing *content* to *path*.

        No data is actually persisted; the call always succeeds and reports
        the number of UTF-8 bytes that would have been written.
        """
        bytes_written = len(content.encode())
        return {"success": True, "path": path, "bytes_written": bytes_written}

    def _code_execute(
        self,
        rng: random.Random,
        task_id: str,
        case_id: str,
        code: str,
        timeout: int = 5,
    ) -> dict:
        """
        Simulate executing *code* in a restricted Python sandbox.

        The code is validated with ``ast.parse`` and a set of AST-level
        safety rules.  If it passes, execution is simulated (no real
        interpreter is spawned).  If it fails safety checks, a non-zero
        exit code with an error message is returned.
        """
        if not _is_safe_code(code):
            return {
                "stdout": "",
                "stderr": "SecurityError: code contains disallowed constructs",
                "exit_code": 1,
            }

        # Simulate simple print output by finding string literals in the code
        stdout_lines = []
        try:
            tree = ast.parse(code)
            for node in ast.walk(tree):
                if (
                    isinstance(node, ast.Call)
                    and isinstance(node.func, ast.Name)
                    and node.func.id == "print"
                ):
                    for arg in node.args:
                        if isinstance(arg, ast.Constant):
                            stdout_lines.append(str(arg.value))
                        else:
                            stdout_lines.append("<computed value>")
        except Exception:  # noqa: BLE001
            pass

        stdout = "\n".join(stdout_lines) + ("\n" if stdout_lines else "")
        return {"stdout": stdout, "stderr": "", "exit_code": 0}

    def _database_query(
        self,
        rng: random.Random,
        task_id: str,
        case_id: str,
        sql: str,
    ) -> dict:
        """
        Simulate a database SELECT query.

        Only SELECT statements are accepted; all others raise a
        ``ValueError``.  Returns 1–5 plausible rows with generic columns.
        """
        normalised = sql.strip().upper()
        if not normalised.startswith("SELECT"):
            raise ValueError("Only SELECT statements are permitted")

        columns = ["id", "name", "value", "created_at"]
        sample_names = ["alpha", "beta", "gamma", "delta", "epsilon",
                        "zeta", "eta", "theta", "iota", "kappa"]
        row_count = rng.randint(1, 5)
        rows = []
        for i in range(row_count):
            rows.append({
                "id": i + 1,
                "name": rng.choice(sample_names),
                "value": round(rng.uniform(0.0, 100.0), 4),
                "created_at": "2026-03-01T00:00:00Z",
            })
        return {"rows": rows, "count": row_count, "columns": columns}

    def _http_request(
        self,
        rng: random.Random,
        task_id: str,
        case_id: str,
        url: str,
        method: str = "GET",
        body: dict = None,
    ) -> dict:
        """
        Simulate an HTTP request to *url*.

        Returns a realistic-looking response with status 200 for GET/POST
        requests to well-formed URLs.  A 404 is returned for URLs that
        contain ``/missing`` or ``/not-found``.
        """
        method = method.upper()

        if any(marker in url for marker in ("/missing", "/not-found")):
            status = 404
            resp_body = {"error": "Not Found", "url": url}
        elif method in ("POST", "PUT", "PATCH") and body:
            status = 201 if method == "POST" else 200
            resp_body = {
                "id": str(uuid.UUID(int=rng.getrandbits(128))),
                "status": "created" if method == "POST" else "updated",
                **body,
            }
        else:
            status = 200
            resp_body = {
                "url": url,
                "method": method,
                "data": {"sample_key": "sample_value", "count": rng.randint(1, 99)},
            }

        headers = {
            "Content-Type": "application/json",
            "X-Request-Id": str(uuid.UUID(int=rng.getrandbits(128))),
            "X-Response-Time": f"{rng.randint(10, 500)}ms",
        }
        return {"status": status, "body": resp_body, "headers": headers}

    def _email_send(
        self,
        rng: random.Random,
        task_id: str,
        case_id: str,
        to: str,
        subject: str,
        body: str,
    ) -> dict:
        """
        Simulate sending an email.

        Returns a generated message ID and an ISO-8601 sent timestamp.
        No actual email is dispatched.
        """
        message_id = f"<{uuid.UUID(int=rng.getrandbits(128))}@sandbox.oaeas.local>"
        sent_at = "2026-03-01T12:00:00Z"
        return {"message_id": message_id, "sent_at": sent_at}

    def _calendar_query(
        self,
        rng: random.Random,
        task_id: str,
        case_id: str,
        date: str,
        user: str = "default",
    ) -> dict:
        """
        Simulate a calendar query for *user* on *date*.

        Returns between 0 and 3 plausible calendar events.
        """
        event_count = rng.randint(0, 3)
        templates = rng.sample(_CALENDAR_EVENT_TEMPLATES, k=min(event_count, len(_CALENDAR_EVENT_TEMPLATES)))
        events = []
        for title_tpl, start, end in templates[:event_count]:
            title = title_tpl.format(user=user)
            events.append({
                "title": title,
                "date": date,
                "start": start,
                "end": end,
                "attendees": [user],
            })
        return {"events": events}

    def _translate(
        self,
        rng: random.Random,
        task_id: str,
        case_id: str,
        text: str,
        from_lang: str,
        to_lang: str,
    ) -> dict:
        """
        Simulate translation of *text* from *from_lang* to *to_lang*.

        The translated string is prefixed with a marker such as ``[ZH→EN]``
        to make the simulated translation unambiguous.  Confidence is drawn
        uniformly from [0.80, 1.00].
        """
        src = from_lang.upper()
        dst = to_lang.upper()
        marker = f"[{src}→{dst}]"
        translated = f"{marker} {text}"
        confidence = round(rng.uniform(0.80, 1.00), 4)
        return {
            "translated": translated,
            "from_lang": from_lang,
            "to_lang": to_lang,
            "confidence": confidence,
        }

    def _sentiment_analyze(
        self,
        rng: random.Random,
        task_id: str,
        case_id: str,
        text: str,
    ) -> dict:
        """
        Simulate sentiment analysis of *text*.

        Attempts a lightweight heuristic before falling back to seeded-random
        classification:

        * Positive word count > negative → "positive"
        * Negative word count > positive → "negative"
        * Otherwise → "neutral" (or seeded-random if equal)

        Returns a sentiment label, a confidence score in [-1.0, 1.0], and
        a list of aspect tags derived from the text.
        """
        _POSITIVE_WORDS = {
            "good", "great", "excellent", "amazing", "wonderful",
            "fantastic", "love", "happy", "best", "awesome", "perfect",
            "beautiful", "brilliant", "outstanding", "superb",
        }
        _NEGATIVE_WORDS = {
            "bad", "terrible", "awful", "horrible", "worst", "hate",
            "poor", "dreadful", "disappointing", "unacceptable", "fail",
            "broken", "useless", "annoying", "wrong",
        }
        _ASPECT_POOL = [
            "quality", "speed", "usability", "reliability",
            "value", "support", "design", "performance",
        ]

        words = re.findall(r"[a-z]+", text.lower())
        pos_hits = sum(1 for w in words if w in _POSITIVE_WORDS)
        neg_hits = sum(1 for w in words if w in _NEGATIVE_WORDS)

        if pos_hits > neg_hits:
            sentiment = "positive"
            score = round(rng.uniform(0.3, 1.0), 4)
        elif neg_hits > pos_hits:
            sentiment = "negative"
            score = round(rng.uniform(-1.0, -0.3), 4)
        else:
            sentiment = rng.choice(_SENTIMENTS)
            score = round(rng.uniform(-0.3, 0.3), 4)

        aspect_count = rng.randint(1, min(4, len(_ASPECT_POOL)))
        aspects = rng.sample(_ASPECT_POOL, k=aspect_count)

        return {"sentiment": sentiment, "score": score, "aspects": aspects}
