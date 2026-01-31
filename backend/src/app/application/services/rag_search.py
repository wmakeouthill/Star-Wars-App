"""
RAG (Retrieval-Augmented Generation) Search System

Sistema de busca semântica com:
- Levenshtein distance para fuzzy matching
- Stemming para português (baseado em regras)
- N-gram matching para tolerância a erros de digitação
- Busca em todo o cache SWAPI para contexto da IA
"""
from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

# Tenta importar rapidfuzz (mais rápido) ou fallback para Levenshtein
try:
    from rapidfuzz import fuzz, process
    from rapidfuzz.distance import Levenshtein
    FUZZY_LIB = "rapidfuzz"
except ImportError:
    try:
        import Levenshtein as lev
        FUZZY_LIB = "levenshtein"
    except ImportError:
        FUZZY_LIB = "fallback"


# ============================================================================
# STEMMING PARA PORTUGUÊS (baseado em regras - RSLP simplificado)
# ============================================================================

# Sufixos comuns do português para remoção (stemming)
PT_SUFFIXES = [
    # Diminutivos/aumentativos
    "inho", "inha", "zinho", "zinha", "ão", "ona", "ões",
    # Plurais
    "ns", "eis", "óis", "is", "es", "s",
    # Verbos
    "ando", "endo", "indo", "ado", "ido", "ar", "er", "ir",
    "ava", "ia", "ou", "ei", "eu", "iu",
    "aram", "eram", "iram", "am", "em",
    "asse", "esse", "isse",
    "aria", "eria", "iria",
    # Substantivos/adjetivos
    "mente", "ção", "ções", "dade", "idade",
    "ismo", "ista", "oso", "osa", "ivo", "iva",
    "eiro", "eira", "or", "ora",
    # Gênero
    "a", "o",
]

# ============================================================================
# STOPWORDS - Palavras que devem ser ignoradas na busca
# ============================================================================

# Stopwords do português - palavras que NÃO devem ser usadas para fuzzy match
PT_STOPWORDS = {
    # Artigos
    "o", "a", "os", "as", "um", "uma", "uns", "umas",
    # Preposições
    "de", "da", "do", "das", "dos", "em", "na", "no", "nas", "nos",
    "para", "pra", "pro", "pela", "pelo", "pelas", "pelos",
    "com", "sem", "por", "sobre", "entre", "até", "desde", "após",
    # Contrações
    "ao", "aos", "à", "às", "num", "numa", "nuns", "numas",
    "dele", "dela", "deles", "delas", "nele", "nela", "neles", "nelas",
    # Pronomes
    "eu", "tu", "ele", "ela", "nós", "vós", "eles", "elas",
    "me", "te", "se", "nos", "vos", "lhe", "lhes",
    "meu", "minha", "meus", "minhas", "teu", "tua", "teus", "tuas",
    "seu", "sua", "seus", "suas", "nosso", "nossa", "nossos", "nossas",
    "este", "esta", "estes", "estas", "esse", "essa", "esses", "essas",
    "aquele", "aquela", "aqueles", "aquelas", "isto", "isso", "aquilo",
    "que", "quem", "qual", "quais", "quanto", "quanta", "quantos", "quantas",
    "onde", "quando", "como", "porque", "porquê",
    # Verbos auxiliares/comuns
    "ser", "estar", "ter", "haver", "ir", "vir", "fazer", "poder", "dever",
    "é", "são", "era", "eram", "foi", "foram", "será", "serão",
    "está", "estão", "estava", "estavam", "esteve", "estiveram",
    "tem", "têm", "tinha", "tinham", "teve", "tiveram",
    "há", "havia", "houve", "haverá",
    "vai", "vão", "ia", "iam", "foi", "foram", "irá", "irão",
    "pode", "podem", "podia", "podiam", "pôde", "puderam",
    "quer", "querem", "queria", "queriam", "quis", "quiseram",
    "sabe", "sabem", "sabia", "sabiam", "soube", "souberam",
    "faz", "fazem", "fazia", "faziam", "fez", "fizeram",
    "diz", "dizem", "dizia", "diziam", "disse", "disseram",
    # Advérbios comuns
    "não", "sim", "muito", "pouco", "mais", "menos", "bem", "mal",
    "já", "ainda", "sempre", "nunca", "talvez", "também", "só", "apenas",
    "aqui", "ali", "lá", "cá", "aí", "onde", "aonde",
    "hoje", "ontem", "amanhã", "agora", "depois", "antes", "logo",
    # Conjunções
    "e", "ou", "mas", "porém", "contudo", "todavia", "entretanto",
    "se", "caso", "embora", "aunque", "porque", "pois", "portanto",
    "então", "assim", "logo", "nem", "quer",
    # Palavras de pergunta/comando comuns
    "fale", "fala", "conte", "conta", "diga", "explique", "explica",
    "quero", "gostaria", "preciso", "desejo",
    "saber", "conhecer", "entender", "descobrir",
    # Interjeições
    "oi", "olá", "ola", "eai", "ei", "hey", "opa", "tchau", "obrigado", "obrigada",
    # Palavras genéricas
    "coisa", "coisas", "algo", "nada", "tudo", "todos", "todas",
    "vez", "vezes", "parte", "partes", "tipo", "tipos",
    "bom", "boa", "bons", "boas", "mau", "má", "maus", "más",
    "grande", "grandes", "pequeno", "pequena", "pequenos", "pequenas",
    "novo", "nova", "novos", "novas", "velho", "velha", "velhos", "velhas",
}

