#!/bin/bash
set -euo pipefail

mkdir -p /apps/casamento.backend

DB_PASS=$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)

docker exec postgres-vector psql -U postgres -c "CREATE USER casamento WITH PASSWORD '${DB_PASS}';" 2>/dev/null || true
docker exec postgres-vector psql -U postgres -c "CREATE DATABASE casamento OWNER casamento;" 2>/dev/null || true
docker exec postgres-vector psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE casamento TO casamento;" 2>/dev/null || true

if [ ! -f /apps/casamento.backend/.env ]; then
  JWT_SECRET=$(openssl rand -base64 48 | tr -d '/+=' | head -c 48)
  cat > /apps/casamento.backend/.env <<EOF
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://casamento:${DB_PASS}@postgres-vector:5432/casamento
JWT_SECRET=${JWT_SECRET}
ABACATEPAY_API_KEY=replace-with-real-abacatepay-api-key
ABACATEPAY_WEBHOOK_SECRET=replace-with-real-webhook-secret
ABACATEPAY_BASE_URL=https://api.abacatepay.com/v2
CORS_ORIGIN=https://tiagoegabriela.com.br
EOF
  chmod 600 /apps/casamento.backend/.env
  echo "Created .env"
else
  echo "Preserved existing .env"
fi

echo "Server prep complete"
