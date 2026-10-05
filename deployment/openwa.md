# Production Deployment Runbook: OpenWA Multi-Tenant WhatsApp Gateway

## 1. Architecture Overview

OpenWA runs as an independent, persistent gateway service on a dedicated Linux VPS/instance (e.g. `wa.printflow.bd` or internal VPC network). It provides multi-session WhatsApp connectivity for PrintFlow tenants while remaining completely decoupled from PrintFlow's Vercel/Next.js frontend.

```
                           +----------------------------------------+
                           |       PrintFlow Next.js (Vercel)        |
                           |   app.printflow.bd / api.printflow.bd   |
                           +----------------------------------------+
                                     |                     ^
             HTTPS (Server-to-Server)|                     | POST Webhook
             X-API-Key Authentication|                     | HMAC-SHA256 Signed
                                     v                     |
                           +----------------------------------------+
                           |   Reverse Proxy (Nginx + SSL / HTTPS)  |
                           |            wa.printflow.bd             |
                           +----------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------------+
| OpenWA Host VPS (Docker Compose Network)                                      |
|                                                                               |
|  +--------------------+    +--------------------+    +---------------------+  |
|  |   OpenWA Core      |    | PostgreSQL Engine  |    | Redis Cache & Queue |  |
|  |   (Port 2785)      |--->| (OpenWA Internal)  |    | (BullMQ / Pacing)   |  |
|  +--------------------+    +--------------------+    +---------------------+  |
|            |                                                                  |
|            +---> Persistent Volume: /app/data (Session Browser Profiles/Auth) |
|            |                                                                  |
|  +--------------------+    +--------------------+                             |
|  | Tenant Session A   |    | Tenant Session B   |                             |
|  | (Chromium Headless)|    | (Chromium Headless)|                             |
|  +--------------------+    +--------------------+                             |
+-------------------------------------------------------------------------------+
```

---

## 2. Upstream Version Specification

