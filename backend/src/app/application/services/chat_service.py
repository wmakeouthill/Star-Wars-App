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
            # Se for pergunta de opinião, não precisamos bloquear por SWAPI: respondemos in-character.
            if self._is_opinion_question(message) and name:
                ai_message = await self._ai_response(persona, message, context, None)
                response = ai_message or self._persona_opinion_about_character(persona, {"name": name})
                return ChatResponse(
                    message=response,
                    data={"name": name},
                    suggested_actions=["Buscar personagens por nome"],
                    xp_earned=5,
                )

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

        # Se parece um nome (>=2 palavras) ou um token bem "nomeável", assume personagem.
        tokens = lowered.split()
        if len(tokens) >= 2:
            return {"type": "character", "name": raw}

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
