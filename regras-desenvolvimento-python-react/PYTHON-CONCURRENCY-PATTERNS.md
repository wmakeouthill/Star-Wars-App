# 🐍 Python 3.11+ Concurrency Patterns para Matchmaking

Este documento define as **melhores práticas de concorrência** para sistemas de matchmaking em Python, focando em high-concurrency, integridade de dados e arquitetura clean, equivalentes às práticas modernas de Java 21+.

---

## 1. Por Que Migrar de Redis para In-Memory (Asyncio)?

Em Python, o modelo de concorrência baseado em **Event Loop** (asyncio) oferece vantagens únicas para sistemas I/O bound (como matchmaking e websockets), eliminando muitas classes de race conditions comuns em multithreading.

| Aspecto             | Redis / Celery               | In-Memory (Python Asyncio)                        |
| ------------------- | ---------------------------- | ------------------------------------------------- |
| **Complexidade**    | Requer Broker/DB externo     | Zero dependências                                 |
| **Latência**        | ~1-5ms (network)             | **~0.0001ms** (dict lookup)                       |
| **Concurrency**     | Threads/Processes (pesado)   | Coroutinas (leve)                                 |
| **Race Conditions** | Locks Distribuídos Complexos | **Inexistentes para blocos síncronos**            |
| **Escalabilidade**  | Horizontal (várias máquinas) | Vertical (até 1 núcleo*) / Horizontal via Workers |

> **Nota**: O Global Interpreter Lock (GIL) do Python joga a nosso favor aqui. Como apenas uma thread roda por vez, **operações em memória sem `await` são atômicas por design**, eliminando a necessidade de locks complexos na maioria dos casos.

---

## 2. Fundamentos Python Moderno para Concorrência

### 2.1 Corrotinas & TaskGroups (vs Virtual Threads)

Enquanto Java usa Virtual Threads para bloquear barato, Python usa **Corrotinas** que suspendem a execução (non-blocking). Python 3.11+ introduziu `TaskGroup` para **Concorrência Estruturada** (Structured Concurrency).

```python
import asyncio

# ❌ Antes (Python antigo): gather ou create_task soltas
# Difícil tratar erros e cancelamentos em grupo
tasks = [asyncio.create_task(process_player(p)) for p in players]
await asyncio.gather(*tasks)

# ✅ Depois (Python 3.11+): Concorrência Estruturada
# Se uma falha, todas são canceladas graciosamente. Equivalente a StructuredTaskScope do Java.
async def process_match(players):
    async with asyncio.TaskGroup() as tg:
        for player in players:
            tg.create_task(notify_player_start(player))
    # Aqui garantimos que todos notificações foram enviadas ou tratadas
```

### 2.2 Dataclasses Congeladas (vs Records)

Para garantir integridade e imutabilidade dos dados da ação:

```python
from dataclasses import dataclass
from uuid import UUID
import time

# ✅ frozen=True torna a instância imutável e hashable
@dataclass(frozen=True)
class PlayerAction:
    player_id: UUID
    summoner_name: str
    action_type: str
    timestamp: float = time.time()

# Uso
action = PlayerAction(uuid_obj, "Faker", "ACCEPT")
# action.summoner_name = "Troll"  # ❌ Levanta FrozenInstanceError
```

### 2.3 Dicts & Atomics (vs ConcurrentHashMap)

Aqui reside o poder do Python Asyncio: **Não precisamos de ConcurrentHashMap**.
O event loop é single-threaded. Se você não fizer `await` no meio da operação, ninguém vai mexer no seu dicionário.

```python
match_acceptances: dict[int, set[str]] = {}

# ✅ ATÔMICO por natureza (sem locks!)
# Nenhuma outra corrotina pode interromper este bloco, pois não há 'await'
def process_acceptance_sync(match_id: int, player_name: str):
    if match_id not in match_acceptances:
        match_acceptances[match_id] = set()
    
    match_acceptances[match_id].add(player_name)
    
    if len(match_acceptances[match_id]) == 10:
        return True # Match ready
    return False
```

### 2.4 asyncio.Lock (vs ReentrantLock)

Use `asyncio.Lock` **apenas** quando a seção crítica envolver I/O (um `await`).

```python
lock = asyncio.Lock()
match_state = {}

async def finalize_match(match_id: int):
    # Precisamos de lock aqui porque 'save_to_db' pausa a execução,
    # permitindo que outro request altere 'match_state' durante a pausa.
    async with lock:
        if match_state.get(match_id) == "FINISHED":
            return
        
        # O estado pode mudar enquanto esperamos o DB se não tiver lock
        await save_to_db(match_id) 
        match_state[match_id] = "FINISHED"
```

### 2.5 asyncio.Queue (vs ConcurrentLinkedQueue)

Para garantir a ordem exata de processamento (FIFO). Ideal para filas de Matchmaking.

```python
queue = asyncio.Queue()

# Produtor (API Request)
async def join_queue(player):
    await queue.put(player) # Thread-safe e Async-safe

# Consumidor (Worker Loop)
async def matchmaking_worker():
    while True:
        # Pega o próximo na ordem exata de chegada
        player = await queue.get()
        await try_match(player)
        queue.task_done()
```

---

## 3. Arquitetura: Strategy Pattern com Protocol

Para manter a flexibilidade entre In-Memory (Dev/Test) e Redis (Prod), usamos `Protocol` (típico do Python moderno) ou `ABC`.

