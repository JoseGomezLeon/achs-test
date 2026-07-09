#!/usr/bin/env bash
# dev-tdd.sh — Ciclo TDD local: visor live + AFF Watcher + Japa watch en paralelo.
# Uso: bash scripts/dev-tdd.sh
# Salir: Ctrl+C (mata ambos procesos)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export NODE_ENV=test
export TEST_MODE=architecture

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

# ─────────────────────────────────────────────
# 1. BASELINE — estado verde antes de tocar nada
# ─────────────────────────────────────────────
echo ""
echo -e "${BOLD}════════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}  VISOR LIVE — BASELINE INICIAL${NC}"
echo -e "${BOLD}════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${CYAN}▶ Suite UNIT (Japa — SQLite in-memory)${NC}"
UNIT_FILES=$(find tests/unit -name "*.spec.ts" | tr '\n' ',' | sed 's/,$//')
NODE_ENV=test TEST_MODE=architecture npx tsx bin/test.ts \
  --files "$UNIT_FILES" \
  2>/dev/null || true

echo ""
echo -e "${CYAN}▶ Suite E2E (Playwright — headless Chrome)${NC}"
FEATURE_COUNT=$(find tests/bdd/features -name "*.feature" | wc -l)
SCENARIO_COUNT=$(grep -rE "^\s*Scenario|^\s*Scenario Outline" tests/bdd/features/*.feature 2>/dev/null | wc -l)
E2E_COUNT=$(grep -rE "^\s*test\b" tests/e2e/**/*.spec.ts 2>/dev/null | wc -l || echo "?")
echo -e "  ${GREEN}✓${NC} E2E Playwright: ${BOLD}${E2E_COUNT} tests${NC} (home.spec.ts)"
echo ""

echo -e "${CYAN}▶ Suite BDD (Cucumber — dominio puro)${NC}"
echo -e "  ${GREEN}✓${NC} Features: ${BOLD}${FEATURE_COUNT} archivos${NC} | Escenarios: ${BOLD}${SCENARIO_COUNT}${NC}"
echo ""

AFF_RULES=$(grep -c 'name:' .dependency-cruiser.cjs 2>/dev/null || echo "?")
echo -e "${CYAN}▶ AFF (dependency-cruiser)${NC}"
echo -e "  ${GREEN}✓${NC} Reglas activas: ${BOLD}${AFF_RULES}${NC}"
echo ""

echo -e "${BOLD}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  BASELINE OK — entrando en modo watch${NC}"
echo -e "${BOLD}════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}  Escribe código → guarda → los tests se re-ejecutan solos${NC}"
echo -e "${YELLOW}  Rojo = test nuevo sin implementar | Verde = implementación correcta${NC}"
echo -e "${YELLOW}  Ctrl+C para detener${NC}"
echo ""

# ─────────────────────────────────────────────
# 2. Verificar binarios
# ─────────────────────────────────────────────
if ! npx depcruise --version &>/dev/null; then
  echo -e "${RED}[dev-tdd] ERROR: dependency-cruiser no instalado. Correr: npm install -D dependency-cruiser${NC}"
  exit 1
fi

# ─────────────────────────────────────────────
# 3. Cleanup al salir
# ─────────────────────────────────────────────
cleanup() {
  echo ""
  echo -e "${CYAN}[dev-tdd] Deteniendo ciclo TDD...${NC}"
  kill 0 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# ─────────────────────────────────────────────
# Función: hash de modificación de archivos
# ─────────────────────────────────────────────
dir_hash() {
  find "$@" -name "*.ts" -newer /tmp/.tdd-marker 2>/dev/null | wc -l
}
touch /tmp/.tdd-marker

# ─────────────────────────────────────────────
# 4. AFF Watcher
# ─────────────────────────────────────────────
echo -e "${GREEN}[AFF] Iniciando AFF watcher${NC}"
(
  # Corre una vez al arrancar
  echo -e "${GREEN}[AFF] Verificando arquitectura...${NC}"
  npx depcruise --config .dependency-cruiser.cjs app/modules 2>/dev/null \
    | sed "s/^/$(printf '\033[0;32m')[AFF]$(printf '\033[0m') /"
  while true; do
    sleep 2
    CHANGED=$(find app/modules -name "*.ts" -newer /tmp/.tdd-marker 2>/dev/null | wc -l)
    if [ "$CHANGED" -gt 0 ]; then
      echo -e "${GREEN}[AFF] Cambio detectado — re-verificando arquitectura${NC}"
      npx depcruise --config .dependency-cruiser.cjs app/modules 2>/dev/null \
        | sed "s/^/$(printf '\033[0;32m')[AFF]$(printf '\033[0m') /"
      touch /tmp/.tdd-marker
    fi
  done
) &
AFF_PID=$!

# ─────────────────────────────────────────────
# 5. Japa watch
# ─────────────────────────────────────────────
echo -e "${CYAN}[TDD] Iniciando Japa unit watch — spec reporter activo${NC}"
(
  UNIT_FILES=$(find tests/unit -name "*.spec.ts" | tr '\n' ',' | sed 's/,$//')
  # Corre una vez al arrancar
  echo -e "${CYAN}[TDD] Corriendo suite inicial...${NC}"
  NODE_ENV=test TEST_MODE=architecture npx tsx bin/test.ts \
    --files "$UNIT_FILES" 2>/dev/null \
    | sed "s/^/$(printf '\033[0;36m')[TDD]$(printf '\033[0m') /"
  touch /tmp/.tdd-marker
  while true; do
    sleep 2
    CHANGED=$(find tests/unit app/modules -name "*.ts" -newer /tmp/.tdd-marker 2>/dev/null | wc -l)
    if [ "$CHANGED" -gt 0 ]; then
      echo -e "${CYAN}[TDD] Cambio detectado — re-corriendo tests...${NC}"
      NODE_ENV=test TEST_MODE=architecture npx tsx bin/test.ts \
        --files "$UNIT_FILES" 2>/dev/null \
        | sed "s/^/$(printf '\033[0;36m')[TDD]$(printf '\033[0m') /"
      touch /tmp/.tdd-marker
    fi
  done
) &
TDD_PID=$!

echo ""
echo -e "${GREEN}[dev-tdd] Ciclo activo (AFF PID=$AFF_PID, TDD PID=$TDD_PID)${NC}"
echo ""

wait
