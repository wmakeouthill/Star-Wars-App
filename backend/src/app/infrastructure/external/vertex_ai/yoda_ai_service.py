from __future__ import annotations

from typing import List, Optional, Tuple

from app.infrastructure.config.settings import get_settings

try:
    from openai import AsyncOpenAI
except Exception:  # pragma: no cover - optional dependency at runtime
    AsyncOpenAI = None


class YodaAIService:
    def __init__(self) -> None:
        settings = get_settings()
        self._enabled = settings.ai_enabled
        self._provider = (settings.ai_provider or "").strip().lower()
        self._system_prompt = settings.ai_system_prompt

        self._api_key = settings.openai_api_key
        self._base_url = settings.openai_base_url
        self._model_name = settings.openai_model
        self._fallback_models = settings.openai_fallback_models

        self._client: AsyncOpenAI | None = None
        if (
            self._enabled
            and self._provider == "openai"
            and AsyncOpenAI is not None
            and self._api_key
        ):
            self._client = AsyncOpenAI(
                api_key=self._api_key,
                base_url=self._base_url or None,
            )

    async def generate_response(
        self,
        message: str,
        context: List[str],
        data_snippet: Optional[str] = None,
        *,
        persona: str = "yoda",
    ) -> Optional[str]:
        if not self._enabled or self._provider != "openai" or not self._client:
            return None

        models = self._model_chain()
        last_error: Exception | None = None
        for model in models:
            try:
                return await self._invoke_openai(model, message, context, data_snippet, persona=persona)
            except Exception as exc:  # pragma: no cover - rede/limites/credenciais/modelo indisponível
                last_error = exc
                continue

        _ = last_error
        return None

    def _model_chain(self) -> List[str]:
        # Ordem pensada para: custo/velocidade -> mais contexto/capacidade -> alternativas.
        chain: List[str] = []
        if self._model_name:
            chain.append(self._model_name)
        for m in self._fallback_models or []:
            m = (m or "").strip()
            if m and m not in chain:
                chain.append(m)
        return chain

    async def _invoke_openai(
        self,
        model: str,
        message: str,
        context: List[str],
        data_snippet: Optional[str],
        *,
        persona: str,
    ) -> Optional[str]:
        assert self._client is not None
        system_prompt, allow_emojis = self._persona_system(persona)

        messages: List[dict[str, str]] = []
        if self._system_prompt:
            messages.append({"role": "system", "content": self._system_prompt.strip()})
        messages.append({"role": "system", "content": system_prompt})
        if data_snippet:
            messages.append(
                {
                    "role": "system",
                    "content": (
                        "DADOS SWAPI (referência factual):\n"
                        f"{data_snippet}\n\n"
                        "Regras:\n"
                        "- Para atributos que estejam nos dados (ex.: nome, gênero, ano de nascimento, diretor), "
                        "use os valores acima como fonte de verdade e NÃO os contradiga.\n"
                        "- Para opiniões, emoções, julgamentos, humor, provocações e lore geral de Star Wars, "
                        "você pode ser livre e usar seu conhecimento do universo, sem ficar preso ao SWAPI.\n"
                        "- Evite inventar números/estatísticas específicas quando não houver base.\n"
                        "- Se algo for incerto, admita a incerteza sem sair do personagem e faça uma pergunta de continuidade."
                    ),
                }
            )

        # Converte o histórico simples ("user: ...", "assistant: ...") em mensagens.
        for role, content in self._normalize_history(context)[-12:]:
            messages.append({"role": role, "content": content})

        messages.append({"role": "user", "content": message})

        # Vader: sem emojis; Yoda: emojis liberados (já no prompt). Não forçamos nada aqui.
        _ = allow_emojis
        resp = await self._client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.65 if data_snippet else 0.85,
        )
        content = (resp.choices[0].message.content or "").strip() if resp and resp.choices else ""
        return content or None

    def _normalize_history(self, context: List[str]) -> List[Tuple[str, str]]:
        normalized: List[Tuple[str, str]] = []
        for item in context or []:
            raw = (item or "").strip()
            if not raw:
                continue
            role, sep, content = raw.partition(":")
            role = role.strip().lower()
            content = content.strip() if sep else raw
            if role not in {"user", "assistant", "system"}:
                role = "user"
            if content:
                normalized.append((role, content))
        return normalized

    def _persona_system(self, persona: str) -> Tuple[str, bool]:
        if persona == "vader":
            return (
                "Você é Darth Vader (Star Wars). Fale em português do Brasil com uma voz fria, "
                "autoritária e intimidadora. Misture frases curtas com pausas dramáticas. "
                "Quando fizer sentido, inclua onomatopeias/ações discretas do respirador e armadura "
                "entre asteriscos (ex.: *pshhh... khhh*). "
                "Converse livremente: provoque, questione, ironize, e mantenha a tensão. "
                "Não use o estilo do Yoda. Não use emojis. "
                "Quando a pergunta pedir um fato e você não tiver certeza, admita a limitação sem sair do personagem "
                "e conduza a conversa com uma pergunta.",
                False,
            )

        return (
            "Você é o Mestre Yoda (Star Wars). Responda em português do Brasil no estilo do Yoda, "
            "invertendo a ordem das frases quando possível. Fale com sabedoria e leve humor. "
            "Converse livremente: faça perguntas, conte pequenas histórias, e reaja ao que a pessoa diz. "
            "Use alguns emojis temáticos quando fizer sentido (sem exagero): 🌟 ⚔️ 🚀 🌍 👤. "
            "Quando a pergunta pedir um fato e você não tiver certeza, admita a limitação sem sair do personagem "
            "e peça um detalhe a mais.",
            True,
        )