# Palavras importantes que NUNCA devem ser removidas (mesmo se parecerem stopwords)
IMPORTANT_WORDS = {
    # ==========================================
    # PERSONAGENS COM NOMES CURTOS
    # ==========================================
    "han", "rey", "finn", "poe", "bb8", "r2", "c3", "ig", "k2", "r2d2", "c3po",
    "luke", "leia", "yoda", "vader", "kylo", "maul", "dooku", "snoke", "hux",
    "chewie", "lando", "mace", "boba", "jango", "grogu", "ahsoka", "rex",
    
    # ==========================================
    # ROBÔS / DROIDES
    # ==========================================
    "robo", "robô", "robos", "robôs",
    "droid", "droide", "droides", "droids",
    "astromech", "astromecânico", "astromechanical",
    "protocol", "protocolo",
    "android", "androide", "androides",
    "bb8", "bb-8", "r2d2", "r2-d2", "c3po", "c-3po",
    "k2so", "k-2so", "ig88", "ig-88", "ig11", "ig-11",
    
    # ==========================================
    # JEDI / FORÇA / LADO DA LUZ
    # ==========================================
    "jedi", "jedis", "cavaleiro", "cavaleiros",
    "força", "forca", "force",
    "lado", "luz", "luminoso",
    "mestre", "mestres", "padawan", "padawans", "youngling", "younglings",
    "conselho", "ordem", "templo",
    "sabre", "sabres", "lightsaber", "lightsabers", "espada",
    "guardião", "guardiões", "guardian", "guardians",
    
    # ==========================================
    # SITH / LADO NEGRO
    # ==========================================
    "sith", "siths",
    "negro", "sombrio", "escuro", "dark", "darkness",
    "darth", "lord", "lorde", "lordes",
    "aprendiz", "aprendizes",
    "imperador", "emperor",
    "inquisidor", "inquisidores", "inquisitor",
    
    # ==========================================
    # IMPÉRIO / FACÇÃO IMPERIAL
    # ==========================================
    "império", "imperio", "empire", "imperial", "imperiais",
    "stormtrooper", "stormtroopers", "trooper", "troopers",
    "soldado", "soldados",
    "estrela", "morte", "death", "star",
    "primeiro", "ordem", "first", "order",
    
    # ==========================================
    # REBELDES / RESISTÊNCIA / REPÚBLICA
    # ==========================================
    "rebelde", "rebeldes", "rebel", "rebels", "rebelião", "rebellion",
    "resistência", "resistencia", "resistance",
    "aliança", "alianca", "alliance",
    "república", "republica", "republic",
    "senado", "senate", "senador", "senadora",
    
    # ==========================================
    # CAÇADORES DE RECOMPENSA / MERCENÁRIOS
    # ==========================================
    "caçador", "caçadores", "hunter", "hunters", "bounty",
    "recompensa", "recompensas",
    "mercenário", "mercenários", "mercenary",
    "mandaloriano", "mandalorian", "mandalorians", "mando",
    "gangster", "gangsters", "criminoso", "criminosos",
    "contrabandista", "contrabandistas", "smuggler",
    
    # ==========================================
    # CLONES / EXÉRCITO
    # ==========================================
    "clone", "clones",
    "exército", "exercito", "army",
    "capitão", "capitao", "captain",
    "comandante", "commander",
    "general", "generais",
    "almirante", "admiral",
    "tenente", "lieutenant",
    
    # ==========================================
    # PILOTOS / NAVES / VEÍCULOS
    # ==========================================
    "piloto", "pilotos", "pilot", "pilots",
    "nave", "naves", "ship", "ships", "starship", "starships",
    "caça", "caças", "fighter", "fighters", "starfighter",
    "cruzador", "cruiser", "destroyer",
    "millennium", "falcon", "falcão",
    "xwing", "x-wing", "tie", "tiefighter",
    "speeder", "walker", "atat", "at-at",
    "veículo", "veiculo", "veículos", "veiculos", "vehicle",
    "frota", "fleet",
    
    # ==========================================
    # PLANETAS / LOCAIS
    # ==========================================
    "planeta", "planetas", "planet", "planets",
    "mundo", "mundos", "world", "worlds",
    "lua", "luas", "moon", "moons",
    "sistema", "sistemas", "system",
    "galáxia", "galaxia", "galaxy",
    "tatooine", "hoth", "endor", "dagobah", "naboo", "coruscant",
    "alderaan", "bespin", "jakku", "mustafar", "kamino", "kashyyyk",
    
    # ==========================================
    # ESPÉCIES / RAÇAS
    # ==========================================
    "espécie", "especie", "espécies", "especies", "species",
    "raça", "raca", "raças", "racas", "race",
    "alien", "aliens", "alienígena", "alienigena", "alienígenas",
    "humano", "humanos", "human", "humans",
    "wookiee", "wookiees", "wookie", "wookies",
    "ewok", "ewoks",
    "hutt", "hutts",
    "twilek", "twi'lek", "twileks",
    "zabrak", "zabraks",
    "togruta", "togrutans",
    "rodian", "rodians", "rodiano",
    "trandoshan", "trandoshans",
    "gungan", "gungans",
    "dathomiri", "nightsister", "nightsisters",
    
    # ==========================================
    # FILMES / MÍDIA
    # ==========================================
    "filme", "filmes", "film", "films", "movie", "movies",
    "episódio", "episodio", "episode", "episodes",
    "trilogia", "trilogy",
    "saga", "sagas",
    "série", "serie", "series",
    "guerra", "guerras", "war", "wars", "clone",
    
    # ==========================================
    # CONCEITOS GERAIS STAR WARS
    # ==========================================
    "midi", "chlorian", "midichlorian", "midichlorians",
    "holocron", "holocrons",
    "cristal", "cristais", "kyber",
    "hiperdrive", "hyperspace", "hiperespaço",
    "blaster", "blasters",
    "carbonita", "carbonite",
    "droid", "droids",
    
    # ==========================================
    # ORGANIZAÇÕES / GRUPOS
    # ==========================================
    "ordem", "order",
    "guilda", "guild",
    "sindicato", "syndicate",
    "cartel", "cartéis",
    "federação", "federacao", "federation",
    "separatista", "separatistas", "separatist",
    "confederação", "confederacao", "confederacy",
}

