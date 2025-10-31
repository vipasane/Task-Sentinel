# Docker Deployment Guide

## Overview

Deploy Task Sentinel workers using Docker containers for consistent, portable, and isolated execution environments.

## Benefits

- **Consistency**: Same environment across dev, test, and production
- **Isolation**: Workers run in isolated containers
- **Portability**: Deploy anywhere Docker runs
- **Scalability**: Easy horizontal scaling with orchestration
- **Resource Limits**: Fine-grained resource control

## Quick Start

### 1. Create Dockerfile

Create `Dockerfile` in project root:

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript (if applicable)
RUN npm run build || true

# Production stage
FROM node:18-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S tasksentinel && \
    adduser -S tasksentinel -u 1001

WORKDIR /app

# Copy built application from builder
COPY --from=builder --chown=tasksentinel:tasksentinel /app/dist ./dist
COPY --from=builder --chown=tasksentinel:tasksentinel /app/node_modules ./node_modules
COPY --from=builder --chown=tasksentinel:tasksentinel /app/package*.json ./

# Create logs directory
RUN mkdir -p /app/logs && \
    chown -R tasksentinel:tasksentinel /app/logs

# Switch to non-root user
USER tasksentinel

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))" || exit 1

# Expose health endpoint port
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start worker
CMD ["node", "dist/index.js"]
```

### 2. Create Docker Compose File

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  # Single worker
  worker:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: task-sentinel-worker
    environment:
      - GITHUB_TOKEN=${GITHUB_TOKEN}
      - GITHUB_OWNER=${GITHUB_OWNER}
      - GITHUB_REPO=${GITHUB_REPO}
      - WORKER_ID=docker-worker-001
      - WORKER_HOSTNAME=docker-worker
      - WORKER_MAX_TASKS=10
      - LOCK_TTL_SECONDS=300
      - HEARTBEAT_INTERVAL_MS=30000
      - STALE_WORKER_THRESHOLD_MS=120000
      - LOAD_BALANCE_STRATEGY=least_loaded
      - MEMORY_SYNC_INTERVAL_MS=5000
    volumes:
      - ./logs:/app/logs
      - ./config:/app/config:ro
    restart: unless-stopped
    networks:
      - task-sentinel
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 3s
      start_period: 10s
      retries: 3

networks:
  task-sentinel:
    driver: bridge
```

### 3. Build and Run

```bash
# Build image
docker build -t task-sentinel:latest .

# Run single worker
docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps

# Stop worker
docker-compose down
```

## Multi-Worker Deployment

### Docker Compose with Multiple Workers

```yaml
version: '3.8'

services:
  # Worker 1
  worker-1:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: task-sentinel-worker-1
    environment:
      - GITHUB_TOKEN=${GITHUB_TOKEN}
      - GITHUB_OWNER=${GITHUB_OWNER}
      - GITHUB_REPO=${GITHUB_REPO}
      - WORKER_ID=docker-worker-001
      - WORKER_HOSTNAME=worker-1
      - WORKER_MAX_TASKS=10
    volumes:
      - ./logs/worker-1:/app/logs
    restart: unless-stopped
    networks:
      - task-sentinel
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G

  # Worker 2
  worker-2:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: task-sentinel-worker-2
    environment:
      - GITHUB_TOKEN=${GITHUB_TOKEN}
      - GITHUB_OWNER=${GITHUB_OWNER}
      - GITHUB_REPO=${GITHUB_REPO}
      - WORKER_ID=docker-worker-002
      - WORKER_HOSTNAME=worker-2
      - WORKER_MAX_TASKS=10
    volumes:
      - ./logs/worker-2:/app/logs
    restart: unless-stopped
    networks:
      - task-sentinel
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G

  # Worker 3
  worker-3:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: task-sentinel-worker-3
    environment:
      - GITHUB_TOKEN=${GITHUB_TOKEN}
      - GITHUB_OWNER=${GITHUB_OWNER}
      - GITHUB_REPO=${GITHUB_REPO}
      - WORKER_ID=docker-worker-003
      - WORKER_HOSTNAME=worker-3
      - WORKER_MAX_TASKS=10
    volumes:
      - ./logs/worker-3:/app/logs
    restart: unless-stopped
    networks:
      - task-sentinel
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G

  # Monitoring dashboard (optional)
  dashboard:
    build:
      context: .
      dockerfile: Dockerfile.dashboard
    container_name: task-sentinel-dashboard
    ports:
      - "8080:8080"
    environment:
      - GITHUB_TOKEN=${GITHUB_TOKEN}
      - GITHUB_OWNER=${GITHUB_OWNER}
      - GITHUB_REPO=${GITHUB_REPO}
    restart: unless-stopped
    networks:
      - task-sentinel

networks:
  task-sentinel:
    driver: bridge
```

### Scale Workers Dynamically

```bash
# Scale to 5 workers
docker-compose up -d --scale worker=5

# Scale down to 2 workers
docker-compose up -d --scale worker=2

# View scaled workers
docker-compose ps
```

