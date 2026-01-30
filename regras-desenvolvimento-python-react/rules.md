# 🎯 Diretrizes de Desenvolvimento (Cursor Rules) — Stack Python + React

Este documento serve como **ponto de entrada** para os padrões de desenvolvimento.
As regras específicas estão organizadas em arquivos dedicados:

| Arquivo              | Escopo                 | Descrição                                            |
| -------------------- | ---------------------- | ---------------------------------------------------- |
| `rules.md`           | Geral                  | Princípios fundamentais e visão geral (este arquivo) |
| `regras-frontend.md` | React 19+ / TypeScript | Regras específicas para desenvolvimento frontend     |
| `regras-backend.md`  | Python 3.12+ / FastAPI | Regras específicas para desenvolvimento backend      |
| `regras-testes.md`   | pytest / Vitest        | Regras para testes backend e frontend                |

---

## ⚠️ PRINCÍPIOS FUNDAMENTAIS INEGOCIÁVEIS (NÃO REMOVER)

### 1. Clean Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      INFRASTRUCTURE                          │
│         Frameworks, UI, DB, APIs Externas                    │
│                                                              │
│    ┌───────────────────────────────────────────────────┐    │
│    │                   APPLICATION                      │    │
│    │            Use Cases, DTOs, Ports                  │    │
│    │                                                    │    │
│    │    ┌───────────────────────────────────────┐      │    │
│    │    │              DOMAIN                    │      │    │
│    │    │    Entidades, Value Objects,           │      │    │
│    │    │    Regras de Negócio                   │      │    │
│    │    │    ❌ ZERO dependências externas       │      │    │
│    │    └───────────────────────────────────────┘      │    │
│    │                                                    │    │
│    └───────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Regra de Dependência:** `Infrastructure → Application → Domain`

❌ **NUNCA** inverta essa ordem!

---

### 2. SOLID

| Princípio                 | Aplicação           | Regra                                          |
| ------------------------- | ------------------- | ---------------------------------------------- |
| **S**ingle Responsibility | Classes/Componentes | Uma classe = uma responsabilidade              |
| **O**pen/Closed           | Extensibilidade     | Aberto para extensão, fechado para modificação |
| **L**iskov Substitution   | Hierarquias         | Subtipos devem ser substituíveis               |
| **I**nterface Segregation | Interfaces          | Interfaces pequenas e específicas              |
| **D**ependency Inversion  | Acoplamento         | Dependa de abstrações, não de implementações   |

---

### 3. DRY (Don't Repeat Yourself)

- ✅ Sempre verificar antes de criar:
    - Backend → módulos compartilhados / `shared/`
    - Frontend → `shared/components`, `shared/hooks`, `shared/utils`
- ✅ Sempre centralizar conversões e mapeamentos:
    - Backend → Pydantic schemas, serializers
    - Frontend → formatters, adapters, React Query hooks
- ✅ Sempre reutilizar antes de duplicar
- ❌ Nunca duplicar código existente
- ❌ Nunca criar utilitários sem verificar se já existem

### 3.1 Reutilização de Serializers/Mappers — sem memory leak

- ❌ Proibido criar instâncias de `JSONEncoder` espalhadas no código.
- ❌ Proibido singleton manual/registry global (`get_instance()`, variáveis globais mutáveis).
- ✅ Pydantic schemas devem ser **stateless** e configurados em um único lugar.
- ✅ Formatters/serializers devem ser funções puras ou classes injetadas via DI (FastAPI Depends).

---

### 4. Clean Code

#### Limites de Tamanho

| Escopo            | Limite Recomendado | Limite Máximo |
| ----------------- | ------------------ | ------------- |
| Classe/Componente | 150 linhas         | 300 linhas    |
| Método/Função     | 15 linhas          | 20 linhas     |
| Parâmetros        | 3 parâmetros       | 5 parâmetros  |

#### Nomenclatura

| Tipo        | Backend (Python)   | Frontend (React/TS)                  |
| ----------- | ------------------ | ------------------------------------ |
| Classes     | `PascalCase`       | `PascalCase`                         |
| Funções     | `snake_case`       | `camelCase`                          |
| Variáveis   | `snake_case`       | `camelCase`                          |
| Constantes  | `UPPER_SNAKE_CASE` | `UPPER_SNAKE_CASE`                   |
| Arquivos    | `snake_case.py`    | `kebab-case.tsx` ou `PascalCase.tsx` |
| Componentes | -                  | `PascalCase`                         |

#### Proibições Absolutas

```
❌ Abreviações: prod, cat, svc, usr
❌ Nomes genéricos: data, info, util, helper, manager
❌ Código excessivamente comentado no repositório
❌ Catch vazio ou genérico demais
❌ Variáveis com nomes de uma letra
```

---

## 🛠️ STACK TECNOLÓGICA

### Backend