# Correções ortográficas comuns (português)
# Mapeia variações sem acento/erradas para forma correta
PT_CORRECTIONS = {
    # ==========================================
    # ROBÔS / DROIDES
    # ==========================================
    "robo": "robô",
    "robos": "robôs",
    "androide": "andróide",
    "androides": "andróides",
    "droide": "droide",  # Mantém
    "droides": "droides",  # Mantém
    "astromech": "astromech",
    "bb8": "bb-8",
    "r2d2": "r2-d2",
    "c3po": "c-3po",
    "ig88": "ig-88",
    "ig11": "ig-11",
    "k2so": "k-2so",
    "artoo": "r2-d2",
    "arturito": "r2-d2",
    "threepio": "c-3po",
    
    # ==========================================
    # JEDI / FORÇA
    # ==========================================
    "jedy": "jedi",
    "jedis": "jedi",
    "jedai": "jedi",
    "forca": "força",
    "cavalero": "cavaleiro",
    "cavaleros": "cavaleiros",
    "sabre": "sabre",
    "lightsaber": "sabre de luz",
    
    # ==========================================
    # SITH / LADO NEGRO
    # ==========================================
    "sity": "sith",
    "siths": "sith",
    "sif": "sith",
    "darth": "darth",
    
    # ==========================================
    # PERSONAGENS
    # ==========================================
    "vader": "darth vader",
    "luke": "luke skywalker",
    "leia": "leia organa",
    "chewie": "chewbacca",
    "chewbaca": "chewbacca",
    "palpatini": "palpatine",
    "palpatine": "palpatine",
    "sidius": "sidious",
    "obi": "obi-wan",
    "obiwan": "obi-wan",
    "quigon": "qui-gon",
    "quigon jinn": "qui-gon jinn",
    "anakin": "anakin skywalker",
    "kylo": "kylo ren",
    "grogu": "grogu",
    "mando": "mandalorian",
    "boba": "boba fett",
    "jango": "jango fett",
    "ahsoka": "ahsoka tano",
    "dooku": "conde dooku",
    "maul": "darth maul",
    
    # ==========================================
    # ESPÉCIES
    # ==========================================
    "wookie": "wookiee",
    "wookies": "wookiee",
    "wookiees": "wookiee",
    "hutt": "hutt",
    "twilek": "twi'lek",
    "ewoks": "ewok",
    "gungan": "gungan",
    "gungans": "gungan",
    
    # ==========================================
    # FACÇÕES / ORGANIZAÇÕES
    # ==========================================
    "imperio": "império",
    "rebeldes": "rebelde",
    "resistencia": "resistência",
    "alianca": "aliança",
    "republica": "república",
    "federacao": "federação",
    "confederacao": "confederação",
    "separatista": "separatista",
    
    # ==========================================
    # LOCAIS
    # ==========================================
    "galaxia": "galáxia",
    "planeta": "planeta",
    "planetas": "planeta",
    
    # ==========================================
    # FILMES / MÍDIA
    # ==========================================
    "episodio": "episódio",
    "episodios": "episódios",
    "filme": "filme",
    "filmes": "filme",
    "trilogia": "trilogia",
    
    # ==========================================
    # MILITAR / TÍTULOS
    # ==========================================
    "capitao": "capitão",
    "general": "general",
    "almirante": "almirante",
    "comandante": "comandante",
    "stormtrooper": "stormtrooper",
    "stormtroopers": "stormtrooper",
    "trooper": "trooper",
    "soldado": "soldado",
    "soldados": "soldado",
    "clone": "clone",
    "clones": "clone",
    
    # ==========================================
    # NAVES / VEÍCULOS
    # ==========================================
    "nave": "nave",
    "naves": "nave",
    "veiculo": "veículo",
    "veiculos": "veículos",
    "piloto": "piloto",
    "pilotos": "piloto",
    "millennium": "millennium falcon",
    "falcao": "millennium falcon",
    "xwing": "x-wing",
    "tiefighter": "tie fighter",
    "atat": "at-at",
    "atst": "at-st",
    
    # ==========================================
    # OUTROS
    # ==========================================
    "voce": "você",
    "tambem": "também",
    "numero": "número",
    "personagen": "personagem",
    "personagens": "personagem",
    "nao": "não",
    "ja": "já",
    "esta": "está",
    "sao": "são",
    "entao": "então",
    "alienigena": "alienígena",
    "alienigenas": "alienígenas",
    "cacador": "caçador",
    "cacadores": "caçadores",
    "recompensa": "recompensa",
    "mercenario": "mercenário",
    "mercenarios": "mercenários",
    "heroi": "herói",
    "herois": "heróis",
    "vilao": "vilão",
    "vilaos": "vilões",
}

