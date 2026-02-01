"""
Fuzzy Filtering Utilities

Módulo para filtragem inteligente com:
- Levenshtein distance para fuzzy matching
- Stemming para português (reutiliza lógica do rag_search)
- Normalização de texto
"""
from __future__ import annotations

import re
import unicodedata
from typing import Any, Callable, List, Optional

# Tenta importar rapidfuzz (mais rápido) ou fallback para Levenshtein
try:
    from rapidfuzz.distance import Levenshtein
    FUZZY_LIB = "rapidfuzz"
    
    def levenshtein_distance(s1: str, s2: str) -> int:
        """Calcula distância de Levenshtein entre duas strings."""
        return Levenshtein.distance(s1, s2)
except ImportError:
    try:
        import Levenshtein as lev
        FUZZY_LIB = "levenshtein"
        
        def levenshtein_distance(s1: str, s2: str) -> int:
            """Calcula distância de Levenshtein entre duas strings."""
            return lev.distance(s1, s2)
    except ImportError:
        FUZZY_LIB = "fallback"
        
        def levenshtein_distance(s1: str, s2: str) -> int:
            """Fallback implementation of Levenshtein distance."""
            if len(s1) < len(s2):
                return levenshtein_distance(s2, s1)
            if len(s2) == 0:
                return len(s1)
            
            previous_row = range(len(s2) + 1)
            for i, c1 in enumerate(s1):
                current_row = [i + 1]
                for j, c2 in enumerate(s2):
                    insertions = previous_row[j + 1] + 1
                    deletions = current_row[j] + 1
                    substitutions = previous_row[j] + (c1 != c2)
                    current_row.append(min(insertions, deletions, substitutions))
                previous_row = current_row
            return previous_row[-1]


# Sufixos comuns do português para remoção (stemming simplificado)
PT_SUFFIXES = [
    "inho", "inha", "zinho", "zinha", "ão", "ona", "ões",
    "ns", "eis", "óis", "is", "es", "s",
    "ando", "endo", "indo", "ado", "ido", "ar", "er", "ir",
    "ava", "ia", "ou", "ei", "eu", "iu",
    "mente", "ção", "ções", "dade", "idade",
    "ismo", "ista", "oso", "osa", "ivo", "iva",
]


def normalize_text(text: str) -> str:
    """
    Normaliza texto para comparação:
    - Remove acentos
    - Converte para lowercase
    - Remove caracteres especiais
    - Colapsa espaços múltiplos
    """
    if not text:
        return ""
    
    # Remove acentos
    text = unicodedata.normalize('NFKD', text)
    text = ''.join(c for c in text if not unicodedata.combining(c))
    
    # Lowercase e remove caracteres não-alfanuméricos (mantém espaços)
    text = re.sub(r'[^a-z0-9\s]', '', text.lower())
    
    # Colapsa espaços múltiplos
    text = ' '.join(text.split())
    
    return text


def stem_word(word: str, min_length: int = 3) -> str:
    """
    Aplica stemming simplificado para português.
    
    Args:
        word: Palavra a ser stemmed
        min_length: Tamanho mínimo da palavra após stemming
    
    Returns:
        Palavra stemmed
    """
    if len(word) <= min_length:
        return word
    
    word_lower = word.lower()
    
    # Tenta remover sufixos em ordem de tamanho (maiores primeiro)
    for suffix in sorted(PT_SUFFIXES, key=len, reverse=True):
        if word_lower.endswith(suffix):
            stemmed = word_lower[:-len(suffix)]
            if len(stemmed) >= min_length:
                return stemmed
    
    return word_lower


def fuzzy_match(query: str, target: str, threshold: float = 0.75) -> bool:
    """
    Verifica se query faz match fuzzy com target.
    
    Args:
        query: Texto de busca
        target: Texto alvo
        threshold: Similaridade mínima (0.0 a 1.0)
    
    Returns:
        True se match, False caso contrário
    
    Examples:
        >>> fuzzy_match("luke", "Luke Skywalker")
        True
        >>> fuzzy_match("luk", "Luke Skywalker")
        True
        >>> fuzzy_match("darth vador", "Darth Vader")  # typo tolerado
        True
    """
    if not query or not target:
        return False
    
    # Normaliza ambos
    query_norm = normalize_text(query)
    target_norm = normalize_text(target)
    
    # Match exato (após normalização)
    if query_norm in target_norm:
        return True
    
    # Split em palavras para busca parcial
    query_words = query_norm.split()
    target_words = target_norm.split()
    
    # Verifica se todas as palavras da query fazem match
    for q_word in query_words:
        word_matched = False
        
        # Stemming da palavra de busca
        q_stem = stem_word(q_word)
        
        for t_word in target_words:
            t_stem = stem_word(t_word)
            
            # Match exato após stemming
            if q_stem == t_stem:
                word_matched = True
                break
            
            # Match com substring
            if q_stem in t_stem or t_stem in q_stem:
                word_matched = True
                break
            
            # Levenshtein para typos (apenas para palavras >= 3 chars)
            if len(q_word) >= 3 and len(t_word) >= 3:
                max_len = max(len(q_word), len(t_word))
                distance = levenshtein_distance(q_word, t_word)
                similarity = 1 - (distance / max_len)
                
                if similarity >= threshold:
                    word_matched = True
                    break
        
        # Se alguma palavra da query não teve match, falha
        if not word_matched:
            return False
    
    return True


