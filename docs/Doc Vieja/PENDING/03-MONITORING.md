#  MONITORING - Issues Pendientes

**Prioridad Global:** P0 (CRTICO)
**Esfuerzo Total:** 1 semana
**Asignado a:** [Sin asignar]

---

## ISSUE-019: Setup Elasticsearch + Kibana (ELK Stack)

**Prioridad:** P0
**Esfuerzo:** M (2-3 das)
**Etiquetas:** [monitoring] [infrastructure] [elk]

###  Descripcin
Logs en archivos locales desaparecen y son difciles de buscar. Necesitamos ELK para centralizar.

###  Objetivo
Elasticsearch + Kibana funcionando con logs indexados en tiempo real.

###  Archivos Afectados
- `docker-compose.monitoring.yml` (crear)
- `api/src/common/logger/logger.config.ts` (modificar)
- `api/package.json` (aadir winston-elasticsearch)

###  Criterios de Aceptacin
- [ ] Docker compose con Elasticsearch + Kibana
- [ ] Winston transport a Elasticsearch configurado
- [ ] ndice `kpital-logs-*` se crea automticamente
- [ ] Kibana accesible en `http://localhost:5601`
- [ ] Logs se pueden buscar por correlationId, userId, level
- [ ] Retention policy: 30 das (logs antiguos se borran)

###  Implementacin Sugerida

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    container_name: kpital-elasticsearch
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch-data:/usr/share/elasticsearch/data
    networks:
      - kpital-monitoring

  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    container_name: kpital-kibana
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    depends_on:
      - elasticsearch
    networks:
      - kpital-monitoring

volumes:
  elasticsearch-data:
    driver: local

networks:
  kpital-monitoring:
    driver: bridge
```

```typescript
// logger.config.ts (aadir transport)
import { ElasticsearchTransport } from 'winston-elasticsearch';

const esTransport = new ElasticsearchTransport({
  level: 'info',
  clientOpts: {
    node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  },
  index: 'kpital-logs',
  indexPrefix: 'kpital-logs',
  indexSuffixPattern: 'YYYY.MM.DD',
  transformer: (logData) => {
    return {
      '@timestamp': logData.timestamp,
      severity: logData.level,
      message: logData.message,
      fields: logData.meta,
    };
  },
});

// Aadir a transports[]
transports: [
  // ...otros transports
  esTransport,
],
```

###  Cmo Verificar
```bash
docker-compose -f docker-compose.monitoring.yml up -d
# Esperar 30s
curl http://localhost:9200/_cat/indices?v
# Debe mostrar: kpital-logs-2026.02.24

# Abrir http://localhost:5601
# Ir a Discover  crear index pattern: kpital-logs-*
# Buscar logs por correlationId
```

---

## ISSUE-020: Implementar Prometheus metrics

**Prioridad:** P0
**Esfuerzo:** M (2 das)
**Etiquetas:** [monitoring] [prometheus] [metrics]

###  Descripcin
Sin mtricas no podemos saber request rate, latency, error rate (RED metrics).

###  Objetivo
Prometheus scrapeando mtricas de NestJS.

###  Archivos Afectados
- `api/src/modules/metrics/metrics.module.ts` (crear)
- `api/src/app.module.ts`
- `docker-compose.monitoring.yml` (aadir Prometheus)
- `prometheus.yml` (crear)
- `api/package.json` (aadir @willsoto/nestjs-prometheus)

###  Criterios de Aceptacin
- [ ] Endpoint `/metrics` expone mtricas en formato Prometheus
- [ ] Mtricas:
  - `http_requests_total` (counter por mtodo, ruta, status)
  - `http_request_duration_seconds` (histogram)
  - `http_requests_in_progress` (gauge)
  - `db_query_duration_seconds` (histogram)
  - `auth_login_attempts_total` (counter por success/failure)
- [ ] Prometheus scrapeando cada 15s
- [ ] Prometheus UI accesible en `http://localhost:9090`

###  Implementacin Sugerida

```typescript
// metrics.module.ts
import { Module } from '@nestjs/common';
import { PrometheusModule, makeCounterProvider, makeHistogramProvider } from '@willsoto/nestjs-prometheus';

@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true,
      },
    }),
  ],
  providers: [
    makeCounterProvider({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    }),
    makeHistogramProvider({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route'],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
    }),
    makeCounterProvider({
      name: 'auth_login_attempts_total',
      help: 'Total login attempts',
      labelNames: ['result'], // success, failure, blocked
    }),
  ],
  exports: [PrometheusModule],
})
export class MetricsModule {}
```

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'kpital-api'
    static_configs:
      - targets: ['host.docker.internal:3000']
    metrics_path: '/metrics'
```

```yaml
# Aadir a docker-compose.monitoring.yml
  prometheus:
    image: prom/prometheus:latest
    container_name: kpital-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
    networks:
      - kpital-monitoring
