#!/bin/bash
#
# Memory Maintenance Script
# Automated daily/weekly memory consolidation and cleanup
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="/tmp/openclaw/memory-maintenance"

mkdir -p "$LOG_DIR"

# Detect mode (daily or weekly)
MODE="${1:-daily}"
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
LOG_FILE="$LOG_DIR/maintenance-$MODE-$TIMESTAMP.log"

echo "=== Memory Maintenance ($MODE) - $TIMESTAMP ===" | tee "$LOG_FILE"

# Function: Log with timestamp
log() {
    echo "[$(date +%H:%M:%S)] $*" | tee -a "$LOG_FILE"
}

# Function: Run consolidation
run_consolidation() {
    log "Running memory consolidation ($MODE mode)..."
    cd "$PROJECT_DIR"
    
    # Use stub version until we have data (TODO: switch to full version later)
    CONSOLIDATE_SCRIPT="src/services/agent-memory/consolidate-memories-stub.ts"
    
    if [ ! -f "$CONSOLIDATE_SCRIPT" ]; then
        log "⚠️  Stub not found, trying full consolidation..."
        CONSOLIDATE_SCRIPT="src/services/agent-memory/consolidate-memories.ts"
    fi
    
    if bun "$CONSOLIDATE_SCRIPT" --mode="$MODE" 2>&1 | tee -a "$LOG_FILE"; then
        log "✅ Consolidation completed successfully"
        return 0
    else
        log "❌ Consolidation failed with exit code $?"
        return 1
    fi
}

# Function: Run retention decay
run_retention_decay() {
    log "Running retention decay..."
    
    # Use full path to psql (macOS Homebrew PostgreSQL)
    PSQL="/usr/local/Cellar/postgresql@17/17.8/bin/psql"
    
    if [ ! -x "$PSQL" ]; then
        log "⚠️  psql not found at $PSQL, trying system PATH..."
        PSQL=$(which psql 2>/dev/null || echo "")
    fi
    
    if [ -z "$PSQL" ]; then
        log "❌ psql not found in PATH"
        return 1
    fi
    
    if "$PSQL" -h localhost -p 5432 -U juliocezar -d openclaw \
        -c "SELECT * FROM decay_retention_scores();" 2>&1 | tee -a "$LOG_FILE"; then
        log "✅ Retention decay completed"
        return 0
    else
        log "❌ Retention decay failed"
        return 1
    fi
}

# Function: Run vacuum (weekly only)
run_vacuum() {
    log "Running VACUUM ANALYZE on agent_memory..."
    
    # Use full path to psql (macOS Homebrew PostgreSQL)
    PSQL="/usr/local/Cellar/postgresql@17/17.8/bin/psql"
    
    if [ ! -x "$PSQL" ]; then
        log "⚠️  psql not found at $PSQL, trying system PATH..."
        PSQL=$(which psql 2>/dev/null || echo "")
    fi
    
    if [ -z "$PSQL" ]; then
        log "❌ psql not found in PATH"
        return 1
    fi
    
    if "$PSQL" -h localhost -p 5432 -U juliocezar -d openclaw \
        -c "VACUUM ANALYZE agent_memory;" 2>&1 | tee -a "$LOG_FILE"; then
        log "✅ VACUUM completed"
        return 0
    else
        log "❌ VACUUM failed"
        return 1
    fi
}

# Main execution
case "$MODE" in
    daily)
        log "🌅 Daily maintenance starting..."
        run_consolidation
        CONSOLIDATION_RESULT=$?
        
        run_retention_decay
        DECAY_RESULT=$?
        
        if [ $CONSOLIDATION_RESULT -eq 0 ] && [ $DECAY_RESULT -eq 0 ]; then
            log "✅ Daily maintenance completed successfully"
            exit 0
        else
            log "⚠️  Daily maintenance completed with errors"
            exit 1
        fi
        ;;
    
    weekly)
        log "📅 Weekly maintenance starting..."
        run_consolidation
        CONSOLIDATION_RESULT=$?
        
        run_retention_decay
        DECAY_RESULT=$?
        
        run_vacuum
        VACUUM_RESULT=$?
        
        if [ $CONSOLIDATION_RESULT -eq 0 ] && [ $DECAY_RESULT -eq 0 ] && [ $VACUUM_RESULT -eq 0 ]; then
            log "✅ Weekly maintenance completed successfully"
            exit 0
        else
            log "⚠️  Weekly maintenance completed with errors"
            exit 1
        fi
        ;;
    
    *)
        echo "Usage: $0 {daily|weekly}"
        exit 1
        ;;
esac