def apply_fuzzy_name_filter(
    items: List[dict],
    query: str,
    field_name: str = "name",
    threshold: float = 0.75
) -> List[dict]:
    """
    Filtra lista de items usando fuzzy matching no campo especificado.
    
    Args:
        items: Lista de dicionários a filtrar
        query: Texto de busca
        field_name: Nome do campo a ser comparado
        threshold: Similaridade mínima (0.0 a 1.0)
    
    Returns:
        Lista filtrada
    
    Examples:
        >>> items = [{"name": "Luke Skywalker"}, {"name": "Darth Vader"}]
        >>> apply_fuzzy_name_filter(items, "luk")
        [{"name": "Luke Skywalker"}]
    """
    if not query:
        return items
    
    return [
        item for item in items
        if fuzzy_match(query, item.get(field_name, ""), threshold)
    ]


def apply_film_filter(
    items: List[dict],
    film_id: str,
    films_field: str = "films"
) -> List[dict]:
    """
    Filtra items que aparecem no filme especificado.
    
    Args:
        items: Lista de items (cada um tem campo com URLs/IDs de filmes)
        film_id: ID do filme a filtrar
        films_field: Nome do campo que contém lista de filmes
    
    Returns:
        Lista filtrada
    
    Examples:
        >>> items = [
        ...     {"name": "Luke", "films": ["1", "2", "3"]},
        ...     {"name": "Rey", "films": ["7", "8", "9"]}
        ... ]
        >>> apply_film_filter(items, "1")
        [{"name": "Luke", "films": ["1", "2", "3"]}]
    """
    if not film_id:
        return items
    
    def item_has_film(item: dict) -> bool:
        films = item.get(films_field, [])
        if not films:
            return False
        
        # Suporta tanto lista de URLs quanto lista de IDs
        for film in films:
            # Se for URL, extrai o ID
            if isinstance(film, str) and "/" in film:
                # URLs SWAPI terminam com /films/1/
                parts = [p for p in film.split("/") if p]
                if parts and parts[-1] == film_id:
                    return True
            # Se for ID direto
            elif str(film) == str(film_id):
                return True
        
        return False
    
    return [item for item in items if item_has_film(item)]


def apply_enum_filter(
    items: List[dict],
    value: str,
    field_name: str,
    case_sensitive: bool = False
) -> List[dict]:
    """
    Filtra items por valor exato de um campo enum.
    
    Args:
        items: Lista de items
        value: Valor a buscar
        field_name: Campo a comparar
        case_sensitive: Se deve ser case-sensitive
    
    Returns:
        Lista filtrada
    """
    if not value:
        return items
    
    if case_sensitive:
        return [item for item in items if item.get(field_name) == value]
    else:
        value_lower = value.lower()
        return [
            item for item in items
            if item.get(field_name, "").lower() == value_lower
        ]


def apply_multi_value_filter(
    items: List[dict],
    query: str,
    field_name: str,
    delimiter: str = ","
) -> List[dict]:
    """
    Filtra items onde o campo contém múltiplos valores (ex: "arid, temperate").
    
    Args:
        items: Lista de items
        query: Valor a buscar
        field_name: Campo com valores múltiplos
        delimiter: Delimitador dos valores
    
    Returns:
        Lista filtrada
    
    Examples:
        >>> items = [{"climate": "arid, hot"}, {"climate": "temperate"}]
        >>> apply_multi_value_filter(items, "arid", "climate")
        [{"climate": "arid, hot"}]
    """
    if not query:
        return items
    
    query_norm = normalize_text(query)
    
    def field_contains_value(item: dict) -> bool:
        field_value = item.get(field_name, "")
        if not field_value:
            return False
        
        # Split por delimitador e normaliza cada parte
        parts = [normalize_text(p.strip()) for p in field_value.split(delimiter)]
        
        # Verifica se alguma parte contém a query
        return any(query_norm in part for part in parts)
    
    return [item for item in items if field_contains_value(item)]