* **Repository:** [https://github.com/rmyndharis/OpenWA.git](https://github.com/rmyndharis/OpenWA.git)
* **Release Version:** `0.24.0`
* **Verified Git Commit:** `261fd4e902649328eb2eefd8ee592237cfd94fa2`
* **Node Target:** `Node.js 22 LTS`
* **API Specification:** OpenAPI 3.0 (`/api/docs`)

---

## 3. Server Hardware Recommendations

| Component | Minimum (1–10 Tenants) | Recommended (10–50 Tenants) | Enterprise (50–200+ Tenants) |
| :--- | :--- | :--- | :--- |
| **CPU** | 2 vCPU | 4 vCPU | 8–16 vCPU |
| **RAM** | 4 GB | 8–16 GB | 32–64 GB |
| **Storage** | 40 GB NVMe SSD | 100 GB NVMe SSD | 250+ GB NVMe SSD |
| **OS** | Ubuntu 24.04 LTS | Ubuntu 24.04 LTS | Ubuntu 24.04 LTS |

> **Memory Rule of Thumb:** `whatsapp-web.js` consumes ~300–450 MB RAM per active session for headless Chromium. If running >25 concurrent sessions, allocate at least 16 GB RAM with adequate swap.

---

## 4. Production Docker Compose Configuration

Create `/opt/openwa/docker-compose.yml`:

```yaml
version: '3.8'

services:
  openwa-db:
    image: postgres:16-alpine
    container_name: openwa_postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${OPENWA_DB_USER:-openwa_admin}
      POSTGRES_PASSWORD: ${OPENWA_DB_PASSWORD:?Required}
      POSTGRES_DB: ${OPENWA_DB_NAME:-openwa_gateway}
    volumes:
      - openwa_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${OPENWA_DB_USER:-openwa_admin} -d ${OPENWA_DB_NAME:-openwa_gateway}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - openwa-net

  openwa-redis:
    image: redis:7-alpine
    container_name: openwa_redis
    restart: unless-stopped
    command: redis-server --requirepass ${OPENWA_REDIS_PASSWORD:?Required} --appendonly yes
    volumes:
      - openwa_redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${OPENWA_REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - openwa-net

  openwa-gateway:
    image: rmyndharis/openwa:0.24.0
    container_name: openwa_core
    restart: unless-stopped
    depends_on:
      openwa-db:
        condition: service_healthy
      openwa-redis:
        condition: service_healthy
    ports:
      - "127.0.0.1:2785:2785"
    environment:
      NODE_ENV: production
      PORT: 2785
      DATABASE_TYPE: postgres
      DATABASE_HOST: openwa-db
      DATABASE_PORT: 5432
      DATABASE_USERNAME: ${OPENWA_DB_USER:-openwa_admin}
      DATABASE_PASSWORD: ${OPENWA_DB_PASSWORD}
      DATABASE_NAME: ${OPENWA_DB_NAME:-openwa_gateway}
      REDIS_HOST: openwa-redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${OPENWA_REDIS_PASSWORD}
      API_KEY: ${OPENWA_MASTER_API_KEY:?Required}
      API_KEY_PEPPER: ${OPENWA_API_KEY_PEPPER:?Required}
      WEBHOOK_GLOBAL_SECRET: ${OPENWA_WEBHOOK_SECRET:?Required}
      SEND_PACING_ENABLED: "true"
      SEND_PACING_COLD_DAILY_CAP: 250
      SEND_PACING_WARMUP_SCHEDULE: "20,50,100,200,500"
      SIMULATE_TYPING: "true"
      PUPPETEER_EXECUTABLE_PATH: /usr/bin/chromium
      BODY_SIZE_LIMIT: 25mb
      WEBHOOK_MAX_PAYLOAD_BYTES: 1048576
      WEBHOOK_MEDIA_INLINE_MAX_BYTES: 1048576
    volumes:
      - openwa_sessions:/app/data
      - /etc/timezone:/etc/timezone:ro
      - /etc/localtime:/etc/localtime:ro
    healthcheck:
      test: ["CMD-SHELL", "curl -f -H 'X-API-Key: ${OPENWA_MASTER_API_KEY}' http://localhost:2785/api/stats/overview || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - openwa-net

volumes:
  openwa_pgdata:
  openwa_redisdata:
  openwa_sessions:

networks:
  openwa-net:
    driver: bridge
```

---

## 5. Nginx Reverse Proxy with HTTPS & WebSockets

Create `/etc/nginx/sites-available/wa.printflow.bd`:

```nginx
server {
    listen 80;
    server_name wa.printflow.bd;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name wa.printflow.bd;

    ssl_certificate /etc/letsencrypt/live/wa.printflow.bd/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/wa.printflow.bd/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    client_max_body_size 30M;

    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass http://127.0.0.1:2785;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 90s;
        proxy_send_timeout 90s;
    }
}
```

---

## 6. PrintFlow Environment Variables Configuration

Add the following variables to `.env.local` / Vercel Environment Variables:

```bash
# ==============================================================================
# PrintFlow - OpenWA Gateway Connection Configuration
# ==============================================================================
OPENWA_BASE_URL="https://wa.printflow.bd/api"
OPENWA_API_KEY="owa_admin_secret_generated_api_key"
OPENWA_WEBHOOK_SECRET="super_secret_hmac_sha256_webhook_key_min_32_chars"
NEXT_PUBLIC_APP_URL="https://app.printflow.bd"
```

---

## 7. Operational Runbook

### Health Check Command
```bash
curl -I -H "X-API-Key: YOUR_API_KEY" https://wa.printflow.bd/api/stats/overview
```

### Session Backup Procedure
The WhatsApp authentication state resides in `openwa_sessions` volume. Back up nightly:
```bash
docker run --rm -v openwa_sessions:/data -v /backup/openwa:/backup alpine \
  tar czf /backup/openwa-sessions-$(date +%Y%m%d).tar.gz -C /data .
```

### Safe Zero-Downtime Rolling Upgrade
```bash
docker compose pull openwa-gateway
docker compose up -d --no-deps openwa-gateway
```
Session authentication data in `/app/data` is preserved, so active phone links remain connected.