## Kubernetes Deployment

### Deployment Configuration

Create `k8s/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: task-sentinel-worker
  namespace: task-sentinel
  labels:
    app: task-sentinel
    component: worker
spec:
  replicas: 3
  selector:
    matchLabels:
      app: task-sentinel
      component: worker
  template:
    metadata:
      labels:
        app: task-sentinel
        component: worker
    spec:
      containers:
      - name: worker
        image: task-sentinel:latest
        imagePullPolicy: Always
        env:
        - name: GITHUB_TOKEN
          valueFrom:
            secretKeyRef:
              name: task-sentinel-secrets
              key: github-token
        - name: GITHUB_OWNER
          value: "your-org"
        - name: GITHUB_REPO
          value: "your-repo"
        - name: WORKER_ID
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: WORKER_HOSTNAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        - name: WORKER_MAX_TASKS
          value: "10"
        - name: LOCK_TTL_SECONDS
          value: "300"
        - name: HEARTBEAT_INTERVAL_MS
          value: "30000"
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 30
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 10
          timeoutSeconds: 3
          failureThreshold: 3
        volumeMounts:
        - name: logs
          mountPath: /app/logs
        - name: config
          mountPath: /app/config
          readOnly: true
      volumes:
      - name: logs
        emptyDir: {}
      - name: config
        configMap:
          name: task-sentinel-config
      restartPolicy: Always
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: task-sentinel-config
  namespace: task-sentinel
data:
  task-sentinel.config.json: |
    {
      "distributed": {
        "enabled": true,
        "locking": {
          "ttlSeconds": 300,
          "retryAttempts": 3,
          "retryDelayMs": 1000
        },
        "heartbeat": {
          "intervalMs": 30000,
          "staleThresholdMs": 120000,
          "recoveryEnabled": true
        },
        "loadBalancer": {
          "strategy": "least_loaded"
        }
      }
    }
---
apiVersion: v1
kind: Secret
metadata:
  name: task-sentinel-secrets
  namespace: task-sentinel
type: Opaque
stringData:
  github-token: "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

### Horizontal Pod Autoscaler

Create `k8s/hpa.yaml`:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: task-sentinel-worker-hpa
  namespace: task-sentinel
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: task-sentinel-worker
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
      - type: Pods
        value: 4
        periodSeconds: 30
      selectPolicy: Max
```

### Deploy to Kubernetes

```bash
# Create namespace
kubectl create namespace task-sentinel

# Apply configurations
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/hpa.yaml

# Check deployment
kubectl get pods -n task-sentinel

# View logs
kubectl logs -f -n task-sentinel -l app=task-sentinel

# Scale manually
kubectl scale deployment task-sentinel-worker -n task-sentinel --replicas=5

# Check autoscaling
kubectl get hpa -n task-sentinel -w
```

## Docker Swarm Deployment

### Stack Configuration

Create `docker-stack.yml`:

```yaml
version: '3.8'

services:
  worker:
    image: task-sentinel:latest
    environment:
      - GITHUB_TOKEN=${GITHUB_TOKEN}
      - GITHUB_OWNER=${GITHUB_OWNER}
      - GITHUB_REPO=${GITHUB_REPO}
      - WORKER_MAX_TASKS=10
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
        failure_action: rollback
      rollback_config:
        parallelism: 1
        delay: 5s
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
      placement:
        constraints:
          - node.role == worker
        preferences:
          - spread: node.labels.region
    networks:
      - task-sentinel
    volumes:
      - logs:/app/logs
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 3s
      retries: 3

volumes:
  logs:
    driver: local

networks:
  task-sentinel:
    driver: overlay
    attachable: true
```

### Deploy to Swarm

```bash
# Initialize swarm (if not already)
docker swarm init

# Deploy stack
docker stack deploy -c docker-stack.yml task-sentinel

# Check services
docker stack services task-sentinel

# Scale service
docker service scale task-sentinel_worker=5

# View logs
docker service logs -f task-sentinel_worker

# Update service
docker service update --image task-sentinel:v2 task-sentinel_worker

# Remove stack
docker stack rm task-sentinel
```

## Advanced Configurations

### Multi-Stage Build with Optimization

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm ci

# Copy source code
COPY . .

# Build and test
RUN npm run build && npm test

# Prune dev dependencies
RUN npm prune --production

# Production stage
FROM node:18-alpine

# Security updates
RUN apk upgrade --no-cache && \
    apk add --no-cache dumb-init tini

# Create non-root user
RUN addgroup -g 1001 -S tasksentinel && \
    adduser -S tasksentinel -u 1001

WORKDIR /app

# Copy only production files
COPY --from=builder --chown=tasksentinel:tasksentinel /app/dist ./dist
COPY --from=builder --chown=tasksentinel:tasksentinel /app/node_modules ./node_modules
COPY --from=builder --chown=tasksentinel:tasksentinel /app/package*.json ./

# Create necessary directories
RUN mkdir -p /app/logs /app/tmp && \
    chown -R tasksentinel:tasksentinel /app

