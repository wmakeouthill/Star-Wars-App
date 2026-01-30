# Regras de Desenvolvimento Backend - Stack Python

Este documento estabelece as regras, princípios e padrões para o desenvolvimento backend de APIs Python, equivalente ao documento de regras Java/Spring Boot.

---

## 1. Clean Architecture

### 1.1 Princípios Fundamentais

A arquitetura segue os princípios da Clean Architecture combinados com DDD (Domain-Driven Design):

- **Independência de Frameworks**: O domínio não depende de frameworks externos
- **Testabilidade**: Regras de negócio testáveis sem UI, banco de dados ou serviços externos
- **Independência de UI**: A interface pode mudar sem alterar o restante do sistema
- **Independência de Banco de Dados**: PostgreSQL pode ser trocado sem afetar regras de negócio
- **Independência de Agentes Externos**: Regras de negócio não conhecem o mundo externo

### 1.2 Camadas da Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                        INTERFACES                                │
│  (Routers FastAPI, Controllers, APIs)                           │
│  - Recebe requisições externas                                  │
│  - Converte dados de entrada/saída                              │
│  - Delega para camada de aplicação                              │
├─────────────────────────────────────────────────────────────────┤
│                        APPLICATION                               │
│  (Services / Use Cases)                                         │
│  - Orquestra fluxo de negócio                                   │
│  - Coordena entidades e serviços de domínio                     │
│  - Não contém regras de negócio                                 │
├─────────────────────────────────────────────────────────────────┤
│                         DOMAIN                                   │
│  (Entities, Schemas, Enums, Repositories, Domain Services)      │
│  - Contém regras de negócio                                     │
│  - Entidades ricas com comportamento                            │
│  - Interfaces de repositório (não implementações)               │
├─────────────────────────────────────────────────────────────────┤
│                     INFRASTRUCTURE                               │
│  (Config, Database, External Services, Implementations)         │
│  - Implementações técnicas                                      │
│  - Configurações de framework                                   │
│  - Adaptadores para serviços externos                           │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Estrutura de Pacotes

```
src/
├── app/
│   ├── domain/                     # NÚCLEO - Regras de negócio
│   │   ├── entities/               # Entidades de domínio (SQLAlchemy models)
│   │   ├── schemas/                # Pydantic schemas (DTOs)
│   │   ├── enums/                  # Enumerações do domínio
│   │   ├── exceptions/             # Exceções de negócio
│   │   ├── repositories/           # Interfaces de repositório (ABCs)
│   │   └── value_objects/          # Value Objects
│   │
│   ├── application/                # CASOS DE USO - Orquestração
│   │   └── services/               # Serviços de aplicação
│   │
│   ├── infrastructure/             # ADAPTADORES - Implementações técnicas
│   │   ├── config/                 # Configurações (Settings)
│   │   ├── database/               # Conexão e sessão do banco
│   │   ├── repositories/           # Implementações de repositório
│   │   ├── external/               # Clientes HTTP externos
│   │   └── security/               # JWT, OAuth2, etc.
│   │
│   ├── interfaces/                 # INTERFACE - Entrada/Saída
│   │   └── api/
│   │       ├── v1/                 # Routers versão 1
│   │       │   ├── routers/        # Endpoints
│   │       │   └── dependencies/   # Dependências de injeção
│   │       └── v2/                 # Routers versão 2
│   │
│   └── main.py                     # Ponto de entrada da aplicação
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── conftest.py
│
├── alembic/                        # Migrations
├── pyproject.toml                  # Configuração Poetry
└── docker-compose.yml
```

### 1.4 Regra de Dependência

As dependências apontam SEMPRE para dentro (em direção ao domínio):

```
interfaces → application → domain ← infrastructure
```

- **interfaces** pode importar de: `application`, `domain`
- **application** pode importar de: `domain`
- **infrastructure** pode importar de: `domain`
- **domain** NÃO importa de nenhuma outra camada

### 1.5 Exemplo Real: Módulo Operação

**Domain (Entidade SQLAlchemy):**

```python
# domain/entities/operacao.py
from sqlalchemy import Column, String, Date, Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import relationship
from app.infrastructure.database.base import Base
from app.domain.enums import SituacaoOperacao
from datetime import date
from typing import Optional

class Operacao(Base):
    __tablename__ = "operacoes"
    
    id = Column(String, primary_key=True)
    numero_operacao = Column(String(20), nullable=False, index=True)
    data_movimento = Column(Date, nullable=False)
    situacao = Column(SQLEnum(SituacaoOperacao), nullable=False)
    
    # Relacionamentos
    comandos = relationship("ComandoOperacao", back_populates="operacao", lazy="selectin")
    
    # COMPORTAMENTO NO DOMÍNIO - Entidade Rica
    def preencher_atributos_agregados(self) -> None:
        """Preenche atributos calculados a partir dos comandos."""
        if self.comandos:
            comando_cedente = next(
                (cmd for cmd in self.comandos if cmd.is_cedente), None
            )
            if comando_cedente:
                self._chave_associacao_cedente = comando_cedente.chave_operacao_associada
    
    @property
    def is_ativa(self) -> bool:
        """Verifica se operação está ativa."""
        return self.situacao == SituacaoOperacao.ATIVA
    
    @property
    def is_pendente(self) -> bool:
        """Verifica se operação está pendente."""
        return self.situacao in [
            SituacaoOperacao.PENDENTE_LANCAMENTO,
            SituacaoOperacao.PENDENTE_OPERACAO
        ]
```

**Domain (Schema/DTO Pydantic):**

```python
# domain/schemas/operacao.py
from pydantic import BaseModel, Field, ConfigDict
from datetime import date
from typing import Optional, List
from app.domain.enums import SituacaoOperacao

class OperacaoBase(BaseModel):
    numero_operacao: str = Field(..., min_length=1, max_length=20)
    data_movimento: date
    situacao: SituacaoOperacao

class OperacaoCreate(OperacaoBase):
    pass

class OperacaoUpdate(BaseModel):
    situacao: Optional[SituacaoOperacao] = None

class OperacaoResponse(OperacaoBase):
    id: str
    chave_associacao_cedente: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class FiltroOperacao(BaseModel):
    numero_operacao: Optional[str] = None
    codigo_operacao: Optional[str] = None
    data_movimento: Optional[date] = None
    situacao: Optional[SituacaoOperacao] = None

class ResultadoPaginado(BaseModel):
    dados: List[OperacaoResponse]
    total: int
    pagina: int
    total_paginas: int
```

**Domain (Repository Interface - ABC):**

```python
# domain/repositories/operacao_repository.py
from abc import ABC, abstractmethod
from typing import List, Optional
from datetime import date
from app.domain.entities.operacao import Operacao
from app.domain.enums import SituacaoOperacao

class IOperacaoRepository(ABC):
    """Interface do repositório de operações."""
    
    @abstractmethod
    async def find_by_id(self, id: str) -> Optional[Operacao]:
        pass
    
    @abstractmethod
    async def find_by_data_movimento(self, data: date) -> List[Operacao]:
        pass
    
    @abstractmethod
    async def find_by_numero_and_data_and_situacoes(
        self,
        numero_operacao: str,
        data_movimento: date,
        situacoes: List[SituacaoOperacao]
    ) -> Optional[Operacao]:
        pass
    
    @abstractmethod
    async def find_pendentes_antes_horario_limite(
        self,
        situacoes: List[SituacaoOperacao],
        data_movimento: date,
        horario_limite: datetime
    ) -> List[Operacao]:
        pass
    
    @abstractmethod
    async def save(self, operacao: Operacao) -> Operacao:
        pass
```