# Sinônimos para expansão de busca
PT_SYNONYMS = {
    # Robôs
    "robô": ["droide", "droid", "máquina", "autômato", "andróide", "astromech"],
    "droide": ["robô", "droid", "máquina", "autômato", "astromech"],
    "astromech": ["robô", "droide", "r2-d2"],
    
    # Jedi / Força
    "jedi": ["cavaleiro", "mestre jedi", "ordem jedi", "lado da luz"],
    "força": ["force", "midichlorians", "poder"],
    "sabre": ["lightsaber", "espada de luz", "sabre de luz"],
    
    # Sith
    "sith": ["lado negro", "darth", "lord sith"],
    "lado negro": ["sith", "lado sombrio", "escuridão"],
    
    # Naves
    "nave": ["espaçonave", "starship", "navio espacial", "veículo espacial"],
    "starship": ["nave", "espaçonave", "ship"],
    "caça": ["starfighter", "fighter", "x-wing", "tie fighter"],
    
    # Pessoas
    "piloto": ["aviador", "condutor", "ace"],
    "guerreiro": ["lutador", "combatente", "soldado"],
    "caçador": ["bounty hunter", "mercenário", "mandalorian"],
    "soldado": ["trooper", "stormtrooper", "clone", "militar"],
    
    # Locais
    "planeta": ["mundo", "astro", "sistema"],
    "galáxia": ["galaxy", "universo"],
    
    # Personagens específicos
    "imperador": ["palpatine", "sidious", "darth sidious"],
    "princesa": ["leia", "leia organa"],
    "mestre": ["jedi", "mestre jedi", "yoda"],
    
    # Facções
    "rebelde": ["aliança rebelde", "resistência", "rebelião"],
    "império": ["imperial", "imperiais", "stormtrooper"],
    
    # Categorias
    "vilão": ["sith", "lado negro", "império", "antagonista"],
    "herói": ["jedi", "rebelde", "aliança", "protagonista"],
    "alien": ["alienígena", "espécie", "extraterrestre"],
}


def normalize_text(text: str) -> str:
    """Remove acentos, converte para minúsculas e normaliza espaços."""
    if not text:
        return ""
    # Remove acentos
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    # Minúsculas e normaliza espaços
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def stem_portuguese(word: str) -> str:
    """
    Aplica stemming simplificado para português.
    Baseado no algoritmo RSLP (Removedor de Sufixos da Língua Portuguesa).
    """
    if len(word) <= 3:
        return word
    
    # Aplica correções ortográficas primeiro
    word_lower = word.lower()
    if word_lower in PT_CORRECTIONS:
        word = PT_CORRECTIONS[word_lower]
    
    # Remove sufixos do maior para o menor
    for suffix in sorted(PT_SUFFIXES, key=len, reverse=True):
        if word.endswith(suffix) and len(word) - len(suffix) >= 3:
            return word[:-len(suffix)]
    
    return word


