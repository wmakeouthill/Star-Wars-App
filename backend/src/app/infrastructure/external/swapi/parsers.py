from __future__ import annotations

from dataclasses import dataclass
import re
from typing import Any, Optional


_UNKNOWN_TOKENS = {
    "",
    "unknown",
    "n/a",
    "na",
    "none",
    "null",
}

_RANGE_RE = re.compile(r"^\s*(?P<min>[0-9][0-9,\.]*)\s*-\s*(?P<max>[0-9][0-9,\.]*)\s*$")
_FIRST_NUMBER_RE = re.compile(r"(?P<num>[0-9][0-9,\.]*)")


@dataclass(frozen=True)
class ParsedSWAPINumber:
    raw: Optional[str]
    kind: str  # "unknown" | "single" | "range" | "text"
    value: Optional[float]
    min: Optional[float]
    max: Optional[float]
    is_unknown: bool


def parse_swapi_number(value: Any) -> ParsedSWAPINumber:
    """
    Parseia "números" da SWAPI com tolerância a:
    - unknown/n/a/none
    - separador de milhar: "47,060"
    - espaços: "36.8 "
    - faixas: "30-165"
    - unidades/sufixos: "1000km"
    """
    if value is None:
        return ParsedSWAPINumber(raw=None, kind="unknown", value=None, min=None, max=None, is_unknown=True)

    if isinstance(value, (int, float)):
        num = float(value)
        return ParsedSWAPINumber(raw=str(value), kind="single", value=num, min=None, max=None, is_unknown=False)

    raw = str(value).strip()
    if raw.lower() in _UNKNOWN_TOKENS:
        return ParsedSWAPINumber(raw=raw or None, kind="unknown", value=None, min=None, max=None, is_unknown=True)

    range_match = _RANGE_RE.match(raw)
    if range_match:
        min_raw = range_match.group("min")
        max_raw = range_match.group("max")
        parsed_min = _parse_float_like(min_raw)
        parsed_max = _parse_float_like(max_raw)
        if parsed_min is not None and parsed_max is not None:
            return ParsedSWAPINumber(
                raw=raw,
                kind="range",
                value=parsed_min,  # estratégia: usar o mínimo como valor normalizado
                min=parsed_min,
                max=parsed_max,
                is_unknown=False,
            )

    parsed = _parse_float_like(raw)
    if parsed is not None:
        return ParsedSWAPINumber(raw=raw, kind="single", value=parsed, min=None, max=None, is_unknown=False)

    # Tenta extrair o primeiro número de strings com unidade/sufixo (ex.: "1000km", "1 standard")
    first = _extract_first_number(raw)
    if first is not None:
        return ParsedSWAPINumber(raw=raw, kind="single", value=first, min=None, max=None, is_unknown=False)

    return ParsedSWAPINumber(raw=raw, kind="text", value=None, min=None, max=None, is_unknown=False)


def _parse_float_like(text: str) -> Optional[float]:
    cleaned = text.strip().replace(",", "")
    try:
        return float(cleaned)
    except ValueError:
        return None


def _extract_first_number(text: str) -> Optional[float]:
    match = _FIRST_NUMBER_RE.search(text)
    if not match:
        return None
    return _parse_float_like(match.group("num"))