**Infrastructure (Repository Implementation):**

```python
# infrastructure/repositories/operacao_repository_impl.py
from typing import List, Optional
from datetime import date, datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.entities.operacao import Operacao
from app.domain.repositories.operacao_repository import IOperacaoRepository
from app.domain.enums import SituacaoOperacao

class OperacaoRepository(IOperacaoRepository):
    """Implementação do repositório de operações."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def find_by_id(self, id: str) -> Optional[Operacao]:
        result = await self.session.execute(
            select(Operacao).where(Operacao.id == id)
        )
        return result.scalar_one_or_none()
    
    async def find_by_data_movimento(self, data: date) -> List[Operacao]:
        result = await self.session.execute(
            select(Operacao).where(Operacao.data_movimento == data)
        )
        return list(result.scalars().all())
    
    async def find_by_numero_and_data_and_situacoes(
        self,
        numero_operacao: str,
        data_movimento: date,
        situacoes: List[SituacaoOperacao]
    ) -> Optional[Operacao]:
        result = await self.session.execute(
            select(Operacao)
            .where(Operacao.numero_operacao == numero_operacao)
            .where(Operacao.data_movimento == data_movimento)
            .where(Operacao.situacao.in_(situacoes))
        )
        return result.scalar_one_or_none()
    
    async def save(self, operacao: Operacao) -> Operacao:
        self.session.add(operacao)
        await self.session.commit()
        await self.session.refresh(operacao)
        return operacao
```

**Application (Service):**

```python
# application/services/operacao_service.py
from typing import List, Optional
from datetime import date, datetime, time
from app.domain.repositories.operacao_repository import IOperacaoRepository
from app.domain.schemas.operacao import OperacaoResponse, FiltroOperacao
from app.domain.enums import SituacaoOperacao
from app.infrastructure.external.grade_client import IGradeClient
from app.infrastructure.external.configuracao_client import IConfiguracaoClient

class OperacaoService:
    """Serviço de aplicação para operações."""
    
    def __init__(
        self,
        operacao_repository: IOperacaoRepository,
        grade_client: IGradeClient,
        configuracao_client: IConfiguracaoClient
    ):
        self.operacao_repository = operacao_repository
        self.grade_client = grade_client
        self.configuracao_client = configuracao_client
    
    async def recuperar_operacoes_expiraveis_por_tempo(self) -> List[OperacaoResponse]:
        """Recupera operações que estão prestes a expirar."""
        # Obtém data de movimento de serviço externo
        data_movimento = await self.grade_client.obter_data_movimento()
        
        # Obtém configurações
        intervalo_limite = await self.configuracao_client.recuperar_intervalo_pendencia()
        horario_limite = self._calcular_horario_limite(intervalo_limite)
        
        # Busca operações
        situacoes_pendentes = SituacaoOperacao.get_situacoes_pendentes()
        operacoes = await self.operacao_repository.find_pendentes_antes_horario_limite(
            situacoes_pendentes,
            data_movimento,
            horario_limite
        )
        
        # Enriquece entidades
        for operacao in operacoes:
            operacao.preencher_atributos_agregados()
        
        return [OperacaoResponse.model_validate(op) for op in operacoes]
    
    async def consultar_informacoes_operacao(
        self,
        numero_operacao: str,
        data_movimento: date,
        identificacao_emissor: str
    ) -> Optional[OperacaoResponse]:
        """Consulta informações de uma operação específica."""
        situacoes_validas = SituacaoOperacao.get_situacoes_validas()
        
        operacao = await self.operacao_repository.find_by_numero_and_data_and_situacoes(
            numero_operacao,
            data_movimento,
            situacoes_validas
        )
        
        if not operacao:
            return None
        
        return OperacaoResponse.model_validate(operacao)
    
    def _calcular_horario_limite(self, intervalo: time) -> datetime:
        return datetime.now() - timedelta(seconds=intervalo.hour * 3600 + intervalo.minute * 60)
```

**Interfaces (Router/Controller):**

```python
# interfaces/api/v1/routers/operacao_router.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional
from datetime import date
from app.application.services.operacao_service import OperacaoService
from app.domain.schemas.operacao import OperacaoResponse, FiltroOperacao
from app.interfaces.api.v1.dependencies.auth import get_current_user, require_permission
from app.interfaces.api.v1.dependencies.services import get_operacao_service

router = APIRouter(prefix="/operacao", tags=["Operação"])

@router.get(
    "/expiraveis-por-tempo",
    response_model=List[OperacaoResponse],
    summary="Consulta operações expiráveis por tempo",
    responses={
        200: {"description": "Lista de operações recuperada com sucesso"},
        401: {"description": "Não autorizado"},
        403: {"description": "Permissão negada"},
    }
)
async def recuperar_operacoes_expiraveis(
    service: OperacaoService = Depends(get_operacao_service),
    _: dict = Depends(require_permission("RECUPERAR_OPERACOES_EXPIRAVEIS"))
) -> List[OperacaoResponse]:
    return await service.recuperar_operacoes_expiraveis_por_tempo()

@router.get(
    "/info",
    response_model=OperacaoResponse,
    summary="Consulta informações de uma operação",
    responses={
        200: {"description": "Operação encontrada"},
        404: {"description": "Operação não encontrada"},
    }
)
async def consultar_informacoes_operacao(
    numero_operacao: str = Query(..., description="Número da operação"),
    data_movimento: date = Query(..., description="Data de movimento"),
    identificacao_emissor: str = Query(..., description="Identificação do emissor"),
    service: OperacaoService = Depends(get_operacao_service),
    _: dict = Depends(require_permission("RECUPERAR_INFORMACOES_OPERACAO"))
) -> OperacaoResponse:
    result = await service.consultar_informacoes_operacao(
        numero_operacao, data_movimento, identificacao_emissor
    )
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Operação não encontrada"
        )
    return result
```

**Interfaces (Dependency Injection):**

```python
# interfaces/api/v1/dependencies/services.py
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.infrastructure.database.session import get_session
from app.infrastructure.repositories.operacao_repository_impl import OperacaoRepository
from app.infrastructure.external.grade_client import GradeClient
from app.infrastructure.external.configuracao_client import ConfiguracaoClient
from app.application.services.operacao_service import OperacaoService

async def get_operacao_service(
    session: AsyncSession = Depends(get_session)
) -> OperacaoService:
    """Factory para criar o serviço de operação com suas dependências."""
    operacao_repository = OperacaoRepository(session)
    grade_client = GradeClient()
    configuracao_client = ConfiguracaoClient()
    
    return OperacaoService(
        operacao_repository=operacao_repository,
        grade_client=grade_client,
        configuracao_client=configuracao_client
    )
```

### 1.6 Validação Arquitetural (ArchUnit)

Para garantir que a arquitetura seja respeitada (ex: domínio não importa infraestrutura), utilizamos `pytest-archon` ou `import-linter`.

**Exemplo com pytest-archon:**

