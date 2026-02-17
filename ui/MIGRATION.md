# OpenClaw UI Migration to Astro Islands

## Overview

Migração progressiva do frontend OpenClaw de Lit puro para Astro com Islands Architecture.

## Status da Migração

### ✅ Fase 1: Infraestrutura

- [x] Astro configurado (hybrid mode)
- [x] Lit integration ativa
- [x] Nanostores configurados
- [x] BaseLayout criado
- [x] Stores existentes mapeados

### ✅ Fase 2: Views Principais (Prioridade Alta)

#### Chat View (`/chat`)

- [x] Página Astro criada (`src/pages/chat.astro`)
- [x] Island component (`chat-island.ts`)
- [x] Integração com stores:
  - `$chatLoading`, `$chatSending`, `$chatMessage`
  - `$chatMessages`, `$chatToolMessages`
  - `$chatStream`, `$chatStreamStartedAt`
  - `$chatQueue`, `$chatAttachments`
  - `$sidebarOpen`, `$sidebarContent`, `$sidebarError`, `$splitRatio`
- [x] Lógica de renderização preservada (`renderChat()`)
- [ ] TODO: Implementar comunicação com gateway (WebSocket/HTTP)
- [ ] TODO: Implementar criação de sessões
- [ ] TODO: Implementar envio de mensagens

#### Config View (`/config`)

- [x] Página Astro criada (`src/pages/config.astro`)
- [x] Island component (`config-island.ts`)
- [x] Form mode + Raw mode
- [x] Diff tracking para mudanças
- [x] Schema validation
- [ ] TODO: Implementar load/save/apply do gateway
- [ ] TODO: Conectar com API de schema

#### Logs View (`/logs`)

- [x] Página Astro criada (`src/pages/logs.astro`)
- [x] Island component (`logs-island.ts`)
- [x] Auto-scroll implementado
- [x] Filtros de nível (trace, debug, info, warn, error, fatal)
- [x] Export de logs
- [x] Polling (2s interval)
- [ ] TODO: Conectar com API de logs do gateway
- [ ] TODO: Implementar streaming real-time (WebSocket)

### 🔄 Fase 3: Views Secundárias (Próxima)

- [ ] Overview (`/overview`)
- [ ] Channels (`/channels`)
- [ ] Instances (`/instances`)
- [ ] Sessions (`/sessions`)
- [ ] Cron (`/cron`)
- [ ] Providers (`/providers`)
- [ ] Usage (`/usage`)
- [ ] Health (`/health`)
- [ ] Voice (`/voice`)
- [ ] Twitter (`/twitter`)

### 🔄 Fase 4: Agent Views

- [ ] Agents (`/agents`)
- [ ] Hierarchy (`/hierarchy`)
- [ ] Skills (`/skills`)
- [ ] Nodes (`/nodes`)
- [ ] Resources (`/resources`)

### 🔄 Fase 5: Settings Views

- [ ] Security (`/security`)
- [ ] Debug (`/debug`)

## Arquitetura

### Estrutura de Arquivos

```
ui/src/
├── pages/              # Astro pages (rotas)
│   ├── index.astro     # Redirect temporário
│   ├── chat.astro      ✅
│   ├── config.astro    ✅
│   └── logs.astro      ✅
├── layouts/
│   └── BaseLayout.astro
├── stores/             # Nanostores (estado global)
│   ├── app.ts          # App state, sessions
│   ├── chat.ts         # Chat state
│   └── gateway.ts      # Gateway connection
└── ui/
    ├── views/          # Lit render functions (preservados)
    │   ├── chat.ts
    │   ├── config.ts
    │   └── logs.ts
    └── components/     # Lit islands (novos)
        ├── chat-island.ts      ✅
        ├── config-island.ts    ✅
        └── logs-island.ts      ✅
```

### Padrão de Migração

1. **Criar página Astro** (`src/pages/<view>.astro`)
   - SSR/hybrid mode (`prerender: false`)
   - Import do island component
   - `client:load` para componentes críticos acima da dobra
   - `client:visible` para componentes abaixo da dobra
   - `client:idle` para componentes não-críticos

2. **Criar Island Component** (`src/ui/components/<view>-island.ts`)
   - Extend `LitElement`
   - `@customElement` decorator
   - `StoreController` para stores reativos
   - `@state` para estado local
   - `createRenderRoot()` retorna `this` (sem Shadow DOM)
   - Delega renderização para função existente em `views/`

3. **Preservar Lógica Existente**
   - Funções de renderização em `views/` permanecem intactas
   - Tipos (`Props`) preservados
   - Helpers e utilities mantidos

4. **Integrar com Stores**
   - Use `StoreController` do `@nanostores/lit`
   - Subscribe nos stores necessários
   - Update stores via `.set()` nos event handlers

## Hydration Strategy

| Componente | Estratégia       | Motivo                                       |
| ---------- | ---------------- | -------------------------------------------- |
| Chat       | `client:load`    | Crítico, acima da dobra, interativo imediato |
| Config     | `client:load`    | Form complexo, interativo imediato           |
| Logs       | `client:load`    | Auto-scroll, streaming, interativo           |
| Overview   | `client:visible` | Abaixo da dobra, carrega quando visível      |
| Debug      | `client:idle`    | Não-crítico, carrega quando browser idle     |

## Guidelines

### Performance

- **NUNCA** use `client:only` (perde SSR)
- Minimize JS bundle: lazy load heavy components
- Use `client:visible` para conteúdo abaixo da dobra
- Use `client:idle` para widgets não-críticos

### Estado

- **Global state**: Nanostores
- **Local state**: `@state` no island
- **Derived state**: `computed()` do nanostores
- **Cross-island communication**: Stores compartilhados

### Acessibilidade

- Manter todos os `aria-*` attributes
- Focus management preservado
- Keyboard navigation funcional
- Screen reader support

### Styling

- CSS global preservado (`styles.css`)
- Classes Tailwind quando aplicável
- Sem CSS-in-JS (usar external stylesheets)

## TODOs Críticos

### Gateway Integration

- [ ] WebSocket connection manager
- [ ] HTTP API client
- [ ] Authentication flow
- [ ] Error handling + retry logic
- [ ] Reconnection strategy

### State Persistence

- [ ] localStorage sync para preferências
- [ ] Session restoration
- [ ] Draft auto-save

### Testing

- [ ] Vitest browser tests para islands
- [ ] E2E com Playwright
- [ ] Visual regression tests

## Riscos e Mitigações

| Risco                   | Mitigação                                        |
| ----------------------- | ------------------------------------------------ |
| Perda de funcionalidade | Manter views originais até island 100% funcional |
| Aumento de bundle size  | Code splitting, lazy loading                     |
| Complexidade de state   | Documentar stores, usar TypeScript strict        |
| Bugs de hidratação      | SSR-safe checks, `client:only` como fallback     |

## Rollout Plan

1. **Semana 1**: Chat, Config, Logs (✅ DONE - estrutura criada)
2. **Semana 2**: Gateway integration, WebSocket
3. **Semana 3**: Overview, Channels, Instances, Sessions
4. **Semana 4**: Providers, Usage, Health, Voice, Twitter
5. **Semana 5**: Agent views (Agents, Hierarchy, Skills, Nodes, Resources)
6. **Semana 6**: Security, Debug, Polish

## Validação

Antes de marcar uma view como "migrada":

- [ ] Funcionalidade 100% preservada
- [ ] Integração com gateway funcional
- [ ] Stores sincronizados
- [ ] Acessibilidade mantida
- [ ] Performance igual ou melhor
- [ ] Testes passando
- [ ] Sem erros de hidratação
