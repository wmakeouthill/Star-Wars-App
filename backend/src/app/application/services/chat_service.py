from __future__ import annotations

import difflib
import json
import re
import unicodedata
import zlib
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

        if not message:
            return ChatResponse(
                message=self._persona_reply(
                    persona,
                    "Vazio está o seu pedido. Perguntar, você deve" if persona == "yoda" else "Não há nada aqui. Fale",
                )
            )

        routed = await self._route_structured_intent(persona, message, request.context)
        if routed is not None:
            return routed

        ai_message = await self._ai_response(persona, message, request.context, None)
        fallback_message = self._persona_freestyle_fallback(persona, message)
        return ChatResponse(
            message=ai_message or fallback_message,
            suggested_actions=[
                "Buscar personagens por nome",
                "Listar planetas e climas",
                "Explorar filmes por episódio",
            ],
            xp_earned=5,
        )

    async def _route_structured_intent(self, persona: str, message: str, context: List) -> ChatResponse | None:
        # Intenções "naturais" (ex.: "quero falar sobre o Luke") sem exigir palavra-chave.
        inferred = self._infer_entity_request(message)
        if inferred:
            inferred_type = inferred.get("type")
            name = inferred.get("name")
            if inferred_type == "character":
                return await self._respond_character(persona, message, context, name_override=name)
            if inferred_type == "planet":
                return await self._respond_planet(persona, message, context, name_override=name)
            if inferred_type == "film":
                return await self._respond_film(persona, message, context, name_override=name)

        lower = message.lower()
        if "personagem" in lower or "quem é" in lower:
            return await self._respond_character(persona, message, context)
        if "planeta" in lower or "mundo" in lower:
            return await self._respond_planet(persona, message, context)
        if "filme" in lower or "episódio" in lower or "episodio" in lower:
            return await self._respond_film(persona, message, context)
        return None

    async def _respond_character(
        self, persona: str, message: str, context: List, *, name_override: str | None = None
    ) -> ChatResponse:
        name = name_override or self._extract_entity_name(message)
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
        data_snippet = json.dumps({"type": "character", "swapi": data}, ensure_ascii=False, indent=2)
        response = (
            f"{match.get('name')} é. Gênero: {match.get('gender')}. "
            f"Ano de nascimento: {match.get('birth_year')}."
            if persona == "yoda"
            else f"{match.get('name')}. Gênero: {match.get('gender')}. Ano de nascimento: {match.get('birth_year')}."
        )
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
        if not name:
            return items[0] if items else None

        target = self._normalize_text(name)
        if not target:
            return items[0] if items else None

        direct = self._direct_match(items, key, target)
        if direct is not None:
            return direct

        best, best_score = self._best_fuzzy_match(items, key, target)
        return best if best_score >= 0.72 else None

    def _direct_match(self, items: List[Dict[str, Any]], key: str, target: str) -> Dict[str, Any] | None:
        for item in items:
            value = self._normalize_text(str(item.get(key, "") or ""))
            if value and target in value:
                return item
        return None

    def _best_fuzzy_match(
        self, items: List[Dict[str, Any]], key: str, target: str
    ) -> tuple[Dict[str, Any] | None, float]:
        best: Dict[str, Any] | None = None
        best_score = 0.0
        for item in items:
            value = self._normalize_text(str(item.get(key, "") or ""))
            if not value:
                continue
            score = self._fuzzy_score(target, value)
            if score > best_score:
                best_score = score
                best = item
        return best, best_score

    def _fuzzy_score(self, target: str, value: str) -> float:
        score = difflib.SequenceMatcher(a=target, b=value).ratio()
        tset = set(target.split())
        vset = set(value.split())
        if tset and vset:
            overlap = len(tset & vset) / max(1, len(tset))
            return max(score, 0.55 * score + 0.45 * overlap)
        return score

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
        """
        raw = (message or "").strip()
        if not raw:
            return None

        lowered = raw.lower()

        # Captura o trecho depois de "sobre", "do/da/de" em frases típicas.
        m = re.search(r"\b(?:falar|conversar)\s+sobre\s+(?:o|a|os|as)?\s*(.+)$", lowered)
        if not m:
            m = re.search(r"\bme\s+fale\s+(?:do|da|de)\s+(?:o|a|os|as)?\s*(.+)$", lowered)
        if not m:
            m = re.search(r"\bsobre\s+(?:o|a|os|as)?\s*(.+)$", lowered)
        if not m:
            return None

        tail = raw[m.start(1) :].strip(" .!?;:")
        if not tail:
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

    def _vader_breath(self, message: str) -> str:
        breaths = [
            "*khhh... psshhh*",
            "*pshhh... khhh*",
            "*ksssshh... khhh*",
            "*psshh... krrhh*",
        ]
        seed = zlib.adler32((message or "").encode("utf-8"))
        return breaths[seed % len(breaths)]

    def _persona_freestyle_fallback(self, persona: str, user_message: str) -> str:
        """
        Resposta "in-character" quando a IA está desabilitada/indisponível.
        """
        msg = (user_message or "").strip()
        seed = zlib.adler32(f"{persona}|{msg}".encode("utf-8"))

        if persona == "vader":
            breath = self._vader_breath(msg)
            templates = [
                f"{breath} Não desperdice meu tempo. O que você quer de verdade?",
                f"{breath} Explique. Agora.",
                f"{breath} Você veio até aqui por um motivo. Qual é?",
                f"{breath} Continue. E escolha bem suas palavras.",
            ]
            return templates[seed % len(templates)]

        # Yoda
        templates = [
            "Hmm... dizer, você pode. O que em seu coração pesa?",
            "Conversar, vamos. Sobre quem ou o quê, falar você quer?",
            "Escuto eu. Mais detalhes, dar você deve.",
            "Curioso, isso é. Por que falar disso, você quer?",
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