```python
# tests/unit/test_architecture.py
from pytest_archon import archrule

def test_domain_independence():
    (
        archrule("domain_independence")
        .match("app.domain.*")
        .should_not_import("app.infrastructure.*")
        .should_not_import("app.application.*")
        .should_not_import("app.interfaces.*")
        .check("app")
    )

def test_layer_dependencies():
    (
        archrule("layer_dependencies")
        .match("app.application.*")
        .should_import("app.domain.*")  # Deve usar domínio
        .should_not_import("app.infrastructure.*")  # Não deve depender de implementação concreta
        .check("app")
    )
```

---

## 2. Arquitetura de Microsserviços

### 2.1 Princípios

- Cada microsserviço tem um propósito único e bem definido
- Comunicação via REST APIs (httpx) ou mensageria (RabbitMQ/Redis)
- Padrão Database per Service - cada serviço possui seu próprio banco

### 2.2 Nomenclatura de Projetos

- Nome descritivo em kebab-case: `operacao-api`, `calendario-api`, `arquivo-service`
- Package name em snake_case: `operacao_api`, `calendario_api`

---

## 3. Stack Tecnológica

| Tecnologia     | Versão | Propósito                     |
| -------------- | ------ | ----------------------------- |
| Python         | 3.12+  | Linguagem principal           |
| FastAPI        | 0.109+ | Framework de API              |
| Pydantic       | 2.x    | Validação e serialização      |
| SQLAlchemy     | 2.x    | ORM                           |
| Alembic        | 1.13+  | Migrations de banco           |
| PostgreSQL     | 16+    | Banco de dados principal      |
| pytest         | 8.x    | Framework de testes           |
| pytest-asyncio | 0.23+  | Testes assíncronos            |
| httpx          | 0.27+  | Cliente HTTP                  |
| python-jose    | 3.3+   | JWT                           |
| passlib/bcrypt | -      | Criptografia de senhas        |
| Poetry         | 1.8+   | Gerenciamento de dependências |

### 3.1 Dependências Recomendadas (pyproject.toml)

```toml
[tool.poetry.dependencies]
python = "^3.12"
fastapi = "^0.109.0"
uvicorn = {extras = ["standard"], version = "^0.27.0"}
pydantic = "^2.6.0"
pydantic-settings = "^2.1.0"
sqlalchemy = {extras = ["asyncio"], version = "^2.0.25"}
asyncpg = "^0.29.0"
alembic = "^1.13.1"
python-jose = {extras = ["cryptography"], version = "^3.3.0"}
passlib = {extras = ["bcrypt"], version = "^1.7.4"}
httpx = "^0.27.0"

[tool.poetry.group.dev.dependencies]
pytest = "^8.0.0"
pytest-asyncio = "^0.23.0"
pytest-cov = "^4.1.0"
pytest-mock = "^3.12.0"
httpx = "^0.27.0"
ruff = "^0.2.0"
mypy = "^1.8.0"
```

---

## 4. Padrões de Código

### 4.1 Entidades SQLAlchemy

```python
from sqlalchemy import Column, String, Date, DateTime, Numeric, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.infrastructure.database.base import Base
from app.domain.enums import SituacaoOperacao
from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List

class Operacao(Base):
    """Entidade de Operação."""
    
    __tablename__ = "operacoes"
    
    # Chave primária
    id = Column(String(36), primary_key=True)
    
    # Campos de negócio
    numero_operacao = Column(String(20), nullable=False, index=True, comment="Número da operação")
    data_movimento = Column(Date, nullable=False, comment="Data do movimento")
    situacao = Column(SQLEnum(SituacaoOperacao), nullable=False, comment="Situação da operação")
    valor_financeiro = Column(Numeric(18, 2), nullable=True, comment="Valor financeiro")
    
    # Auditoria
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relacionamentos
    comandos = relationship("ComandoOperacao", back_populates="operacao", lazy="selectin")
    
    # Métodos de domínio
    def is_valida(self) -> bool:
        """Verifica se a operação é válida."""
        return self.situacao in SituacaoOperacao.get_situacoes_validas()

### 4.2 Nomenclatura de Banco de Dados

Para manter consistência com o legado Oracle/Java, adotamos as seguintes convenções de nomenclatura no SQLAlchemy:

- **Tabelas**: `SEL_{SIGLA}_{NOME}` (ex: `SEL_OPE_OPERACAO`)
- **Colunas**: Prefixo semântico de 3 letras
  - `TXT_`: Texto (ex: `TXT_DESCRICAO`)
  - `DAT_`: Data/Hora (ex: `DAT_MOVIMENTO`)
  - `NUM_`: Número (ex: `NUM_OPERACAO`)
  - `VAL_`: Valor Monetário (ex: `VAL_FINANCEIRO`)
  - `COD_`: Código/Enum (ex: `COD_SITUACAO`)
  - `ID_`: Identificador (ex: `ID_OPERACAO`)

**Exemplo de Mapeamento:**
```python
class Operacao(Base):
    __tablename__ = "SEL_OPE_OPERACAO"
    
    id = Column("ID_OPERACAO", String(36), primary_key=True)
    numero_operacao = Column("NUM_OPERACAO", String(20), nullable=False)
    data_movimento = Column("DAT_MOVIMENTO", Date, nullable=False)
    descricao = Column("TXT_DESCRICAO", String(100))
    valor = Column("VAL_FINANCEIRO", Numeric(18, 2))
```

```

**Regras:**
- Usar `Column` com tipos explícitos
- Comentários via `comment=` para documentação
- Usar `Enum` do SQLAlchemy para enumerações
- Usar `Decimal` para valores monetários
- Implementar métodos de negócio na entidade (Rich Domain Model)

### 4.2 Schemas (DTOs) Pydantic

```python
from pydantic import BaseModel, Field, field_validator, ConfigDict
from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from enum import Enum

class OperacaoBase(BaseModel):
    """Schema base para operação."""
    numero_operacao: str = Field(..., min_length=1, max_length=20, description="Número da operação")
    data_movimento: date = Field(..., description="Data do movimento")
    valor_financeiro: Optional[Decimal] = Field(None, ge=0, description="Valor financeiro")

class OperacaoCreate(OperacaoBase):
    """Schema para criação de operação."""
    pass

class OperacaoUpdate(BaseModel):
    """Schema para atualização de operação."""
    situacao: Optional[SituacaoOperacao] = None
    valor_financeiro: Optional[Decimal] = Field(None, ge=0)

class OperacaoResponse(OperacaoBase):
    """Schema de resposta de operação."""
    id: str
    situacao: SituacaoOperacao
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
```

### 4.3 Serviços de Aplicação

```python
from typing import List, Optional
from datetime import date
from app.domain.repositories.operacao_repository import IOperacaoRepository
from app.domain.schemas.operacao import OperacaoCreate, OperacaoResponse
from app.domain.exceptions import OperacaoNaoEncontradaError
import logging

logger = logging.getLogger(__name__)

class OperacaoService:
    """Serviço de aplicação para operações."""
    
    def __init__(
        self,
        operacao_repository: IOperacaoRepository,
        cache_service: ICacheService
    ):
        self.operacao_repository = operacao_repository
        self.cache_service = cache_service
    
    async def listar_por_data(self, data: date) -> List[OperacaoResponse]:
        """Lista operações por data de movimento."""
        operacoes = await self.operacao_repository.find_by_data_movimento(data)
        return [OperacaoResponse.model_validate(op) for op in operacoes]
    
    async def criar(self, dados: OperacaoCreate) -> OperacaoResponse:
        """Cria uma nova operação."""
        operacao = Operacao(**dados.model_dump())
        operacao = await self.operacao_repository.save(operacao)
        logger.info(f"Operação criada: {operacao.id}")
        return OperacaoResponse.model_validate(operacao)
    
    async def buscar_por_id(self, id: str) -> OperacaoResponse:
        """Busca operação por ID."""
        operacao = await self.operacao_repository.find_by_id(id)
        if not operacao:
            raise OperacaoNaoEncontradaError(f"Operação {id} não encontrada")
        return OperacaoResponse.model_validate(operacao)
```

