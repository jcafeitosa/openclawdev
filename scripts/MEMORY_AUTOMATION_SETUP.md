# Memory System - Automated Maintenance Setup

_Scripts para manutenção automática do sistema de memória_

---

## 📋 O Que Foi Criado

### 1. Script Principal

- **`memory-maintenance.sh`** — Script bash que executa consolidação, decay e vacuum

### 2. Configuração Cron (Opcional)

- **`memory-crontab.txt`** — Entradas para crontab tradicional

### 3. Configuração launchd (Recomendado para macOS)

- **`com.openclaw.memory-maintenance-daily.plist`** — Job diário (23:59)
- **`com.openclaw.memory-maintenance-weekly.plist`** — Job semanal (Domingo 01:00)

---

## 🚀 Instalação (Escolha UMA das opções)

### Opção A: launchd (Recomendado para macOS)

**Mais confiável que cron no macOS**

```bash
# 1. Copiar plists para ~/Library/LaunchAgents/
cp scripts/com.openclaw.memory-maintenance-*.plist ~/Library/LaunchAgents/

# 2. Carregar jobs
launchctl load ~/Library/LaunchAgents/com.openclaw.memory-maintenance-daily.plist
launchctl load ~/Library/LaunchAgents/com.openclaw.memory-maintenance-weekly.plist

# 3. Verificar status
launchctl list | grep openclaw

# 4. (Opcional) Testar agora
launchctl start com.openclaw.memory-maintenance-daily
```

**Desinstalar:**

```bash
launchctl unload ~/Library/LaunchAgents/com.openclaw.memory-maintenance-daily.plist
launchctl unload ~/Library/LaunchAgents/com.openclaw.memory-maintenance-weekly.plist
rm ~/Library/LaunchAgents/com.openclaw.memory-maintenance-*.plist
```

---

### Opção B: cron (Alternativa)

```bash
# 1. Editar crontab
crontab -e

# 2. Adicionar linhas (copiar de memory-crontab.txt):
59 23 * * * /Users/juliocezar/Desenvolvimento/openclawdev/scripts/memory-maintenance.sh daily >> /tmp/openclaw/memory-maintenance/cron.log 2>&1
0 1 * * 0 /Users/juliocezar/Desenvolvimento/openclawdev/scripts/memory-maintenance.sh weekly >> /tmp/openclaw/memory-maintenance/cron.log 2>&1

# 3. Salvar e sair (ESC :wq no vim)

# 4. Verificar
crontab -l
```

---

## 🧪 Teste Manual

**Antes de automatizar, teste manualmente:**

```bash
# Criar diretório de logs
mkdir -p /tmp/openclaw/memory-maintenance

# Testar daily
cd ~/Desenvolvimento/openclawdev
./scripts/memory-maintenance.sh daily

# Verificar log
cat /tmp/openclaw/memory-maintenance/maintenance-daily-*.log

# Testar weekly
./scripts/memory-maintenance.sh weekly

# Verificar log
cat /tmp/openclaw/memory-maintenance/maintenance-weekly-*.log
```

**Sucesso esperado:**

```
=== Memory Maintenance (daily) - 2026-02-16_15-30-00 ===
[15:30:00] 🌅 Daily maintenance starting...
[15:30:01] Running memory consolidation (daily mode)...
[15:30:02] ✅ Consolidation completed successfully
[15:30:02] Running retention decay...
[15:30:03] ✅ Retention decay completed
[15:30:03] ✅ Daily maintenance completed successfully
```

---

## 📅 Schedule

| Job        | Frequência | Horário   | O Que Faz                             |
| ---------- | ---------- | --------- | ------------------------------------- |
| **Daily**  | Todo dia   | 23:59 BRT | Consolidação diária + Retention decay |
| **Weekly** | Domingo    | 01:00 BRT | Consolidação semanal + Decay + VACUUM |

---

## 📊 Monitoramento

### Logs

**Localização:**

```
/tmp/openclaw/memory-maintenance/
├── cron.log                              (cron output)
├── daily.log                             (launchd daily)
├── daily.err                             (launchd daily errors)
├── weekly.log                            (launchd weekly)
├── weekly.err                            (launchd weekly errors)
├── maintenance-daily-YYYY-MM-DD_HH-MM-SS.log
└── maintenance-weekly-YYYY-MM-DD_HH-MM-SS.log
```

