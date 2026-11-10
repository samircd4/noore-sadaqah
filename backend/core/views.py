from django.core.cache import cache
from django.db import connection
from django.http import JsonResponse


def health(request):
    """GET /api/v1/health/ for the uptime monitor (API.md "Internal"): no version numbers."""
    result = {"db": "ok", "redis": "ok"}
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    except Exception:
        result["db"] = "down"
    try:
        cache.set("health:ping", "1", 5)
        if cache.get("health:ping") != "1":
            result["redis"] = "down"
    except Exception:
        result["redis"] = "down"
    status = 200 if all(v == "ok" for v in result.values()) else 503
    return JsonResponse(result, status=status)