### 4.4 Exceções Customizadas

```python
# domain/exceptions/__init__.py
from typing import Optional

class DomainError(Exception):
    """Exceção base do domínio."""
    
    def __init__(self, message: str, code: Optional[str] = None):
        self.message = message
        self.code = code
        super().__init__(message)

class OperacaoNaoEncontradaError(DomainError):
    """Operação não encontrada."""
    
    def __init__(self, message: str = "Operação não encontrada"):
        super().__init__(message, code="OPERACAO_NAO_ENCONTRADA")

class OperacaoInvalidaError(DomainError):
    """Operação inválida."""
    
    def __init__(self, message: str, validacao: Optional[str] = None):
        super().__init__(message, code="OPERACAO_INVALIDA")
        self.validacao = validacao
```

### 4.5 Exception Handlers

```python
# interfaces/api/exception_handlers.py
from fastapi import Request, status
from fastapi.responses import JSONResponse
from app.domain.exceptions import DomainError, OperacaoNaoEncontradaError

async def domain_exception_handler(request: Request, exc: DomainError) -> JSONResponse:
    """Handler para exceções de domínio."""
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "detail": exc.message,
            "code": exc.code
        }
    )

async def not_found_exception_handler(request: Request, exc: OperacaoNaoEncontradaError) -> JSONResponse:
    """Handler para recursos não encontrados."""
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={
            "detail": exc.message,
            "code": exc.code
        }
    )
```

---

## 5. APIs REST

### 5.1 Padrão Router (FastAPI)

```python
# interfaces/api/v1/routers/operacao_router.py
from fastapi import APIRouter, Depends, HTTPException, Query, Path, status
from typing import List, Optional
from datetime import date
from app.application.services.operacao_service import OperacaoService
from app.domain.schemas.operacao import (
    OperacaoCreate, OperacaoUpdate, OperacaoResponse, FiltroOperacao, ResultadoPaginado
)
from app.interfaces.api.v1.dependencies.auth import get_current_user, require_permission
from app.interfaces.api.v1.dependencies.services import get_operacao_service

router = APIRouter(prefix="/operacao", tags=["Operação"])

@router.get(
    "",
    response_model=ResultadoPaginado,
    summary="Lista operações",
    description="Retorna lista paginada de operações com filtros opcionais."
)
async def listar_operacoes(
    filtro: FiltroOperacao = Depends(),
    page: int = Query(1, ge=1, description="Página"),
    size: int = Query(20, ge=1, le=100, description="Itens por página"),
    service: OperacaoService = Depends(get_operacao_service),
    user: dict = Depends(get_current_user)
) -> ResultadoPaginado:
    return await service.listar(filtro, page, size)

@router.get(
    "/{operacao_id}",
    response_model=OperacaoResponse,
    summary="Busca operação por ID"
)
async def buscar_operacao(
    operacao_id: str = Path(..., description="ID da operação"),
    service: OperacaoService = Depends(get_operacao_service),
    user: dict = Depends(get_current_user)
) -> OperacaoResponse:
    return await service.buscar_por_id(operacao_id)

@router.post(
    "",
    response_model=OperacaoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Cria nova operação"
)
async def criar_operacao(
    dados: OperacaoCreate,
    service: OperacaoService = Depends(get_operacao_service),
    _: dict = Depends(require_permission("CRIAR_OPERACAO"))
) -> OperacaoResponse:
    return await service.criar(dados)

@router.put(
    "/{operacao_id}",
    response_model=OperacaoResponse,
    summary="Atualiza operação"
)
async def atualizar_operacao(
    operacao_id: str = Path(..., description="ID da operação"),
    dados: OperacaoUpdate = ...,
    service: OperacaoService = Depends(get_operacao_service),
    _: dict = Depends(require_permission("ATUALIZAR_OPERACAO"))
) -> OperacaoResponse:
    return await service.atualizar(operacao_id, dados)

@router.delete(
    "/{operacao_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove operação"
)
async def remover_operacao(
    operacao_id: str = Path(..., description="ID da operação"),
    service: OperacaoService = Depends(get_operacao_service),
    _: dict = Depends(require_permission("REMOVER_OPERACAO"))
) -> None:
    await service.remover(operacao_id)
```

### 5.2 Cliente HTTP Externo

```python
# infrastructure/external/grade_client.py
from abc import ABC, abstractmethod
from typing import Optional
from datetime import date
from pydantic import BaseModel
import httpx
from app.infrastructure.config.settings import settings

class DataMovimentoResponse(BaseModel):
    data_movimento_corrente: date

class IGradeClient(ABC):
    """Interface do cliente de grade."""
    
    @abstractmethod
    async def obter_data_movimento(self) -> date:
        pass

class GradeClient(IGradeClient):
    """Cliente HTTP para serviço de grade."""
    
    def __init__(self):
        self.base_url = settings.GRADE_API_URL
        self.timeout = 30.0
    
    async def obter_data_movimento(self) -> date:
        """Obtém a data de movimento corrente."""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(f"{self.base_url}/data-movimento")
            response.raise_for_status()
            data = DataMovimentoResponse.model_validate(response.json())
            return data.data_movimento_corrente
```

---

## 6. Segurança

### 6.1 OAuth2/JWT

```python
# infrastructure/security/auth.py
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from app.infrastructure.config.settings import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class TokenData(BaseModel):
    username: Optional[str] = None
    permissions: list[str] = []

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Cria token JWT."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def verify_token(token: str) -> TokenData:
    """Verifica e decodifica token JWT."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        permissions: list = payload.get("permissions", [])
        if username is None:
            raise JWTError("Token inválido")
        return TokenData(username=username, permissions=permissions)
    except JWTError:
        raise JWTError("Token inválido ou expirado")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica senha."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Gera hash de senha."""
    return pwd_context.hash(password)
```

### 6.2 Dependencies de Autenticação

```python
# interfaces/api/v1/dependencies/auth.py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from app.infrastructure.security.auth import verify_token, TokenData

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def get_current_user(token: str = Depends(oauth2_scheme)) -> TokenData:
    """Obtém usuário atual do token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        return verify_token(token)
    except JWTError:
        raise credentials_exception

def require_permission(permission: str):
    """Factory para verificar permissão específica."""
    async def check_permission(user: TokenData = Depends(get_current_user)) -> TokenData:
        if permission not in user.permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permissão '{permission}' necessária"
            )
        return user
    return check_permission
```

### 6.3 Configurações

```python
# infrastructure/config/settings.py
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    """Configurações da aplicação."""
    
    # Database
    DATABASE_URL: str
    DATABASE_ECHO: bool = False
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # External Services
    GRADE_API_URL: str
    CONFIGURACAO_API_URL: str
    
    # App
    DEBUG: bool = False
    ENVIRONMENT: str = "development"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
```

---

## 7. Banco de Dados

### 7.1 Alembic (Migrations)

