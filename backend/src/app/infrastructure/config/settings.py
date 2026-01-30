from __future__ import annotations

import json
from functools import lru_cache
from typing import Any

from pydantic import Field, field_validator
from pydantic.fields import FieldInfo
from pydantic_settings import BaseSettings, PydanticBaseSettingsSource, SettingsConfigDict


class _CorsLenientJsonSource(PydanticBaseSettingsSource):
    """
    Wrapper de SettingsSource que evita o json.loads automático do pydantic-settings
    especificamente para o campo `cors_allow_origins`.

    Motivo: em `pydantic-settings==2.1.0`, campos complexos como `list[str]` são
    decodificados como JSON no source. Se a variável vier como CSV
    (ex.: "http://a,http://b"), isso falha ANTES do validator do Pydantic rodar,
    gerando `SettingsError`.
    """

    def __init__(self, inner: PydanticBaseSettingsSource) -> None:
        super().__init__(inner.settings_cls)
        self._inner = inner

    def get_field_value(self, field: FieldInfo, field_name: str) -> tuple[Any, str, bool]:
        return self._inner.get_field_value(field, field_name)

    def prepare_field_value(
        self,
        field_name: str,
        field: FieldInfo,
        value: Any,
        value_is_complex: bool,
    ) -> Any:
        if field_name == "cors_allow_origins" and isinstance(value, str):
            return value
        return self._inner.prepare_field_value(field_name, field, value, value_is_complex)

    def __call__(self) -> dict[str, Any]:
        """
        Implementa o contrato do SettingsSource.

        A ideia aqui é replicar o comportamento padrão do source:
        - extrair valor por campo (get_field_value)
        - preparar (prepare_field_value)
        - retornar apenas campos encontrados/preparados
        """
        data: dict[str, Any] = {}
        for field_name, field in self.settings_cls.model_fields.items():
            value, key, value_is_complex = self.get_field_value(field, field_name)
            prepared = self.prepare_field_value(field_name, field, value, value_is_complex)
            if prepared is not None:
                data[key] = prepared
        return data


class Settings(BaseSettings):
    app_name: str = "Holocron Analytics API"
    app_version: str = "0.1.0"
    swapi_base_url: str = "https://swapi.dev/api"
    cache_ttl_seconds: int = 3600
    vertex_ai_enabled: bool = False
    vertex_ai_project_id: str | None = None
    vertex_ai_location: str = "us-central1"
    vertex_ai_model: str = "gemini-1.5-pro"
    cors_allow_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]
    )

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: type[BaseSettings],
        init_settings: PydanticBaseSettingsSource,
        env_settings: PydanticBaseSettingsSource,
        dotenv_settings: PydanticBaseSettingsSource,
        file_secret_settings: PydanticBaseSettingsSource,
    ) -> tuple[PydanticBaseSettingsSource, ...]:
        return (
            init_settings,
            _CorsLenientJsonSource(env_settings),
            _CorsLenientJsonSource(dotenv_settings),
            file_secret_settings,
        )

    @field_validator("cors_allow_origins", mode="before")
    @classmethod
    def _parse_cors_allow_origins(cls, v: Any) -> list[str]:
        """
        Aceita:
        - lista real (ex.: ["http://localhost:5173"])
        - string JSON (ex.: '["http://localhost:5173"]')
        - string CSV (ex.: "http://localhost:5173,http://127.0.0.1:5173")
        """
        if v is None:
            return []
        if isinstance(v, list):
            return [str(x).strip() for x in v if str(x).strip()]
        if isinstance(v, str):
            raw = v.strip()
            if not raw:
                return []
            try:
                parsed = json.loads(raw)
            except json.JSONDecodeError:
                parsed = None

            if isinstance(parsed, list):
                return [str(x).strip() for x in parsed if str(x).strip()]
            if isinstance(parsed, str):
                raw = parsed.strip()
                if not raw:
                    return []
            return [item.strip() for item in raw.split(",") if item.strip()]

        if isinstance(v, (tuple, set)):
            return [str(x).strip() for x in v if str(x).strip()]

        raise TypeError("cors_allow_origins deve ser uma lista ou string (JSON/CSV).")


@lru_cache
def get_settings() -> Settings:
    return Settings()
