# 🚀 CI/CD - Issues Pendientes

**Prioridad Global:** P0 (CRÍTICO)
**Esfuerzo Total:** 1-2 semanas
**Asignado a:** [Sin asignar]

---

## ISSUE-024: Pipeline CI - Lint + Test + Build

**Prioridad:** P0
**Esfuerzo:** M (2-3 días)
**Etiquetas:** [ci-cd] [github-actions] [pipeline]

### 📝 Descripción
Sin CI pipeline, no hay validación automática de código. Riesgo de merge de código roto.

### 🎯 Objetivo
GitHub Actions ejecutando lint → test → build en cada push/PR.

### 📁 Archivos Afectados
- `.github/workflows/ci.yml` (crear)
- `api/package.json` (verificar scripts)
- `frontend/package.json` (verificar scripts)

### ✅ Criterios de Aceptación
- [ ] Pipeline corre en push a `main` y `develop`
- [ ] Pipeline corre en todos los PRs
- [ ] Jobs: lint, test, build (paralelos)
- [ ] Lint backend (ESLint + Prettier)
- [ ] Lint frontend (ESLint + Prettier)
- [ ] Tests unitarios backend (requiere MySQL en CI)
- [ ] Tests E2E backend
- [ ] Build backend (TypeScript compilation)
- [ ] Build frontend (Vite build)
- [ ] Coverage report sube a Codecov
- [ ] PR status check bloquea merge si falla CI

### 🔧 Implementación Sugerida

```yaml
# .github/workflows/ci.yml
name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  NODE_VERSION: '18'

jobs:
  lint-backend:
    name: Lint Backend
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: api/package-lock.json

      - name: Install dependencies
        working-directory: ./api
        run: npm ci

      - name: Run ESLint
        working-directory: ./api
        run: npm run lint

      - name: Run Prettier check
        working-directory: ./api
        run: npm run format:check

  lint-frontend:
    name: Lint Frontend
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        working-directory: ./frontend
        run: npm ci

      - name: Run ESLint
        working-directory: ./frontend
        run: npm run lint

  test-backend:
    name: Test Backend
    runs-on: ubuntu-latest

    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: test_root_password
          MYSQL_DATABASE: kpital_test
          MYSQL_USER: test_user
          MYSQL_PASSWORD: test_password
        ports:
          - 3306:3306
        options: >-
          --health-cmd="mysqladmin ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=5

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: api/package-lock.json

      - name: Install dependencies
        working-directory: ./api
        run: npm ci

      - name: Run unit tests
        working-directory: ./api
        run: npm run test
        env:
          DB_HOST: localhost
          DB_PORT: 3306
          DB_USERNAME: test_user
          DB_PASSWORD: test_password
          DB_DATABASE: kpital_test
          JWT_SECRET: test-secret-key-for-ci

      - name: Run E2E tests
        working-directory: ./api
        run: npm run test:e2e
        env:
          DB_HOST: localhost
          DB_PORT: 3306
          DB_USERNAME: test_user
          DB_PASSWORD: test_password
          DB_DATABASE: kpital_test
          JWT_SECRET: test-secret-key-for-ci

      - name: Generate coverage report
        working-directory: ./api
        run: npm run test:cov

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./api/coverage/lcov.info
          flags: backend
          name: backend-coverage

  build-backend:
    name: Build Backend
    runs-on: ubuntu-latest
    needs: [lint-backend, test-backend]

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: api/package-lock.json

      - name: Install dependencies
        working-directory: ./api
        run: npm ci

      - name: Build
        working-directory: ./api
        run: npm run build

      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: api-build
          path: api/dist
          retention-days: 7

  build-frontend:
    name: Build Frontend
    runs-on: ubuntu-latest
    needs: [lint-frontend]

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        working-directory: ./frontend
        run: npm ci

      - name: Build
        working-directory: ./frontend
        run: npm run build
        env:
          VITE_API_URL: https://api-staging.kpital360.com

      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: frontend-build
          path: frontend/dist
          retention-days: 7

  ci-success:
    name: CI Success
    runs-on: ubuntu-latest
    needs: [build-backend, build-frontend]
    steps:
      - run: echo "All CI checks passed!"
```

### 🧪 Cómo Verificar
```bash
# Crear PR de prueba
git checkout -b test-ci
git commit --allow-empty -m "test: CI pipeline"
git push origin test-ci

# Ir a GitHub → Actions → Verificar que pipeline corre
# Verificar que cada job pasa
```

---

## ISSUE-025: Pipeline CD - Deploy a Staging

**Prioridad:** P0
**Esfuerzo:** M (2-3 días)
**Etiquetas:** [ci-cd] [deployment] [staging]

### 📝 Descripción
Deployments manuales son lentos y propensos a error. Necesitamos CD automático.

### 🎯 Objetivo
Deploy automático a staging en cada merge a `develop`.

