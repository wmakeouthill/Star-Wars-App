import hashlib
from typing import Iterable, Optional

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


def _append_vary(existing: Optional[str], values: Iterable[str]) -> str:
    parts = [p.strip() for p in (existing or "").split(",") if p.strip()]
    lower = {p.lower() for p in parts}
    for value in values:
        v = value.strip()
        if not v:
            continue
        if v.lower() in lower:
            continue
        parts.append(v)
        lower.add(v.lower())
    return ", ".join(parts)


class ETagMiddleware(BaseHTTPMiddleware):
    """
    Emite ETag para respostas JSON de GET e suporta 304 Not Modified via If-None-Match.

    Observações:
    - No browser, `If-None-Match` é um header "forbidden" (não dá para setar via JS);
      quem envia automaticamente é o próprio navegador, baseado no cache HTTP.
    - Este middleware reconstrói a Response para garantir que o body possa ser lido e
      o ETag seja calculado de forma determinística.
    """

    CACHE_CONTROL_VALUE = "private, max-age=0, must-revalidate"

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        if request.method != "GET":
            return response
        if response.status_code != 200:
            return response

        content_type = (response.headers.get("content-type") or "").lower()
        if "application/json" not in content_type:
            return response

        body = b""
        async for chunk in response.body_iterator:
            body += chunk

        etag_raw = hashlib.sha256(body).hexdigest()
        etag = f"\"{etag_raw}\""

        headers = dict(response.headers)
        headers["ETag"] = etag
        headers["Vary"] = _append_vary(headers.get("Vary"), ["Origin", "Authorization", "X-User-Id"])
        headers.setdefault("Cache-Control", self.CACHE_CONTROL_VALUE)

        if_none_match = (request.headers.get("if-none-match") or "").strip()
        if if_none_match and if_none_match == etag:
            # 304 não deve ter body.
            return Response(
                status_code=304,
                headers=headers,
                media_type=response.media_type,
                background=response.background,
            )

        return Response(
            content=body,
            status_code=response.status_code,
            headers=headers,
            media_type=response.media_type,
            background=response.background,
        )

