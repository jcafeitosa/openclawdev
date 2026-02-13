#!/usr/bin/env bash
# Verificação da configuração do Health Monitor

set -euo pipefail

echo "🏥 Verificando configuração do Health Monitor..."
echo

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

check_pass() {
    echo -e "${GREEN}✓${NC} $1"
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
}

# 1. Verificar se health-monitor está na lista de agentes
echo "1. Verificando configuração de agentes..."
if grep -q '"id": "health-monitor"' ~/.openclaw/openclaw.json; then
    check_pass "Health Monitor registrado em agents.list"
else
    check_fail "Health Monitor NÃO encontrado em agents.list"
    exit 1
fi

# 2. Verificar se main permite health-monitor
echo
echo "2. Verificando allowAgents do main..."
if grep -A 70 '"id": "main"' ~/.openclaw/openclaw.json | grep -q '"health-monitor"'; then
    check_pass "Health Monitor está em main.subagents.allowAgents"
else
    check_fail "Health Monitor NÃO está em main.subagents.allowAgents"
    exit 1
fi

# 3. Verificar workspace
echo
echo "3. Verificando workspace..."
WORKSPACE_DIR=~/.openclaw/agents/health-monitor/workspace

if [ -d "$WORKSPACE_DIR" ]; then
    check_pass "Workspace directory existe: $WORKSPACE_DIR"
else
    check_fail "Workspace directory NÃO existe: $WORKSPACE_DIR"
    exit 1
fi

# 4. Verificar arquivos de configuração
echo
echo "4. Verificando arquivos do workspace..."

declare -a FILES=(
    "HEARTBEAT.md"
    "IDENTITY.md"
    "SOUL.md"
    "TOOLS.md"
    "README.md"
)

for file in "${FILES[@]}"; do
    if [ -f "$WORKSPACE_DIR/$file" ]; then
        check_pass "$file existe"
    else
        check_warn "$file NÃO existe (opcional mas recomendado)"
    fi
done

# 5. Verificar heartbeat configurado
echo
echo "5. Verificando heartbeat..."
if jq -e '.agents.list[] | select(.id=="health-monitor") | .heartbeat.every' ~/.openclaw/openclaw.json > /dev/null 2>&1; then
    INTERVAL=$(jq -r '.agents.list[] | select(.id=="health-monitor") | .heartbeat.every' ~/.openclaw/openclaw.json)
    check_pass "Heartbeat configurado: a cada $INTERVAL"
else
    check_warn "Heartbeat NÃO configurado (opcional)"
fi

# 6. Verificar modelo configurado
echo
echo "6. Verificando modelo..."
if jq -e '.agents.list[] | select(.id=="health-monitor") | .model.primary' ~/.openclaw/openclaw.json > /dev/null 2>&1; then
    MODEL=$(jq -r '.agents.list[] | select(.id=="health-monitor") | .model.primary' ~/.openclaw/openclaw.json)
    check_pass "Modelo configurado: $MODEL"
else
    check_warn "Modelo NÃO configurado (usará default)"
fi

# 7. Verificar especialistas permitidos
echo
echo "7. Verificando especialistas permitidos..."
ALLOWED_COUNT=$(jq -r '.agents.list[] | select(.id=="health-monitor") | .subagents.allowAgents | length' ~/.openclaw/openclaw.json)
if [ "$ALLOWED_COUNT" -gt 0 ]; then
    check_pass "$ALLOWED_COUNT especialistas podem ser spawned"
else
    check_warn "Nenhum especialista configurado (delegação não funcionará)"
fi

# 8. Testar se o agente pode ser listado
echo
echo "8. Testando listagem de agentes..."
if pnpm openclaw agents list 2>&1 | grep -q "health-monitor"; then
    check_pass "Health Monitor aparece em 'openclaw agents list'"
else
    check_warn "Health Monitor NÃO aparece em 'openclaw agents list' (pode precisar restart)"
fi

# Resumo
echo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RESUMO DA VERIFICAÇÃO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo
check_pass "Health Monitor está PRONTO para uso!"
echo
echo "Próximos passos:"
echo "  1. Reiniciar o gateway: pnpm openclaw gateway restart"
echo "  2. Verificar hierarquia: abra a UI e veja o grafo"
echo "  3. Testar manualmente: pnpm openclaw agent --message 'Run health check' --agent health-monitor"
echo
echo "O Health Monitor aparecerá no grafo conectado a 'main' (Marcelo)."
echo