**Verificar logs recentes:**

```bash
# Últimos 50 linhas do log mais recente
ls -t /tmp/openclaw/memory-maintenance/maintenance-*.log | head -1 | xargs tail -50

# Buscar erros
grep -i "error\|failed\|❌" /tmp/openclaw/memory-maintenance/*.log
```

### Status do Job (launchd)

```bash
# Listar jobs OpenClaw
launchctl list | grep openclaw

# Ver detalhes
launchctl print user/$(id -u)/com.openclaw.memory-maintenance-daily

# Logs do sistema
log show --predicate 'subsystem == "com.apple.launchd"' --info --last 1h | grep openclaw
```

---

## ⚙️ Configuração Avançada

### Ajustar Horários

**launchd (editar plist):**

```bash
# Daily: mudar hora
nano ~/Library/LaunchAgents/com.openclaw.memory-maintenance-daily.plist

# Modificar:
<key>Hour</key>
<integer>23</integer>  <!-- Nova hora (0-23) -->

# Recarregar
launchctl unload ~/Library/LaunchAgents/com.openclaw.memory-maintenance-daily.plist
launchctl load ~/Library/LaunchAgents/com.openclaw.memory-maintenance-daily.plist
```

**cron:**

```bash
crontab -e
# Modificar: MIN HORA DIA MES DIA_SEMANA COMANDO
```

### Notificações (Opcional)

**Adicionar ao final do memory-maintenance.sh:**

```bash
# Notificar via macOS Notification Center
if [ $? -eq 0 ]; then
    osascript -e 'display notification "Memory maintenance completed" with title "OpenClaw"'
else
    osascript -e 'display notification "Memory maintenance FAILED" with title "OpenClaw" sound name "Basso"'
fi

# Ou via Telegram/Slack (usar message tool do OpenClaw)
```

---

## 🔧 Troubleshooting

### Job Não Executa

**launchd:**

```bash
# Verificar se está carregado
launchctl list | grep openclaw

# Se não aparecer, carregar:
launchctl load ~/Library/LaunchAgents/com.openclaw.memory-maintenance-daily.plist

# Verificar erros de sintaxe do plist
plutil -lint ~/Library/LaunchAgents/com.openclaw.memory-maintenance-daily.plist
```

**cron:**

```bash
# Verificar se cron está rodando (macOS)
sudo launchctl list | grep cron

# Ver logs do cron
tail -f /var/log/cron.log  # Se existir

# Testar manualmente
/Users/juliocezar/Desenvolvimento/openclawdev/scripts/memory-maintenance.sh daily
```

### PostgreSQL Authentication

**Se falhar com "Peer authentication failed":**

```bash
# Opção 1: Configurar .pgpass
echo "localhost:5432:openclaw:juliocezar:SENHA" > ~/.pgpass
chmod 600 ~/.pgpass

# Opção 2: Configurar pg_hba.conf para trust local
# (menos seguro, só em dev)
```

### PATH Issues (launchd)

**Se bun/psql não for encontrado:**

Editar plist e adicionar PATH completo:

```xml
<key>EnvironmentVariables</key>
<dict>
    <key>PATH</key>
    <string>/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin:/Users/juliocezar/.bun/bin</string>
</dict>
```

---

## ✅ Checklist de Instalação

- [ ] Script `memory-maintenance.sh` executável (`chmod +x`)
- [ ] Testado manualmente (daily e weekly)
- [ ] Logs aparecem em `/tmp/openclaw/memory-maintenance/`
- [ ] Escolhido método (launchd OU cron)
- [ ] Jobs instalados e carregados
- [ ] Verificado com `launchctl list` ou `crontab -l`
- [ ] (Opcional) Testado execução via `launchctl start`
- [ ] (Opcional) Configurado notificações

---

## 📈 Próximos Passos

Depois de instalar automação:

1. **Monitorar primeira execução** (check logs amanhã)
2. **Validar resultados no banco:**
   ```sql
   SELECT agent_id, COUNT(*) as memories
   FROM agent_memory
   GROUP BY agent_id;
   ```
3. **Configurar alertas** (opcional, se falhar)
4. **Integrar context builder** com agent system

---

_Automação configurada. Sistema de memória roda 24/7 sem intervenção._ 🤖⚙️
