# Regras e Boas Práticas de Testes - Stack Python + React

> **Documento de Referência** - Práticas equivalentes ao documento de testes Java

---

## 📑 Índice

1. [Frameworks e Tecnologias](#1-frameworks-e-tecnologias)
2. [Estrutura e Organização](#2-estrutura-e-organização)
3. [Testes Backend (Python)](#3-testes-backend-python)
4. [Testes Frontend (React)](#4-testes-frontend-react)
5. [Mocking](#5-mocking)
6. [Testes Parametrizados](#6-testes-parametrizados)
7. [Cobertura de Código](#7-cobertura-de-código)
8. [Anti-Padrões a Evitar](#8-anti-padrões-a-evitar)

---

## 1. Frameworks e Tecnologias

### 1.1 Backend Python

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| **pytest** | 8.x | Framework principal de testes |
| **pytest-asyncio** | 0.23+ | Testes assíncronos |
| **pytest-mock** | 3.x | Integração com mocking |
| **pytest-cov** | 4.x | Cobertura de código |
| **httpx** | 0.27+ | Cliente HTTP para testes |
| **factory-boy** | 3.x | Factories para dados de teste |
| **Faker** | 22+ | Geração de dados fake |

### 1.2 Frontend React

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| **Vitest** | 2.x | Framework principal de testes |
| **React Testing Library** | 16.x | Testes de componentes |
| **@testing-library/user-event** | 14.x | Simulação de eventos |
| **MSW (Mock Service Worker)** | 2.x | Mock de APIs |
| **@testing-library/jest-dom** | 6.x | Matchers DOM |
| **Playwright** | 1.x | Testes E2E |

---

## 2. Estrutura e Organização

### 2.1 Backend Python

```
tests/
├── conftest.py                    # Fixtures globais
├── unit/                          # Testes unitários
│   ├── application/
│   │   └── services/
│   │       └── test_operacao_service.py
│   ├── domain/
│   │   ├── entities/
│   │   └── value_objects/
│   └── infrastructure/
│       └── repositories/
├── integration/                   # Testes de integração
│   ├── test_operacao_api.py
│   └── conftest.py
└── factories/                     # Factories
    └── operacao_factory.py
```

### 2.2 Frontend React

```
src/
├── features/operacao/
│   ├── components/
│   │   ├── OperacaoTable.tsx
│   │   └── OperacaoTable.test.tsx    # Co-located
│   ├── hooks/
│   │   ├── useOperacoes.ts
│   │   └── useOperacoes.test.ts
│   └── pages/
│       ├── OperacaoListPage.tsx
│       └── OperacaoListPage.test.tsx
├── shared/
│   └── utils/
│       ├── formatters.ts
│       └── formatters.test.ts
└── test/                              # Config global
    ├── setup.ts
    ├── mocks/
    │   └── handlers.ts                # MSW handlers
    └── utils/
        └── render.tsx                 # Custom render
```

---

## 3. Testes Backend (Python)

### 3.1 Configuração pytest

```python
# conftest.py
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from app.main import app
from app.infrastructure.database.base import Base
from app.infrastructure.database.session import get_session

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest.fixture(scope="session")
def event_loop():
    import asyncio
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
async def session():
    engine = create_async_engine(TEST_DATABASE_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async_session = AsyncSession(engine, expire_on_commit=False)
    try:
        yield async_session
    finally:
        await async_session.rollback()
        await async_session.close()

@pytest.fixture
async def client(session):
    async def override_get_session():
        yield session
    
    app.dependency_overrides[get_session] = override_get_session
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
```

### 3.2 Testes de Serviço

```python
# tests/unit/application/services/test_operacao_service.py
import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import date
from app.application.services.operacao_service import OperacaoService
from app.domain.entities.operacao import Operacao
from app.domain.enums import SituacaoOperacao

class TestOperacaoService:
    
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
    async def test_listar_por_data_retorna_operacoes(self, service, mock_repository):
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
    async def test_buscar_por_id_nao_encontrado_lanca_excecao(self, service, mock_repository):
        # Arrange
        mock_repository.find_by_id.return_value = None
        
        # Act & Assert
        with pytest.raises(OperacaoNaoEncontradaError):
            await service.buscar_por_id("inexistente")
```

### 3.3 Testes de API (Integration)

```python
# tests/integration/test_operacao_api.py
import pytest
from httpx import AsyncClient

class TestOperacaoAPI:
    
    @pytest.mark.asyncio
    async def test_listar_operacoes_retorna_200(self, client: AsyncClient, auth_headers):
        response = await client.get("/api/v1/operacao", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "dados" in data
        assert "total" in data
    
    @pytest.mark.asyncio
    async def test_criar_operacao_retorna_201(self, client: AsyncClient, auth_headers):
        payload = {
            "numero_operacao": "OP001",
            "data_movimento": "2024-01-20"
        }
        
        response = await client.post(
            "/api/v1/operacao",
            json=payload,
            headers=auth_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["numero_operacao"] == "OP001"
    
    @pytest.mark.asyncio
    async def test_buscar_operacao_inexistente_retorna_404(self, client: AsyncClient, auth_headers):
        response = await client.get(
            "/api/v1/operacao/inexistente",
            headers=auth_headers
        )
        
        assert response.status_code == 404
```

### 3.4 Validação Arquitetural (ArchUnit)

Para garantir que a arquitetura seja respeitada, utilizamos `pytest-archon`.

```python
# tests/unit/test_architecture.py
from pytest_archon import archrule

def test_domain_isolation():
    (
        archrule("domain_must_be_pure")
        .match("app.domain.*")
        .should_not_import("app.infrastructure.*")
        .should_not_import("app.application.*")
        .check("app")
    )
```

### 3.5 Factories

```python
# tests/factories/operacao_factory.py
import factory
from faker import Faker
from app.domain.entities.operacao import Operacao
from app.domain.enums import SituacaoOperacao

fake = Faker('pt_BR')

class OperacaoFactory(factory.Factory):
    class Meta:
        model = Operacao
    
    id = factory.LazyFunction(lambda: str(fake.uuid4()))
    numero_operacao = factory.Sequence(lambda n: f"OP{n:05d}")
    data_movimento = factory.LazyFunction(fake.date_object)
    situacao = SituacaoOperacao.ATIVA
    valor_financeiro = factory.LazyFunction(
        lambda: fake.pydecimal(left_digits=6, right_digits=2, positive=True)
    )
```

---

## 4. Testes Frontend (React)

### 4.1 Setup Vitest

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/'],
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
```

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, afterAll } from 'vitest';
import { server } from './mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => { cleanup(); server.resetHandlers(); });
afterAll(() => server.close());
```

### 4.2 MSW Setup

```typescript
// src/test/mocks/handlers.ts
import { http, HttpResponse } from 'msw';
import { operacaoMock } from './data';

export const handlers = [
  http.get('/api/v1/operacao', () => {
    return HttpResponse.json({
      dados: [operacaoMock],
      total: 1,
      pagina: 1,
      totalPaginas: 1,
    });
  }),
  
  http.get('/api/v1/operacao/:id', ({ params }) => {
    if (params.id === 'inexistente') {
      return HttpResponse.json({ detail: 'Não encontrado' }, { status: 404 });
    }
    return HttpResponse.json(operacaoMock);
  }),
  
  http.post('/api/v1/operacao', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: '123', ...body }, { status: 201 });
  }),
];

// src/test/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';
export const server = setupServer(...handlers);
```

### 4.3 Custom Render

```typescript
// src/test/utils/render.tsx
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ReactElement } from 'react';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

function AllProviders({ children }: { children: React.ReactNode }) {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
}

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

export * from '@testing-library/react';
export { renderWithProviders as render };
```

### 4.4 Testes de Componentes

```typescript
// features/operacao/components/OperacaoTable.test.tsx
import { screen } from '@testing-library/react';
import { render } from '@/test/utils/render';
import { OperacaoTable } from './OperacaoTable';
import { SituacaoOperacao } from '../types/operacao.types';

describe('OperacaoTable', () => {
  const operacoesMock = [
    {
      id: '1',
      numeroOperacao: 'OP001',
      dataMovimento: '2024-01-20',
      situacao: SituacaoOperacao.ATIVA,
    },
  ];

  it('deve renderizar tabela com operações', () => {
    render(<OperacaoTable operacoes={operacoesMock} />);

    expect(screen.getByText('OP001')).toBeInTheDocument();
    expect(screen.getByText('ATIVA')).toBeInTheDocument();
  });

  it('deve mostrar estado vazio quando não há operações', () => {
    render(<OperacaoTable operacoes={[]} />);

    expect(screen.getByText(/nenhuma operação/i)).toBeInTheDocument();
  });

  it('deve mostrar skeleton quando carregando', () => {
    render(<OperacaoTable operacoes={[]} isLoading />);

    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
  });
});
```

### 4.5 Testes de Hooks

```typescript
// features/operacao/hooks/useOperacoes.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useOperacoes } from './useOperacoes';

const wrapper = ({ children }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe('useOperacoes', () => {
  it('deve buscar operações com sucesso', async () => {
    const { result } = renderHook(() => useOperacoes({}, 1), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.dados).toHaveLength(1);
    expect(result.current.data?.dados[0].numeroOperacao).toBe('OP001');
  });

  it('deve usar filtro na query', async () => {
    const filtro = { situacao: 'ATIVA' };
    const { result } = renderHook(() => useOperacoes(filtro, 1), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
```

### 4.6 Testes de Páginas

```typescript
// features/operacao/pages/OperacaoListPage.test.tsx
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@/test/utils/render';
import { OperacaoListPage } from './OperacaoListPage';

describe('OperacaoListPage', () => {
  it('deve renderizar lista de operações', async () => {
    render(<OperacaoListPage />);

    await waitFor(() => {
      expect(screen.getByText('OP001')).toBeInTheDocument();
    });
  });

  it('deve filtrar operações ao submeter filtro', async () => {
    const user = userEvent.setup();
    render(<OperacaoListPage />);

    const input = screen.getByPlaceholderText(/número/i);
    await user.type(input, 'OP002');
    await user.click(screen.getByRole('button', { name: /filtrar/i }));

    await waitFor(() => {
      expect(screen.getByText('OP002')).toBeInTheDocument();
    });
  });
});
```

---

## 5. Mocking

### 5.1 Python (pytest-mock)

```python
# Usando pytest-mock
def test_com_mock(mocker):
    mock_service = mocker.patch('app.services.external_service')
    mock_service.return_value = {'status': 'ok'}
    
    resultado = funcao_que_usa_service()
    
    assert resultado == {'status': 'ok'}
    mock_service.assert_called_once()

# Usando unittest.mock
from unittest.mock import AsyncMock, patch, MagicMock

@pytest.mark.asyncio
async def test_com_asyncmock():
    mock_repo = AsyncMock()
    mock_repo.find_by_id.return_value = Operacao(id="123")
    
    service = OperacaoService(operacao_repository=mock_repo)
    resultado = await service.buscar_por_id("123")
    
    assert resultado.id == "123"
```

### 5.2 React (MSW + vi.mock)

```typescript
// MSW para APIs
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';

test('trata erro da API', async () => {
  server.use(
    http.get('/api/v1/operacao', () => {
      return HttpResponse.json({ error: 'Erro' }, { status: 500 });
    })
  );

  render(<OperacaoListPage />);
  await waitFor(() => {
    expect(screen.getByText(/erro/i)).toBeInTheDocument();
  });
});

// vi.mock para módulos
vi.mock('@/shared/services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));
```

### 5.3 Mocking de "Static" / Módulos (Python)

Em Python, não precisamos de `sun.misc.Unsafe`. Usamos `patch` para substituir módulos ou funções diretamente.

```python
from unittest.mock import patch
from datetime import datetime

# Substitui datetime.now()
@patch('app.services.service.datetime')
def test_com_data_fixa(mock_datetime):
    mock_datetime.now.return_value = datetime(2024, 1, 1)
    mock_datetime.side_effect = lambda *args, **kw: datetime(*args, **kw)
    
    # ... executa teste
```

---

## 6. Testes Parametrizados

### 6.1 Python

```python
import pytest

@pytest.mark.parametrize("situacao,esperado", [
    (SituacaoOperacao.ATIVA, True),
    (SituacaoOperacao.PENDENTE, False),
    (SituacaoOperacao.CANCELADA, False),
])
def test_is_valida(situacao, esperado):
    operacao = Operacao(situacao=situacao)
    assert operacao.is_valida() == esperado

@pytest.mark.parametrize("valor,mensagem_erro", [
    ("", "Número obrigatório"),
    ("X" * 21, "Máximo 20 caracteres"),
])
def test_validacao_numero_operacao(valor, mensagem_erro):
    with pytest.raises(ValidationError) as exc:
        OperacaoCreate(numero_operacao=valor, data_movimento="2024-01-20")
    assert mensagem_erro in str(exc.value)
```

### 6.2 React (Vitest)

```typescript
import { describe, it, expect } from 'vitest';

describe.each([
  { situacao: 'ATIVA', variant: 'success' },
  { situacao: 'PENDENTE', variant: 'warning' },
  { situacao: 'CANCELADA', variant: 'destructive' },
])('Badge de situação', ({ situacao, variant }) => {
  it(`deve usar variant ${variant} para ${situacao}`, () => {
    render(<SituacaoBadge situacao={situacao} />);
    expect(screen.getByText(situacao)).toHaveClass(`badge-${variant}`);
  });
});

it.each([
  ['2024-01-20', '20/01/2024'],
  ['2024-12-31', '31/12/2024'],
])('formatDate(%s) retorna %s', (input, expected) => {
  expect(formatDate(input)).toBe(expected);
});
```

---

## 7. Cobertura de Código

### 7.1 Python (pytest-cov)

```toml
# pyproject.toml
[tool.pytest.ini_options]
addopts = "--cov=app --cov-report=term-missing --cov-fail-under=80"

[tool.coverage.run]
branch = true
source = ["app"]
omit = ["app/main.py", "*/conftest.py"]

[tool.coverage.report]
exclude_lines = [
    "pragma: no cover",
    "if TYPE_CHECKING:",
    "raise NotImplementedError",
]
```

### 7.2 React (Vitest)

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/', '**/*.d.ts'],
      thresholds: {
        lines: 80,
        branches: 70,
        functions: 80,
        statements: 80,
      },
    },
  },
});
```

### 7.3 Metas de Cobertura

| Métrica | Meta Mínima | Meta Ideal |
|---------|-------------|------------|
| Linhas | 70% | 85%+ |
| Branches | 60% | 75%+ |
| Domínio/Entities | 80% | 90%+ |
| Services/Hooks | 75% | 85%+ |
| API/Controllers | 70% | 80%+ |

---

## 8. Anti-Padrões a Evitar

### ❌ Testes Sem Asserções

```python
# ❌ INCORRETO
def test_processar():
    servico.processar(dado)

# ✅ CORRETO
def test_processar():
    resultado = servico.processar(dado)
    assert resultado is not None
    mock_repo.save.assert_called_once()
```

### ❌ Mocks Excessivos

```typescript
// ❌ INCORRETO - Mock de valor simples
const mockText = vi.fn().mockReturnValue('texto');

// ✅ CORRETO - Use valores reais
const texto = 'valor teste';
```

### ❌ Testes que Dependem de Ordem

```python
# ❌ INCORRETO
contador = 0

def test_1():
    global contador
    contador += 1

def test_2():
    assert contador == 1  # Pode falhar!
```

### ❌ Testes que Acessam Recursos Externos

```typescript
// ❌ INCORRETO
test('busca dados', async () => {
  const response = await fetch('https://api-real.com/dados');
  // Conecta na API real!
});

// ✅ CORRETO - Use MSW
test('busca dados', async () => {
  render(<Component />);
  await waitFor(() => expect(screen.getByText('dados')).toBeInTheDocument());
});
```

---

## 📌 Checklist de Code Review

### Estrutura
- [ ] Arquivo de teste segue nomenclatura `test_*.py` ou `*.test.ts(x)`
- [ ] Fixtures/mocks configurados corretamente
- [ ] Imports organizados

### Mocking
- [ ] Mocks para dependências externas
- [ ] Evita mocks desnecessários
- [ ] MSW para APIs no frontend

### Asserções
- [ ] Pelo menos uma asserção por teste
- [ ] Testa casos de sucesso e erro
- [ ] Verifica chamadas de mock quando relevante

### Cobertura
- [ ] Cobertura >= 80%
- [ ] Testa branches principais
- [ ] Testa edge cases