```
alembic/
├── versions/           # Arquivos de migration
├── env.py             # Configuração do Alembic
├── script.py.mako     # Template de migration
└── alembic.ini        # Configuração principal
```

**Exemplo de Migration:**

```python
# alembic/versions/001_create_operacoes_table.py
"""create operacoes table

Revision ID: 001
Revises: 
Create Date: 2024-01-20 10:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ENUM

revision = '001'
down_revision = None
branch_labels = None
depends_on = None

situacao_enum = ENUM('ATIVA', 'PENDENTE', 'CANCELADA', name='situacao_operacao', create_type=False)

def upgrade() -> None:
    situacao_enum.create(op.get_bind())
    
    op.create_table(
        'operacoes',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('numero_operacao', sa.String(20), nullable=False),
        sa.Column('data_movimento', sa.Date(), nullable=False),
        sa.Column('situacao', situacao_enum, nullable=False),
        sa.Column('valor_financeiro', sa.Numeric(18, 2), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_operacoes_numero_operacao', 'operacoes', ['numero_operacao'])
    op.create_index('ix_operacoes_data_movimento', 'operacoes', ['data_movimento'])

def downgrade() -> None:
    op.drop_index('ix_operacoes_data_movimento', table_name='operacoes')
    op.drop_index('ix_operacoes_numero_operacao', table_name='operacoes')
    op.drop_table('operacoes')
    situacao_enum.drop(op.get_bind())
```

### 7.2 Conexão Assíncrona

```python
# infrastructure/database/session.py
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from app.infrastructure.config.settings import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DATABASE_ECHO,
    pool_pre_ping=True
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

async def get_session() -> AsyncSession:
    """Dependency para obter sessão do banco."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
```

---

## 8. Mensageria (Event-Driven)

### 8.1 FastStream (RabbitMQ/Kafka)

Utilizamos `FastStream` para criar consumidores e produtores robustos e tipados.

```python
# infrastructure/messaging/consumer.py
from faststream import FastStream
from faststream.rabbit import RabbitBroker
from app.application.services.operacao_service import OperacaoService

broker = RabbitBroker("amqp://guest:guest@localhost:5672/")
app = FastStream(broker)

@broker.subscriber("fila.operacao.criada")
async def handle_operacao_criada(msg: OperacaoCriadaEvent, service: OperacaoService):
    """Processa evento de operação criada."""
    await service.processar_nova_operacao(msg.id)
```

---

## 9. Testes

### 8.1 Estrutura

```python
# tests/unit/application/test_operacao_service.py
import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import date
from app.application.services.operacao_service import OperacaoService
from app.domain.entities.operacao import Operacao
from app.domain.enums import SituacaoOperacao

class TestOperacaoService:
    """Testes do serviço de operação."""
    
    @pytest.fixture
    def mock_repository(self):
        return AsyncMock()
    
    @pytest.fixture
    def mock_grade_client(self):
        return AsyncMock()
    
    @pytest.fixture
    def service(self, mock_repository, mock_grade_client):
        return OperacaoService(
            operacao_repository=mock_repository,
            grade_client=mock_grade_client,
            configuracao_client=AsyncMock()
        )
    
    @pytest.mark.asyncio
    async def test_listar_por_data_retorna_operacoes(
        self, service, mock_repository
    ):
        # Arrange
        data = date(2024, 1, 20)
        operacao = Operacao(
            id="123",
            numero_operacao="OP001",
            data_movimento=data,
            situacao=SituacaoOperacao.ATIVA
        )
        mock_repository.find_by_data_movimento.return_value = [operacao]
        
        # Act
        resultado = await service.listar_por_data(data)
        
        # Assert
        assert len(resultado) == 1
        assert resultado[0].numero_operacao == "OP001"
        mock_repository.find_by_data_movimento.assert_called_once_with(data)
    
    @pytest.mark.asyncio
    async def test_buscar_por_id_nao_encontrado_lanca_excecao(
        self, service, mock_repository
    ):
        # Arrange
        mock_repository.find_by_id.return_value = None
        
        # Act & Assert
        with pytest.raises(OperacaoNaoEncontradaError):
            await service.buscar_por_id("inexistente")
```

### 8.2 Fixtures Globais (conftest.py)

```python
# tests/conftest.py
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from app.main import app
from app.infrastructure.database.base import Base
from app.infrastructure.database.session import get_session

# Banco de testes em memória
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest.fixture(scope="session")
def event_loop():
    import asyncio
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
async def engine():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()

@pytest.fixture
async def session(engine):
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session
        await session.rollback()

@pytest.fixture
async def client(session):
    async def override_get_session():
        yield session
    
    app.dependency_overrides[get_session] = override_get_session
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()
```

---

## 9. CI/CD

### 9.1 GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      
      - name: Install Poetry
        uses: snok/install-poetry@v1
        with:
          version: 1.8.0
      
      - name: Install dependencies
        run: poetry install
      
      - name: Run linting
        run: poetry run ruff check .
      
      - name: Run type checking
        run: poetry run mypy .
      
      - name: Run tests
        run: poetry run pytest --cov=app --cov-report=xml
        env:
          DATABASE_URL: postgresql+asyncpg://test:test@localhost:5432/test
          SECRET_KEY: test-secret-key
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage.xml
```

### 9.2 Dockerfile

```dockerfile
FROM python:3.12-slim as builder

WORKDIR /app

RUN pip install poetry==1.8.0

COPY pyproject.toml poetry.lock ./
RUN poetry export -f requirements.txt --output requirements.txt --without-hashes

FROM python:3.12-slim

WORKDIR /app

COPY --from=builder /app/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## 10. Qualidade de Código

### 10.1 Ruff (Linting)

```toml
# pyproject.toml
[tool.ruff]
target-version = "py312"
line-length = 100
select = [
    "E",   # pycodestyle errors
    "W",   # pycodestyle warnings
    "F",   # Pyflakes
    "I",   # isort
    "B",   # flake8-bugbear
    "C4",  # flake8-comprehensions
    "UP",  # pyupgrade
]
ignore = [
    "E501",  # line too long (handled by formatter)
]

[tool.ruff.per-file-ignores]
"tests/*" = ["B008", "B011"]
```

### 10.2 MyPy (Type Checking)

```toml
# pyproject.toml
[tool.mypy]
python_version = "3.12"
warn_return_any = true
warn_unused_ignores = true
disallow_untyped_defs = true
plugins = ["pydantic.mypy"]

[[tool.mypy.overrides]]
module = "tests.*"
disallow_untyped_defs = false
```

### 10.3 pytest-cov (Cobertura)

```toml
# pyproject.toml
[tool.pytest.ini_options]
testpaths = ["tests"]
asyncio_mode = "auto"
addopts = "--cov=app --cov-report=term-missing --cov-fail-under=80"
```

---

## 11. Boas Práticas

### 11.1 Clean Code

- Funções pequenas e com responsabilidade única
- Nomes descritivos em português (domínio) ou inglês (código técnico)
- Evitar comentários óbvios - código auto-explicativo
- Máximo de 3 níveis de indentação
- Evitar valores mágicos - usar constantes

**Exemplo - Função focada e legível:**

