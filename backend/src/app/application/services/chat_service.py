from __future__ import annotations

from typing import Any, Dict, List, Optional

from app.domain.repositories.swapi_client import ISWAPIClient
from app.domain.schemas.chat import ChatRequest, ChatResponse
from app.infrastructure.external.swapi.client import extract_id
from app.infrastructure.external.vertex_ai.yoda_ai_service import YodaAIService


class ChatService:
    def __init__(self, swapi_client: ISWAPIClient, yoda_ai: YodaAIService | None = None) -> None:
        self._swapi = swapi_client
        self._yoda_ai = yoda_ai

    async def process_message(self, request: ChatRequest) -> ChatResponse:
        persona = getattr(request, "persona", "yoda")
        message = request.message.strip()
        lower = message.lower()

        if not message:
            return ChatResponse(
                message=self._persona_reply(
                    persona,
                    "Vazio está o seu pedido. Perguntar, você deve" if persona == "yoda" else "Não há nada aqui. Fale",
                )
            )

        if "personagem" in lower or "quem é" in lower:
            return await self._respond_character(persona, message, request.context)
        if "planeta" in lower or "mundo" in lower:
            return await self._respond_planet(persona, message, request.context)
        if "filme" in lower or "episódio" in lower or "episodio" in lower:
            return await self._respond_film(persona, message, request.context)

        fallback_message = self._persona_reply(
            persona,
            "Pergunta ampla, essa é. Tentar por personagem, planeta ou filme, você pode"
            if persona == "yoda"
            else "Seja específico. Personagem, planeta ou filme — escolha um",
        )
        ai_message = await self._ai_response(persona, message, request.context, None)
        return ChatResponse(
            message=ai_message or fallback_message,
            suggested_actions=[
                "Buscar personagens por nome",
                "Listar planetas e climas",
                "Explorar filmes por episódio",
            ],
            xp_earned=5,
        )

    async def _respond_character(self, persona: str, message: str, context: List) -> ChatResponse:
        name = self._extract_entity_name(message)
        people = await self._swapi.get_all_people()
        match = self._find_match(people, name)
        if not match:
            return ChatResponse(
                message=self._persona_reply(
                    persona,
                    "Encontrar este personagem, eu não consegui. Outro nome, tente"
                    if persona == "yoda"
                    else "Não encontrei esse personagem. Tente outro nome",
                ),
                suggested_actions=["Listar personagens", "Filtrar por gênero"],
                xp_earned=3,
            )

        data = {
            "id": extract_id(match.get("url", "")),
            "name": match.get("name"),
            "gender": match.get("gender"),
            "birth_year": match.get("birth_year"),
        }
        response = (
            f"{match.get('name')} é. Gênero: {match.get('gender')}. "
            f"Ano de nascimento: {match.get('birth_year')}."
            if persona == "yoda"
            else f"{match.get('name')}. Gênero: {match.get('gender')}. Ano de nascimento: {match.get('birth_year')}."
        )
        ai_message = await self._ai_response(persona, message, context, response)
        return ChatResponse(
            message=ai_message or self._persona_reply(persona, response),
            data=data,
            suggested_actions=["Ver detalhes do personagem", "Comparar personagens"],
            xp_earned=10,
        )

    async def _respond_planet(self, persona: str, message: str, context: List) -> ChatResponse:
        name = self._extract_entity_name(message)
        planets = await self._swapi.get_all_planets()
        match = self._find_match(planets, name)
        if not match:
            return ChatResponse(
                message=self._persona_reply(
                    persona,
                    "Planeta esse, desconhecido é. Tentar outro, você deve"
                    if persona == "yoda"
                    else "Não reconheço esse planeta. Tente outro",
                ),
                suggested_actions=["Listar planetas", "Filtrar por clima"],
                xp_earned=3,
            )

        data = {
            "id": extract_id(match.get("url", "")),
            "name": match.get("name"),
            "climate": match.get("climate"),
            "terrain": match.get("terrain"),
        }
        response = (
            f"{match.get('name')} planeta é. Clima: {match.get('climate')}. "
            f"Terreno: {match.get('terrain')}."
            if persona == "yoda"
            else f"{match.get('name')}. Clima: {match.get('climate')}. Terreno: {match.get('terrain')}."
        )
        ai_message = await self._ai_response(persona, message, context, response)
        return ChatResponse(
            message=ai_message or self._persona_reply(persona, response),
            data=data,
            suggested_actions=["Ver personagens do planeta", "Explorar planetas similares"],
            xp_earned=10,
        )

    async def _respond_film(self, persona: str, message: str, context: List) -> ChatResponse:
        name = self._extract_entity_name(message)
        films = await self._swapi.get_all_films()
        match = self._find_match(films, name, key="title")
        if not match:
            return ChatResponse(
                message=self._persona_reply(
                    persona,
                    "Filme esse, encontrar não pude. Título outro, tente"
                    if persona == "yoda"
                    else "Não encontrei esse filme. Tente outro título",
                ),
                suggested_actions=["Listar filmes", "Ordenar por episódio"],
                xp_earned=3,
            )

        data = {
            "id": extract_id(match.get("url", "")),
            "title": match.get("title"),
            "episode_id": match.get("episode_id"),
            "director": match.get("director"),
        }
        response = (
            f"Filme {match.get('title')} é. Episódio {match.get('episode_id')}, "
            f"diretor {match.get('director')}."
            if persona == "yoda"
            else f"{match.get('title')}. Episódio {match.get('episode_id')}. Diretor: {match.get('director')}."
        )
        ai_message = await self._ai_response(persona, message, context, response)
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
        if not name:
            return items[0] if items else None
        lowered = name.lower()
        for item in items:
            value = str(item.get(key, "")).lower()
            if lowered in value:
                return item
        return None

    def _extract_entity_name(self, message: str) -> Optional[str]:
        tokens = message.split()
        if len(tokens) <= 1:
            return None
        return " ".join(tokens[1:]).strip()

    def _persona_reply(self, persona: str, message: str) -> str:
        msg = message.strip()
        if persona == "yoda":
            # Mantém a "assinatura" do Yoda nas respostas determinísticas.
            return f"{msg} Hmmm."
        # Vader: curto, direto; sem tique de Yoda.
        msg = msg.rstrip()
        if msg.endswith((".", "!", "?")):
            return msg
        return f"{msg}."