```python
from typing import Protocol, List

class MatchStateService(Protocol):
    async def create_match(self, match_id: int, players: List[str]) -> None: ...
    async def accept_match(self, match_id: int, player_name: str) -> None: ...
    async def all_accepted(self, match_id: int) -> bool: ...

# Implementação In-Memory
class InMemoryMatchService:
    def __init__(self):
        self._matches = {} # Dict normal é suficiente!

    async def create_match(self, match_id: int, players: List[str]):
        self._matches[match_id] = {"pending": set(players), "accepted": set()}

    async def accept_match(self, match_id: int, player_name: str):
        if match_id in self._matches:
            self._matches[match_id]["pending"].discard(player_name)
            self._matches[match_id]["accepted"].add(player_name)

    async def all_accepted(self, match_id: int) -> bool:
        return len(self._matches.get(match_id, {}).get("pending", [])) == 0

# Implementação Redis
class RedisMatchService:
    def __init__(self, redis_client):
        self.redis = redis_client

    async def create_match(self, match_id: int, players: List[str]):
        await self.redis.sadd(f"match:{match_id}:pending", *players)
```

**Injeção de Dependência:**
```python
# config.py
def get_match_service() -> MatchStateService:
    if settings.USE_REDIS:
        return RedisMatchService(redis_client)
    return InMemoryMatchService()
```

---

## 4. Patterns Específicos para Matchmaking

### 4.1 Fila de Matchmaking (Ordenada)

Em Python, uma `list` simples pode servir de fila se usarmos `append` e `pop(0)`, mas `asyncio.Queue` é mais robusta para controle de fluxo.

```python
import asyncio
from dataclasses import dataclass

@dataclass(frozen=True)
class QueuePlayer:
    id: str
    mmr: int
    entry_time: float

class MatchmakingQueue:
    def __init__(self):
        self._queue = asyncio.Queue()
    
    async def add_player(self, player: QueuePlayer):
        await self._queue.put(player)
    
    async def process_queue(self):
        buffer = []
        while True:
            # Pega 10 jogadores ou espera
            while len(buffer) < 10:
                player = await self._queue.get()
                buffer.append(player)
            
            match = self.find_balanced_match(buffer)
            if match:
                await self.start_match(match)
                # Remove os usados do buffer
            else:
                # Retorna jogadores não usados para prioridade?
                # Estratégia complexa: geralmente usa-se listas ordenadas customizadas
                pass
```

### 4.2 Gerenciamento de WebSockets

FastAPI + WebSockets é o padrão ouro moderno.

```python
from fastapi import WebSocket, WebSocketDisconnect

class ConnectionManager:
    def __init__(self):
        # Mapeamento: player_id -> WebSocket
        self.active_connections: dict[str, WebSocket] = {}

    async def connect(self, player_id: str, websocket: WebSocket):
        await websocket.accept()
        # Se já tiver conexão, fecha a anterior (kick)
        if player_id in self.active_connections:
            await self.active_connections[player_id].close()
        self.active_connections[player_id] = websocket

    def disconnect(self, player_id: str):
        if player_id in self.active_connections:
            del self.active_connections[player_id]

    async def send_personal_message(self, message: str, player_id: str):
        if ws := self.active_connections.get(player_id):
            await ws.send_text(message)
```

---

## 5. Checklist de Migração Java -> Python

| Conceito Java         | Equivalente Python                 | Nota                                              |
| --------------------- | ---------------------------------- | ------------------------------------------------- |
| `Virtual Threads`     | `async`/`await` Coroutines         | Python é Non-blocking I/O por padrão.             |
| `ConcurrentHashMap`   | `dict` (Standard Dictionary)       | Seguro em single-thread (Asyncio).                |
| `ReentrantLock`       | `asyncio.Lock`                     | Só necessário se houver `await` na seção crítica. |
| `Record`              | `@dataclass(frozen=True)`          | Imutabilidade garantida.                          |
| `StructuredTaskScope` | `asyncio.TaskGroup` (Python 3.11+) | Gerenciamento de vida de tasks.                   |
| `Thread.sleep()`      | `await asyncio.sleep()`            | Nunca use `time.sleep()`!                         |

---

## 6. Cuidados e Limitações

1.  **Blocking Code é Proibido**:
    *   NUNCA rode código pesado (CPU intensive) ou bloqueante (ex: `requests.get`, `time.sleep`) dentro de uma função async. Isso para o servidor inteiro.
    *   **Solução**: Use bibliotecas async (`httpx` em vez de `requests`, `asyncpg` em vez de `psycopg2`) ou rode em threadpool: `await asyncio.to_thread(cpu_func)`.

2.  **Escala Vertical**:
    *   Python é limitado a 1 núcleo por processo (geralmente).
    *   **Solução**: Para produção, rode múltiplos workers (ex: Gunicorn/Uvicorn com 4 workers). Note que `In-Memory` state **NÃO é compartilhado** entre workers.
    *   Se precisar de múltiplos workers, você **DEVE** usar Redis ou uma solução de IPC. Para dev/single-instance, In-Memory funciona perfeitamente.

3.  **Memory Cleanup**:
    *   Objetos em `global dicts` ficam lá para sempre (Memory Leak).
    *   Use `WeakValueDictionary` se possível, ou implemente um cleanup periódico com `asyncio.create_task(cleanup_loop())`.