```python
# ✅ BOM: Função pequena, nome descritivo, responsabilidade única
async def recuperar_operacoes_expiraveis(self) -> list[OperacaoResponse]:
    data_movimento = await self._obter_data_movimento_corrente()
    limite_expiracao = self._calcular_limite_expiracao()
    
    return await self.operacao_repository.buscar_pendentes_por_limite(
        data_movimento, limite_expiracao
    )

# ❌ RUIM: Função faz muitas coisas, nome genérico
async def processar(self) -> list[OperacaoResponse]:
    # 200 linhas de código fazendo múltiplas operações...
    pass
```

### 11.2 DRY

- Extrair código duplicado para funções/classes reutilizáveis
- Usar bibliotecas comuns
- Centralizar constantes e configurações

### 11.3 SOLID

- **S** (Single Responsibility): Cada classe/função deve ter uma única responsabilidade
- **O** (Open/Closed): Aberto para extensão, fechado para modificação
- **L** (Liskov Substitution): Subtipos devem ser substituíveis por seus tipos base
- **I** (Interface Segregation): Interfaces específicas ao invés de interfaces genéricas
- **D** (Dependency Inversion): Depender de abstrações (ABCs), não de implementações

**Exemplo - Dependency Inversion:**

```python
# ✅ BOM: Serviço depende de interface (abstração)
class OperacaoService:
    def __init__(
        self,
        operacao_repository: IOperacaoRepository,  # Interface (ABC)
        grade_client: IGradeClient                  # Interface (ABC)
    ):
        self.operacao_repository = operacao_repository
        self.grade_client = grade_client

# A implementação real é injetada via Dependency Injection (FastAPI Depends)
# Pode ser facilmente mockada em testes
```

### 11.4 Clean Architecture

**Regra de Dependência:**

```
interfaces → application → domain ← infrastructure
```

As dependências SEMPRE apontam para o centro (domínio). Camadas externas conhecem as internas, nunca o contrário.

**Anti-patterns a evitar:**

```python
# ❌ RUIM: Router com lógica de negócio
@router.get("/operacoes")
async def listar_operacoes(session: AsyncSession = Depends(get_session)):
    operacoes = await session.execute(select(Operacao))
    # Lógica de negócio no router!
    for op in operacoes:
        if op.situacao == "PEN":
            op.alerta = True
    return operacoes

# ❌ RUIM: Domínio importando de infraestrutura
# domain/entities/operacao.py
from app.infrastructure.config.settings import settings  # ERRADO!

# ❌ RUIM: Entidade anêmica (sem comportamento)
class Operacao(Base):
    numero = Column(String)
    data = Column(Date)
    # Apenas colunas, sem métodos de negócio
```

---

## 12. Checklist de Revisão

- [ ] Estrutura de pacotes segue Clean Architecture (DDD)
- [ ] Regra de dependência respeitada (interfaces → application → domain)
- [ ] Routers são finos (delegam para services)
- [ ] Services de aplicação orquestram, não implementam regras de negócio
- [ ] Entidades são ricas (contêm comportamento do domínio)
- [ ] Schemas Pydantic para validação de entrada/saída
- [ ] Testes unitários escritos e passando
- [ ] Cobertura de código >= 80%
- [ ] Documentação OpenAPI gerada automaticamente
- [ ] Type hints em todas as funções
- [ ] Sem credenciais hardcoded (usar .env)
- [ ] Migrations versionadas com Alembic
- [ ] Linting e type checking passando

---

## 13. Princípios SOLID em Python

### 13.1 S - Single Responsibility (Responsabilidade Única)

```python
# ✅ CORRETO - Uma classe = uma responsabilidade
class CriarOperacaoUseCase:
    """Caso de uso apenas para criação de operação."""
    
    def __init__(self, repository: IOperacaoRepository):
        self.repository = repository
    
    async def executar(self, dados: OperacaoCreate) -> OperacaoResponse:
        operacao = Operacao.criar(dados)
        await self.repository.save(operacao)
        return OperacaoResponse.model_validate(operacao)


class CancelarOperacaoUseCase:
    """Caso de uso apenas para cancelamento."""
    
    def __init__(
        self,
        repository: IOperacaoRepository,
        notificacao: INotificacaoService
    ):
        self.repository = repository
        self.notificacao = notificacao
    
    async def executar(self, id: str) -> None:
        operacao = await self.repository.find_by_id(id)
        if not operacao:
            raise OperacaoNaoEncontradaError(id)
        
        operacao.cancelar()
        await self.repository.save(operacao)
        await self.notificacao.notificar_cancelamento(operacao)


# ❌ ERRADO - Múltiplas responsabilidades
class OperacaoService:
    """FAZ TUDO: criar, cancelar, listar, notificar, gerar relatório..."""
    
    async def criar(self, dados): ...
    async def cancelar(self, id): ...
    async def listar(self): ...
    async def notificar(self, id): ...
    async def gerar_relatorio(self): ...
    async def enviar_email(self): ...
    # 500+ linhas de código misturado
```

### 13.2 O - Open/Closed (Aberto/Fechado)

```python
from abc import ABC, abstractmethod
from typing import List

# ✅ CORRETO - Extensível via interface
class ValidadorOperacao(ABC):
    """Interface para validadores."""
    
    @abstractmethod
    def validar(self, operacao: Operacao) -> ValidationResult:
        pass


class ValidadorValorMinimo(ValidadorOperacao):
    """Valida valor mínimo da operação."""
    
    def __init__(self, valor_minimo: Decimal = Decimal("10.00")):
        self.valor_minimo = valor_minimo
    
    def validar(self, operacao: Operacao) -> ValidationResult:
        if operacao.valor < self.valor_minimo:
            return ValidationResult(
                valido=False,
                mensagem=f"Valor mínimo é R$ {self.valor_minimo}"
            )
        return ValidationResult(valido=True)


class ValidadorHorarioFuncionamento(ValidadorOperacao):
    """Valida se está no horário de funcionamento."""
    
    def validar(self, operacao: Operacao) -> ValidationResult:
        hora_atual = datetime.now().hour
        if not (8 <= hora_atual <= 18):
            return ValidationResult(
                valido=False,
                mensagem="Fora do horário de funcionamento"
            )
        return ValidationResult(valido=True)


# Novos validadores podem ser adicionados sem modificar existentes
class ValidadorLimiteCredito(ValidadorOperacao):
    def validar(self, operacao: Operacao) -> ValidationResult:
        # Nova validação...
        pass


# Uso: adicionar validadores via injeção
class CriarOperacaoUseCase:
    def __init__(
        self,
        repository: IOperacaoRepository,
        validadores: List[ValidadorOperacao]
    ):
        self.repository = repository
        self.validadores = validadores
    
    async def executar(self, dados: OperacaoCreate) -> OperacaoResponse:
        operacao = Operacao.criar(dados)
        
        # Executa todos os validadores
        for validador in self.validadores:
            resultado = validador.validar(operacao)
            if not resultado.valido:
                raise ValidacaoError(resultado.mensagem)
        
        await self.repository.save(operacao)
        return OperacaoResponse.model_validate(operacao)
```

### 13.3 L - Liskov Substitution (Substituição de Liskov)