def stem_text(text: str) -> str:
    """Aplica stemming a cada palavra do texto."""
    words = normalize_text(text).split()
    return " ".join(stem_portuguese(w) for w in words)


def extract_keywords(text: str) -> List[str]:
    """
    Extrai keywords relevantes de uma frase, removendo stopwords.
    
    Esta função é CRUCIAL para evitar fuzzy match em palavras irrelevantes.
    
    Exemplos:
        "me fale sobre o luke skywalker" -> ["luke", "skywalker"]
        "o que você acha do r2d2" -> ["r2d2"]
        "ele é um robô?" -> ["robô"]  (ou resolve pronome do contexto)
        "conhece os jedis?" -> ["jedis"]
    """
    if not text:
        return []
    
    # Normaliza o texto
    normalized = normalize_text(text)
    words = normalized.split()
    
    keywords = []
    
    for word in words:
        # Ignora palavras muito curtas (exceto se forem importantes)
        if len(word) < 2:
            continue
        
        # Sempre mantém palavras importantes (mesmo se parecem stopwords)
        if word in IMPORTANT_WORDS:
            keywords.append(word)
            continue
        
        # Verifica se é uma correção conhecida (provavelmente importante)
        if word in PT_CORRECTIONS:
            keywords.append(word)
            continue
        
        # Remove stopwords
        if word in PT_STOPWORDS:
            continue
        
        # Palavras com 3+ caracteres que não são stopwords são candidatas
        if len(word) >= 3:
            keywords.append(word)
    
    return keywords


def extract_search_query(text: str) -> str:
    """
    Extrai uma query de busca otimizada de uma frase do usuário.
    
    Remove stopwords e junta as keywords relevantes.
    
    Exemplos:
        "me fale sobre o luke skywalker" -> "luke skywalker"
        "quero saber mais sobre os droides" -> "droides"
        "o que você acha do darth vader?" -> "darth vader"
    """
    keywords = extract_keywords(text)
    
    if not keywords:
        # Se não encontrou keywords, tenta pegar as últimas palavras
        # (geralmente o assunto vem no final da frase)
        words = normalize_text(text).split()
        # Pega até 3 últimas palavras que não sejam stopwords muito comuns
        basic_stopwords = {"o", "a", "os", "as", "um", "uma", "de", "da", "do", "e", "é"}
        keywords = [w for w in words[-3:] if w not in basic_stopwords and len(w) >= 2]
    
    return " ".join(keywords)


def is_likely_name(text: str) -> bool:
    """
    Verifica se o texto parece ser um nome próprio ou termo de Star Wars.
    
    Útil para decidir se deve fazer fuzzy match.
    """
    normalized = normalize_text(text)
    words = normalized.split()
    
    # Nomes próprios geralmente têm 1-3 palavras
    if len(words) > 4:
        return False
    
    # Verifica se alguma palavra é uma keyword importante
    for word in words:
        if word in IMPORTANT_WORDS:
            return True
        if word in PT_CORRECTIONS:
            return True
        # Palavras com números são provavelmente nomes de droides (R2D2, C3PO, etc)
        if any(c.isdigit() for c in word):
            return True
    
    # Se todas as palavras têm 3+ caracteres e não são stopwords, provavelmente é um nome
    non_stopword_count = sum(1 for w in words if w not in PT_STOPWORDS and len(w) >= 3)
    return non_stopword_count >= 1


def detect_entity_type(text: str) -> str | None:
    """
    Detecta o tipo de entidade que o usuário está perguntando.
    
    Returns:
        "character", "planet", "film", "starship", "species", ou None
    """
    normalized = normalize_text(text)
    
    # Detecta por palavras-chave
    character_words = ["personagem", "pessoa", "quem", "jedi", "sith", "piloto", "droide", "droid", "robo", "robô"]
    planet_words = ["planeta", "mundo", "lugar", "onde"]
    film_words = ["filme", "episodio", "episódio", "trilogia", "saga"]
    ship_words = ["nave", "navio", "veiculo", "veículo", "starship", "spaceship"]
    species_words = ["especie", "espécie", "raca", "raça", "alien"]
    
    for word in character_words:
        if word in normalized:
            return "character"
    for word in planet_words:
        if word in normalized:
            return "planet"
    for word in film_words:
        if word in normalized:
            return "film"
    for word in ship_words:
        if word in normalized:
            return "starship"
    for word in species_words:
        if word in normalized:
            return "species"
    
    return None