USER tasksentinel

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))" || exit 1

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
```

### Resource Monitoring Sidecar

```yaml
version: '3.8'

services:
  worker:
    image: task-sentinel:latest
    # ... worker configuration ...

  # Resource monitoring sidecar
  monitor:
    image: google/cadvisor:latest
    container_name: task-sentinel-monitor
    ports:
      - "8080:8080"
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
    restart: unless-stopped
    networks:
      - task-sentinel

  # Prometheus metrics exporter
  prometheus:
    image: prom/prometheus:latest
    container_name: task-sentinel-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    restart: unless-stopped
    networks:
      - task-sentinel

  # Grafana dashboard
  grafana:
    image: grafana/grafana:latest
    container_name: task-sentinel-grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
    restart: unless-stopped
    networks:
      - task-sentinel

volumes:
  prometheus-data:
  grafana-data:

networks:
  task-sentinel:
    driver: bridge
```

## Security Best Practices

### Dockerfile Security

```dockerfile
# Use specific version tags (not 'latest')
FROM node:18.19.0-alpine3.19

# Run security updates
RUN apk upgrade --no-cache

# Create non-root user with specific UID/GID
RUN addgroup -g 1001 -S tasksentinel && \
    adduser -S tasksentinel -u 1001 -G tasksentinel

# Set secure file permissions
RUN chmod 755 /app && \
    chmod 644 /app/package*.json

# Use read-only filesystem where possible
VOLUME ["/app/logs"]

# Drop all capabilities except needed ones
# (Configure in docker-compose or k8s)

USER tasksentinel

# Don't expose unnecessary ports
EXPOSE 3000

# Use specific entrypoint
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "--no-warnings", "dist/index.js"]
```

### Docker Compose Security

```yaml
version: '3.8'

services:
  worker:
    image: task-sentinel:latest
    # Read-only root filesystem
    read_only: true
    tmpfs:
      - /tmp
      - /app/logs
    # Drop all capabilities
    cap_drop:
      - ALL
    # Add only necessary capabilities
    cap_add:
      - NET_BIND_SERVICE
    # Security options
    security_opt:
      - no-new-privileges:true
    # Resource limits
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
          pids: 100
    # Secrets management (instead of env vars)
    secrets:
      - github_token
    environment:
      - GITHUB_TOKEN_FILE=/run/secrets/github_token

secrets:
  github_token:
    file: ./secrets/github_token.txt
```

## Monitoring and Logging

### Centralized Logging with ELK

```yaml
version: '3.8'

services:
  worker:
    image: task-sentinel:latest
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
        labels: "worker_id,environment"
    # ... rest of configuration ...

  # Elasticsearch
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    container_name: elasticsearch
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch-data:/usr/share/elasticsearch/data
    networks:
      - task-sentinel

  # Logstash
  logstash:
    image: docker.elastic.co/logstash/logstash:8.11.0
    container_name: logstash
    volumes:
      - ./logstash/pipeline:/usr/share/logstash/pipeline
    ports:
      - "5044:5044"
    networks:
      - task-sentinel
    depends_on:
      - elasticsearch

  # Kibana
  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    container_name: kibana
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    networks:
      - task-sentinel
    depends_on:
      - elasticsearch

volumes:
  elasticsearch-data:

networks:
  task-sentinel:
    driver: bridge
```

## Troubleshooting

### Container Won't Start

**Check logs:**
```bash
docker-compose logs worker
docker logs <container-id>
```

**Common issues:**
- Missing environment variables
- Invalid GitHub token
- Port conflicts
- Resource constraints

**Solutions:**
```bash
# Verify environment
docker-compose config

# Check resource usage
docker stats

# Inspect container
docker inspect <container-id>
```

### High Memory Usage

**Monitor memory:**
```bash
docker stats --no-stream
```

**Solutions:**
```yaml
services:
  worker:
    environment:
      - NODE_OPTIONS=--max-old-space-size=2048
    deploy:
      resources:
        limits:
          memory: 3G
```

### Health Check Failures

**Debug health check:**
```bash
# Execute health check manually
docker exec <container-id> wget --quiet --tries=1 --spider http://localhost:3000/health

# Check health status
docker inspect --format='{{.State.Health.Status}}' <container-id>
```

## Performance Tuning

### Optimize Image Size

```dockerfile
# Use alpine variant
FROM node:18-alpine

# Multi-stage build
FROM node:18 AS builder
# ... build steps ...
FROM node:18-alpine
COPY --from=builder /app/dist ./dist

# Remove unnecessary files
RUN rm -rf /tmp/* /var/cache/apk/*
```

### Optimize Docker Layer Caching

```dockerfile
# Copy dependencies first (changes less frequently)
COPY package*.json ./
RUN npm ci

# Copy source code last (changes more frequently)
COPY . .
RUN npm run build
```

## Next Steps

- [Phase 3 Overview](../phase3_guide.md)
- [API Reference](../api/distributed.md)
- [Single Worker Guide](./single-worker.md)
- [Multi-Worker Guide](./multi-worker.md)