```

###  Cmo Verificar
```bash
curl http://localhost:3000/metrics
# Debe retornar mtricas en formato Prometheus

# Abrir http://localhost:9090
# Query: rate(http_requests_total[5m])
# Debe mostrar grfica de request rate
```

---

## ISSUE-021: Crear Grafana dashboards

**Prioridad:** P0
**Esfuerzo:** M (2 das)
**Etiquetas:** [monitoring] [grafana] [dashboards]

###  Descripcin
Mtricas sin visualizacin son intiles. Necesitamos dashboards operativos.

###  Objetivo
3 dashboards bsicos: Overview, Auth, Database.

###  Archivos Afectados
- `docker-compose.monitoring.yml` (aadir Grafana)
- `grafana/dashboards/overview.json` (crear)
- `grafana/dashboards/auth.json` (crear)
- `grafana/dashboards/database.json` (crear)
- `grafana/provisioning/datasources/prometheus.yml` (crear)

###  Criterios de Aceptacin

**Dashboard 1: API Overview**
- [ ] Request rate (req/min)
- [ ] Error rate (%)
- [ ] P50/P95/P99 latency
- [ ] Status code distribution (2xx, 4xx, 5xx)
- [ ] Top 10 slowest endpoints

**Dashboard 2: Authentication**
- [ ] Login attempts (success vs failure)
- [ ] Active sessions
- [ ] Refresh token rotations
- [ ] Account lockouts
- [ ] Microsoft SSO usage

**Dashboard 3: Database**
- [ ] Query duration (avg, p95, p99)
- [ ] Connection pool usage
- [ ] Slow queries (>1s)
- [ ] Transaction errors

**Dashboard 4: Business Metrics**
- [ ] Empresas creadas (ltimas 24h)
- [ ] Empleados activos
- [ ] Planillas en estado Abierta/Verificada
- [ ] Acciones de personal pendientes

###  Implementacin Sugerida

```yaml
# Aadir a docker-compose.monitoring.yml
  grafana:
    image: grafana/grafana:latest
    container_name: kpital-grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - ./grafana/provisioning:/etc/grafana/provisioning
      - ./grafana/dashboards:/var/lib/grafana/dashboards
      - grafana-data:/var/lib/grafana
    depends_on:
      - prometheus
    networks:
      - kpital-monitoring
```

```yaml
# grafana/provisioning/datasources/prometheus.yml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
```

###  Cmo Verificar
```bash
# Abrir http://localhost:3001
# Login: admin / admin
# Ir a Dashboards  debe mostrar 4 dashboards
# Verificar que grficas muestran datos
```

---

## ISSUE-022: Configurar alertas bsicas

**Prioridad:** P1
**Esfuerzo:** S (1 da)
**Etiquetas:** [monitoring] [alerts]

###  Descripcin
Dashboards son reactivos. Necesitamos alertas proactivas.

###  Criterios de Aceptacin
- [ ] Alert: Error rate > 5% por 5 minutos
- [ ] Alert: P95 latency > 2 segundos
- [ ] Alert: Login failure rate > 50% por 5 minutos
- [ ] Alert: Database connection pool > 80%
- [ ] Notificaciones por email/Slack
- [ ] Documentar playbooks de respuesta

###  Implementacin Sugerida

```yaml
# prometheus/alerts.yml
groups:
  - name: kpital_alerts
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors/sec"

      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High latency detected"
          description: "P95 latency is {{ $value }}s"
```

---

## ISSUE-023: Health checks mejorados

**Prioridad:** P1
**Esfuerzo:** S (1 da)
**Etiquetas:** [monitoring] [health]

###  Descripcin
OpsController probablemente tiene health checks bsicos, necesitamos ms detalle.

###  Criterios de Aceptacin
- [ ] `/health` retorna status general (healthy/unhealthy)
- [ ] `/health/live` para liveness probe (Kubernetes)
- [ ] `/health/ready` para readiness probe
- [ ] Checks:
  - Database connection
  - Elasticsearch connection (opcional)
  - Redis connection (cuando se implemente)
  - Filesystem write (uploads/)
- [ ] Formato JSON con detalles por componente

###  Implementacin Sugerida

```typescript
// health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      // ...otros checks
    ]);
  }

  @Get('live')
  @HealthCheck()
  live() {
    // Solo verifica que el proceso est corriendo
    return { status: 'ok' };
  }

  @Get('ready')
  @HealthCheck()
  ready() {
    // Verifica que puede servir requests
    return this.health.check([
      () => this.db.pingCheck('database'),
    ]);
  }
}
```

---

##  Progreso Monitoring

- [ ] ISSUE-019: ELK Stack
- [ ] ISSUE-020: Prometheus metrics
- [ ] ISSUE-021: Grafana dashboards
- [ ] ISSUE-022: Alertas bsicas
- [ ] ISSUE-023: Health checks mejorados

**Total:** 0/5 completados (0%)