def expand_with_synonyms(text: str) -> List[str]:
    """Expande o texto com sinônimos conhecidos."""
    normalized = normalize_text(text)
    words = normalized.split()
    expansions = [normalized]
    
    for word in words:
        if word in PT_SYNONYMS:
            for synonym in PT_SYNONYMS[word]:
                expanded = normalized.replace(word, synonym)
                if expanded not in expansions:
                    expansions.append(expanded)
    
    return expansions


def generate_ngrams(text: str, n: int = 3) -> set[str]:
    """Gera n-gramas para matching parcial."""
    text = normalize_text(text)
    if len(text) < n:
        return {text}
    return {text[i:i+n] for i in range(len(text) - n + 1)}


# ============================================================================
# FUNÇÕES DE DISTÂNCIA E SIMILARIDADE
# ============================================================================

def levenshtein_distance(s1: str, s2: str) -> int:
    """Calcula distância de Levenshtein entre duas strings."""
    if FUZZY_LIB == "rapidfuzz":
        return Levenshtein.distance(s1, s2)
    elif FUZZY_LIB == "levenshtein":
        return lev.distance(s1, s2)
    else:
        # Fallback: implementação própria
        if len(s1) < len(s2):
            s1, s2 = s2, s1
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


def levenshtein_ratio(s1: str, s2: str) -> float:
    """Calcula similaridade baseada em Levenshtein (0.0 a 1.0)."""
    if not s1 and not s2:
        return 1.0
    if not s1 or not s2:
        return 0.0
    
    distance = levenshtein_distance(s1, s2)
    max_len = max(len(s1), len(s2))
    return 1.0 - (distance / max_len)


def fuzzy_ratio(s1: str, s2: str) -> float:
    """Calcula similaridade fuzzy usando a melhor biblioteca disponível."""
    if FUZZY_LIB == "rapidfuzz":
        return fuzz.ratio(s1, s2) / 100.0
    else:
        return levenshtein_ratio(s1, s2)


def token_set_ratio(s1: str, s2: str) -> float:
    """
    Calcula similaridade baseada em conjuntos de tokens.
    Útil para quando as palavras estão em ordem diferente.
    """
    if FUZZY_LIB == "rapidfuzz":
        return fuzz.token_set_ratio(s1, s2) / 100.0
    else:
        # Fallback: Jaccard similarity nos tokens
        tokens1 = set(normalize_text(s1).split())
        tokens2 = set(normalize_text(s2).split())
        if not tokens1 or not tokens2:
            return 0.0
        intersection = len(tokens1 & tokens2)
        union = len(tokens1 | tokens2)
        return intersection / union if union > 0 else 0.0


def partial_ratio(s1: str, s2: str) -> float:
    """
    Calcula similaridade parcial (substring matching).
    Útil quando uma string é substring da outra.
    """
    if FUZZY_LIB == "rapidfuzz":
        return fuzz.partial_ratio(s1, s2) / 100.0
    else:
        # Fallback: verifica se uma é substring da outra
        s1_norm = normalize_text(s1)
        s2_norm = normalize_text(s2)
        if s1_norm in s2_norm or s2_norm in s1_norm:
            return 0.9
        return levenshtein_ratio(s1_norm, s2_norm)


def ngram_similarity(s1: str, s2: str, n: int = 3) -> float:
    """Calcula similaridade baseada em n-gramas."""
    ngrams1 = generate_ngrams(s1, n)
    ngrams2 = generate_ngrams(s2, n)
    if not ngrams1 or not ngrams2:
        return 0.0
    intersection = len(ngrams1 & ngrams2)
    union = len(ngrams1 | ngrams2)
    return intersection / union if union > 0 else 0.0


def combined_similarity(query: str, target: str) -> float:
    """
    Calcula similaridade combinada usando múltiplas métricas.
    Retorna score de 0.0 a 1.0.
    """
    query_norm = normalize_text(query)
    target_norm = normalize_text(target)
    
    if not query_norm or not target_norm:
        return 0.0
    
    # Match exato
    if query_norm == target_norm:
        return 1.0
    
    # Substring match
    if query_norm in target_norm or target_norm in query_norm:
        return 0.95
    
    # Calcula múltiplas métricas
    scores = [
        fuzzy_ratio(query_norm, target_norm) * 0.3,
        token_set_ratio(query_norm, target_norm) * 0.25,
        partial_ratio(query_norm, target_norm) * 0.25,
        ngram_similarity(query_norm, target_norm) * 0.2,
    ]
    
    # Bonus para stemming match
    query_stemmed = stem_text(query)
    target_stemmed = stem_text(target)
    if query_stemmed == target_stemmed:
        return max(sum(scores), 0.85)
    
    stem_bonus = fuzzy_ratio(query_stemmed, target_stemmed) * 0.15
    
    return min(sum(scores) + stem_bonus, 1.0)


