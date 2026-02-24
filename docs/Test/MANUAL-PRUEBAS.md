# Manual de Pruebas - KPITAL 360

Fecha: 2026-02-24  
Version: 4.0  
Estado: Vigente

## 1. Requisitos
- Node.js 20+
- npm 10+

Validar entorno:
```bash
node --version
npm --version
```

## 2. Instalacion
Backend:
```bash
cd api
npm install
```

Frontend:
```bash
cd frontend
npm install
```

## 3. Ejecucion estandar (suite completa)
### Backend
```bash
cd api
npm.cmd test -- --runInBand
```

### Frontend
```bash
cd frontend
npm.cmd test
```

Nota:
- En PowerShell de este entorno se usa `npm.cmd` para evitar bloqueo de `npm.ps1`.
- Resultado esperado vigente: Backend `137/137`, Frontend `184/184`, Total `321/321`.

## 4. Ejecucion por alcance
### Backend
- Todos los unit tests:
```bash
npm.cmd test -- --runInBand
```
- Un archivo:
```bash
npm.cmd test -- auth.service.spec.ts --runInBand
```
- Cobertura:
```bash
npm.cmd run test:cov
```
- E2E:
```bash
npm.cmd run test:e2e
```

### Frontend
- Todos los tests:
```bash
npm.cmd test
```
- Un archivo:
```bash
npx vitest run src/lib/currencyFormat.test.ts
```
- Cobertura:
```bash
npm.cmd run test:coverage
```
- UI de Vitest:
```bash
npm.cmd run test:ui
```

## 5. Protocolo de revalidacion (obligatorio)
1. Ejecutar backend completo.
2. Ejecutar frontend completo.
3. Si hay cambios sensibles, ejecutar coverage backend/frontend.
4. Registrar resultados como nueva fase en `docs/Test/TEST-EXECUTION-REPORT.md`.
5. Actualizar estado vigente en `docs/Test/GUIA-TESTING.md` solo si cambia el estado general.

## 6. Plantilla para nueva fase
Copiar y completar:

```text
## Fase N - YYYY-MM-DD HH:mm
Alcance: backend/frontend/completo
Comandos ejecutados:
- ...
Resultado:
- Backend: x/y
- Frontend: x/y
- Total: x/y
Fallos:
- cantidad
- lista breve de causa raiz
Acciones aplicadas:
- ...
Estado final de fase:
- cerrada / abierta
```

## 7. Criterios de salida
Una fase se considera cerrada cuando:
- No hay fallos bloqueantes en el alcance definido.
- Los fallos residuales (si existen) tienen causa raiz y plan.
- El reporte de fase esta documentado.

## 8. Troubleshooting
- Error `Cannot redefine property: compare`:
  - Usar `jest.mock` para bcrypt y limpiar mocks por test.
- Error por mocks one-shot consumidos:
  - Evitar ejecutar el mismo servicio dos veces en el mismo assert de rechazo.
- Error de parseo monetario:
  - Verificar reglas de separador decimal/miles y notacion cientifica.
- Error en validadores SQL/email:
  - Verificar orden de validacion y patron regex de inyeccion.

## 9. Ubicacion de evidencia
- Guia vigente: `docs/Test/GUIA-TESTING.md`
- Reporte por fases: `docs/Test/TEST-EXECUTION-REPORT.md`
- Base historica inicial: `docs/Test/TESTING.md`
