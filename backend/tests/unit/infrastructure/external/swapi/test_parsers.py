import pytest

from app.infrastructure.external.swapi.parsers import parse_swapi_number


@pytest.mark.parametrize(
    "raw",
    [None, "", "unknown", "UNKNOWN", "n/a", "N/A", "na", "none", "null", "   unknown   "],
)
def test_parse_swapi_number_unknown_tokens(raw):
    parsed = parse_swapi_number(raw)
    assert parsed.is_unknown is True
    assert parsed.value is None
    assert parsed.min is None
    assert parsed.max is None


def test_parse_swapi_number_thousands_separator():
    parsed = parse_swapi_number("47,060")
    assert parsed.is_unknown is False
    assert parsed.kind == "single"
    assert parsed.value == 47060.0


def test_parse_swapi_number_range():
    parsed = parse_swapi_number("30-165")
    assert parsed.is_unknown is False
    assert parsed.kind == "range"
    assert parsed.min == 30.0
    assert parsed.max == 165.0
    # estratégia atual: value = min
    assert parsed.value == 30.0


def test_parse_swapi_number_range_with_spaces():
    parsed = parse_swapi_number("  30 - 165  ")
    assert parsed.kind == "range"
    assert parsed.min == 30.0
    assert parsed.max == 165.0


def test_parse_swapi_number_unit_suffix_extracts_first_number():
    parsed = parse_swapi_number("1000km")
    assert parsed.is_unknown is False
    assert parsed.kind == "single"
    assert parsed.value == 1000.0
    assert parsed.raw == "1000km"


def test_parse_swapi_number_keeps_text_when_no_number_present():
    parsed = parse_swapi_number("N/A-ish")
    assert parsed.is_unknown is False
    assert parsed.kind == "text"
    assert parsed.value is None

