#!/bin/bash
# ================================================================
# First-time SSL Certificate Setup
# Run this ONCE on the EC2 instance after DNS is pointing to it
#
# Usage:
#   DOMAIN_ADMIN=admin.example.com DOMAIN_CUSTOMER=portal.example.com bash init-ssl.sh
# ================================================================

set -euo pipefail

if [ -z "${DOMAIN_ADMIN:-}" ] || [ -z "${DOMAIN_CUSTOMER:-}" ]; then
  echo "Usage: DOMAIN_ADMIN=admin.example.com DOMAIN_CUSTOMER=portal.example.com bash init-ssl.sh"
  exit 1
fi

EMAIL="${CERTBOT_EMAIL:-admin@${DOMAIN_ADMIN}}"

cd ~/leads-portal

echo "[1/4] Using initial HTTP-only nginx config..."
cp nginx/conf.d/default.conf.initial nginx/conf.d/default.conf

echo "[2/4] Starting services with HTTP only..."
docker compose up -d db admin customer nginx
echo "  Waiting for services to be ready..."
sleep 15

echo "[3/4] Obtaining SSL certificates..."
docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN_ADMIN" \
  -d "$DOMAIN_CUSTOMER"

echo "[4/4] Switching to SSL nginx config..."
sed -e "s/DOMAIN_ADMIN_PLACEHOLDER/$DOMAIN_ADMIN/g" \
    -e "s/DOMAIN_CUSTOMER_PLACEHOLDER/$DOMAIN_CUSTOMER/g" \
    nginx/conf.d/default.conf.template > nginx/conf.d/default.conf

docker compose restart nginx

echo ""
echo "SSL setup complete!"
echo "  https://$DOMAIN_ADMIN"
echo "  https://$DOMAIN_CUSTOMER"
