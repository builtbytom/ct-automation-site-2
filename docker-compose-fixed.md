# Fixed Docker Compose Configuration

Copy everything between the ```yaml markers below:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: ct_postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
    networks:
      - internal

  redis:
    image: redis:7-alpine
    container_name: ct_redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD} --appendonly yes
    volumes:
      - ./data/redis:/data
    networks:
      - internal

  n8n:
    image: n8nio/n8n
    container_name: ct_n8n
    restart: unless-stopped
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=${N8N_BASIC_AUTH_PASSWORD}
      - N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}
    volumes:
      - ./data/n8n:/home/node/.n8n
    ports:
      - "5678:5678"
    networks:
      - internal

  nginx:
    image: nginx:alpine
    container_name: ct_nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d
      - ./nginx/ssl:/etc/nginx/ssl
    networks:
      - internal
      - external

networks:
  internal:
    driver: bridge
  external:
    driver: bridge
```