### 📁 Archivos Afectados
- `.github/workflows/deploy-staging.yml` (crear)
- `api/Dockerfile` (crear si no existe)
- `scripts/deploy-staging.sh` (crear)

### ✅ Criterios de Aceptación
- [ ] Corre solo en merge a `develop`
- [ ] Build de Docker image para backend
- [ ] Build de assets para frontend
- [ ] Push image a AWS ECR o Docker Hub
- [ ] Deploy a servidor staging (ECS/EC2/otro)
- [ ] Run migrations antes de deploy
- [ ] Smoke tests post-deploy
- [ ] Rollback automático si smoke tests fallan
- [ ] Notificación a Slack cuando deploy completa

### 🔧 Implementación Sugerida

```yaml
# .github/workflows/deploy-staging.yml
name: Deploy to Staging

on:
  push:
    branches: [develop]

env:
  AWS_REGION: us-east-1
  ECR_REGISTRY: ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.us-east-1.amazonaws.com
  ECR_REPOSITORY: kpital-api
  ECS_SERVICE: kpital-staging-api
  ECS_CLUSTER: kpital-staging
  CONTAINER_NAME: api

jobs:
  deploy:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    environment: staging

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build, tag, and push image to Amazon ECR
        id: build-image
        env:
          IMAGE_TAG: ${{ github.sha }}
        run: |
          cd api
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY:staging
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:staging
          echo "image=$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG" >> $GITHUB_OUTPUT

      - name: Run database migrations
        run: |
          # Ejecutar migrations en contenedor temporal
          aws ecs run-task \
            --cluster $ECS_CLUSTER \
            --task-definition kpital-migrations \
            --network-configuration "awsvpcConfiguration={subnets=[${{ secrets.STAGING_SUBNET }}],securityGroups=[${{ secrets.STAGING_SG }}]}" \
            --launch-type FARGATE

          # Esperar a que termine
          sleep 30

      - name: Deploy to Amazon ECS
        uses: aws-actions/amazon-ecs-deploy-task-definition@v1
        with:
          task-definition: task-definition-staging.json
          service: ${{ env.ECS_SERVICE }}
          cluster: ${{ env.ECS_CLUSTER }}
          wait-for-service-stability: true

      - name: Run smoke tests
        run: |
          sleep 30
          response=$(curl -f https://api-staging.kpital360.com/health || echo "FAILED")
          if [ "$response" == "FAILED" ]; then
            echo "Smoke tests failed!"
            exit 1
          fi

      - name: Notify Slack
        uses: 8398a7/action-slack@v3
        if: always()
        with:
          status: ${{ job.status }}
          text: 'Deploy to staging: ${{ job.status }}'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

```dockerfile
# api/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:18-alpine AS runner

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main.js"]
```

---

## ISSUE-026: Pipeline CD - Deploy a Production

**Prioridad:** P0
**Esfuerzo:** M (1-2 días)
**Etiquetas:** [ci-cd] [deployment] [production]

### 📝 Descripción
Deploy a producción necesita aprobación manual y estrategia de rollback.

### 🎯 Objetivo
Deploy a producción con aprobación y smoke tests.

### ✅ Criterios de Aceptación
- [ ] Corre solo en tags (ej: `v1.2.3`)
- [ ] Requiere aprobación manual (GitHub Environments)
- [ ] Blue-Green deployment (opcional) o rolling update
- [ ] Smoke tests post-deploy
- [ ] Rollback automático si falla
- [ ] Backup de BD antes de migrations
- [ ] Notificaciones a Slack/Email

### 🔧 Implementación Sugerida

```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production

on:
  release:
    types: [published]

jobs:
  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://api.kpital360.com

    steps:
      - uses: actions/checkout@v4

      # Similar a staging pero con:
      # - Image tag: ${{ github.ref_name }}
      # - ECS cluster: kpital-production
      # - Backup de BD primero
      # - Rollback automático si smoke tests fallan

      - name: Backup database
        run: |
          aws rds create-db-snapshot \
            --db-instance-identifier kpital-prod-db \
            --db-snapshot-identifier kpital-backup-$(date +%Y%m%d-%H%M%S)

      # ...resto de steps similares a staging
```

---

## ISSUE-027: Rollback strategy automatizada

**Prioridad:** P1
**Esfuerzo:** S (1 día)
**Etiquetas:** [ci-cd] [rollback]

### 📝 Descripción
Si deploy falla, necesitamos rollback rápido a versión anterior.

### ✅ Criterios de Aceptación
- [ ] Workflow manual: `.github/workflows/rollback.yml`
- [ ] Input: environment (staging/production)
- [ ] Input: version tag para rollback
- [ ] Actualiza ECS task definition a versión anterior
- [ ] Verifica health checks después de rollback
- [ ] Notifica a equipo

### 🔧 Implementación Sugerida

```yaml
# .github/workflows/rollback.yml
name: Rollback Deployment

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to rollback'
        required: true
        type: choice
        options:
          - staging
          - production
      version:
        description: 'Version tag to rollback to (e.g., v1.2.3)'
        required: true
        type: string