| Tecnologia | Versão | Política                           |
| ---------- | ------ | ---------------------------------- |
| Python     | 3.12+  | Usar a versão mais recente estável |
| FastAPI    | 0.109+ | Framework principal                |
| Pydantic   | 2.x    | Validação e serialização           |
| SQLAlchemy | 2.x    | ORM com async                      |
| Alembic    | 1.13+  | Migrações                          |
| pytest     | 8.x    | Framework de testes                |

**Padrões OBRIGATÓRIOS:**

```python
# Injeção de Dependência (FastAPI)
async def get_service(
    repository: IRepository = Depends(get_repository)
) -> Service:
    return Service(repository)

# Type Hints SEMPRE
def calcular_total(itens: list[Item]) -> Decimal:
    ...

# Async por padrão
async def buscar_por_id(id: str) -> Optional[Operacao]:
    ...
```

📖 **Detalhes completos:** `regras-backend.md`

### Frontend

| Tecnologia     | Versão | Política                          |
| -------------- | ------ | --------------------------------- |
| React          | 19+    | Functional components obrigatório |
| TypeScript     | 5.6+   | `strict` habilitado               |
| Vite           | 6+     | Build tool padrão                 |
| TanStack Query | 5+     | Server state                      |
| Zustand        | 5+     | Client state global               |

**Padrões OBRIGATÓRIOS:**

```typescript
// Hooks para estado
useState()        // Estado local
useMemo()         // Valores derivados
useEffect()       // Side effects
useQuery()        // Server state

// Separação de arquivos
Component.tsx         // Apenas JSX
Component.styles.ts   // Estilos
Component.hooks.ts    // Lógica
Component.types.ts    // Tipos
```

📖 **Detalhes completos:** `regras-frontend.md`

---

## 🧱 ARQUITETURA (visão unificada)

### Backend (DDD + Clean Architecture)

- Estrutura canônica por camadas: `domain/` → `application/` → `infrastructure/` e `interfaces/`.
- `interfaces/api/v{n}/` define **routers** (endpoints FastAPI).
- O domínio contém regras de negócio e **não depende** de framework.

### Frontend (Clean Architecture adaptada)

- Organização por **feature**.
- `pages/` (smart/container), `components/` (presentational), `hooks/` (data/state), `services/` (API), `types/` (domínio).

## 📚 PRINCÍPIOS ADICIONAIS (OBRIGATÓRIOS QUANDO APLICÁVEL)

### DDD (Domain-Driven Design)

- Entidades ricas com invariantes.
- Value Objects imutáveis.
- Use Cases na aplicação (orquestração), não no controller/router.
- Ports/Adapters para integrações externas.

### ACID (Persistência)

- **Atomicidade**: mudanças relacionadas na mesma transação.
- **Consistência**: invariantes e constraints respeitadas.
- **Isolamento**: escolha consciente; evitar suposições.
- **Durabilidade**: commit + migrações versionadas (Alembic).

### Patterns (evitar reinventar roda)

- Backend: Factory, Strategy, Adapter, Facade, Repository, Specification.
- Frontend: Facade, shared modules, Adapter, Container/Presentational, Composition (hooks).

---

## ✅ CHECKLIST UNIVERSAL

### Antes de Iniciar uma Feature

- [ ] Li e entendi a arquitetura do módulo
- [ ] Verifiquei se existe código similar que pode ser reutilizado
- [ ] Defini as camadas onde o código será criado
- [ ] Planejei a divisão de responsabilidades

### Antes de Commitar

#### Arquitetura

- [ ] Clean Architecture respeitada (dependências corretas)
- [ ] Domain sem dependências de frameworks
- [ ] Responsabilidade única por classe/componente

#### Qualidade de Código

- [ ] Arquivos com menos de 300 linhas
- [ ] Funções/métodos com menos de 20 linhas
- [ ] Nomes descritivos e autoexplicativos
- [ ] Sem código duplicado

#### Frontend (React)

- [ ] Usando hooks (useState, useEffect, useMemo)
- [ ] Usando React Query para server state
- [ ] Usando Zustand para client state global
- [ ] Separação de arquivos (JSX/styles/hooks/types)
- [ ] Componentes com menos de 200 linhas

#### Backend (Python)

- [ ] Usando async/await
- [ ] Type hints em todas as funções
- [ ] Pydantic para validação
- [ ] Repository pattern para persistência
- [ ] Exceções de domínio específicas

#### Testes

- [ ] Testes unitários para lógica de negócio
- [ ] Testes de casos de erro
- [ ] Padrão AAA (Arrange, Act, Assert)

---

## 🚫 ANTI-PATTERNS UNIVERSAIS

### Código

1. ❌ **God Classes** - Classes fazendo muitas coisas
2. ❌ **Entidades Anêmicas** - Apenas getters/setters, sem comportamento
3. ❌ **Código Duplicado** - Violar DRY
4. ❌ **Nomes Genéricos** - `data`, `info`, `util`, `helper`
5. ❌ **Abreviações** - `prod`, `cat`, `svc`, `usr`
6. ❌ **Magic Numbers/Strings** - Valores hardcoded sem constantes