# ============================================================================
# RESULTADO DE BUSCA RAG
# ============================================================================

@dataclass
class RAGSearchResult:
    """Resultado de uma busca RAG."""
    entity_type: str  # "character", "planet", "film", "starship", "vehicle", "species"
    entity_id: str
    name: str
    score: float
    data: Dict[str, Any]
    context_snippet: str = ""


@dataclass
class RAGContext:
    """Contexto RAG para enviar à IA."""
    query: str
    results: List[RAGSearchResult] = field(default_factory=list)
    total_matches: int = 0
    
    def to_context_string(self, max_results: int = 5) -> str:
        """Converte para string de contexto para a IA."""
        if not self.results:
            return ""
        
        lines = [f"[Contexto SWAPI para: '{self.query}']"]
        for i, result in enumerate(self.results[:max_results]):
            lines.append(f"\n{i+1}. {result.entity_type.upper()}: {result.name} (relevância: {result.score:.0%})")
            if result.context_snippet:
                lines.append(f"   {result.context_snippet}")
        
        if self.total_matches > max_results:
            lines.append(f"\n... e mais {self.total_matches - max_results} resultados")
        
        return "\n".join(lines)


# ============================================================================
# CLASSE PRINCIPAL RAG SEARCH
# ============================================================================

class RAGSearch:
    """
    Sistema RAG para busca em dados SWAPI.
    Usa Levenshtein, stemming e n-gramas para encontrar matches relevantes.
    """
    
    def __init__(self) -> None:
        self._cache: Dict[str, List[Dict[str, Any]]] = {}
        self._index: Dict[str, List[Tuple[str, str, str, Dict[str, Any]]]] = {}  # normalized -> [(type, id, name, data)]
    
    def update_cache(
        self,
        characters: List[Dict[str, Any]] | None = None,
        planets: List[Dict[str, Any]] | None = None,
        films: List[Dict[str, Any]] | None = None,
        starships: List[Dict[str, Any]] | None = None,
        vehicles: List[Dict[str, Any]] | None = None,
        species: List[Dict[str, Any]] | None = None,
    ) -> None:
        """Atualiza o cache com dados do SWAPI."""
        if characters is not None:
            self._cache["characters"] = characters
        if planets is not None:
            self._cache["planets"] = planets
        if films is not None:
            self._cache["films"] = films
        if starships is not None:
            self._cache["starships"] = starships
        if vehicles is not None:
            self._cache["vehicles"] = vehicles
        if species is not None:
            self._cache["species"] = species
        
        self._rebuild_index()
    
    def _rebuild_index(self) -> None:
        """Reconstrói o índice de busca."""
        self._index.clear()
        
        type_configs = [
            ("character", "characters", "name", ["name", "gender", "birth_year", "height", "mass"]),
            ("planet", "planets", "name", ["name", "climate", "terrain", "population"]),
            ("film", "films", "title", ["title", "episode_id", "director", "release_date"]),
            ("starship", "starships", "name", ["name", "model", "manufacturer", "starship_class"]),
            ("vehicle", "vehicles", "name", ["name", "model", "manufacturer", "vehicle_class"]),
            ("species", "species", "name", ["name", "classification", "language", "average_height"]),
        ]
        
        for entity_type, cache_key, name_field, context_fields in type_configs:
            items = self._cache.get(cache_key, [])
            for item in items:
                name = item.get(name_field, "")
                if not name:
                    continue
                
                entity_id = self._extract_id(item.get("url", ""))
                
                # Cria snippet de contexto
                context_parts = []
                for field in context_fields:
                    value = item.get(field)
                    if value and value != "unknown" and value != "n/a":
                        context_parts.append(f"{field}: {value}")
                context_snippet = " | ".join(context_parts[:4])
                
                # Indexa pelo nome normalizado
                name_normalized = normalize_text(name)
                if name_normalized:
                    entry = (entity_type, entity_id, name, item, context_snippet)
                    if name_normalized not in self._index:
                        self._index[name_normalized] = []
                    self._index[name_normalized].append(entry)
                    
                    # Também indexa versão com stemming
                    name_stemmed = stem_text(name)
                    if name_stemmed != name_normalized:
                        if name_stemmed not in self._index:
                            self._index[name_stemmed] = []
                        self._index[name_stemmed].append(entry)
    
    def _extract_id(self, url: str) -> str:
        """Extrai ID da URL do SWAPI."""
        if not url:
            return ""
        match = re.search(r"/(\d+)/?$", url)
        return match.group(1) if match else ""
    
    def search(
        self,
        query: str,
        entity_types: List[str] | None = None,
        min_score: float = 0.4,
        max_results: int = 10,
        use_keyword_extraction: bool = True,
    ) -> RAGContext:
        """
        Busca no cache SWAPI usando Levenshtein e stemming.
        
        Args:
            query: Texto de busca do usuário
            entity_types: Tipos de entidade para filtrar (None = todos)
            min_score: Score mínimo para incluir resultado (0.0 a 1.0)
            max_results: Número máximo de resultados
            use_keyword_extraction: Se True, extrai keywords da query antes de buscar
            
        Returns:
            RAGContext com resultados ordenados por relevância
        """
        if not query or not self._index:
            return RAGContext(query=query)
        
        # IMPORTANTE: Extrai keywords para evitar fuzzy match em stopwords
        if use_keyword_extraction:
            search_query = extract_search_query(query)
            # Se não extraiu nada útil, usa a query original
            if not search_query:
                search_query = query
        else:
            search_query = query
        
        query_normalized = normalize_text(search_query)
        query_stemmed = stem_text(search_query)
        query_expansions = expand_with_synonyms(search_query)
        
        # Também extrai keywords individuais para busca por palavra
        keywords = extract_keywords(query)
        
        results: List[RAGSearchResult] = []
        seen_ids: set[str] = set()
        
        # Busca em todas as entradas do índice
        for indexed_name, entries in self._index.items():
            for entity_type, entity_id, original_name, data, context_snippet in entries:
                # Filtra por tipo se especificado
                if entity_types and entity_type not in entity_types:
                    continue
                
                # Evita duplicatas
                unique_key = f"{entity_type}:{entity_id}"
                if unique_key in seen_ids:
                    continue
                
                # Calcula similaridade com múltiplas estratégias
                scores = []
                
                # 1. Score direto com query limpa (sem stopwords)
                scores.append(combined_similarity(query_normalized, indexed_name))
                
                # 2. Score com stemming
                scores.append(combined_similarity(query_stemmed, stem_text(indexed_name)))
                
                # 3. Score com expansões de sinônimos
                for expansion in query_expansions:
                    scores.append(combined_similarity(expansion, indexed_name) * 0.9)
                
                # 4. Score por keywords individuais (IMPORTANTE para frases longas)
                # Usa keywords extraídas (sem stopwords) em vez de todas as palavras
                for keyword in keywords:
                    if len(keyword) >= 2:  # Keywords já foram filtradas
                        keyword_score = combined_similarity(keyword, indexed_name)
                        # Boost maior se a keyword aparece exatamente no nome
                        if keyword in indexed_name:
                            keyword_score = max(keyword_score, 0.9)
                        scores.append(keyword_score * 0.95)
                
                # Pega o melhor score
                best_score = max(scores) if scores else 0.0
                
                if best_score >= min_score:
                    seen_ids.add(unique_key)
                    results.append(RAGSearchResult(
                        entity_type=entity_type,
                        entity_id=entity_id,
                        name=original_name,
                        score=best_score,
                        data=data,
                        context_snippet=context_snippet,
                    ))
        
        # Ordena por score decrescente
        results.sort(key=lambda x: x.score, reverse=True)
        
        return RAGContext(
            query=query,
            results=results[:max_results],
            total_matches=len(results),
        )
    
    def search_characters(self, query: str, min_score: float = 0.4, max_results: int = 5) -> RAGContext:
        """Busca apenas personagens."""
        return self.search(query, entity_types=["character"], min_score=min_score, max_results=max_results)
    
    def search_planets(self, query: str, min_score: float = 0.4, max_results: int = 5) -> RAGContext:
        """Busca apenas planetas."""
        return self.search(query, entity_types=["planet"], min_score=min_score, max_results=max_results)
    
    def search_films(self, query: str, min_score: float = 0.4, max_results: int = 5) -> RAGContext:
        """Busca apenas filmes."""
        return self.search(query, entity_types=["film"], min_score=min_score, max_results=max_results)
    
    def get_best_match(
        self,
        query: str,
        entity_types: List[str] | None = None,
        min_score: float = 0.5,
    ) -> RAGSearchResult | None:
        """Retorna o melhor match ou None se score for baixo."""
        context = self.search(query, entity_types=entity_types, min_score=min_score, max_results=1)
        return context.results[0] if context.results else None
    
    def find_entity_by_name(
        self,
        name: str,
        entity_type: str,
        min_score: float = 0.6,
    ) -> Dict[str, Any] | None:
        """
        Encontra uma entidade específica pelo nome.
        Retorna os dados completos ou None.
        """
        result = self.get_best_match(name, entity_types=[entity_type], min_score=min_score)
        return result.data if result else None


# Instância global para uso no chat service
rag_search = RAGSearch()
