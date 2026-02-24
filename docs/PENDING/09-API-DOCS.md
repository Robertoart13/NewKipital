# 📚 API DOCUMENTATION - Issues Pendientes

**Prioridad Global:** P1 (ALTO)
**Esfuerzo Total:** 3-5 días

---

## ISSUE-055: Generar OpenAPI/Swagger desde NestJS

**Prioridad:** P1 | **Esfuerzo:** M (2-3 días)

### Descripción
Sin documentación de API, frontend y terceros no saben cómo integrar.

### Archivos Afectados
- `api/src/main.ts`
- `api/src/**/*.controller.ts` (añadir decorators)

### Criterios de Aceptación
- [ ] Swagger UI en `/api/docs`
- [ ] Todos los endpoints documentados
- [ ] DTOs con @ApiProperty
- [ ] Ejemplos de requests/responses
- [ ] Códigos de error documentados
- [ ] Exportar swagger.json para Postman

### Implementación

```typescript
// main.ts
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('KPITAL 360 API')
    .setDescription('ERP de Planillas Multiempresa')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth('accessToken')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(3000);
}

// auth.controller.ts
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  @Post('login')
  @ApiOperation({ summary: 'Login con email y password' })
  @ApiResponse({ status: 200, description: 'Login exitoso', type: SessionData })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  @ApiResponse({ status: 429, description: 'Demasiados intentos' })
  async login(@Body() dto: LoginDto) {
    // ...
  }
}
```

---

## ISSUE-056: Documentar permisos requeridos por endpoint

**Prioridad:** P1 | **Esfuerzo:** S (1 día)

### Criterios de Aceptación
- [ ] Decorator custom @ApiRequiresPermission()
- [ ] Swagger muestra permisos en cada endpoint
- [ ] Ejemplo:
  ```typescript
  @ApiRequiresPermission('employee:create')
  @Post()
  create() {}
  ```

---

## ISSUE-057: Postman collection auto-generada

**Prioridad:** P2 | **Esfuerzo:** XS (medio día)

### Criterios de Aceptación
- [ ] Script: `npm run generate:postman`
- [ ] Genera collection desde swagger.json
- [ ] Variables de environment (dev, staging, prod)
- [ ] Commit collection en repo: `postman/KPITAL-360.postman_collection.json`

---

## 📊 Progreso API Docs

- [ ] ISSUE-055: OpenAPI/Swagger
- [ ] ISSUE-056: Documentar permisos
- [ ] ISSUE-057: Postman collection

**Total:** 0/3 completados (0%)