### Arquitetura

7. ❌ **Dependências Invertidas** - Domain dependendo de Infrastructure
8. ❌ **Lógica no Router/Controller** - Regras de negócio na camada web
9. ❌ **Framework no Domain** - SQLAlchemy annotations no domínio
10. ❌ **Use Cases Gigantes** - Casos de uso fazendo muitas coisas

### Frontend Específico

11. ❌ **Lógica no JSX** - Extrair para hooks
12. ❌ **Props Drilling** - Mais de 2 níveis, use Context ou Zustand
13. ❌ **Estilos Inline** - Usar arquivos separados
14. ❌ **Componentes > 200 linhas** - Dividir em subcomponentes
15. ❌ **any no TypeScript** - Sempre tipar corretamente

### Backend Específico

16. ❌ **Sync em código async** - Usar bibliotecas async (httpx, asyncpg)
17. ❌ **Retornar `None` silenciosamente** - Usar `Optional` + exceções
18. ❌ **Catch genérico** - `except Exception:` sem tratamento

---

## 📚 REFERÊNCIA RÁPIDA

### Criar Novo Componente React

```typescript
// ✅ Template correto
// ComponentName/
// ├── ComponentName.tsx
// ├── ComponentName.styles.ts
// ├── ComponentName.hooks.ts
// ├── ComponentName.types.ts
// └── index.ts

// ComponentName.tsx
import { ComponentNameProps } from './ComponentName.types';
import { useComponentName } from './ComponentName.hooks';
import * as S from './ComponentName.styles';

export function ComponentName({ item, onSave }: ComponentNameProps) {
  const { state, handlers } = useComponentName();
  
  return (
    <S.Container>
      {/* JSX apenas */}
    </S.Container>
  );
}
```

### Criar Novo Service Python

```python
# ✅ Template correto
from typing import Optional
from app.domain.repositories.item_repository import IItemRepository
from app.domain.schemas.item import ItemResponse, ItemCreate
from app.domain.exceptions import ItemNaoEncontradoError

class ItemService:
    """Serviço de aplicação para items."""
    
    def __init__(self, item_repository: IItemRepository):
        self.item_repository = item_repository
    
    async def buscar_por_id(self, id: str) -> ItemResponse:
        """Busca item por ID."""
        item = await self.item_repository.find_by_id(id)
        if not item:
            raise ItemNaoEncontradoError(f"Item {id} não encontrado")
        return ItemResponse.model_validate(item)
    
    async def criar(self, dados: ItemCreate) -> ItemResponse:
        """Cria um novo item."""
        item = Item(**dados.model_dump())
        item = await self.item_repository.save(item)
        return ItemResponse.model_validate(item)
```

---

## 🔗 LINKS PARA DOCUMENTAÇÃO DETALHADA

| Documento            | Conteúdo                                                 |
| -------------------- | -------------------------------------------------------- |
| `regras-frontend.md` | React, TypeScript, React Query, Zustand, Testes Frontend |
| `regras-backend.md`  | Python, FastAPI, SQLAlchemy, Pydantic, Testes Backend    |
| `regras-testes.md`   | pytest, Vitest, Playwright, Cobertura                    |

---

## 📊 CORRESPONDÊNCIA Java/Angular → Python/React

### Backend

| Conceito Java            | Equivalente Python          |
| ------------------------ | --------------------------- |
| Spring Boot              | FastAPI                     |
| JPA/Hibernate            | SQLAlchemy                  |
| Lombok (@Data, @Getter)  | dataclasses / Pydantic      |
| Bean Validation          | Pydantic validators         |
| JUnit 5                  | pytest                      |
| Mockito                  | unittest.mock / pytest-mock |
| Maven                    | Poetry / pip                |
| Liquibase                | Alembic                     |
| Feign Client             | httpx / aiohttp             |
| @Service, @Repository    | FastAPI Depends             |
| @RequiredArgsConstructor | `__init__` + type hints     |
| Optional<T>              | Optional[T]                 |

### Frontend

| Conceito Angular          | Equivalente React          |
| ------------------------- | -------------------------- |
| `signal()`                | `useState()`               |
| `computed()`              | `useMemo()`                |
| `effect()`                | `useEffect()`              |
| `Observable` (HTTP)       | `useQuery()` (React Query) |
| `Subject/BehaviorSubject` | Zustand Store              |
| `@Input()/@Output()`      | Props / Callbacks          |
| Pipes                     | `formatters.ts`            |
| Interceptors              | Axios interceptors         |
| NgModules                 | Feature folders            |
| Lazy Loading Modules      | React.lazy + Suspense      |
| `takeUntil + destroy$`    | useEffect cleanup          |
| `async` pipe              | Suspense + React Query     |

---

**🚨 ESTAS DIRETRIZES SÃO INEGOCIÁVEIS**

Sempre siga todas as regras antes de implementar qualquer funcionalidade.
Em caso de dúvida, consulte os arquivos específicos de frontend ou backend.
