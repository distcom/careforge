# CareForge EHR - Deployment Guide

## Overview
This document provides instructions for deploying CareForge EHR in various environments.

## Prerequisites

### System Requirements
| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 4 cores | 8 cores |
| RAM | 8 GB | 16 GB |
| Storage | 100 GB SSD | 500 GB SSD |
| Network | 100 Mbps | 1 Gbps |

### Software Requirements
- **Node.js**: 20.x LTS
- **PostgreSQL**: 16.x
- **Redis**: 7.x
- **Docker**: 24.x (optional)
- **Nginx**: 1.24.x (reverse proxy)

## Development Deployment

### 1. Clone Repository
```bash
git clone https://github.com/distcom/careforge.git
cd careforge
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
```bash
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/careforge_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-development-secret
JWT_REFRESH_SECRET=your-refresh-secret
PORT=3000
```

### 4. Database Setup
```bash
npx prisma migrate dev
npx prisma db seed
```

### 5. Start Development Server
```bash
npm run dev
```

## Production Deployment

### Option 1: Docker Compose

#### docker-compose.prod.yml
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: careforge_prod
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/careforge_prod
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      JWT_SECRET: ${JWT_SECRET}
      NODE_ENV: production
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    ports:
      - "3000:3000"

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    environment:
      NEXT_PUBLIC_API_URL: http://api:3000
    depends_on:
      - api
    ports:
      - "3001:3001"

volumes:
  postgres_data:
  redis_data:
```

#### Deploy
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Option 2: Bare Metal

#### 1. Install Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### 2. Install PostgreSQL
```bash
sudo apt-get install -y postgresql-16
sudo -u postgres createdb careforge_prod
sudo -u postgres createuser careforge_user
```

#### 3. Install Redis
```bash
sudo apt-get install -y redis-server
sudo systemctl enable redis-server
```

#### 4. Deploy Application
```bash
cd /opt/careforge
npm ci --production
npm run build
npm run start:prod
```

#### 5. Configure Systemd Service
```ini
# /etc/systemd/system/careforge-api.service
[Unit]
Description=CareForge API
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=careforge
WorkingDirectory=/opt/careforge
ExecStart=/usr/bin/node apps/api/dist/main.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=/opt/careforge/.env

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable careforge-api
sudo systemctl start careforge-api
```

### Option 3: Kubernetes

#### k8s/deployment.yaml
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: careforge-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: careforge-api
  template:
    metadata:
      labels:
        app: careforge-api
    spec:
      containers:
      - name: api
        image: careforge/api:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: careforge-secrets
              key: database-url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: careforge-secrets
              key: jwt-secret
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

## Environment Variables

### Required Variables
| Variable | Description | Example |
|----------|-------------|---------|
| DATABASE_URL | PostgreSQL connection string | postgresql://user:pass@host:5432/db |
| REDIS_URL | Redis connection string | redis://:pass@host:6379 |
| JWT_SECRET | JWT signing secret | random-64-char-string |
| JWT_REFRESH_SECRET | Refresh token secret | random-64-char-string |
| NODE_ENV | Environment name | production |

### Optional Variables
| Variable | Description | Default |
|----------|-------------|---------|
| PORT | API port | 3000 |
| LOG_LEVEL | Logging level | info |
| CORS_ORIGINS | Allowed origins | * |
| RATE_LIMIT_MAX | Max requests/min | 100 |

## Database Migration

### Run Migrations
```bash
npx prisma migrate deploy
```

### Seed Database
```bash
npx prisma db seed
```

### Backup Database
```bash
pg_dump -h localhost -U careforge_user careforge_prod > backup_$(date +%Y%m%d).sql
```

### Restore Database
```bash
psql -h localhost -U careforge_user careforge_prod < backup_20260721.sql
```

## Health Checks

### API Health
```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2026-07-21T09:00:00Z",
  "database": "connected",
  "redis": "connected"
}
```

### Readiness Check
```bash
curl http://localhost:3000/ready
```

## Monitoring

### Prometheus Metrics
```bash
curl http://localhost:3000/metrics
```

### Log Aggregation
- Logs written to stdout in JSON format
- Configure log shipper (Fluentd, Logstash) for aggregation
- Recommended: ELK Stack or Grafana Loki

## Security Checklist

- [ ] Use strong, unique passwords
- [ ] Enable TLS/SSL certificates
- [ ] Configure firewall rules
- [ ] Enable database encryption
- [ ] Set up automated backups
- [ ] Configure rate limiting
- [ ] Enable audit logging
- [ ] Regular security updates
- [ ] Restrict network access
- [ ] Implement intrusion detection

## Troubleshooting

### Common Issues

#### Database Connection Failed
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check connection
psql -h localhost -U careforge_user -d careforge_prod
```

#### Redis Connection Failed
```bash
# Check Redis status
sudo systemctl status redis-server

# Test connection
redis-cli ping
```

#### Application Won't Start
```bash
# Check logs
journalctl -u careforge-api -f

# Check environment
node -e "console.log(process.env.DATABASE_URL)"
```

## Support

- **Documentation**: https://docs.careforge.health
- **Support Email**: support@careforge.health
- **Status Page**: https://status.careforge.health

## Last Updated
2026-07-21
