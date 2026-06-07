#!/bin/bash
# ============================================
# F9 Rendering — Deploy Script to HawkHost
# Usage: ./deploy.sh [backend|frontend|all]
# ============================================

set -e  # Exit on any error

# ─── Config ─────────────────────────────────
SSH_USER="thinhvu1"
SSH_HOST="sng129.arandomserver.com"
SSH_KEY="$HOME/.ssh/f9_hawkhost"
REMOTE_APP_DIR="~/f9-api"
LOCAL_SERVER_DIR="./server"
LOCAL_FRONTEND_DIR="."
SSH_CMD="ssh -i $SSH_KEY"
RSYNC_SSH="ssh -i $SSH_KEY"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[DEPLOY]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ─── Args ────────────────────────────────────
TARGET=${1:-all}  # backend | frontend | all

deploy_backend() {
  log "Building backend (TypeScript)..."
  cd "$LOCAL_SERVER_DIR"
  npm run build || err "TypeScript build failed"
  cd ..

  log "Uploading backend to HawkHost..."
  rsync -avz --delete -e "$RSYNC_SSH" \
    --exclude='node_modules' \
    --exclude='.env' \
    --exclude='uploads' \
    --exclude='.DS_Store' \
    --exclude='*.ts' \
    --exclude='fix-*.js' \
    --exclude='test-*.js' \
    --exclude='.htaccess' \
    --exclude='tmp' \
    "$LOCAL_SERVER_DIR/" \
    "$SSH_USER@$SSH_HOST:$REMOTE_APP_DIR/"

  log "Restarting Node.js app..."
  $SSH_CMD "$SSH_USER@$SSH_HOST" "
    source /home/thinhvu1/nodevenv/f9-api/18/bin/activate &&
    cd $REMOTE_APP_DIR &&
    npm install --production --silent &&
    mkdir -p tmp &&
    touch tmp/restart.txt 2>/dev/null || true
  "
  log "✅ Backend deployed!"
}

deploy_frontend() {
  log "Building frontend (Vite)..."
  npm run build || err "Vite build failed"

  log "Uploading frontend to f9render.com..."
  rsync -avz --delete -e "$RSYNC_SSH" \
    --exclude='.DS_Store' \
    --exclude='.htaccess' \
    dist/ \
    "$SSH_USER@$SSH_HOST:~/f9render.com/"

  log "✅ Frontend deployed!"
}

# ─── Run ────────────────────────────────────
echo ""
echo "🚀 F9 Rendering Deploy — Target: $TARGET"
echo "   Host: $SSH_HOST"
echo ""

case "$TARGET" in
  backend)  deploy_backend ;;
  frontend) deploy_frontend ;;
  all)
    deploy_backend
    deploy_frontend
    ;;
  *) err "Unknown target: $TARGET. Use: backend | frontend | all" ;;
esac

echo ""
log "🎉 Deploy complete!"
echo ""
echo "  Backend:  https://f9render.com/api/health"
echo "  Frontend: https://f9render.com"
echo ""