```python
from abc import ABC, abstractmethod
from decimal import Decimal

# ✅ CORRETO - Subtipos são completamente substituíveis
class Pagamento(ABC):
    """Classe base para pagamentos."""
    
    def __init__(self, valor: Decimal):
        self.valor = valor
        self.status = StatusPagamento.PENDENTE
    
    @abstractmethod
    async def processar(self) -> bool:
        """Processa o pagamento."""
        pass
    
    @abstractmethod
    async def estornar(self) -> bool:
        """Estorna o pagamento."""
        pass
    
    def get_valor(self) -> Decimal:
        return self.valor
    
    def get_status(self) -> StatusPagamento:
        return self.status


class PagamentoCartao(Pagamento):
    """Pagamento via cartão de crédito."""
    
    def __init__(self, valor: Decimal, numero_cartao: str):
        super().__init__(valor)
        self.numero_cartao = numero_cartao
    
    async def processar(self) -> bool:
        # Processa cartão via gateway
        resultado = await self._chamar_gateway()
        if resultado.sucesso:
            self.status = StatusPagamento.APROVADO
            return True
        return False
    
    async def estornar(self) -> bool:
        resultado = await self._estornar_gateway()
        if resultado.sucesso:
            self.status = StatusPagamento.ESTORNADO
            return True
        return False


class PagamentoPix(Pagamento):
    """Pagamento via PIX."""
    
    def __init__(self, valor: Decimal, chave_pix: str):
        super().__init__(valor)
        self.chave_pix = chave_pix
    
    async def processar(self) -> bool:
        # Implementação específica para PIX
        ...
    
    async def estornar(self) -> bool:
        # Implementação específica para PIX
        ...


# Ambos podem ser usados de forma intercambiável
async def processar_pagamento(pagamento: Pagamento) -> bool:
    """Funciona com qualquer subtipo de Pagamento."""
    return await pagamento.processar()


# ❌ ERRADO - Viola LSP (subtipo tem comportamento diferente)
class PagamentoBoleto(Pagamento):
    async def estornar(self) -> bool:
        raise NotImplementedError("Boleto não pode ser estornado")
        # Viola o contrato da classe base!
```

### 13.4 I - Interface Segregation (Segregação de Interfaces)

```python
from abc import ABC, abstractmethod
from typing import List, Optional

# ✅ CORRETO - Interfaces pequenas e focadas
class IOperacaoReadRepository(ABC):
    """Interface apenas para leitura."""
    
    @abstractmethod
    async def find_by_id(self, id: str) -> Optional[Operacao]:
        pass
    
    @abstractmethod
    async def find_by_data(self, data: date) -> List[Operacao]:
        pass


class IOperacaoWriteRepository(ABC):
    """Interface apenas para escrita."""
    
    @abstractmethod
    async def save(self, operacao: Operacao) -> Operacao:
        pass
    
    @abstractmethod
    async def delete(self, id: str) -> None:
        pass


class IOperacaoRelatorioRepository(ABC):
    """Interface para relatórios."""
    
    @abstractmethod
    async def buscar_por_periodo(
        self, inicio: date, fim: date
    ) -> List[Operacao]:
        pass
    
    @abstractmethod
    async def calcular_total_periodo(
        self, inicio: date, fim: date
    ) -> Decimal:
        pass


# Implementação pode implementar múltiplas interfaces
class OperacaoRepository(
    IOperacaoReadRepository,
    IOperacaoWriteRepository,
    IOperacaoRelatorioRepository
):
    """Implementação completa do repositório."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def find_by_id(self, id: str) -> Optional[Operacao]:
        ...
    
    async def save(self, operacao: Operacao) -> Operacao:
        ...
    
    # ... outras implementações


# Use cases usam apenas a interface necessária
class BuscarOperacaoUseCase:
    """Precisa apenas de leitura."""
    
    def __init__(self, repository: IOperacaoReadRepository):  # Interface mínima
        self.repository = repository


# ❌ ERRADO - Interface muito grande
class IOperacaoRepository(ABC):
    @abstractmethod
    async def find_by_id(self, id: str): pass
    @abstractmethod
    async def find_all(self): pass
    @abstractmethod
    async def find_by_data(self, data: date): pass
    @abstractmethod
    async def find_by_situacao(self, situacao: str): pass
    @abstractmethod
    async def save(self, operacao): pass
    @abstractmethod
    async def delete(self, id: str): pass
    @abstractmethod
    async def gerar_relatorio(self): pass
    @abstractmethod
    async def enviar_notificacao(self): pass
    # ... mais 20 métodos
```

### 13.5 D - Dependency Inversion (Inversão de Dependência)

```python
from abc import ABC, abstractmethod

# ✅ CORRETO - Depende de abstrações (interfaces)
class OperacaoService:
    """Service depende de interfaces, não de implementações."""
    
    def __init__(
        self,
        operacao_repository: IOperacaoRepository,  # Interface
        notificacao_service: INotificacaoService,  # Interface
        cache_service: ICacheService,              # Interface
    ):
        self.operacao_repository = operacao_repository
        self.notificacao_service = notificacao_service
        self.cache_service = cache_service
    
    async def criar(self, dados: OperacaoCreate) -> OperacaoResponse:
        operacao = Operacao.criar(dados)
        await self.operacao_repository.save(operacao)
        await self.notificacao_service.notificar(operacao)
        await self.cache_service.invalidar("operacoes")
        return OperacaoResponse.model_validate(operacao)


# Injeção de dependência via FastAPI
async def get_operacao_service(
    session: AsyncSession = Depends(get_session)
) -> OperacaoService:
    """Factory para criar o service com suas dependências."""
    return OperacaoService(
        operacao_repository=OperacaoRepository(session),
        notificacao_service=EmailNotificacaoService(),
        cache_service=RedisCache(),
    )


# Para testes, pode injetar mocks facilmente
def test_criar_operacao():
    mock_repository = Mock(spec=IOperacaoRepository)
    mock_notificacao = Mock(spec=INotificacaoService)
    mock_cache = Mock(spec=ICacheService)
    
    service = OperacaoService(
        operacao_repository=mock_repository,
        notificacao_service=mock_notificacao,
        cache_service=mock_cache,
    )
    
    # Testa sem dependências reais


# ❌ ERRADO - Depende de implementação concreta
class OperacaoService:
    def __init__(self, session: AsyncSession):
        self.repository = OperacaoRepository(session)  # Implementação concreta!
        self.email = SmtpEmailService()                # Implementação concreta!
```

---

## 14. Anti-Patterns

### 14.1 Anti-Patterns de Código

