# OpenClaw Astro Islands Migration

## Quick Start

```bash
# Development (Astro mode)
pnpm dev:astro

# Development (Vite mode - legacy)
pnpm dev

# Build
pnpm build:astro

# Type check
pnpm check
```

## Arquitetura

### Islands Architecture

OpenClaw UI usa **Astro Islands** para renderização parcial hidratada:

```
┌─────────────────────────────────────┐
│  HTML Estático (Astro)             │
│  ┌───────────────────────────────┐ │
│  │ <chat-island client:load>    │ │  ← Island interativa
│  │   (Lit component)             │ │
│  │   - Conecta com nanostores    │ │
│  │   - Event handlers            │ │
│  │   - Renderiza chat.ts         │ │
│  └───────────────────────────────┘ │
│                                     │
│  Conteúdo estático...              │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ <config-island client:load>  │ │  ← Outra island
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Componentes

#### Páginas Astro (`src/pages/*.astro`)

- Renderização estática no build
- Definem rotas (`/chat`, `/config`, `/logs`)
- Importam islands e aplicam hydration strategy

#### Islands (`src/ui/components/*-island.ts`)

- Lit components com `@customElement`
- Integram com nanostores via `StoreController`
- Delegam renderização para funções em `views/`
- Hidratados apenas quando necessário

#### Views (`src/ui/views/*.ts`)

- Funções puras de renderização (Lit `html`)
- Recebem `Props` como argumento
- Sem estado interno (stateless)
- Reutilizáveis entre islands

### Hydration Strategies

| Directive        | Quando Usar             | Exemplo         |
| ---------------- | ----------------------- | --------------- |
| `client:load`    | Crítico, acima da dobra | Chat, Config    |
| `client:visible` | Abaixo da dobra         | Overview, Stats |
| `client:idle`    | Não-crítico             | Settings, Debug |
| `client:only`    | ❌ Evitar (perde SSR)   | -               |

## Estado Global (Nanostores)

```typescript
// Stores em src/stores/
$connected; // Gateway connection status
$chatLoading; // Chat loading state
$chatMessage; // Draft message
$chatMessages; // Message history
$activeSession; // Current session key
```

### Padrão de Uso

```typescript
import { StoreController } from "@nanostores/lit";
import { $chatMessage } from "../../stores/chat.ts";

class MyIsland extends LitElement {
  private message = new StoreController(this, $chatMessage);

  render() {
    return html`<div>${this.message.value}</div>`;
  }

  handleInput(value: string) {
    $chatMessage.set(value); // Update store
  }
}
```

## Rotas

| Rota         | Island          | View           | Status              |
| ------------ | --------------- | -------------- | ------------------- |
| `/chat`      | `chat-island`   | `chat.ts`      | ✅ Estrutura criada |
| `/config`    | `config-island` | `config.ts`    | ✅ Estrutura criada |
| `/logs`      | `logs-island`   | `logs.ts`      | ✅ Estrutura criada |
| `/overview`  | -               | `overview.ts`  | ⏳ Pendente         |
| `/channels`  | -               | `channels.ts`  | ⏳ Pendente         |
| `/instances` | -               | `instances.ts` | ⏳ Pendente         |
| ...          | ...             | ...            | ...                 |

## TODOs de Implementação

### Chat Island

- [ ] WebSocket connection para mensagens
- [ ] HTTP POST para envio de mensagens
- [ ] Criação de novas sessões
- [ ] Upload de imagens (attachments)
- [ ] Markdown rendering
- [ ] Scroll to bottom automático

### Config Island

- [ ] GET `/config` - Load config
- [ ] POST `/config` - Save config
- [ ] GET `/config/schema` - Load schema
- [ ] PATCH `/config/apply` - Apply config

### Logs Island

- [ ] GET `/logs` - Load logs
- [ ] WebSocket para streaming real-time
- [ ] Export to file
- [ ] Filter persistence (localStorage)

## Performance

### Bundle Size

- **Base (Astro)**: ~5KB
- **Chat island**: ~80KB (lazy loaded)
- **Config island**: ~40KB (lazy loaded)
- **Logs island**: ~20KB (lazy loaded)

### Hydration Time

- Target: < 100ms TTI (Time to Interactive)
- Estratégia: `client:load` apenas para crítico

### Code Splitting

```
dist/
├── chunks/
│   ├── chat-island.[hash].js     # Lazy loaded
│   ├── config-island.[hash].js   # Lazy loaded
│   └── logs-island.[hash].js     # Lazy loaded
├── pages/
│   ├── chat.html                 # SSG output
│   ├── config.html
│   └── logs.html
└── _astro/                        # Shared chunks
```

## Debugging

### Dev Tools

```bash
# Astro dev server with HMR
pnpm dev:astro

# Build and preview
pnpm build:astro && pnpm preview:astro

# Type check
pnpm check
```

### Common Issues

**Hydration mismatch**

- Causa: SSR HTML ≠ client render
- Fix: Use `client:only` temporariamente, depois investigue

**Store not updating**

- Causa: Store não registrado no StoreController
- Fix: `new StoreController(this, $store)`

**Island não renderiza**

- Causa: Custom element não registrado
- Fix: Verificar `@customElement('name')` e import no `.astro`

## Migração Incremental

1. **Criar página Astro** (`src/pages/name.astro`)
2. **Criar island** (`src/ui/components/name-island.ts`)
3. **Conectar stores** (usar `StoreController`)
4. **Preservar view** (manter `views/name.ts` intacto)
5. **Testar funcionalidade** (comparar com versão Vite)
6. **Implementar API calls** (gateway integration)
7. **Deploy** (marcar como migrado)

## Referências

- [Astro Islands](https://docs.astro.build/en/concepts/islands/)
- [Lit integration](https://docs.astro.build/en/guides/integrations-guide/lit/)
- [Nanostores](https://github.com/nanostores/nanostores)
- [OpenClaw CLAUDE.md](../CLAUDE.md)
