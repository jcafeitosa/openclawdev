# ADR-003: Model Health Checks

## Status

Aceito

## Contexto

O sistema de classificação e routing de modelos sofria de gaps críticos na detecção de disponibilidade e saúde dos modelos. Modelos podiam ser selecionados mesmo quando indisponíveis, causando falhas em runtime. Não havia visibilidade sobre degradação de performance ou timeout patterns antes de routing decisions serem tomadas.

Problemas identificados:

- Falhas de routing para modelos offline ou com rate limits excedidos
- Ausência de early warning para degradação de performance
- Cascading failures quando modelos primários falhavam sem detecção prévia
- Impossibilidade de decisões preventivas baseadas em health state

## Decisão

Implementar **active health probes** no sistema de model registry:

1. **Probe Types:**
   - Lightweight ping probes (< 100ms) para availability checks
   - Performance probes (test prompts) executados periodicamente
   - Circuit breaker state monitoring

2. **Probe Frequency:**
   - Availability: a cada 30s para modelos em uso ativo
   - Performance: a cada 5min para modelos marcados como primary
   - On-demand probes antes de routing decisions críticas

3. **Health States:**
   - `healthy`: Latência normal, sem erros recentes
   - `degraded`: Latência elevada (>2x baseline) ou erros intermitentes
   - `unhealthy`: Timeouts consistentes ou rate limits ativos
   - `unknown`: Não foi possível obter health status

4. **Integration:**
   - Health checks alimentam o routing engine com dados em tempo real
   - Modelos `unhealthy` são automaticamente excluídos da seleção
   - Modelos `degraded` têm score penalty no ranking

## Consequências

**Positivas:**

- Detecção proativa de problemas antes de impactar usuários
- Routing decisions baseadas em estado real dos modelos
- Redução de retry loops e failed requests
- Visibilidade operacional sobre health do provider ecosystem

**Negativas:**

- Overhead de API calls para health probes (~10-15 requests/min)
- Complexidade adicional no model registry management
- Potencial para false positives em networks instáveis
- Custo adicional em providers que cobram por request

**Trade-offs:**

- Probe frequency vs API cost: balanceado em 30s/5min
- Probe complexity vs latency: preferimos lightweight pings
- False positive rate vs missed failures: ajustável via thresholds

## Alternativas Consideradas

### 1. Reactive Health Checks (Apenas on-failure)

**Por que não:** Resulta em first-user-pays pattern. Usuário sofre a falha antes do sistema reagir.

### 2. Passive Monitoring (Apenas logs históricos)

**Por que não:** Dados atrasados não previnem failures iminentes. Circuit breakers reagem tarde demais.

### 3. Provider-Reported Status APIs

**Por que não:** Nem todos providers oferecem. Dados podem estar desatualizados. Não reflete nossa network path.

### 4. Health Checks com Test Prompts Reais

**Por que não:** Custo proibitivo. Latência alta (>1s). Desnecessário para basic availability.