```python
# ❌ 1. God Class - Classe fazendo muitas coisas
class OperacaoManager:
    """CRUD + Validação + Notificação + Relatório + Cache..."""
    
    def criar(self): ...
    def atualizar(self): ...
    def excluir(self): ...
    def validar(self): ...
    def notificar(self): ...
    def gerar_relatorio(self): ...
    def limpar_cache(self): ...
    # 1000+ linhas

# ✅ Dividir em classes com responsabilidade única


# ❌ 2. Entidade Anêmica - Apenas dados, sem comportamento
class Operacao(Base):
    __tablename__ = "operacoes"
    
    id = Column(String, primary_key=True)
    situacao = Column(String)
    valor = Column(Numeric)
    # Apenas colunas, nenhum método de negócio

# ✅ Entidade Rica
class Operacao(Base):
    # ... colunas ...
    
    def cancelar(self) -> None:
        if not self.pode_cancelar():
            raise OperacaoNaoCancelavel()
        self.situacao = SituacaoOperacao.CANCELADA
    
    def pode_cancelar(self) -> bool:
        return self.situacao in [
            SituacaoOperacao.PENDENTE,
            SituacaoOperacao.EM_ANDAMENTO
        ]


# ❌ 3. Uso de Any
def processar_dados(dados: Any) -> Any:
    return dados

# ✅ Tipar corretamente
def processar_dados(dados: OperacaoCreate) -> OperacaoResponse:
    return OperacaoResponse.model_validate(dados)


# ❌ 4. Exception genérica
try:
    resultado = await operacao_service.criar(dados)
except Exception:
    pass  # Ignora o erro!

# ✅ Exceptions específicas
try:
    resultado = await operacao_service.criar(dados)
except OperacaoInvalidaError as e:
    logger.warning(f"Operação inválida: {e.message}")
    raise HTTPException(status_code=400, detail=e.message)
except OperacaoNaoEncontradaError as e:
    raise HTTPException(status_code=404, detail=e.message)


# ❌ 5. Retornar None silenciosamente
async def buscar_por_id(id: str) -> Operacao | None:
    return await self.session.get(Operacao, id)
    # Chamador não sabe se é None porque não existe ou por erro

# ✅ Usar Optional + exceções ou Result pattern
async def buscar_por_id(id: str) -> Operacao:
    operacao = await self.session.get(Operacao, id)
    if not operacao:
        raise OperacaoNaoEncontradaError(id)
    return operacao


# ❌ 6. Sync em código async
import requests  # Bloqueante!

async def chamar_api():
    response = requests.get("https://api.exemplo.com")  # Bloqueia event loop!
    return response.json()

# ✅ Usar bibliotecas async
import httpx

async def chamar_api():
    async with httpx.AsyncClient() as client:
        response = await client.get("https://api.exemplo.com")
        return response.json()
```

### 14.2 Anti-Patterns de Arquitetura

```python
# ❌ 7. Lógica de negócio no Router
@router.post("/operacoes")
async def criar_operacao(
    dados: OperacaoCreate,
    session: AsyncSession = Depends(get_session)
):
    # 50 linhas de lógica de negócio aqui!
    if dados.valor < 10:
        raise HTTPException(400, "Valor mínimo é 10")
    
    if dados.tipo == "A":
        taxa = 0.05
    else:
        taxa = 0.10
    
    valor_final = dados.valor * (1 + taxa)
    # ... mais lógica ...

# ✅ Router delega para Service
@router.post("/operacoes")
async def criar_operacao(
    dados: OperacaoCreate,
    service: OperacaoService = Depends(get_operacao_service)
):
    return await service.criar(dados)


# ❌ 8. Domain importando Infrastructure
# domain/entities/operacao.py
from app.infrastructure.config.settings import settings  # ❌ ERRADO!
from app.infrastructure.database.session import get_session  # ❌ ERRADO!

class Operacao:
    def calcular_taxa(self):
        return self.valor * settings.TAXA_PADRAO  # ❌ Depende de infra!

# ✅ Domain puro, configuração injetada via parâmetro
class Operacao:
    def calcular_taxa(self, taxa: Decimal) -> Decimal:
        return self.valor * taxa


# ❌ 9. Acoplamento direto a frameworks no Domain
from sqlalchemy import Column, String  # ❌ Framework no domínio

class Operacao:
    __tablename__ = "operacoes"
    id = Column(String, primary_key=True)

# ✅ Separar entidade de domínio do modelo de persistência
# domain/entities/operacao.py (puro)
class Operacao:
    def __init__(self, id: str, numero: str):
        self.id = id
        self.numero = numero

# infrastructure/persistence/models/operacao_model.py (SQLAlchemy)
class OperacaoModel(Base):
    __tablename__ = "operacoes"
    id = Column(String, primary_key=True)


# ❌ 10. Use Case com muitas responsabilidades
class ProcessarOperacaoUseCase:
    async def executar(self, dados):
        # Valida
        # Cria operação
        # Calcula taxas
        # Envia notificação
        # Gera PDF
        # Atualiza relatório
        # Limpa cache
        # 500 linhas...

# ✅ Dividir em Use Cases específicos
class CriarOperacaoUseCase: ...
class CalcularTaxaUseCase: ...
class NotificarOperacaoUseCase: ...
```

### 14.3 Anti-Patterns de Persistência

```python
# ❌ 11. N+1 Queries
async def listar_operacoes_com_comandos():
    operacoes = await session.execute(select(Operacao))
    for operacao in operacoes.scalars():
        # Uma query para cada operação!
        comandos = await session.execute(
            select(Comando).where(Comando.operacao_id == operacao.id)
        )

# ✅ Eager loading
async def listar_operacoes_com_comandos():
    stmt = select(Operacao).options(selectinload(Operacao.comandos))
    result = await session.execute(stmt)
    return result.scalars().all()


# ❌ 12. Transaction no lugar errado
class OperacaoRepository:
    async def save(self, operacao: Operacao):
        self.session.add(operacao)
        await self.session.commit()  # ❌ Cada operação isolada

# ✅ Transaction no Use Case (unit of work)
class CriarOperacaoUseCase:
    async def executar(self, dados):
        async with self.session.begin():
            await self.repository.save(operacao1)
            await self.repository.save(operacao2)
            # Commit automático ao sair do contexto
```

### 14.4 Anti-Patterns de Segurança

```python
# ❌ 13. Credenciais hardcoded
DATABASE_URL = "postgresql://user:senha123@localhost/db"
JWT_SECRET = "minha-chave-secreta"

# ✅ Usar variáveis de ambiente
DATABASE_URL = os.getenv("DATABASE_URL")
JWT_SECRET = os.getenv("JWT_SECRET")


# ❌ 14. SQL Injection
async def buscar_por_nome(nome: str):
    query = f"SELECT * FROM operacoes WHERE nome = '{nome}'"  # ❌ Vulnerável!
    await session.execute(text(query))

# ✅ Usar parâmetros
async def buscar_por_nome(nome: str):
    stmt = select(Operacao).where(Operacao.nome == nome)
    await session.execute(stmt)


# ❌ 15. Expor dados sensíveis
@router.get("/usuarios/{id}")
async def buscar_usuario(id: str):
    usuario = await repository.find_by_id(id)
    return usuario  # Retorna senha, dados sensíveis!

# ✅ Usar DTO para resposta
@router.get("/usuarios/{id}", response_model=UsuarioResponse)
async def buscar_usuario(id: str):
    usuario = await repository.find_by_id(id)
    return UsuarioResponse.model_validate(usuario)  # Sem dados sensíveis
```

### 14.5 Resumo de Anti-Patterns

| #   | Anti-Pattern          | Solução                      |
| --- | --------------------- | ---------------------------- |
| 1   | God Class             | Dividir por responsabilidade |
| 2   | Entidade Anêmica      | Adicionar comportamento      |
| 3   | Uso de Any            | Tipar corretamente           |
| 4   | Exception genérica    | Exceptions específicas       |
| 5   | Retornar None         | Optional + exceções          |
| 6   | Sync em async         | Bibliotecas async (httpx)    |
| 7   | Lógica no Router      | Delegar para Service         |
| 8   | Domain → Infra        | Inversão de dependência      |
| 9   | Framework no Domain   | Separar modelos              |
| 10  | UseCase gigante       | Dividir em Use Cases         |
| 11  | N+1 Queries           | Eager loading                |
| 12  | Transaction errada    | Unit of Work                 |
| 13  | Credenciais hardcoded | Variáveis de ambiente        |
| 14  | SQL Injection         | Queries parametrizadas       |
| 15  | Expor dados sensíveis | DTOs de resposta             |

