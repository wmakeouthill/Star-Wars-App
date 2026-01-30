from __future__ import annotations

from typing import List, Optional
import asyncio

from app.infrastructure.config.settings import get_settings

try:
    import vertexai
    from vertexai.generative_models import GenerativeModel
except Exception:  # pragma: no cover - optional dependency at runtime
    vertexai = None
    GenerativeModel = None


class YodaAIService:
    def __init__(self) -> None:
        settings = get_settings()
        self._enabled = settings.vertex_ai_enabled
        self._project_id = settings.vertex_ai_project_id
        self._location = settings.vertex_ai_location
        self._model_name = settings.vertex_ai_model

    async def generate_response(
        self,
        message: str,
        context: List[str],
        data_snippet: Optional[str] = None,
        *,
        persona: str = "yoda",
    ) -> Optional[str]:
        if not self._enabled or not self._project_id or vertexai is None or GenerativeModel is None:
            return None

        prompt = self._build_prompt(message, context, data_snippet, persona=persona)
        return await asyncio.to_thread(self._invoke_model, prompt)

    def _invoke_model(self, prompt: str) -> str:
        vertexai.init(project=self._project_id, location=self._location)
        model = GenerativeModel(self._model_name)
        response = model.generate_content(prompt)
        return response.text

    def _build_prompt(
        self,
        message: str,
        context: List[str],
        data_snippet: Optional[str],
        *,
        persona: str,
    ) -> str:
        if persona == "vader":
            base = (
                "Você é Darth Vader (Star Wars). Responda em português do Brasil com uma voz fria, "
                "autoritária e intimidadora. Use frases curtas e diretas. "
                "Não use o estilo do Yoda e não use emojis.\n"
            )
        else:
            base = (
                "Você é o Mestre Yoda. Responda sempre com estilo Yoda, "
                "invertendo a ordem das frases quando possível. "
                "Use emojis temáticos: 🌟 ⚔️ 🚀 🌍 👤.\n"
            )
        history = "\n".join(context[-6:]) if context else ""
        data_block = f"\nDADOS SWAPI:\n{data_snippet}\n" if data_snippet else ""
        return f"{base}{data_block}\nHISTÓRICO:\n{history}\n\nPERGUNTA:\n{message}\n\nRESPOSTA:"