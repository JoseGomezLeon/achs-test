#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

echo ""
echo "=== Piloto RBAC — Instalación del stack de tests ==="
echo ""

# ── npm dev dependencies ─────────────────────────────────────────────────────
echo "▶ Instalando dependencias npm..."
npm install -D \
  @japa/file-system \
  @types/better-sqlite3 \
  @playwright/test \
  @cucumber/cucumber \
  @pact-foundation/pact \
  toxiproxy-node-client \
  dependency-cruiser

echo "  ✓ dependencias npm instaladas"

# ── Playwright: descargar binarios del navegador del sistema ─────────────────
echo ""
echo "▶ Configurando Playwright para usar google-chrome del sistema..."
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npx playwright install-deps chromium 2>/dev/null || true
echo "  ✓ Playwright configurado (usará /usr/bin/google-chrome via executablePath)"

# ── allure-commandline (global) ───────────────────────────────────────────────
echo ""
echo "▶ Instalando allure-commandline globalmente..."
npm install -g allure-commandline --quiet
echo "  ✓ allure instalado globalmente"

# ── k6 (binario del sistema via snap) ────────────────────────────────────────
# Nota: la instalación via apt (dl.k6.io/deb) falla en Ubuntu 26.04 por problemas
# de firma del keyring GPG con gpgv. snap es el método confiable en este entorno.
echo ""
echo "▶ Instalando k6..."
if ! command -v k6 &>/dev/null; then
  if command -v snap &>/dev/null && command -v sudo &>/dev/null; then
    sudo snap install k6
    echo "  ✓ k6 instalado via snap"
  elif command -v sudo &>/dev/null; then
    echo "  ⚠ snap no disponible — intenta: sudo apt-get install -y k6 (si el repo ya está configurado)"
  else
    echo "  ⚠ sudo no disponible — instala k6 manualmente: https://k6.io/docs/get-started/installation/"
  fi
else
  echo "  ✓ k6 ya instalado: $(k6 version)"
fi

# ── Resumen ───────────────────────────────────────────────────────────────────
echo ""
echo "=== Verificación ==="
echo "node            : $(node -v)"
echo "npm             : $(npm -v)"
echo "@playwright/test: $(npx playwright --version 2>/dev/null || echo 'no encontrado')"
echo "cucumber-js     : $(npx cucumber-js --version 2>/dev/null || echo 'no encontrado')"
echo "@pact/pact      : $(npm ls @pact-foundation/pact --depth=0 2>/dev/null | grep pact | tr -d ' ' || echo 'no encontrado')"
echo "allure          : $(allure --version 2>/dev/null || echo 'no encontrado')"
echo "k6              : $(k6 version 2>/dev/null || echo 'no encontrado')"
echo "depcruise       : $(npx depcruise --version 2>/dev/null || echo 'no encontrado')"
echo ""
echo "✅ Stack instalado. Revisa los ⚠ arriba si algo faltó."
