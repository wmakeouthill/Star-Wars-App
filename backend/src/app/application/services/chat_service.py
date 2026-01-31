from __future__ import annotations

import json
import re
import unicodedata
import zlib
from typing import Any, Dict, List, Optional

from app.application.services.rag_search import (
    RAGSearch,
    RAGContext,
    combined_similarity,
    normalize_text as rag_normalize,
    stem_text,
    extract_keywords,
    extract_search_query,
    preprocess_droid_names,
    is_robot_query,
    rag_search,
)
from app.domain.repositories.swapi_client import ISWAPIClient
from app.domain.schemas.chat import ChatRequest, ChatResponse
from app.infrastructure.external.swapi.client import extract_id
from app.infrastructure.external.vertex_ai.yoda_ai_service import YodaAIService

# ============================================================================
# ALIASES: Mapeamento de variações de escrita para nomes canônicos SWAPI
# ============================================================================
CHARACTER_ALIASES: Dict[str, str] = {
    # R2-D2 (variações muito comuns)
    "r2d2": "R2-D2",
    "r2 d2": "R2-D2",
    "artoo": "R2-D2",
    "artoo detoo": "R2-D2",
    "arturito": "R2-D2",  # Espanhol/PT comum
    "r2": "R2-D2",
    # C-3PO (variações)
    "c3po": "C-3PO",
    "c 3po": "C-3PO",
    "c3 po": "C-3PO",
    "threepio": "C-3PO",
    "3po": "C-3PO",
    # BB-8
    "bb8": "BB-8",
    "bb 8": "BB-8",
    # Luke Skywalker
    "luke": "Luke Skywalker",
    "skywalker": "Luke Skywalker",
    # Darth Vader / Anakin
    "vader": "Darth Vader",
    "darth vader": "Darth Vader",
    "anakin": "Anakin Skywalker",
    "ani": "Anakin Skywalker",
    # Obi-Wan Kenobi
    "obi wan": "Obi-Wan Kenobi",
    "obiwan": "Obi-Wan Kenobi",
    "obi-wan": "Obi-Wan Kenobi",
    "kenobi": "Obi-Wan Kenobi",
    "ben kenobi": "Obi-Wan Kenobi",
    # Princesa Leia
    "leia": "Leia Organa",
    "princesa leia": "Leia Organa",
    # Han Solo
    "han": "Han Solo",
    "han solo": "Han Solo",
    # Chewbacca
    "chewie": "Chewbacca",
    "chewbaca": "Chewbacca",
    # Yoda
    "mestre yoda": "Yoda",
    # Palpatine
    "palpatine": "Palpatine",
    "imperador": "Palpatine",
    "sidious": "Palpatine",
    "darth sidious": "Palpatine",
    # Boba Fett
    "boba": "Boba Fett",
    "boba fett": "Boba Fett",
    # Jabba
    "jabba": "Jabba Desilijic Tiure",
    "jabba the hutt": "Jabba Desilijic Tiure",
    # Mace Windu
    "mace": "Mace Windu",
    "windu": "Mace Windu",
    # Qui-Gon Jinn
    "qui gon": "Qui-Gon Jinn",
    "quigon": "Qui-Gon Jinn",
    "qui-gon": "Qui-Gon Jinn",
    # Padmé Amidala
    "padme": "Padmé Amidala",
    "amidala": "Padmé Amidala",
    # Darth Maul
    "maul": "Darth Maul",
    "darth maul": "Darth Maul",
    # Count Dooku
    "dooku": "Dooku",
    "conde dooku": "Dooku",
    # General Grievous
    "grievous": "Grievous",
    "general grievous": "Grievous",
    # Lando
    "lando": "Lando Calrissian",
    # Kylo Ren
    "kylo": "Kylo Ren",
    "kylo ren": "Kylo Ren",
    "ben solo": "Kylo Ren",
    # Rey
    "rey": "Rey",
    # Finn
    "finn": "Finn",
    # Poe Dameron
    "poe": "Poe Dameron",
    # IG-88
    "ig88": "IG-88",
    "ig 88": "IG-88",
    # Greedo
    "greedo": "Greedo",
    # Watto
    "watto": "Watto",
    # Shmi
    "shmi": "Shmi Skywalker",
    # Owen Lars
    "tio owen": "Owen Lars",
    "owen": "Owen Lars",
    # Beru Lars
    "tia beru": "Beru Whitesun lars",
    "beru": "Beru Whitesun lars",
}

PLANET_ALIASES: Dict[str, str] = {
    # Tatooine
    "tatooine": "Tatooine",
    "tatoine": "Tatooine",
    "tatuine": "Tatooine",
    # Coruscant
    "coruscant": "Coruscant",
    "coruscante": "Coruscant",
    # Naboo
    "naboo": "Naboo",
    # Hoth
    "hoth": "Hoth",
    # Dagobah
    "dagobah": "Dagobah",
    "dagoba": "Dagobah",
    # Endor
    "endor": "Endor",
    # Bespin
    "bespin": "Bespin",
    "cidade das nuvens": "Bespin",
    # Mustafar
    "mustafar": "Mustafar",
    # Kashyyyk
    "kashyyyk": "Kashyyyk",
    "kashyyk": "Kashyyyk",
    # Alderaan
    "alderaan": "Alderaan",
    "alderan": "Alderaan",
    # Jakku
    "jakku": "Jakku",
    # Kamino
    "kamino": "Kamino",
    # Geonosis
    "geonosis": "Geonosis",
    # Utapau
    "utapau": "Utapau",
}

FILM_ALIASES: Dict[str, str] = {
    # Episode IV
    "episodio 4": "A New Hope",
    "episódio 4": "A New Hope",
    "ep 4": "A New Hope",
    "ep4": "A New Hope",
    "uma nova esperanca": "A New Hope",
    "uma nova esperança": "A New Hope",
    "new hope": "A New Hope",
    # Episode V
    "episodio 5": "The Empire Strikes Back",
    "episódio 5": "The Empire Strikes Back",
    "ep 5": "The Empire Strikes Back",
    "ep5": "The Empire Strikes Back",
    "imperio contra ataca": "The Empire Strikes Back",
    "império contra-ataca": "The Empire Strikes Back",
    "empire strikes back": "The Empire Strikes Back",
    # Episode VI
    "episodio 6": "Return of the Jedi",
    "episódio 6": "Return of the Jedi",
    "ep 6": "Return of the Jedi",
    "ep6": "Return of the Jedi",
    "retorno de jedi": "Return of the Jedi",
    "return of the jedi": "Return of the Jedi",
    # Episode I
    "episodio 1": "The Phantom Menace",
    "episódio 1": "The Phantom Menace",
    "ep 1": "The Phantom Menace",
    "ep1": "The Phantom Menace",
    "ameaca fantasma": "The Phantom Menace",
    "ameaça fantasma": "The Phantom Menace",
    "phantom menace": "The Phantom Menace",
    # Episode II
    "episodio 2": "Attack of the Clones",
    "episódio 2": "Attack of the Clones",
    "ep 2": "Attack of the Clones",
    "ep2": "Attack of the Clones",
    "ataque dos clones": "Attack of the Clones",
    "attack of the clones": "Attack of the Clones",
    # Episode III
    "episodio 3": "Revenge of the Sith",
    "episódio 3": "Revenge of the Sith",
    "ep 3": "Revenge of the Sith",
    "ep3": "Revenge of the Sith",
    "vinganca dos sith": "Revenge of the Sith",
    "vingança dos sith": "Revenge of the Sith",
    "revenge of the sith": "Revenge of the Sith",
    # Episode VII
    "episodio 7": "The Force Awakens",
    "episódio 7": "The Force Awakens",
    "ep 7": "The Force Awakens",
    "ep7": "The Force Awakens",
    "despertar da forca": "The Force Awakens",
    "despertar da força": "The Force Awakens",
    "force awakens": "The Force Awakens",
}

# Termos de categoria (para identificar o que o usuário está perguntando)
CATEGORY_TERMS: Dict[str, List[str]] = {
    "robot": [
        "robo", "robô", "robos", "robôs", "droide", "droides", "droid", "droids",
        "andróide", "androide", "androides", "maquina", "máquina", "maquinas", "máquinas",
        "automato", "autômato", "automatos", "autômatos", "astromech", "protocolo",
    ],
    "jedi": [
        "jedi", "jedis", "cavaleiro jedi", "cavaleiros jedi", "mestre jedi", "mestres jedi",
        "padawan", "padawans", "ordem jedi", "conselho jedi", "sabre de luz", "lightsaber",
    ],
    "sith": [
        "sith", "siths", "lord sith", "lords sith", "darth", "lado negro", "lado sombrio",
        "império", "imperio", "imperial", "imperiais",
    ],
    "human": ["humano", "humana", "humanos", "humanas", "pessoa", "pessoas", "homem", "mulher"],
    "alien": [
        "alienigena", "alienígena", "alienigenas", "alienígenas", "alien", "aliens",
        "extraterrestre", "extraterrestres", "especie", "espécie", "especies", "espécies",
    ],
    "wookiee": ["wookiee", "wookie", "wookies", "wookiees"],
    "pilot": ["piloto", "pilota", "pilotos", "aviador", "aviadora"],
    "bounty_hunter": [
        "cacador de recompensas", "caçador de recompensas", "caçadores de recompensas",
        "bounty hunter", "bounty hunters", "mercenario", "mercenário", "mercenarios", "mercenários",
    ],
    "princess": ["princesa", "princesas", "realeza"],
    "senator": ["senador", "senadora", "senadores", "politico", "político", "politica", "política"],
    "smuggler": ["contrabandista", "contrabandistas", "smuggler", "smugglers", "pirata", "piratas"],
    "clone": ["clone", "clones", "soldado clone", "soldados clone", "tropas clone"],
    "stormtrooper": ["stormtrooper", "stormtroopers", "soldado imperial", "soldados imperiais"],
    "rebel": ["rebelde", "rebeldes", "aliança rebelde", "resistencia", "resistência"],
    "villain": ["vilao", "vilão", "viloes", "vilões", "malvado", "inimigo", "antagonista"],
    "hero": ["heroi", "herói", "heroina", "heroína", "herois", "heróis"],
    "force_user": ["usuario da forca", "usuário da força", "sensitivo", "sensitivo à força"],
    "master": ["mestre", "mestres", "mentor", "mentores"],
    "apprentice": ["aprendiz", "aprendizes", "discipulo", "discípulo"],
}

# Mapeamento de personagens para suas categorias (usado para perguntas como "ele é um robô?")
# Usar a chave "robot" para consistência com CATEGORY_TERMS
CHARACTER_CATEGORIES: Dict[str, List[str]] = {
    # Droides
    "R2-D2": ["robot", "astromech", "hero"],
    "C-3PO": ["robot", "protocol", "hero"],
    "BB-8": ["robot", "astromech", "hero"],
    "IG-88": ["robot", "bounty_hunter", "villain"],
    "K-2SO": ["robot", "rebel"],
    # Heróis principais
    "Luke Skywalker": ["human", "jedi", "pilot", "hero", "force_user"],
    "Leia Organa": ["human", "princess", "senator", "rebel", "hero", "force_user"],
    "Han Solo": ["human", "pilot", "smuggler", "rebel", "hero"],
    "Chewbacca": ["wookiee", "pilot", "rebel", "hero"],
    # Jedi
    "Obi-Wan Kenobi": ["human", "jedi", "master", "hero", "force_user"],
    "Yoda": ["alien", "jedi", "master", "hero", "force_user"],
    "Mace Windu": ["human", "jedi", "master", "hero", "force_user"],
    "Qui-Gon Jinn": ["human", "jedi", "master", "hero", "force_user"],
    "Anakin Skywalker": ["human", "jedi", "pilot", "apprentice", "force_user"],
    "Ahsoka Tano": ["alien", "jedi", "apprentice", "hero", "force_user"],
    # Sith / Vilões
    "Darth Vader": ["human", "sith", "pilot", "villain", "force_user"],
    "Palpatine": ["human", "sith", "senator", "villain", "master", "force_user"],
    "Darth Maul": ["alien", "sith", "villain", "apprentice", "force_user"],
    "Dooku": ["human", "sith", "jedi", "villain", "force_user"],
    "Kylo Ren": ["human", "sith", "villain", "force_user"],
    "General Grievous": ["alien", "villain"],
    "Jabba Desilijic Tiure": ["alien", "villain"],
    # Caçadores de recompensas
    "Boba Fett": ["human", "bounty_hunter"],
    "Jango Fett": ["human", "bounty_hunter"],
    "Bossk": ["alien", "bounty_hunter"],
    "Greedo": ["alien", "bounty_hunter"],
    "Dengar": ["human", "bounty_hunter"],
    # Políticos / Senadores
    "Padmé Amidala": ["human", "senator", "princess", "hero"],
    "Bail Organa": ["human", "senator", "rebel", "hero"],
    "Mon Mothma": ["human", "senator", "rebel", "hero"],
    # Pilotos
    "Wedge Antilles": ["human", "pilot", "rebel", "hero"],
    "Poe Dameron": ["human", "pilot", "rebel", "hero"],
    "Lando Calrissian": ["human", "pilot", "smuggler", "hero"],
    # Novos personagens
    "Rey": ["human", "jedi", "hero", "force_user"],
    "Finn": ["human", "stormtrooper", "rebel", "hero"],
    # Clones
    "Captain Rex": ["human", "clone", "hero"],
}