jobs:
  rollback:
    name: Rollback to ${{ inputs.version }}
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}

    steps:
      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Rollback ECS service
        run: |
          aws ecs update-service \
            --cluster kpital-${{ inputs.environment }} \
            --service kpital-api \
            --task-definition kpital-api:${{ inputs.version }} \
            --force-new-deployment

      - name: Wait for service stability
        run: |
          aws ecs wait services-stable \
            --cluster kpital-${{ inputs.environment }} \
            --services kpital-api

      - name: Verify health
        run: |
          curl -f https://api-${{ inputs.environment }}.kpital360.com/health
```

---

## ISSUE-028: Scripts de deployment locales

**Prioridad:** P1
**Esfuerzo:** S (1 día)
**Etiquetas:** [ci-cd] [scripts]

### 📝 Descripción
Para emergencias, necesitamos scripts para deploy manual.

### ✅ Criterios de Aceptación
- [ ] `scripts/deploy.sh` - Deploy manual a environment
- [ ] `scripts/rollback.sh` - Rollback manual
- [ ] `scripts/run-migrations.sh` - Solo migrations
- [ ] Documentación de uso en `docs/deployment.md`

---

## ISSUE-029: Environments y secrets management

**Prioridad:** P0
**Esfuerzo:** S (1 día)
**Etiquetas:** [ci-cd] [security]

### 📝 Descripción
Configurar GitHub Environments con secrets y approvers.

### ✅ Criterios de Aceptación
- [ ] Environment `staging` configurado
- [ ] Environment `production` configurado con approvers
- [ ] Secrets:
  - AWS_ACCESS_KEY_ID
  - AWS_SECRET_ACCESS_KEY
  - AWS_ACCOUNT_ID
  - STAGING_SUBNET, STAGING_SG
  - PRODUCTION_SUBNET, PRODUCTION_SG
  - SLACK_WEBHOOK
  - DATABASE_URL (por environment)
- [ ] Protection rules: solo `develop` → staging, solo tags → production

---

## ISSUE-030: Smoke tests suite

**Prioridad:** P1
**Esfuerzo:** S (1 día)
**Etiquetas:** [ci-cd] [testing]

### 📝 Descripción
Tests rápidos post-deploy para verificar que sistema funciona.

### ✅ Criterios de Aceptación
- [ ] Script: `scripts/smoke-tests.sh`
- [ ] Checks:
  - GET /health retorna 200
  - GET /api/auth/me con token válido retorna 200
  - POST /api/auth/login funciona
  - Base de datos accesible
  - Redis accesible (cuando se implemente)
- [ ] Timeout: máximo 2 minutos
- [ ] Exit code 0 si pasa, 1 si falla

### 🔧 Implementación Sugerida

```bash
#!/bin/bash
# scripts/smoke-tests.sh
set -e

API_URL=${1:-https://api-staging.kpital360.com}

echo "Running smoke tests against $API_URL"

# Test 1: Health check
echo -n "1. Health check... "
curl -f -s "$API_URL/health" > /dev/null
echo "✓"

# Test 2: Login
echo -n "2. Login... "
RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"'$SMOKE_TEST_EMAIL'","password":"'$SMOKE_TEST_PASSWORD'"}')
TOKEN=$(echo $RESPONSE | jq -r '.accessToken')
if [ "$TOKEN" == "null" ]; then
  echo "✗ Failed to login"
  exit 1
fi
echo "✓"

# Test 3: Authenticated request
echo -n "3. Authenticated request... "
curl -f -s "$API_URL/api/auth/me" \
  -H "Authorization: Bearer $TOKEN" > /dev/null
echo "✓"

echo "All smoke tests passed! ✓"
```

---

## ISSUE-031: Deployment documentation

**Prioridad:** P1
**Esfuerzo:** XS (medio día)
**Etiquetas:** [ci-cd] [documentation]

### 📝 Descripción
Documentar proceso completo de deployment.

### ✅ Criterios de Aceptación
- [ ] `docs/deployment.md` con:
  - Arquitectura de deployment
  - Ambientes (dev, staging, production)
  - Proceso de CI/CD
  - Cómo hacer deploy manual
  - Cómo hacer rollback
  - Troubleshooting común
  - Runbook para emergencias

---

## 📊 Progreso CI/CD

- [ ] ISSUE-024: Pipeline CI
- [ ] ISSUE-025: Deploy Staging
- [ ] ISSUE-026: Deploy Production
- [ ] ISSUE-027: Rollback strategy
- [ ] ISSUE-028: Scripts locales
- [ ] ISSUE-029: Environments y secrets
- [ ] ISSUE-030: Smoke tests
- [ ] ISSUE-031: Documentation

**Total:** 0/8 completados (0%)
