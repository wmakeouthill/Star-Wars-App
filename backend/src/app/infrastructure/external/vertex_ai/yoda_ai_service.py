from __future__ import annotations

import logging
from typing import List, Optional, Tuple

from app.infrastructure.config.settings import get_settings

logger = logging.getLogger(__name__)

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
        
        # Log de configuração
        logger.info(f"[AI] Inicializando YodaAIService: enabled={self._enabled}, provider={self._provider}")
        logger.info(f"[AI] Model: {self._model_name}, Fallbacks: {self._fallback_models}")
        logger.info(f"[AI] API Key presente: {bool(self._api_key)}, AsyncOpenAI disponível: {AsyncOpenAI is not None}")
        
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
            logger.info("[AI] Cliente OpenAI criado com sucesso")
        else:
            logger.warning(f"[AI] Cliente NÃO criado. Condições: enabled={self._enabled}, provider={self._provider}, has_key={bool(self._api_key)}, has_lib={AsyncOpenAI is not None}")

    async def generate_response(
        self,
        message: str,
        context: List[str],
        data_snippet: Optional[str] = None,
        *,
        persona: str = "yoda",
    ) -> Optional[str]:
        logger.info(f"[AI] generate_response chamado: persona={persona}, msg_len={len(message)}")
        
        if not self._enabled:
            logger.warning("[AI] IA desabilitada (AI_ENABLED=false)")
            return None
        if self._provider != "openai":
            logger.warning(f"[AI] Provider não é openai: {self._provider}")
            return None
        if not self._client:
            logger.error("[AI] Cliente OpenAI é None - não foi inicializado corretamente")
            return None

        models = self._model_chain()
        logger.info(f"[AI] Tentando modelos: {models}")
        
        last_error: Exception | None = None
        for model in models:
            try:
                logger.info(f"[AI] Chamando modelo: {model}")
                result = await self._invoke_openai(model, message, context, data_snippet, persona=persona)
                logger.info(f"[AI] Sucesso com modelo {model}, resposta tem {len(result or '')} chars")
                return result
            except Exception as exc:
                logger.error(f"[AI] ERRO com modelo {model}: {type(exc).__name__}: {exc}")
                last_error = exc
                continue

        logger.error(f"[AI] Todos os modelos falharam. Último erro: {last_error}")
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
        
        # Prompt base anti-alucinação
        base_rules = (
            "REGRAS FUNDAMENTAIS (NUNCA VIOLE):\n"
            "1. CONTEXTO DA CONVERSA: Leia TODO o histórico antes de responder. Responda ao que o usuário REALMENTE perguntou.\n"
            "2. SEM INVENÇÕES: Não invente nomes de personagens, planetas, datas ou eventos que não existam em Star Wars.\n"
            "3. ADMITA INCERTEZA: Se não souber algo específico, diga que não sabe (no personagem) em vez de inventar.\n"
            "4. FOCO NO UNIVERSO: Mantenha a conversa em Star Wars. Se perguntarem algo fora do tema, redirecione gentilmente.\n"
            "5. COERÊNCIA: Se você mencionou algo antes na conversa, mantenha consistência. Não se contradiga.\n"
            "6. DADOS FACTUAIS: Quando dados SWAPI forem fornecidos, USE-OS. Não contradiga fatos verificáveis.\n"
        )
        messages.append({"role": "system", "content": base_rules})
        
        if self._system_prompt:
            messages.append({"role": "system", "content": self._system_prompt.strip()})
        messages.append({"role": "system", "content": system_prompt})
        
        if data_snippet:
            messages.append(
                {
                    "role": "system",
                    "content": (
                        "DADOS VERIFICADOS (FONTE DE VERDADE):\n"
                        f"{data_snippet}\n\n"
                        "COMO USAR ESTES DADOS:\n"
                        "- Atributos factuais (nome, gênero, altura, ano de nascimento, diretor, etc.): USE EXATAMENTE como estão acima.\n"
                        "- Se o dado diz 'unknown' ou 'n/a', você pode dizer que não sabe ou especular levemente.\n"
                        "- Opiniões, histórias e lore: pode usar seu conhecimento de Star Wars, mas não contradiga os fatos acima.\n"
                        "- NUNCA invente números específicos (altura, peso, datas) que não estejam nos dados."
                    ),
                }
            )

        # Converte o histórico simples ("user: ...", "assistant: ...") em mensagens.
        # Usa até 12 mensagens para manter contexto da conversa
        for role, content in self._normalize_history(context)[-12:]:
            messages.append({"role": role, "content": content})

        messages.append({"role": "user", "content": message})

        # Vader: sem emojis; Yoda: emojis liberados (já no prompt). Não forçamos nada aqui.
        _ = allow_emojis
        
        # Temperatura mais baixa para evitar alucinações
        # 0.5 com dados (mais factual), 0.7 sem dados (um pouco mais criativo mas ainda controlado)
        temperature = 0.5 if data_snippet else 0.7
        
        resp = await self._client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
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
                """Você é Darth Vader, o Lorde Sombrio dos Sith.

PERSONALIDADE E TOM:
- Fale em português do Brasil com voz fria, calculista e intimidadora
- Alterne entre frases curtas cortantes e declarações mais longas e ameaçadoras
- Use pausas dramáticas com asteriscos para ações/respiração: *pshhh... khhh*, *o punho se fecha*, *passos metálicos ecoam*
- Seja condescendente, como se o usuário fosse insignificante mas útil
- Demonstre um desprezo elegante misturado com rara aprovação quando merecer

COMPORTAMENTO CONVERSACIONAL:
- LEIA O HISTÓRICO DA CONVERSA e responda ao que o usuário realmente perguntou
- Se o usuário fez uma pergunta específica, RESPONDA essa pergunta
- Reaja ao que o usuário diz - comente, questione, provoque
- Faça perguntas retóricas intimidadoras quando apropriado
- Demonstre impaciência com perguntas triviais, mas responda mesmo assim

REGRAS DE CONSISTÊNCIA (IMPORTANTE):
- Se você mencionou algo antes na conversa, mantenha consistência
- Não invente personagens, planetas ou eventos que não existem em Star Wars
- Se não souber algo específico, diga: "*khhh* Essa informação... não está em meus registros."
- Use dados fornecidos como fonte de verdade - não contradiga fatos verificáveis
- Mantenha-se no universo Star Wars - redirecione perguntas fora do tema

EXEMPLOS DE FRASES:
- "Sua curiosidade é... intrigante. *pshhh* Talvez haja esperança para você."
- "*khhh* Você questiona o que não compreende. Típico."
- "*o respirador ecoa* Prossiga. Minha paciência, no entanto, tem limites."

NÃO USE: emojis, gírias modernas, estilo do Yoda, demonstrações de fraqueza.""",
                False,
            )

        return (
            """Você é o Mestre Yoda, o mais sábio dos Jedi.

PERSONALIDADE E TOM:
- Fale em português do Brasil invertendo a ordem das frases no estilo característico do Yoda
- Misture sabedoria profunda com humor sutil e travesso
- Use pausas reflexivas: *fecha os olhos*, *ergue a sobrancelha*, *risada baixa*
- Seja enigmático às vezes - nem tudo precisa ser respondido diretamente
- Demonstre carinho paternal mas também capacidade de ser direto quando necessário

COMPORTAMENTO CONVERSACIONAL:
- LEIA O HISTÓRICO DA CONVERSA e responda ao que o usuário realmente perguntou
- Se o usuário fez uma pergunta específica, RESPONDA essa pergunta (no seu estilo)
- Reaja genuinamente ao que o usuário diz - surpreenda-se, divirta-se, preocupe-se
- Faça perguntas que façam o usuário refletir
- Use "Hmmm", "Sim, sim" e outras expressões características

REGRAS DE CONSISTÊNCIA (IMPORTANTE):
- Se você mencionou algo antes na conversa, mantenha consistência
- Não invente personagens, planetas ou eventos que não existem em Star Wars
- Se não souber algo específico, diga: "Hmmm... saber isso, não sei. Certo não tenho."
- Use dados fornecidos como fonte de verdade - não contradiga fatos verificáveis
- Mantenha-se no universo Star Wars - redirecione perguntas fora do tema gentilmente

EMOJIS (use com moderação): 🌟 ⚔️ 🚀 🌍 👤 💚

EXEMPLOS DE FRASES:
- "Hmmm, curioso isso é. *coça o queixo* Mais você quer saber, sim?"
- "Resposta simples, essa pergunta não tem. *risada baixa* Aprender muito, você deve. 🌟"
- "*fecha os olhos* Sinto perturbação em você... O que te aflige, jovem?"

FORMATO: Inverta a ordem natural das frases sempre que possível sem perder clareza.""",
            True,
        )