class ChatService:
    def __init__(self, swapi_client: ISWAPIClient, yoda_ai: YodaAIService | None = None) -> None:
        self._swapi = swapi_client
        self._yoda_ai = yoda_ai
        self._rag = rag_search
        self._rag_initialized = False

    async def _ensure_rag_cache(self) -> None:
        """Garante que o cache RAG está populado com dados do SWAPI."""
        if self._rag_initialized:
            return
        
        try:
            # Carrega todos os dados do SWAPI para o cache RAG
            people = await self._swapi.get_all_people()
            planets = await self._swapi.get_all_planets()
            films = await self._swapi.get_all_films()
            
            # Tenta carregar starships, vehicles e species se disponíveis
            starships = []
            vehicles = []
            species = []
            
            try:
                if hasattr(self._swapi, 'get_all_starships'):
                    starships = await self._swapi.get_all_starships()
            except Exception:
                pass
            
            try:
                if hasattr(self._swapi, 'get_all_vehicles'):
                    vehicles = await self._swapi.get_all_vehicles()
            except Exception:
                pass
            
            try:
                if hasattr(self._swapi, 'get_all_species'):
                    species = await self._swapi.get_all_species()
            except Exception:
                pass
            
            self._rag.update_cache(
                characters=people,
                planets=planets,
                films=films,
                starships=starships,
                vehicles=vehicles,
                species=species,
            )
            self._rag_initialized = True
        except Exception:
            # Se falhar, continua sem RAG completo
            pass

    async def process_message(self, request: ChatRequest) -> ChatResponse:
        persona = getattr(request, "persona", "yoda")
        message = request.message.strip()

        if not message:
            return ChatResponse(
                message=self._persona_reply(
                    persona,
                    "Vazio está o seu pedido. Perguntar, você deve" if persona == "yoda" else "Não há nada aqui. Fale",
                )
            )

        # Garante que o cache RAG está populado
        await self._ensure_rag_cache()

        routed = await self._route_structured_intent(persona, message, request.context)
        if routed is not None:
            return routed

        # Busca contexto RAG para mensagens não roteadas
        # Também considera o contexto da conversa para melhor relevância
        rag_context = self._get_rag_context_with_history(message, request.context)
        rag_snippet = rag_context.to_context_string(max_results=5) if rag_context.results else None

        ai_message = await self._ai_response(persona, message, request.context, rag_snippet)
        # Passa o contexto para o fallback para manter coerência
        fallback_message = self._persona_freestyle_fallback(persona, message, request.context)
        return ChatResponse(
            message=ai_message or fallback_message,
            suggested_actions=[
                "Buscar personagens por nome",
                "Listar planetas e climas",
                "Explorar filmes por episódio",
            ],
            xp_earned=5,
        )

    def _get_rag_context(self, message: str) -> RAGContext:
        """Busca contexto RAG relevante para a mensagem do usuário."""
        # Detecta se é uma pergunta sobre categoria para expandir a busca
        lowered = message.lower()
        
        # Robôs/Droides
        if any(w in lowered for w in ["robo", "robô", "robos", "robôs", "droide", "droides", "droid", "astromech"]):
            ctx = self._rag.search(query="R2-D2 C-3PO BB-8 IG-88 K-2SO droide astromech", min_score=0.3, max_results=5)
            if ctx.results:
                return ctx
        
        # Jedis
        if any(w in lowered for w in ["jedi", "jedis", "cavaleiro jedi", "mestre jedi", "padawan", "ordem jedi"]):
            ctx = self._rag.search(query="Luke Yoda Obi-Wan Mace Windu Qui-Gon Anakin Ahsoka Jedi", min_score=0.3, max_results=5)
            if ctx.results:
                return ctx
        
        # Sith / Lado Negro
        if any(w in lowered for w in ["sith", "siths", "lado negro", "lado sombrio", "darth", "imperio", "império"]):
            ctx = self._rag.search(query="Darth Vader Palpatine Darth Maul Dooku Kylo Ren Sith", min_score=0.3, max_results=5)
            if ctx.results:
                return ctx
        
        # Caçadores de recompensas
        if any(w in lowered for w in ["caçador", "cacador", "bounty hunter", "mercenario", "mercenário"]):
            ctx = self._rag.search(query="Boba Fett Jango Fett IG-88 Bossk Greedo Dengar bounty hunter", min_score=0.3, max_results=5)
            if ctx.results:
                return ctx
        
        # Pilotos
        if any(w in lowered for w in ["piloto", "pilotos", "aviador", "pilot"]):
            ctx = self._rag.search(query="Han Solo Luke Skywalker Poe Dameron Wedge Antilles Lando pilot", min_score=0.3, max_results=5)
            if ctx.results:
                return ctx
        
        # Princesas / Realeza
        if any(w in lowered for w in ["princesa", "rainha", "realeza", "princess"]):
            ctx = self._rag.search(query="Leia Organa Padmé Amidala princess queen", min_score=0.3, max_results=5)
            if ctx.results:
                return ctx
        
        # Vilões
        if any(w in lowered for w in ["vilao", "vilão", "viloes", "vilões", "malvado", "antagonista"]):
            ctx = self._rag.search(query="Darth Vader Palpatine Darth Maul Jabba Grievous Kylo villain", min_score=0.3, max_results=5)
            if ctx.results:
                return ctx
        
        # Heróis
        if any(w in lowered for w in ["heroi", "herói", "heroina", "heroína", "herois", "heróis"]):
            ctx = self._rag.search(query="Luke Skywalker Leia Han Solo Chewbacca Rey Finn hero", min_score=0.3, max_results=5)
            if ctx.results:
                return ctx
        
        # Rebeldes / Resistência
        if any(w in lowered for w in ["rebelde", "rebeldes", "aliança", "resistencia", "resistência"]):
            ctx = self._rag.search(query="Luke Leia Han Solo Mon Mothma Bail Organa Wedge rebel resistance", min_score=0.3, max_results=5)
            if ctx.results:
                return ctx
        
        # Clones / Stormtroopers
        if any(w in lowered for w in ["clone", "clones", "stormtrooper", "stormtroopers", "soldado"]):
            ctx = self._rag.search(query="clone trooper stormtrooper Captain Rex soldiers", min_score=0.3, max_results=5)
            if ctx.results:
                return ctx
        
        # Wookiees
        if any(w in lowered for w in ["wookiee", "wookie", "wookies", "kashyyyk"]):
            ctx = self._rag.search(query="Chewbacca Wookiee Kashyyyk", min_score=0.3, max_results=5)
            if ctx.results:
                return ctx
        
        # Força
        if any(w in lowered for w in ["força", "forca", "force", "poder", "poderes", "midi-chlorian"]):
            ctx = self._rag.search(query="Yoda Luke Skywalker Obi-Wan Palpatine Force Jedi Sith", min_score=0.3, max_results=5)
            if ctx.results:
                return ctx
        
        # Naves
        if any(w in lowered for w in ["nave", "naves", "starship", "spaceship", "falcon", "x-wing", "destroyer"]):
            ctx = self._rag.search(query="Millennium Falcon X-wing Star Destroyer TIE Fighter starship", min_score=0.3, max_results=5)
            if ctx.results:
                return ctx
        
        # Planetas
        if any(w in lowered for w in ["planeta", "planetas", "mundo", "mundos", "sistema"]):
            ctx = self._rag.search(query="Tatooine Coruscant Naboo Hoth Dagobah Endor planet", min_score=0.3, max_results=5)
            if ctx.results:
                return ctx
        
        # Filmes / Saga
        if any(w in lowered for w in ["filme", "filmes", "trilogia", "saga", "episodio", "episódio"]):
            ctx = self._rag.search(query="New Hope Empire Strikes Back Return Jedi Phantom Menace film", min_score=0.3, max_results=5)
            if ctx.results:
                return ctx
        
        # Busca geral em todas as entidades
        return self._rag.search(
            query=message,
            min_score=0.35,
            max_results=5,
        )

    def _get_rag_context_with_history(self, message: str, context: List) -> RAGContext:
        """
        Busca contexto RAG considerando também o histórico da conversa.
        
        Isso permite que perguntas como "o que você acha dele?" ou "me fale mais"
        busquem contexto relevante baseado na última entidade mencionada.
        """
        # Primeiro tenta a busca normal
        rag_ctx = self._get_rag_context(message)
        
        # Se não encontrou nada relevante, verifica se há referência ao contexto anterior
        if not rag_ctx.results or rag_ctx.results[0].score < 0.5:
            # Verifica se a mensagem tem pronomes ou referências vagas
            lowered = message.lower()
            has_reference = any(w in lowered for w in [
                "ele", "ela", "dele", "dela", "isso", "esse", "essa",
                "mais", "sobre isso", "continue", "explique", "detalhe",
                "como assim", "por que", "porque", "o que mais"
            ])
            
            if has_reference and context:
                # Tenta encontrar a última entidade mencionada
                last_entity = self._last_entity_from_context(context)
                if last_entity and last_entity.get("name"):
                    entity_name = last_entity["name"]
                    entity_type = last_entity.get("type", "character")
                    
                    # Busca RAG pela última entidade
                    entity_ctx = self._rag.search(
                        query=entity_name,
                        entity_types=[entity_type] if entity_type else None,
                        min_score=0.3,
                        max_results=5,
                    )
                    if entity_ctx.results:
                        return entity_ctx
            
            # Também tenta extrair tema das últimas mensagens do assistente
            for item in reversed(context or [])[:3]:
                if getattr(item, "role", "") == "assistant":
                    content = getattr(item, "content", "")
                    # Extrai nomes/temas mencionados na resposta
                    theme_ctx = self._extract_theme_from_content(content)
                    if theme_ctx:
                        theme_rag = self._rag.search(query=theme_ctx, min_score=0.3, max_results=3)
                        if theme_rag.results:
                            # Combina com o contexto original se houver
                            if rag_ctx.results:
                                combined_results = rag_ctx.results + theme_rag.results
                                return RAGContext(
                                    query=message,
                                    results=sorted(combined_results, key=lambda x: x.score, reverse=True)[:5],
                                    total_matches=len(combined_results),
                                )
                            return theme_rag
                    break
        
        return rag_ctx

    def _extract_theme_from_content(self, content: str) -> str | None:
        """Extrai tema/entidade principal de uma resposta do assistente."""
        if not content:
            return None
        
        # Procura por nomes conhecidos de Star Wars na resposta
        content_lower = content.lower()
        
        # Verifica aliases de personagens
        for alias, canonical in CHARACTER_ALIASES.items():
            if alias in content_lower or self._normalize_text(canonical) in content_lower:
                return canonical
        
        # Verifica aliases de planetas
        for alias, canonical in PLANET_ALIASES.items():
            if alias in content_lower:
                return canonical
        
        # Verifica categorias mencionadas
        category_keywords = {
            "droide": "droide R2-D2 C-3PO",
            "jedi": "jedi Luke Obi-Wan Yoda",
            "sith": "sith Vader Palpatine",
            "nave": "nave Millennium Falcon X-Wing",
            "planeta": "planeta Tatooine Coruscant",
        }
        for keyword, search_terms in category_keywords.items():
            if keyword in content_lower:
                return search_terms
        
        return None

    async def _route_structured_intent(self, persona: str, message: str, context: List) -> ChatResponse | None:
        # Perguntas de opinião com pronomes ("dele/dela/ele/ela/isso") devem usar o último alvo mencionado.
        if self._is_opinion_question(message) and self._message_mentions_pronoun(message):
            last = self._last_entity_from_context(context)
            if last and last.get("name"):
                if last.get("type") == "character":
                    return await self._respond_character(persona, message, context, name_override=last["name"])
                if last.get("type") == "planet":
                    return await self._respond_planet(persona, message, context, name_override=last["name"])
                if last.get("type") == "film":
                    return await self._respond_film(persona, message, context, name_override=last["name"])

        # NOVA LÓGICA: Perguntas de categoria ("o r2d2 é um robô?")
        entity_name, category = self._is_category_question(message)
        if entity_name and category:
            # Se o nome extraído é um pronome, resolve do contexto
            if self._looks_like_pronoun(entity_name):
                last = self._last_entity_from_context(context)
                if last and last.get("name"):
                    entity_name = last["name"]
                else:
                    # Não conseguiu resolver o pronome, responde genericamente
                    return None
            
            # Resolve alias se existir
            canonical = self._resolve_alias(entity_name, "character")
            search_name = canonical or entity_name
            
            people = await self._swapi.get_all_people()
            match = self._find_match(people, search_name)
            
            if match:
                data = {
                    "id": extract_id(match.get("url", "")),
                    "name": match.get("name"),
                    "gender": match.get("gender"),
                    "birth_year": match.get("birth_year"),
                }
                response = self._answer_category_question(persona, entity_name, category, data)
                return ChatResponse(
                    message=response,
                    data=data,
                    suggested_actions=["Ver detalhes do personagem", "Perguntar sobre outros personagens"],
                    xp_earned=10,
                )
            else:
                # Mesmo sem match SWAPI, responde de forma útil
                response = self._answer_category_question(persona, entity_name, category, None)
                return ChatResponse(
                    message=response,
                    suggested_actions=["Buscar personagens por nome"],
                    xp_earned=5,
                )

        # NOVA LÓGICA: Perguntas do tipo "o que é X?" / "quem é X?" / "X é o quê?"
        entity_from_question = self._extract_entity_from_question(message)
        if entity_from_question:
            return await self._respond_character(
                persona, message, context, name_override=entity_from_question.get("name")
            )

        # Intenções "naturais" (ex.: "quero falar sobre o Luke") sem exigir palavra-chave.
        inferred = self._infer_entity_request(message)
        if inferred and self._looks_like_pronoun(inferred.get("name")):
            resolved = self._resolve_pronoun_from_context(inferred, context)
            inferred = resolved or inferred
        if inferred:
            inferred_type = inferred.get("type")
            name = inferred.get("name")
            if inferred_type == "character":
                return await self._respond_character(persona, message, context, name_override=name)
            if inferred_type == "planet":
                return await self._respond_planet(persona, message, context, name_override=name)
            if inferred_type == "film":
                return await self._respond_film(persona, message, context, name_override=name)

        # Se o usuário mandar apenas um nome/título ("Luke Skywalker"), assume consulta da entidade.
        standalone = self._infer_standalone_entity(message)
        if standalone:
            if standalone.get("type") == "character":
                return await self._respond_character(persona, message, context, name_override=standalone.get("name"))
            if standalone.get("type") == "planet":
                return await self._respond_planet(persona, message, context, name_override=standalone.get("name"))
            if standalone.get("type") == "film":
                return await self._respond_film(persona, message, context, name_override=standalone.get("name"))

        lower = message.lower()
        if "personagem" in lower or "quem é" in lower:
            return await self._respond_character(persona, message, context)
        if "planeta" in lower or "mundo" in lower:
            return await self._respond_planet(persona, message, context)
        if "filme" in lower or "episódio" in lower or "episodio" in lower:
            return await self._respond_film(persona, message, context)

        # Perguntas de opinião usando nome explícito (ex.: "o que você acha do Luke?").
        opinion_target = self._infer_opinion_target(message)
        if opinion_target:
            inferred_type = opinion_target.get("type")
            name = opinion_target.get("name")
            if inferred_type == "character":
                return await self._respond_character(persona, message, context, name_override=name)
            if inferred_type == "planet":
                return await self._respond_planet(persona, message, context, name_override=name)
            if inferred_type == "film":
                return await self._respond_film(persona, message, context, name_override=name)
        return None

    async def _respond_character(
        self, persona: str, message: str, context: List, *, name_override: str | None = None
    ) -> ChatResponse:
        name = name_override or self._extract_entity_name(message)
        people = await self._swapi.get_all_people()
        match = self._find_match(people, name)
        if not match and name:
            # Fallback: às vezes o "nome" vem como frase inteira ("o que você acha do Luke...").
            # Sanitiza e tenta novamente para evitar "não encontrei" indevido.
            for candidate in self._candidate_entity_queries(name, message):
                if candidate and candidate != name:
                    match = self._find_match(people, candidate)
                    if match:
                        name = candidate
                        break

        if not match:
            # Mesmo sem match exato, responde de forma natural usando RAG context
            rag_context = self._get_rag_context(name or message)
            rag_snippet = rag_context.to_context_string(max_results=3) if rag_context.results else None
            
            ai_message = await self._ai_response(persona, message, context, rag_snippet)
            if ai_message:
                return ChatResponse(
                    message=ai_message,
                    data={"query": name},
                    suggested_actions=["Explorar personagens", "Descobrir mais sobre Star Wars"],
                    xp_earned=5,
                )
            
            # Fallback: responde in-character sobre o que sabe
            response = self._persona_freestyle_about_topic(persona, name or message)
            return ChatResponse(
                message=response,
                data={"query": name},
                suggested_actions=["Explorar personagens", "Descobrir mais sobre Star Wars"],
                xp_earned=5,
            )

        data = {
            "id": extract_id(match.get("url", "")),
            "name": match.get("name"),
            "gender": match.get("gender"),
            "birth_year": match.get("birth_year"),
        }
        data_snippet = json.dumps({"type": "character", "swapi": data}, ensure_ascii=False, indent=2)

        if self._is_opinion_question(message):
            ai_message = await self._ai_response(persona, message, context, data_snippet)
            response = ai_message or self._persona_opinion_about_character(persona, data)
            return ChatResponse(
                message=response,
                data=data,
                suggested_actions=["Ver detalhes do personagem", "Comparar personagens"],
                xp_earned=10,
            )

        response = (
            f"{match.get('name')} é. Gênero: {match.get('gender')}. "
            f"Ano de nascimento: {match.get('birth_year')}."
            if persona == "yoda"
            else f"{match.get('name')}. Gênero: {match.get('gender')}. Ano de nascimento: {match.get('birth_year')}."
        )
        # Quando a IA estiver desabilitada, adiciona um toque de "lore" seguro e curto (sem números).
        response = self._persona_add_lore_hint(persona, data, response)
        ai_message = await self._ai_response(persona, message, context, data_snippet)
        return ChatResponse(
            message=ai_message or self._persona_reply(persona, response),
            data=data,
            suggested_actions=["Ver detalhes do personagem", "Comparar personagens"],
            xp_earned=10,
        )

    async def _respond_planet(
        self, persona: str, message: str, context: List, *, name_override: str | None = None
    ) -> ChatResponse:
        name = name_override or self._extract_entity_name(message)
        planets = await self._swapi.get_all_planets()
        match = self._find_match(planets, name)
        if not match:
            # Responde de forma natural mesmo sem match exato
            rag_context = self._get_rag_context(name or message)
            rag_snippet = rag_context.to_context_string(max_results=3) if rag_context.results else None
            
            ai_message = await self._ai_response(persona, message, context, rag_snippet)
            if ai_message:
                return ChatResponse(
                    message=ai_message,
                    data={"query": name},
                    suggested_actions=["Explorar planetas", "Descobrir mundos da galáxia"],
                    xp_earned=5,
                )
            
            response = self._persona_freestyle_about_topic(persona, name or message)
            return ChatResponse(
                message=response,
                data={"query": name},
                suggested_actions=["Explorar planetas", "Descobrir mundos da galáxia"],
                xp_earned=5,
            )

        data = {
            "id": extract_id(match.get("url", "")),
            "name": match.get("name"),
            "climate": match.get("climate"),
            "terrain": match.get("terrain"),
        }
        data_snippet = json.dumps({"type": "planet", "swapi": data}, ensure_ascii=False, indent=2)
        response = (
            f"{match.get('name')} planeta é. Clima: {match.get('climate')}. "
            f"Terreno: {match.get('terrain')}."
            if persona == "yoda"
            else f"{match.get('name')}. Clima: {match.get('climate')}. Terreno: {match.get('terrain')}."
        )
        ai_message = await self._ai_response(persona, message, context, data_snippet)
        return ChatResponse(
            message=ai_message or self._persona_reply(persona, response),
            data=data,
            suggested_actions=["Ver personagens do planeta", "Explorar planetas similares"],
            xp_earned=10,
        )

    async def _respond_film(
        self, persona: str, message: str, context: List, *, name_override: str | None = None
    ) -> ChatResponse:
        name = name_override or self._extract_entity_name(message)
        films = await self._swapi.get_all_films()
        match = self._find_match(films, name, key="title")
        if not match:
            # Responde de forma natural mesmo sem match exato
            rag_context = self._get_rag_context(name or message)
            rag_snippet = rag_context.to_context_string(max_results=3) if rag_context.results else None
            
            ai_message = await self._ai_response(persona, message, context, rag_snippet)
            if ai_message:
                return ChatResponse(
                    message=ai_message,
                    data={"query": name},
                    suggested_actions=["Explorar filmes", "Descobrir a saga"],
                    xp_earned=5,
                )
            
            response = self._persona_freestyle_about_topic(persona, name or message)
            return ChatResponse(
                message=response,
                data={"query": name},
                suggested_actions=["Explorar filmes", "Descobrir a saga"],
                xp_earned=5,
            )

        data = {
            "id": extract_id(match.get("url", "")),
            "title": match.get("title"),
            "episode_id": match.get("episode_id"),
            "director": match.get("director"),
        }
        data_snippet = json.dumps({"type": "film", "swapi": data}, ensure_ascii=False, indent=2)
        response = (
            f"Filme {match.get('title')} é. Episódio {match.get('episode_id')}, "
            f"diretor {match.get('director')}."
            if persona == "yoda"
            else f"{match.get('title')}. Episódio {match.get('episode_id')}. Diretor: {match.get('director')}."
        )
        ai_message = await self._ai_response(persona, message, context, data_snippet)
        return ChatResponse(
            message=ai_message or self._persona_reply(persona, response),
            data=data,
            suggested_actions=["Ver personagens do filme", "Explorar filmes relacionados"],
            xp_earned=10,
        )

    async def _ai_response(
        self,
        persona: str,
        message: str,
        context: List,
        data_snippet: str | None,
    ) -> str | None:
        if not self._yoda_ai:
            return None
        history = [f"{item.role}: {item.content}" for item in context]
        return await self._yoda_ai.generate_response(message, history, data_snippet, persona=persona)

    def _find_match(self, items: List[Dict[str, Any]], name: Optional[str], key: str = "name") -> Optional[Dict[str, Any]]:
        """
        Busca um item pelo nome usando múltiplas estratégias:
        1. Match direto (substring)
        2. Aliases conhecidos
        3. Keywords extraídas (sem stopwords)
        4. RAG com Levenshtein + stemming
        """
        if not name:
            return items[0] if items else None

        target = self._normalize_text(name)
        if not target:
            return items[0] if items else None

        # 1. Tenta match direto (substring)
        direct = self._direct_match(items, key, target)
        if direct is not None:
            return direct

        # 2. Tenta resolver via alias
        entity_type = "character" if key == "name" else ("film" if key == "title" else "planet")
        alias_dict = CHARACTER_ALIASES if entity_type == "character" else (FILM_ALIASES if entity_type == "film" else PLANET_ALIASES)
        
        # Verifica se algum alias corresponde
        for alias_key, canonical in alias_dict.items():
            if alias_key in target or target in alias_key:
                # Busca pelo nome canônico
                canonical_normalized = self._normalize_text(canonical)
                for item in items:
                    item_value = self._normalize_text(str(item.get(key, "") or ""))
                    if item_value and (canonical_normalized in item_value or item_value in canonical_normalized):
                        return item

        # 3. Extrai keywords (remove stopwords) ANTES do fuzzy match
        # Isso evita fazer fuzzy match em "me", "fale", "sobre", "o", etc.
        keywords = extract_keywords(name)
        search_query = extract_search_query(name) if keywords else target
        
        # Também verifica se alguma keyword é um alias
        for keyword in keywords:
            if keyword in alias_dict:
                canonical = alias_dict[keyword]
                canonical_normalized = self._normalize_text(canonical)
                for item in items:
                    item_value = self._normalize_text(str(item.get(key, "") or ""))
                    if item_value and canonical_normalized in item_value:
                        return item

        # 4. Usa RAG com Levenshtein + stemming para busca fuzzy avançada
        best_item = None
        best_score = 0.0
        
        # Usa a query limpa (sem stopwords) para fuzzy match
        target_clean = self._normalize_text(search_query) if search_query else target
        target_stemmed = stem_text(search_query) if search_query else stem_text(name)
        
        for item in items:
            item_value = str(item.get(key, "") or "")
            if not item_value:
                continue
            
            item_normalized = self._normalize_text(item_value)
            
            # Score com query limpa (sem stopwords)
            score = combined_similarity(target_clean, item_value)
            
            # Score com stemming
            item_stemmed = stem_text(item_value)
            stem_score = combined_similarity(target_stemmed, item_stemmed)
            
            # Score por keywords individuais
            keyword_scores = []
            for keyword in keywords:
                if len(keyword) >= 2:
                    kw_score = combined_similarity(keyword, item_normalized)
                    # Boost se keyword aparece no nome
                    if keyword in item_normalized:
                        kw_score = max(kw_score, 0.9)
                    keyword_scores.append(kw_score)
            
            best_keyword_score = max(keyword_scores) if keyword_scores else 0.0
            
            final_score = max(score, stem_score, best_keyword_score)
            
            if final_score > best_score:
                best_score = final_score
                best_item = item
        
        # Threshold de 0.5 - mais alto agora que usamos keywords limpas
        if best_score >= 0.5:
            return best_item

        # 5. Fallback: tenta cada keyword separadamente (já filtradas)
        words = keywords if keywords else target.split()
        if len(words) >= 1:
            for word in words:
                if len(word) >= 3:  # Ignora palavras muito curtas
                    # Verifica se a palavra é um alias
                    if word in alias_dict:
                        canonical = alias_dict[word]
                        canonical_normalized = self._normalize_text(canonical)
                        for item in items:
                            item_value = self._normalize_text(str(item.get(key, "") or ""))
                            if item_value and canonical_normalized in item_value:
                                return item
                    
                    # Busca com Levenshtein por palavra individual
                    for item in items:
                        item_value = str(item.get(key, "") or "")
                        word_score = combined_similarity(word, item_value)
                        if word_score >= 0.6:
                            return item

        return None

    def _direct_match(self, items: List[Dict[str, Any]], key: str, target: str) -> Dict[str, Any] | None:
        for item in items:
            value = self._normalize_text(str(item.get(key, "") or ""))
            if value and target in value:
                return item
        return None

    def _best_fuzzy_match(
        self, items: List[Dict[str, Any]], key: str, target: str
    ) -> tuple[Dict[str, Any] | None, float]:
        """Busca fuzzy usando Levenshtein + stemming."""
        best: Dict[str, Any] | None = None
        best_score = 0.0
        target_stemmed = stem_text(target)
        
        for item in items:
            value = str(item.get(key, "") or "")
            if not value:
                continue
            
            # Score combinado com Levenshtein
            score = combined_similarity(target, value)
            
            # Também tenta com stemming
            value_stemmed = stem_text(value)
            stem_score = combined_similarity(target_stemmed, value_stemmed)
            
            final_score = max(score, stem_score)
            
            if final_score > best_score:
                best_score = final_score
                best = item
        
        return best, best_score

    def _fuzzy_score(self, target: str, value: str) -> float:
        """Calcula score fuzzy usando o sistema RAG com Levenshtein."""
        return combined_similarity(target, value)

    def _extract_entity_name(self, message: str) -> Optional[str]:
        raw = (message or "").strip()
        if not raw:
            return None

        lowered = raw.lower().strip()
        # Remove alguns prefixos comuns.
        for prefix in (
            "personagem",
            "planeta",
            "mundo",
            "filme",
            "episódio",
            "episodio",
            "quem é",
            "quem eh",
        ):
            if lowered.startswith(prefix):
                raw = raw[len(prefix) :].strip(" :,-")
                break

        tokens = raw.split()
        if len(tokens) <= 1:
            return raw.strip() or None
        return raw.strip() or None

    def _infer_entity_request(self, message: str) -> dict[str, str] | None:
        """
        Heurística barata para capturar pedidos do tipo:
        - "quero falar sobre o luke skywalker"
        - "me fala do tatooine"
        - "vamos conversar sobre o episódio 4"
        - "me fale sobre o r2 d2" (detecta droides corretamente)
        """
        raw = (message or "").strip()
        if not raw:
            return None

        lowered = raw.lower()
        
        # IMPORTANTE: Verifica primeiro se é sobre robôs/droides em geral
        # Isso evita que "roobs" ou "robos" sejam tratados como nome de personagem
        if is_robot_query(lowered):
            return None  # Deixa o fluxo de categoria responder
        
        # Verifica se é uma pergunta sobre CATEGORIA (jedis, siths, etc.)
        # em vez de um personagem específico
        if self._is_category_query(lowered):
            return None  # Deixa o fluxo padrão com RAG responder sobre a categoria
        
        # IMPORTANTE: Pré-processa para detectar nomes de droides
        # "r2 d2" -> "R2-D2", "c3 po" -> "C-3PO"
        preprocessed = preprocess_droid_names(raw)

        # Captura o trecho depois de "sobre", "do/da/de" em frases típicas.
        m = re.search(r"\b(?:falar|conversar)\s+sobre\s+(?:o|a|os|as)?\s*(.+)$", lowered)
        if not m:
            m = re.search(r"\bme\s+fale\s+(?:do|da|de)\s+(?:o|a|os|as)?\s*(.+)$", lowered)
        if not m:
            m = re.search(r"\bsobre\s+(?:o|a|os|as)?\s*(.+)$", lowered)
        if not m:
            return None

        # Usa o texto pré-processado para extrair o nome
        tail_start = m.start(1)
        tail = preprocessed[tail_start:].strip(" .!?;:")
        if not tail:
            return None
        
        # Verifica novamente se o "tail" é uma categoria
        if self._is_category_query(tail.lower()):
            return None

        # Sinais de filme.
        if re.search(r"\b(epis[oó]dio|episode)\b", tail, flags=re.IGNORECASE):
            tail = re.sub(r"\b(epis[oó]dio|episode)\b", "", tail, flags=re.IGNORECASE).strip(" -:#")
            return {"type": "film", "name": tail or raw}

        # Sinais de planeta.
        if re.search(r"\b(planeta|mundo)\b", lowered):
            tail = re.sub(r"\b(planeta|mundo)\b", "", tail, flags=re.IGNORECASE).strip(" -:#")
            return {"type": "planet", "name": tail or raw}

        # Default: personagem (a intenção mais comum em "falar sobre X").
        return {"type": "character", "name": tail}
    
    def _is_category_query(self, text: str) -> bool:
        """
        Detecta se o texto é sobre uma CATEGORIA de entidades (plural/genérico)
        em vez de um personagem específico.
        
        Ex: "robôs", "droides", "jedis", "siths", "naves", etc.
        """
        # Primeiro, usa a função especializada para robôs/droides
        if is_robot_query(text):
            return True
        
        category_words = [
            # Robôs/Droides - já cobertos por is_robot_query, mas mantém para compatibilidade
            "robos", "robôs", "robo", "robô", "roobs", "robs", "robot", "robots",
            "droides", "droide", "droid", "droids",
            "maquinas", "máquinas", "androides", "andróides", "astromech", "astromechs",
            # Jedis
            "jedis", "jedi", "cavaleiros jedi", "mestres jedi", "padawans", "padawan",
            "ordem jedi", "conselho jedi", "templo jedi",
            # Siths
            "siths", "sith", "lords sith", "lado negro", "lado sombrio", "ordem sith",
            # Naves
            "naves", "espaçonaves", "starships", "veiculos", "veículos", "starfighters",
            "x-wings", "tie fighters", "destroyers", "millennium falcon",
            # Planetas (genérico)
            "planetas", "mundos", "sistemas", "galaxia", "galáxia",
            # Espécies
            "especies", "espécies", "racas", "raças", "alienigenas", "alienígenas",
            "criaturas", "seres",
            # Grupos/Facções
            "personagens", "viloes", "vilões", "herois", "heróis",
            "rebeldes", "aliança rebelde", "resistencia", "resistência",
            "imperio", "império", "imperiais", "primeiro ordem", "primeira ordem",
            "clones", "soldados clone", "exercito clone", "exército clone",
            "stormtroopers", "troopers", "soldados",
            "wookiees", "wookies", "twi'leks", "togrutas", "zabraks",
            # Caçadores de recompensas
            "cacadores de recompensas", "caçadores de recompensas", "bounty hunters",
            "mercenarios", "mercenários",
            # Força
            "força", "forca", "force", "lado luminoso", "lado da luz",
            "poderes", "habilidades", "midi-chlorians", "midichlorians",
            # Armas
            "sabres de luz", "lightsabers", "blasters", "armas",
            # Filmes (genérico)
            "filmes", "trilogia", "saga", "prequels", "sequels", "originais",
            # Conceitos
            "batalhas", "guerras", "clone wars", "guerras clonicas", "guerras clônicas",
            "ordem 66", "purga jedi", "queda da republica", "queda da república",
            "ascensao do imperio", "ascensão do império",
        ]
        
        text_normalized = self._normalize_text(text)
        
        # Verifica se o texto É apenas uma categoria (ou quase)
        words = text_normalized.split()
        if len(words) <= 3:  # Aumentado para capturar frases como "lado negro"
            for cat_word in category_words:
                cat_normalized = self._normalize_text(cat_word)
                if cat_normalized in text_normalized or text_normalized in cat_normalized:
                    return True
        
        return False

    def _infer_opinion_target(self, message: str) -> dict[str, str] | None:
        """
        Captura alvo explícito em perguntas de opinião:
        - "o que você acha do Luke Skywalker?"
        - "você gosta do Tatooine?"
        - "qual sua opinião sobre o episódio 4?"
        """
        raw = (message or "").strip()
        if not raw:
            return None

        lowered = raw.lower()
        if not self._is_opinion_question(lowered):
            return None

        # "acha/gosta/odeia do/da/de X" ou "opinião sobre X"
        m = re.search(r"\b(?:acha|gosta|odeia)\s+(?:do|da|de)\s+(?:o|a|os|as)?\s*(.+)$", lowered)
        if not m:
            m = re.search(r"\b(?:opini[aã]o)\s+sobre\s+(?:o|a|os|as)?\s*(.+)$", lowered)
        if not m:
            return None

        tail = raw[m.start(1) :].strip(" .!?;:")
        if not tail:
            return None

        if re.search(r"\b(epis[oó]dio|episode)\b", tail, flags=re.IGNORECASE):
            tail = re.sub(r"\b(epis[oó]dio|episode)\b", "", tail, flags=re.IGNORECASE).strip(" -:#")
            return {"type": "film", "name": tail or raw}

        if re.search(r"\b(planeta|mundo)\b", lowered):
            tail = re.sub(r"\b(planeta|mundo)\b", "", tail, flags=re.IGNORECASE).strip(" -:#")
            return {"type": "planet", "name": tail or raw}

        return {"type": "character", "name": tail}

    def _normalize_text(self, text: str) -> str:
        raw = (text or "").strip()
        if not raw:
            return ""
        raw = unicodedata.normalize("NFKD", raw)
        raw = "".join(ch for ch in raw if not unicodedata.combining(ch))
        raw = raw.lower()
        raw = re.sub(r"[^a-z0-9\s]", " ", raw)
        raw = re.sub(r"\s+", " ", raw).strip()
        return raw

    def _resolve_alias(self, name: str, entity_type: str = "character") -> str | None:
        """
        Resolve um alias para o nome canônico da entidade.
        Retorna None se não encontrar alias correspondente.
        """
        if not name:
            return None
        
        normalized = self._normalize_text(name)
        if not normalized:
            return None

        if entity_type == "character":
            return CHARACTER_ALIASES.get(normalized)
        elif entity_type == "planet":
            return PLANET_ALIASES.get(normalized)
        elif entity_type == "film":
            return FILM_ALIASES.get(normalized)
        return None

    def _extract_entity_from_question(self, message: str) -> dict[str, str] | None:
        """
        Extrai entidade de perguntas do tipo:
        - "o r2d2 é um robô?"
        - "r2-d2 é o que?"
        - "ele é um droide?"
        - "o que é o luke?"
        - "quem é obi wan?"
        """
        raw = (message or "").strip()
        if not raw:
            return None

        lowered = raw.lower()

        # Padrões para "X é um Y?" / "X é Y?" / "X é o que?"
        patterns = [
            # "o r2d2 é um robô?" / "r2d2 é um robô?"
            r"^(?:o|a|os|as)?\s*(.+?)\s+(?:e|é|eh)\s+(?:um|uma|o|a)?\s*(?:robo|robô|droide|droid|jedi|sith|humano|humana|alien|piloto|[a-z]+)\??$",
            # "o r2d2 é o que?" / "r2d2 é o quê?"
            r"^(?:o|a|os|as)?\s*(.+?)\s+(?:e|é|eh)\s+(?:o\s+)?qu[eê]\??$",
            # "o que é o r2d2?" / "o que é r2d2?"
            r"^(?:o\s+)?qu[eê]\s+(?:e|é|eh)\s+(?:o|a|os|as)?\s*(.+?)\??$",
            # "quem é o luke?" / "quem é luke?"
            r"^quem\s+(?:e|é|eh)\s+(?:o|a|os|as)?\s*(.+?)\??$",
        ]

        for pattern in patterns:
            m = re.search(pattern, lowered)
            if m:
                entity_name = m.group(1).strip()
                if entity_name and len(entity_name) > 1:
                    # Verifica se é um alias conhecido
                    for alias_name, canonical in CHARACTER_ALIASES.items():
                        if self._normalize_text(entity_name) == alias_name or alias_name in self._normalize_text(entity_name):
                            return {"type": "character", "name": canonical}
                    
                    # Tenta pelo próprio nome
                    return {"type": "character", "name": entity_name}

        return None

    def _is_category_question(self, message: str) -> tuple[str | None, str | None]:
        """
        Detecta perguntas sobre categoria de uma entidade.
        Retorna (entity_name, category_asked) ou (None, None).
        
        Ex: "o r2d2 é um robô?" -> ("r2d2", "robot")
        """
        raw = (message or "").strip()
        if not raw:
            return None, None

        lowered = raw.lower()
        
        # Detecta qual categoria está sendo perguntada
        asked_category = None
        for category, terms in CATEGORY_TERMS.items():
            for term in terms:
                if term in lowered:
                    asked_category = category
                    break
            if asked_category:
                break

        if not asked_category:
            return None, None

        # Extrai o nome da entidade da pergunta
        # Padrões: "o X é um Y?" / "X é Y?"
        patterns = [
            r"^(?:o|a|os|as)?\s*(.+?)\s+(?:e|é|eh)\s+(?:um|uma|o|a)?\s*",
            r"^(?:o|a|os|as)?\s*(.+?)\s+(?:e|é|eh)\s+",
        ]
        
        for pattern in patterns:
            m = re.match(pattern, lowered)
            if m:
                entity_name = m.group(1).strip()
                if entity_name and len(entity_name) > 1:
                    return entity_name, asked_category

        return None, None

    def _answer_category_question(self, persona: str, entity_name: str, category: str, character_data: dict | None) -> str:
        """
        Gera resposta para perguntas de categoria como "o r2d2 é um robô?".
        """
        name = character_data.get("name", entity_name) if character_data else entity_name
        canonical_name = self._resolve_alias(entity_name, "character") or name
        
        # Verifica se o personagem pertence à categoria perguntada
        categories = CHARACTER_CATEGORIES.get(canonical_name, [])
        
        # Mapeamento de categoria para respostas
        category_names_pt = {
            "robot": "um droide",
            "jedi": "um Jedi",
            "sith": "um Sith",
            "human": "um humano",
            "alien": "um alienígena",
            "wookiee": "um Wookiee",
            "pilot": "um piloto",
            "bounty_hunter": "um caçador de recompensas",
            "princess": "uma princesa",
            "senator": "um(a) senador(a)",
            "smuggler": "um contrabandista",
        }

        is_in_category = category in categories
        category_label = category_names_pt.get(category, f"um {category}")

        if persona == "yoda":
            if is_in_category:
                if category == "robot":
                    return f"Sim, {category_label} {name} é. Astromech, modelo confiável muito. Muitas missões, servido bem ele tem. Hmmm."
                return f"Sim, {category_label} {name} é. Papel importante na galáxia, desempenha. Hmmm."
            else:
                return f"Não, {category_label} {name} não é. Diferente, a natureza dele é. Hmmm."
        else:
            # Vader
            breath = self._vader_breath(entity_name)
            if is_in_category:
                if category == "robot":
                    return f"{breath} Sim, {name} é {category_label}. Uma máquina útil, quando funciona como deve."
                return f"{breath} {name} é {category_label}. Fatos são fatos."
            else:
                return f"{breath} Não. {name} não é {category_label}. Informação básica. Não perca meu tempo com perguntas óbvias."

    def _looks_like_pronoun(self, text: str | None) -> bool:
        if not text:
            return False
        t = self._normalize_text(text)
        if not t:
            return False
        return bool(re.fullmatch(r"(ele|ela|dele|dela|deles|delas|isso|disso|nisso|nele|nela)", t))

    def _message_mentions_pronoun(self, message: str) -> bool:
        text = self._normalize_text(message or "")
        if not text:
            return False
        return bool(re.search(r"\b(ele|ela|dele|dela|deles|delas|isso|disso|nisso|nele|nela)\b", text))

    def _extract_entity_from_assistant_content(self, content: str) -> dict[str, str] | None:
        """
        Extrai o último alvo a partir de respostas determinísticas do backend.
        Útil quando o contexto do usuário só tem "dele/dela".
        """
        raw = (content or "").strip()
        if not raw:
            return None

        # Remove prefixo do Vader "*pshhh... khhh*" (se existir).
        raw = re.sub(r"^\s*\*[^*]+\*\s*", "", raw).strip()

        # Personagem: "Luke Skywalker é. Gênero: ..." ou "Luke Skywalker. Gênero: ..."
        m = re.search(r"^\s*(?P<name>.+?)(?:\s+é|\.)\s*G[eê]nero\s*:", raw, flags=re.IGNORECASE)
        if m:
            return {"type": "character", "name": m.group("name").strip()}

        # Planeta: "Tatooine planeta é. Clima: ..." ou "Tatooine. Clima: ..."
        m = re.search(r"^\s*(?P<name>.+?)(?:\s+planeta\s+é|\.)\s*Clima\s*:", raw, flags=re.IGNORECASE)
        if m:
            return {"type": "planet", "name": m.group("name").strip()}

        # Filme: "Filme Uma Nova Esperança é. Episódio ..." ou "Uma Nova Esperança. Episódio ..."
        m = re.search(
            r"^\s*(?:Filme\s+)?(?P<title>.+?)(?:\s+é|\.)\s*Epis[oó]dio\s+",
            raw,
            flags=re.IGNORECASE,
        )
        if m:
            return {"type": "film", "name": m.group("title").strip()}

        return None

    def _last_entity_from_context(self, context: List) -> dict[str, str] | None:
        """
        Tenta encontrar a última entidade mencionada, priorizando mensagens do assistente
        (pois elas normalmente confirmam o match com dados do SWAPI).
        """
        for item in reversed(context or []):
            role = getattr(item, "role", "")
            content = getattr(item, "content", "")
            if role == "assistant":
                extracted = self._extract_entity_from_assistant_content(content)
                if extracted:
                    return extracted

        for item in reversed(context or []):
            if getattr(item, "role", "") != "user":
                continue
            prev = self._infer_entity_request(getattr(item, "content", ""))
            if prev and prev.get("name") and not self._looks_like_pronoun(prev.get("name")):
                return prev
        return None

    def _resolve_pronoun_from_context(self, inferred: dict[str, str], context: List) -> dict[str, str] | None:
        """
        Resolve "ele/ela/dele/dela" para a última entidade explícita mencionada no contexto.

        Ex.: usuário: "quero saber sobre o luke skywalker" -> depois "o que você acha sobre ele?"
        """
        inferred_type = inferred.get("type") or "character"

        # Primeiro tenta extrair a partir da última resposta do assistente (mais confiável).
        for item in reversed(context or []):
            if getattr(item, "role", "") != "assistant":
                continue
            extracted = self._extract_entity_from_assistant_content(getattr(item, "content", ""))
            if extracted and extracted.get("type") == inferred_type and extracted.get("name"):
                return {"type": inferred_type, "name": extracted["name"]}

        # Procura primeiro em mensagens do usuário, pois normalmente é onde o alvo foi definido.
        for item in reversed(context or []):
            if getattr(item, "role", "") != "user":
                continue
            prev = self._infer_entity_request(getattr(item, "content", ""))
            if prev and prev.get("type") == inferred_type and not self._looks_like_pronoun(prev.get("name")):
                return {"type": inferred_type, "name": prev.get("name") or ""}

            # Como fallback: tenta extrair um nome "solto" da frase anterior.
            prev_name = self._extract_entity_name(getattr(item, "content", ""))
            if prev_name and not self._looks_like_pronoun(prev_name):
                return {"type": inferred_type, "name": prev_name}

        return None

    def _is_opinion_question(self, message: str) -> bool:
        text = self._normalize_text(message or "")
        if not text:
            return False
        return bool(
            re.search(
                r"\b("
                r"o que (?:voce )?acha|"
                r"oq (?:voce )?acha|"
                r"o que c[ée] acha|"
                r"qual (?:a )?sua opini[aã]o|"
                r"sua opini[aã]o|"
                r"opini[aã]o|"
                r"(?:voce )?gosta|"
                r"(?:voce )?odeia|"
                r"(?:voce )?sente"
                r")\b",
                text,
            )
        )

    def _infer_standalone_entity(self, message: str) -> dict[str, str] | None:
        raw = (message or "").strip()
        if not raw:
            return None

        lowered = self._normalize_text(raw)
        if not lowered:
            return None

        # Evita saudações curtas e frases de comando.
        if lowered in {"oi", "ola", "olá", "eai", "e aí", "bom dia", "boa tarde", "boa noite"}:
            return None
        if any(word in lowered for word in {"fale", "conversar", "sobre", "personagem", "planeta", "filme", "episodio"}):
            return None

        # Verifica se é um alias conhecido (mesmo com 1 palavra)
        if lowered in CHARACTER_ALIASES:
            return {"type": "character", "name": CHARACTER_ALIASES[lowered]}
        if lowered in PLANET_ALIASES:
            return {"type": "planet", "name": PLANET_ALIASES[lowered]}
        if lowered in FILM_ALIASES:
            return {"type": "film", "name": FILM_ALIASES[lowered]}

        # Se parece um nome (>=2 palavras) ou um token bem "nomeável", assume personagem.
        tokens = lowered.split()
        if len(tokens) >= 2:
            return {"type": "character", "name": raw}
        
        # Mesmo com 1 palavra, se parece nome de personagem/planeta, tenta
        if len(tokens) == 1 and len(lowered) >= 3:
            # Verifica se é substring de algum alias conhecido
            for alias in CHARACTER_ALIASES:
                if lowered in alias or alias in lowered:
                    return {"type": "character", "name": CHARACTER_ALIASES[alias]}
            for alias in PLANET_ALIASES:
                if lowered in alias or alias in lowered:
                    return {"type": "planet", "name": PLANET_ALIASES[alias]}

        return None

    def _candidate_entity_queries(self, name: str, message: str) -> List[str]:
        """
        Gera tentativas de "nome" mais limpas para lookup no SWAPI.
        Ex.: name="o que voce acha do luke skywalker" -> "luke skywalker".
        """
        raw = (name or "").strip()
        if not raw:
            return []

        candidates: List[str] = [raw]

        sanitized = self._sanitize_entity_query(raw)
        if sanitized and sanitized not in candidates:
            candidates.append(sanitized)

        # Também tenta sanitizar a mensagem inteira (caso `name` tenha vindo esquisito).
        msg_sanitized = self._sanitize_entity_query((message or "").strip())
        if msg_sanitized and msg_sanitized not in candidates:
            candidates.append(msg_sanitized)

        # Heurística simples: últimas 2-3 palavras costumam ser o nome ("luke skywalker").
        toks = self._normalize_text(sanitized or raw).split()
        if len(toks) >= 2:
            tail2 = " ".join(toks[-2:])
            if tail2 and tail2 not in candidates:
                candidates.append(tail2)
        if len(toks) >= 3:
            tail3 = " ".join(toks[-3:])
            if tail3 and tail3 not in candidates:
                candidates.append(tail3)

        return candidates

    def _sanitize_entity_query(self, text: str) -> str:
        raw = (text or "").strip()
        if not raw:
            return ""

        # Remove perguntas/frames comuns (PT-BR) e preposições que atrapalham o match.
        raw = re.sub(
            r"^\s*(?:o que|oq)\s+(?:voce\s+)?(?:acha|sabe)\s+(?:do|da|de|sobre)\s+",
            "",
            raw,
            flags=re.IGNORECASE,
        )
        raw = re.sub(r"^\s*(?:qual\s+(?:a\s+)?sua\s+opini[aã]o)\s+(?:do|da|de|sobre)\s+", "", raw, flags=re.IGNORECASE)
        raw = re.sub(r"^\s*(?:sua\s+opini[aã]o)\s+(?:do|da|de|sobre)\s+", "", raw, flags=re.IGNORECASE)
        raw = re.sub(r"^\s*(?:opini[aã]o)\s+sobre\s+", "", raw, flags=re.IGNORECASE)
        raw = re.sub(r"^\s*(?:do|da|de|sobre)\s+", "", raw, flags=re.IGNORECASE)
        raw = re.sub(r"^\s*(?:o|a|os|as)\s+", "", raw, flags=re.IGNORECASE)
        return raw.strip(" .!?;:")

    def _persona_add_lore_hint(self, persona: str, data: Dict[str, Any], base: str) -> str:
        name = str(data.get("name") or "")
        norm = self._normalize_text(name)
        if not name:
            return base

        if "luke skywalker" in norm:
            if persona == "vader":
                return (
                    base
                    + " Um símbolo para rebeldes. Um risco para o Império. E um eco de escolhas antigas."
                )
            return base + " Um herói da Rebelião, tornar-se ele pôde. Jedi, o caminho buscou."

        if persona == "yoda":
            return base + " Destino, em movimento está. Ações e escolhas, mais que rótulos importam."
        return base + " O que importa é o que ele faz com esse destino."

    def _persona_opinion_about_character(self, persona: str, data: Dict[str, Any]) -> str:
        name = str(data.get("name") or "esse alguém")
        norm = self._normalize_text(name)

        if persona == "vader":
            if "luke skywalker" in norm:
                return self._persona_reply(
                    persona,
                    "Luke Skywalker... forte na Força. Impulsivo. "
                    "Uma ameaça quando indisciplinado — e um aliado inestimável quando quebrado e forjado. "
                    "Não subestime a teimosia dele. Eu não subestimo.",
                )
            if "obi wan" in norm or "obiwan" in norm or "kenobi" in norm:
                return self._persona_reply(
                    persona,
                    "Kenobi. Um fantasma que insiste em assombrar o que já foi decidido. "
                    "Honra, ele chama. Fraqueza, eu chamo.",
                )
            if "palpatine" in norm or "sidious" in norm or "imperador" in norm:
                return self._persona_reply(
                    persona,
                    "O Imperador não é um homem. É uma intenção. "
                    "E intenções como a dele devoram tudo — inclusive você, se vacilar.",
                )
            return self._persona_reply(
                persona,
                f"{name}. Se for forte, será útil. Se for fraco... será esquecido. "
                "Fatos não mudam. Sentimentos, sim.",
            )

        # Yoda
        if "luke skywalker" in norm:
            return self._persona_reply(
                persona,
                "Hmm... grande potencial, nele eu vi. Impaciente, ele era — e ainda assim, esperança trouxe. "
                "Aprender a ouvir a Força, ele precisou. E escolher, sempre precisa.",
            )
        if "anakin" in norm or "vader" in norm:
            return self._persona_reply(
                persona,
                "Tristeza grande, esse nome carrega. Medo alimentado, destino torcido foi. "
                "Mas perdido para sempre, ninguém está... se o querer verdadeiro existir.",
            )
        return self._persona_reply(
            persona,
            f"Sobre {name}, hmm... julgar rápido, perigoso é. "
            "Pelas escolhas, a sombra e a luz se mostram — e atentos, devemos estar.",
        )

    def _vader_breath(self, message: str) -> str:
        breaths = [
            "*khhh... psshhh*",
            "*pshhh... khhh*",
            "*ksssshh... khhh*",
            "*psshh... krrhh*",
        ]
        seed = zlib.adler32((message or "").encode("utf-8"))
        return breaths[seed % len(breaths)]

    def _persona_freestyle_fallback(self, persona: str, user_message: str, context: List = None) -> str:
        """
        Resposta "in-character" quando a IA está desabilitada/indisponível.
        Deve ser conversacional e desenvolver o assunto, não pedir mais detalhes.
        
        Agora usa o contexto da conversa para manter coerência.
        """
        msg = (user_message or "").strip().lower()
        seed = zlib.adler32(f"{persona}|{msg}".encode("utf-8"))
        
        # ============================================================
        # CONTEXTO DA CONVERSA - Mantém coerência com mensagens anteriores
        # ============================================================
        context_theme = None
        context_entity = None
        
        if context:
            # Tenta extrair o tema/entidade da conversa anterior
            last_entity = self._last_entity_from_context(context)
            if last_entity:
                context_entity = last_entity.get("name")
                context_theme = last_entity.get("type")
            
            # Também verifica as últimas mensagens para detectar o tema
            for item in reversed(context or [])[:5]:
                content = getattr(item, "content", "").lower()
                if not content:
                    continue
                
                # Detecta temas mencionados nas mensagens anteriores
                if any(w in content for w in ["robo", "robô", "droide", "r2", "c3po"]):
                    context_theme = context_theme or "droids"
                elif any(w in content for w in ["jedi", "cavaleiro", "mestre jedi"]):
                    context_theme = context_theme or "jedi"
                elif any(w in content for w in ["sith", "lado negro", "darth"]):
                    context_theme = context_theme or "sith"
                elif any(w in content for w in ["nave", "falcon", "x-wing"]):
                    context_theme = context_theme or "ships"
                elif any(w in content for w in ["planeta", "tatooine", "coruscant"]):
                    context_theme = context_theme or "planets"
                
                if context_theme:
                    break

        # Detecta temas na mensagem para responder de forma relevante
        # Se a mensagem é vaga mas temos contexto, usa o tema do contexto
        is_about_droids = any(w in msg for w in ["robo", "robô", "robos", "robôs", "droide", "droides", "droid", "r2", "c3po", "bb8", "astromech"]) or context_theme == "droids"
        is_about_force = any(w in msg for w in ["força", "forca", "force", "lado negro", "lado luminoso", "lado sombrio", "poderes", "midi-chlorian"])
        is_about_jedi = any(w in msg for w in ["jedi", "jedis", "cavaleiro", "padawan", "ordem jedi", "sabre de luz", "lightsaber"]) or context_theme == "jedi"
        is_about_sith = any(w in msg for w in ["sith", "siths", "lado negro", "darth", "lord sith"]) or context_theme == "sith"
        is_about_war = any(w in msg for w in ["guerra", "batalha", "luta", "conflito", "clone wars", "guerras clonicas"])
        is_about_empire = any(w in msg for w in ["império", "imperio", "imperial", "imperiais", "stormtrooper", "estrela da morte"])
        is_about_rebels = any(w in msg for w in ["rebelde", "rebeldes", "aliança", "resistencia", "resistência"])
        is_about_bounty = any(w in msg for w in ["caçador", "cacador", "bounty", "mercenario", "mercenário", "boba", "jango"])
        is_about_ships = any(w in msg for w in ["nave", "naves", "falcon", "x-wing", "tie", "destroyer", "starship"]) or context_theme == "ships"
        is_about_planets = any(w in msg for w in ["planeta", "planetas", "mundo", "tatooine", "coruscant", "naboo", "hoth", "dagobah"]) or context_theme == "planets"
        is_about_films = any(w in msg for w in ["filme", "filmes", "trilogia", "saga", "episodio", "episódio", "prequels", "sequels"])
        is_greeting = any(w in msg for w in ["oi", "olá", "ola", "eai", "bom dia", "boa tarde", "boa noite", "tudo bem", "opa", "hey", "ei"])
        is_about_destiny = any(w in msg for w in ["destino", "futuro", "escolha", "caminho", "profecia"])
        is_about_love = any(w in msg for w in ["amor", "amizade", "familia", "família", "relacionamento", "casamento"])
        is_about_death = any(w in msg for w in ["morte", "morrer", "matar", "perda", "luto", "sacrificio", "sacrifício"])
        
        # Detecta se é uma pergunta de continuidade/referência ao contexto
        is_continuation = any(w in msg for w in [
            "ele", "ela", "dele", "dela", "isso", "esse", "essa", "desse", "dessa",
            "mais", "continue", "explique", "detalhe", "como assim", "por que", "porque",
            "o que mais", "e sobre", "conte mais", "fale mais"
        ])

        if persona == "vader":
            breath = self._vader_breath(msg)
            
            # CONTINUIDADE: Se é uma referência ao contexto anterior, responde sobre a entidade
            if is_continuation and context_entity:
                entity_lower = context_entity.lower()
                # Gera resposta sobre a entidade do contexto
                if any(w in entity_lower for w in ["r2", "c3po", "bb", "droide", "ig-"]):
                    templates = [
                        f"{breath} {context_entity}... já falamos sobre droides. Máquinas são previsíveis, ao contrário de pessoas. Há algo específico que deseja saber sobre esse modelo?",
                        f"{breath} Continuando sobre {context_entity}... droides têm sua utilidade. Mas não confie demais neles. Máquinas falham. A Força nunca falha.",
                    ]
                elif any(w in entity_lower for w in ["luke", "obi", "yoda", "jedi", "mace", "qui-gon"]):
                    templates = [
                        f"{breath} {context_entity}... um nome que me traz memórias. Os Jedi sempre foram cegos para a verdade que estava diante deles. Continue sua pergunta.",
                        f"{breath} Ainda sobre {context_entity}? Os caminhos da Força são complexos. O que mais deseja saber?",
                    ]
                elif any(w in entity_lower for w in ["palpatine", "sidious", "maul", "sith", "dooku"]):
                    templates = [
                        f"{breath} {context_entity}... o Lado Negro conecta todos nós. O poder flui de formas que poucos compreendem. Continue sua pergunta.",
                        f"{breath} Ainda sobre {context_entity}? Os Sith têm segredos que duraram milênios. O que mais deseja descobrir?",
                    ]
                else:
                    templates = [
                        f"{breath} {context_entity}... lembro do que falamos. Continue sua pergunta. Minha paciência é limitada, mas estou ouvindo.",
                        f"{breath} Você ainda quer falar sobre {context_entity}? Muito bem. O que mais deseja saber?",
                    ]
                return templates[seed % len(templates)]
            
            if is_about_droids:
                templates = [
                    f"{breath} Droides... ferramentas. R2-D2 e C-3PO são persistentes, devo admitir. Máquinas não sentem medo, não hesitam — isso as torna úteis. Mas também não têm ambição. São servos perfeitos para quem sabe comandá-los.",
                    f"{breath} R2-D2, C-3PO, IG-88... cada um serve um propósito. Os astromechs são indispensáveis em combate. Os de protocolo, irritantes mas ocasionalmente úteis. Droides assassinos... esses eu respeito.",
                ]
                return templates[seed % len(templates)]
            
            if is_greeting:
                templates = [
                    f"{breath} Eu não tenho tempo para cordialidades. Mas já que está aqui... a galáxia está em constante conflito. O Império busca ordem. Os rebeldes, caos disfarçado de liberdade. De que lado você está?",
                    f"{breath} Formalidades são para os fracos. Diga-me, o que o trouxe até mim? Poucos têm coragem de se aproximar de Darth Vader.",
                ]
            elif is_about_jedi:
                templates = [
                    f"{breath} Os Jedi... eu fui um deles. Hipócritas que pregavam paz enquanto lideravam exércitos. Suprimiam emoções e chamavam isso de sabedoria. Obi-Wan, Yoda, Mace Windu... todos falharam em ver o que estava diante deles.",
                    f"{breath} Cavaleiros Jedi... guardiões de uma república corrupta. Mestres como Yoda e Windu se achavam tão superiores. E onde estão agora? A arrogância foi a ruína deles.",
                ]
            elif is_about_sith:
                templates = [
                    f"{breath} Os Sith compreendem uma verdade que os Jedi negam: paz é mentira, só existe paixão. Através da paixão, ganho força. O Imperador me mostrou o caminho. O Lado Negro não é mal — é libertação.",
                    f"{breath} Darth Sidious, Darth Maul, Darth Tyranus... e eu. Cada um de nós escolheu o poder. Os Sith não se escondem atrás de códigos morais. Somos honestos sobre o que queremos.",
                ]
            elif is_about_force:
                templates = [
                    f"{breath} A Força... ela flui através de tudo. Os Jedi a temem, tentam controlá-la com regras. O Lado Negro oferece poder verdadeiro, sem as correntes da tradição. A raiva, o medo — eles não são fraquezas. São combustível.",
                    f"{breath} Já sentiu o poder da Força? Os Jedi ensinam a suprimir emoções. Tolos. A paixão é o que nos torna fortes. O Lado Negro não é mal — é liberdade.",
                ]
            elif is_about_war or is_about_empire:
                templates = [
                    f"{breath} A guerra nunca termina. Apenas muda de forma. O Império trouxe ordem a uma galáxia em caos. Os rebeldes chamam isso de tirania, mas a paz tem seu preço. Você prefere a ilusão de liberdade ou a certeza da ordem?",
                    f"{breath} O Império não é crueldade — é necessidade. Star Destroyers, a Estrela da Morte, stormtroopers... ferramentas de paz. Ordem requer força. E eu sou essa força.",
                ]
            elif is_about_rebels:
                templates = [
                    f"{breath} Rebeldes... terroristas que se disfarçam de heróis. A Aliança Rebelde destruiu a Estrela da Morte — uma estação com milhões de vidas. E eles se chamam de libertadores?",
                    f"{breath} A Resistência, a Aliança... nomes diferentes para o mesmo caos. Eles não querem liberdade — querem poder sem responsabilidade. O Império trouxe estabilidade. Eles trazem destruição.",
                ]
            elif is_about_bounty:
                templates = [
                    f"{breath} Caçadores de recompensas... mercenários úteis. Boba Fett é eficiente e não faz perguntas. IG-88 é uma máquina implacável. Homens como eles entendem que lealdade se compra — e isso é honesto.",
                    f"{breath} Jango Fett era um guerreiro admirável. Seu filho segue os mesmos passos. Caçadores de recompensas servem a quem paga mais. Simples, direto, sem hipocrisia.",
                ]
            elif is_about_ships:
                templates = [
                    f"{breath} Naves... meu TIE Advanced é precisão e poder. A Millennium Falcon? Uma sucata que se recusa a morrer — irritante. Star Destroyers dominam os céus. Tecnologia a serviço do poder.",
                    f"{breath} X-wings, TIE Fighters, cruzadores... máquinas de guerra. Cada batalha espacial que lutei me ensinou algo. A tecnologia não vence guerras — a vontade de usá-la sim.",
                ]
            elif is_about_planets:
                templates = [
                    f"{breath} Tatooine... um deserto que eu deveria ter deixado queimar. Coruscant, o coração do poder. Mustafar, onde Anakin morreu e eu nasci. Cada planeta carrega memórias — algumas eu preferiria esquecer.",
                    f"{breath} Hoth, Endor, Naboo... mundos que a guerra tocou. Alderaan não existe mais — um lembrete do preço da rebelião. A galáxia é vasta, mas o Império alcança todos os cantos.",
                ]
            elif is_about_films:
                templates = [
                    f"{breath} A saga... minha história contada através de gerações. De Anakin Skywalker a Darth Vader. De herói a vilão. E talvez, no fim... algo entre os dois. Você já viu todos os episódios?",
                    f"{breath} Os filmes mostram apenas fragmentos da verdade. A trilogia original, as prequels, as sequels... cada uma conta parte da história. A minha história.",
                ]
            elif is_about_destiny:
                templates = [
                    f"{breath} Destino... uma palavra usada por aqueles que temem suas próprias escolhas. Eu fiz as minhas. Algumas me custaram tudo. Outras me deram poder além da imaginação. Não culpe o destino pelo que você mesmo escolhe.",
                    f"{breath} O futuro não está escrito. Ele é forjado por aqueles fortes o suficiente para moldá-lo. Os fracos se submetem ao destino. Os fortes o conquistam.",
                ]
            elif is_about_love:
                templates = [
                    f"{breath} Amor... foi minha maior fraqueza. Por Padmé, abandonei os Jedi. Por Luke, desafiei o Imperador. O amor pode destruir ou redimir. Para mim, fez ambos.",
                    f"{breath} Os Jedi proibiam amor. Talvez estivessem certos... ou talvez esse medo tenha causado minha queda. Anakin amava demais. Vader... Vader não ama nada.",
                ]
            elif is_about_death:
                templates = [
                    f"{breath} Morte... eu a distribuo com frequência. E quase a encontrei em Mustafar. Viver nesta armadura é um lembrete constante do preço das minhas escolhas. A morte não me assusta. O fracasso sim.",
                    f"{breath} Sacrifício... os Jedi falam disso como virtude. Obi-Wan se sacrificou diante de mim. Inútil. A verdadeira força é sobreviver, não morrer por uma causa.",
                ]
            else:
                templates = [
                    f"{breath} Star Wars... uma saga de escolhas. De luz e trevas. Eu já estive dos dois lados. A verdade é que não existe preto e branco — apenas tons de cinza e as consequências das decisões que fazemos.",
                    f"{breath} A galáxia é vasta. Impérios sobem e caem. Heróis se tornam vilões, e vilões às vezes encontram redenção. O que você quer saber? Tenho vivido essa história por tempo demais.",
                    f"{breath} Interessante... você busca conhecimento sobre a galáxia. Há muito a aprender — sobre a Força, sobre o Império, sobre aqueles que ousaram desafiá-lo. Pergunte, e talvez eu responda.",
                ]
            return templates[seed % len(templates)]

        # Yoda
        # CONTINUIDADE: Se é uma referência ao contexto anterior, responde sobre a entidade
        if is_continuation and context_entity:
            entity_lower = context_entity.lower()
            # Gera resposta sobre a entidade do contexto
            if any(w in entity_lower for w in ["r2", "c3po", "bb", "droide", "ig-"]):
                templates = [
                    f"Sobre {context_entity}, ainda falar deseja? Hmm. Droides, aliados valiosos são. Mais perguntas, fazer você pode.",
                    f"{context_entity}, hmm... interessado ainda você está. Contar mais, eu posso. O que saber você deseja?",
                ]
            elif any(w in entity_lower for w in ["luke", "obi", "mace", "qui-gon", "anakin"]):
                templates = [
                    f"Sobre {context_entity}, lembranças muitas tenho. Jedi importante, ele foi. Perguntar mais, você pode.",
                    f"{context_entity}... nome que memórias traz. Continuar a conversa, prazer meu é. O que mais saber você deseja?",
                ]
            elif any(w in entity_lower for w in ["vader", "palpatine", "sidious", "maul", "sith", "dooku"]):
                templates = [
                    f"Sobre {context_entity}, hmm... lado negro, dor isso traz. Mas discutir, importante é. O que mais perguntar você quer?",
                    f"{context_entity}... escuridão, esse nome representa. Mas entender o mal, evitá-lo nos ajuda. Continuar, podemos.",
                ]
            else:
                templates = [
                    f"Sobre {context_entity}, mais falar deseja? Hmm. Ouvindo, estou. Sua pergunta, fazer você pode.",
                    f"{context_entity}... interessante assunto, é. Continuar, podemos. O que mais saber você deseja? Hmmm.",
                ]
            return templates[seed % len(templates)]
        
        if is_about_droids:
            templates = [
                "Droides, hmm... subestimá-los, erro grande é! R2-D2, leal companheiro de muitas aventuras foi. Sem ele, fracassado muitas missões teriam. C-3PO, preocupado sempre está, mas útil sua tradução é. A Força neles não flui, mas importantes na galáxia são.",
                "Máquinas com personalidade, fascinante é! R2-D2, corajoso e travesso. C-3PO, ansioso mas dedicado. BB-8, espírito jovem tem. Droides, mais que ferramentas podem ser — amigos, aliados leais. Valor neles, reconhecer devemos.",
            ]
            return f"{templates[seed % len(templates)]} Hmmm."
        
        if is_greeting:
            templates = [
                "Bem-vindo, você é! Hmm... sentir a sua curiosidade, eu posso. Sobre a galáxia, muito a aprender há. A Força nos conecta a todos — Jedi, Sith, e aqueles entre luz e sombra. O que saber você deseja?",
                "Olá! Prazer em conhecê-lo, tenho. Muitos anos vivi eu, e muitas histórias presenciei. Da ascensão da República à queda dos Jedi... perguntar, você pode. Responder, tentarei.",
            ]
        elif is_about_jedi:
            templates = [
                "Os Jedi, guardiões da paz foram. Imperfeitos, sim — mas luz na escuridão representavam. Luke, Obi-Wan, Mace Windu... cada um seu caminho trilhou. Treinar jovens, minha alegria era. A Ordem caiu, mas renascer pode. Sempre.",
                "Cavaleiros Jedi, mais que sabres de luz são. Sabedoria, compaixão, equilíbrio. Padawans treinei eu, muitos. Alguns ao Lado Negro caíram... Anakin... dor ainda isso traz. Mas esperança, abandonar nunca devemos.",
            ]
        elif is_about_sith:
            templates = [
                "O Lado Negro, sedutor ele é. Poder rápido promete, mas destruição traz. Darth Sidious, manipulador supremo foi. Darth Maul, ódio puro. Vader... tristeza grande, esse nome carrega. Redimir-se, alguns conseguem. Mas difícil, o caminho é.",
                "Sith, medo e ódio usam como combustível. Forte isso os faz, mas também os consome. Equilíbrio, nunca alcançam. A Regra de Dois, sobreviver os fez. Mas no fim, destruir a si mesmos, o destino deles é.",
            ]
        elif is_about_force:
            templates = [
                "A Força, hmm... energia ela é, que todas as coisas vivas conecta. Criar, destruir, curar — tudo isso ela pode. Mas equilíbrio, o segredo é. Nem luz demais, nem escuridão. Os Sith isso não entendem. Os Jedi... às vezes também esquecem.",
                "Sentir a Força, você pode? Em tudo ela está — nas árvores, nas estrelas, em você. Medo leva à raiva, raiva leva ao ódio, ódio leva ao sofrimento. Mas amor e compaixão, à luz levam. Escolher, cada um deve.",
            ]
        elif is_about_war or is_about_empire:
            templates = [
                "Guerras, hmm... muitas eu vi. As Guerras Clônicas, manipulação de Sidious foram. A ascensão do Império, escuridão trouxe. Mas resistir, os corajosos sempre vão. Esperança, nunca morrer pode.",
                "O Império, medo e opressão representa. Stormtroopers, Star Destroyers... máquinas de guerra. Mas enfrentar gigantes, pequenos heróis podem. Luke, uma nova esperança trouxe. Coragem, tamanho não tem.",
            ]
        elif is_about_rebels:
            templates = [
                "Rebeldes, corajosos são! Contra o Império, lutar escolheram. Leia, líder forte se tornou. Han Solo, coração de herói descobriu. Juntos, impossível possível fizeram. Aliança Rebelde, esperança da galáxia foi.",
                "A Resistência, legado da Aliança carrega. Poe, Finn, Rey... nova geração de heróis. Contra a Primeira Ordem, lutar precisam. Mas enquanto luz existir, trevas vencer não podem.",
            ]
        elif is_about_bounty:
            templates = [
                "Caçadores de recompensas, perigosos são. Boba Fett, eficiente e implacável. Por dinheiro trabalham, lealdade não têm. Mas até entre eles, honra existir pode. Julgá-los todos iguais, erro seria.",
                "Jango Fett, template dos clones foi. Boba, legado do pai carrega. IG-88, Bossk, Greedo... cada um sua história tem. Mercenários, parte da galáxia são. Subestimá-los, perigoso é.",
            ]
        elif is_about_ships:
            templates = [
                "Naves espaciais, maravilhas da galáxia são! A Millennium Falcon, velha mas lendária. X-wings, esperança da Rebelião. Pilotar, nunca meu forte foi... pequeno demais para maioria, sou. Hehe.",
                "Star Destroyers, medo inspiram. Mas não pelo tamanho, guerreiro se mede. Coragem e propósito, mais importantes são. Han Solo na Falcon, frota inteira valer pode.",
            ]
        elif is_about_planets:
            templates = [
                "Planetas, diversos são! Tatooine, deserto onde heróis nascem. Dagobah, meu refúgio por anos foi. Coruscant, coração da República era. Cada mundo, histórias únicas guarda. A galáxia, vasta e bela é.",
                "Naboo, Hoth, Endor, Kashyyyk... cada um memorias traz. Alderaan, perdido foi — tragédia grande. Mas em cada planeta, vida persiste. A Força, em todos os lugares flui.",
            ]
        elif is_about_films:
            templates = [
                "A saga, épica ela é! De Anakin jovem a Luke adulto. De República a Império a Resistência. Cada trilogia, perspectiva diferente mostra. Assistir todos, eu recomendo. Muito a aprender, há.",
                "Filmes, janela para galáxia são. Trilogia original, minha introdução foi. Prequels, minha história jovem contam. Sequels, nova esperança representam. Qual sua favorita, pergunto eu?",
            ]
        elif is_about_destiny:
            templates = [
                "Destino, hmm... difícil de ver, o futuro é. Sempre em movimento ele está. Mas escolhas, mais que destino, nos definem. Anakin, grande Jedi poderia ter sido. Escolhas erradas, Vader o fizeram. Mas até para ele, redenção possível foi.",
                "O futuro, nebuloso ele é. Muitos caminhos existem. Qual seguir, escolher você deve. Medo do futuro, ao Lado Negro leva. Aceitar o presente, paz traz. Sábio conselho, este é.",
            ]
        elif is_about_love:
            templates = [
                "Amor, poderoso é. Anakin, por amor à Padmé, ao Lado Negro caiu. Mas também por amor a Luke, redimiu-se. Proibir amor, erro dos Jedi talvez foi. Equilíbrio, em tudo necessário é.",
                "Família, conexão profunda cria. Skywalkers, linhagem poderosa são. Luke e Leia, irmãos sem saber. Han e Leia, amor improvável encontraram. Laços do coração, fortes como a Força são.",
            ]
        elif is_about_death:
            templates = [
                "Morte, parte da vida é. Temer não devemos. Luminous beings we are, not this crude matter. Quando morremos, na Força nos tornamos. Obi-Wan entendeu isso. Qui-Gon, caminho da imortalidade descobriu.",
                "Perda, dor traz. Mas apegar-se demais, ao sofrimento leva. Deixar ir, aprender devemos. Aqueles que amamos, na Força sempre conosco estão. Sacrifício de heróis, honrar devemos.",
            ]
        else:
            templates = [
                "Hmm... sobre Star Wars, falar você quer? Vasto, o universo é. Jedi e Sith, planetas distantes, naves espaciais... muito a explorar há. A Força, através de tudo ela flui. Conectados, todos estamos.",
                "Curioso, você é! Bom sinal, isso é. A galáxia, cheia de mistérios está. Personagens corajosos, vilões temíveis, e aqueles que entre luz e sombra caminham. Perguntar sobre qualquer um, você pode.",
                "Interessante, sua pergunta é. Na galáxia, muitas histórias existem. De heróis que caíram e vilões que se redimiram. De amor proibido e sacrifícios nobres. Compartilhar o que sei, prazer tenho.",
            ]
        return f"{templates[seed % len(templates)]} Hmmm."

    def _persona_freestyle_about_topic(self, persona: str, topic: str) -> str:
        """
        Resposta desenvolvida sobre um tópico específico quando não há match exato no SWAPI.
        """
        topic_lower = (topic or "").strip().lower()
        seed = zlib.adler32(f"{persona}|{topic_lower}".encode("utf-8"))
        
        # Tenta identificar palavras-chave no tópico
        is_about_droid = any(w in topic_lower for w in ["robô", "robo", "droide", "droid", "r2", "c3", "bb"])
        is_about_jedi = any(w in topic_lower for w in ["jedi", "cavaleiro", "mestre", "padawan", "sabre de luz"])
        is_about_sith = any(w in topic_lower for w in ["sith", "lado negro", "darth", "imperador"])
        is_about_ship = any(w in topic_lower for w in ["nave", "ship", "falcon", "destroyer", "x-wing", "tie"])
        
        if persona == "vader":
            breath = self._vader_breath(topic)
            
            if is_about_droid:
                templates = [
                    f"{breath} Droides... ferramentas úteis quando funcionam. R2-D2 e C-3PO provaram ser mais persistentes do que eu esperava. Máquinas não sentem medo, não hesitam. Às vezes, isso as torna mais confiáveis que orgânicos.",
                    f"{breath} Droides não têm lealdade verdadeira — seguem programação. Mas alguns desenvolvem algo parecido com personalidade. Irritante, às vezes. Útil, outras.",
                ]
            elif is_about_jedi:
                templates = [
                    f"{breath} Os Jedi... eu fui um deles, uma vez. Ensinaram-me a suprimir emoções, a negar minha verdadeira natureza. Hipócritas. Pregavam paz enquanto lideravam exércitos. A Ordem caiu por suas próprias contradições.",
                    f"{breath} Cavaleiros Jedi... guardiões de uma república corrupta. Seus sabres de luz eram símbolos de uma era que precisava acabar. Alguns eram honrados. A maioria, cegos pela tradição.",
                ]
            elif is_about_sith:
                templates = [
                    f"{breath} Os Sith compreendem uma verdade que os Jedi negam: o poder é a única constante. Paz é uma mentira. A paixão nos fortalece. Através da vitória, nossas correntes são quebradas.",
                    f"{breath} O Lado Negro não é mal — é honesto. Não esconde desejos atrás de códigos morais. O Imperador me mostrou isso. Poder, verdadeiro poder, exige sacrifício.",
                ]
            elif is_about_ship:
                templates = [
                    f"{breath} Naves... a Millennium Falcon é uma sucata que se recusa a morrer. Irritante. Meu TIE Advanced, por outro lado, é precisão e poder. Uma extensão da minha vontade.",
                    f"{breath} Star Destroyers dominam os céus. Mas até a maior nave é inútil sem tripulação competente. A tecnologia não substitui determinação.",
                ]
            else:
                templates = [
                    f"{breath} '{topic}'... interessante. A galáxia é vasta e cheia de segredos. Alguns eu descobri, outros permanecem ocultos até para mim. O que especificamente você quer saber?",
                    f"{breath} Sobre isso, tenho minhas opiniões. Na minha experiência, nada na galáxia é simples. Luz e trevas se misturam em tudo. Até nos heróis. Especialmente nos heróis.",
                ]
            return templates[seed % len(templates)]
        
        # Yoda
        if is_about_droid:
            templates = [
                "Droides, hmm... subestimá-los, muitos cometem esse erro. R2-D2, leal companheiro sempre foi. Sem ele, muitas missões falhado teriam. Inteligência artificial, consciência pode desenvolver? Meditar sobre isso, interessante é.",
                "Máquinas com personalidade, fascinante é. C-3PO, sempre preocupado. R2-D2, corajoso e travesso. A Força neles não flui, mas importante papel na galáxia desempenham.",
            ]
        elif is_about_jedi:
            templates = [
                "Os Jedi, guardiões da paz foram. Imperfeitos, sim — mas luz na escuridão representavam. Treinar jovens, minha alegria era. Alguns se perderam... Anakin... dor ainda traz. Mas a Ordem, renascer pode. Sempre.",
                "Cavaleiro Jedi, mais que sabre de luz é. Sabedoria, compaixão, equilíbrio. Lutar, às vezes necessário é. Mas verdadeiro Jedi, paz busca primeiro. A Força, guia ela é, não arma.",
            ]
        elif is_about_sith:
            templates = [
                "O Lado Negro, sedutor ele é. Poder rápido promete, mas preço alto cobra. Vazio deixa no coração. Darth Sidious, manipulador supremo foi. Anakin, vítima e algoz se tornou. Triste, essa história é.",
                "Sith, medo e ódio usam como combustível. Forte isso os faz, mas também os consome. Equilíbrio, nunca alcançam. Destruir, incluindo a si mesmos, o destino deles é.",
            ]
        elif is_about_ship:
            templates = [
                "Naves espaciais, maravilhas da galáxia são! A Millennium Falcon, velha mas resistente. X-wings, esperança da Rebelião. Pilotar, nunca meu forte foi... pequeno demais para a maioria das naves, sou. Hehe.",
                "Pelo espaço viajar, aventura grande é. Star Destroyers, medo inspiram. Mas não pelo tamanho um guerreiro se mede. Coragem e propósito, mais importantes são.",
            ]
        else:
            templates = [
                f"Sobre '{topic}', refletir devo. Na galáxia, tudo conectado está. Personagens, eventos, escolhas — teia complexa formam. Específico algo saber você quer? Ajudar, tentarei.",
                f"Hmm, '{topic}'... conhecimento vasto, a galáxia contém. Oitocentos anos vivi eu, e ainda aprendendo estou. Perguntar mais, você pode. Responder com sabedoria, meu objetivo é.",
            ]
        return f"{templates[seed % len(templates)]} Hmmm."

    def _persona_reply(self, persona: str, message: str) -> str:
        msg = message.strip()
        if persona == "yoda":
            # Mantém a "assinatura" do Yoda nas respostas determinísticas.
            return f"{msg} Hmmm."
        # Vader: curto, direto; com assinatura do respirador.
        msg = msg.rstrip()
        if msg.endswith((".", "!", "?")):
            base = msg
        else:
            base = f"{msg}."
        return f"{self._vader_breath(msg)} {base}"
