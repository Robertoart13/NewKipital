# 🏛️ RACI Documental Enterprise

## 🎯 Objetivo
Definir responsabilidades formales de mantenimiento documental.

## 🎯 Roles
- Product Owner (PO)
- Tech Lead (TL)
- Engineering Team (ENG)
- QA Lead (QA)
- Security Lead (SEC)
- Operations Lead (OPS)

## 📊 Matriz RACI por documento maestro
| Documento | R | A | C | I |
|---|---|---|---|---|
| 03-reglas/REGLAS-MAESTRAS-CANONICAS.md | TL | TL | SEC, QA | PO, OPS |
| 04-arquitectura/ARQUITECTURA-GOBIERNO-CONSOLIDADO.md | TL | TL | ENG | PO, OPS |
| 05-seguridad-identidad-permisos/* | SEC | SEC | TL, ENG | PO, QA |
| 06-backend-api-db/* | ENG | TL | QA, SEC | PO |
| 07-frontend-ux/* | ENG | TL | QA | PO |
| 08-planilla/* | ENG | PO | TL, QA | OPS |
| 09-acciones-personal/* | ENG | PO | QA, TL | OPS |
| 10-testing-qa/* | QA | QA | TL, ENG | PO |
| 11-operacion-automatizaciones/* | OPS | OPS | TL, ENG | PO |
| 12-backlog-pendientes/* | PO | PO | TL, QA | ENG |
| 13-manual-usuario/* | PO | PO | QA, TL | OPS |
| 14-manual-tecnico/* | TL | TL | ENG, QA | PO |
| 16-enterprise-operacion/* | TL | TL | SEC, QA, OPS | PO |

## 🎯 Reglas
- Ningun documento maestro se considera vigente sin `A` aprobado.
- Todo cambio funcional requiere actualizar al menos un documento `R`.


