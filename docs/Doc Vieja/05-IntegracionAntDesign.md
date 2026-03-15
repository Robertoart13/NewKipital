# KPITAL 360  Integracin de Ant Design

**Documento:** 05  
**Para:** Ingeniero Frontend  
**De:** Roberto  Arquitecto Funcional / Senior Engineer  
**Prerrequisito:** Haber ledo [02-ScaffoldingProyecto.md](./02-ScaffoldingProyecto.md)  
**ltima actualizacin:** 2026-02-23 (Validacin formularios, estilos Histrico Laboral, tabs scroll, smbolo CRC)

---

## ndice rpido

| Seccin | Contenido |
|---------|-----------|
| [Ubicacin del CSS](#ubicacin-del-css-obligatorio) | Archivo de estilos compartidos y cmo importarlo |
| [Formularios y Modales](#formularios-y-modales-patrn-oficial) | Patrn obligatorio para modales de creacin/edicin |
| [Tabla y Filtros](#tabla-y-filtros-patrn-oficial-de-listados) | Patrn obligatorio, clases CSS, estructura, ejemplo de uso |
| [Clases CSS obligatorias](#clases-css-obligatorias-usersmanagementpagemodulecss) | Lista de clases con ubicacin en el archivo |
| [Paleta RRHH](#paleta-rrhh-valores-vigentes) | Colores corporativos (no inventar) |
| [Referencia de implementacin](#referencia-de-implementacin) | Pginas y archivos a consultar |
| [Nomenclatura](#nomenclatura-y-convenciones) | Prefijos, patrones de nombres, textos estndar |
| [Formato de fecha y hora](#formato-de-fecha-y-hora-obligatorio) | Formato 12h (AM/PM), locale es-ES |
| [Formato de moneda](#formato-de-moneda-obligatorio) | Regla nica para inputs monetarios CRC/USD |

---

## Nomenclatura y convenciones

> **Toda la app debe seguir estas convenciones** para mantener coherencia entre pginas y mdulos.

### Prefijos de clases CSS

| Prefijo | Uso | Ejemplos |
|---------|-----|----------|
| `company*` | Modales, formularios y confirmaciones de entidades (empresas, empleados, etc.) | `companyModal`, `companyFormGrid`, `companyConfirmModal` |
| `config*` | Tablas de configuracin/listados | `configTable` |
| `pane*` | Paneles de filtro expandibles | `paneCard`, `paneOptionsBox` |

### Orden de nombres de empleados

- **Todos los selects, listas y tablas de empleados deben ordenarse alfabticamente** por **Apellidos  Nombre**.
- El formato visual obligatorio es: **`Apellido1 Apellido2 Nombre`** (si no hay `apellido2`, se omite).

### Ordenamiento en tablas

- **Todas las tablas del sistema** deben permitir ordenar por columna (como en Empresas).
| `tag*` | Etiquetas de estado | `tagActivo`, `tagInactivo` |
| `btn*` | Botones (si se necesita clase propia) | `btnPrimary`, `btnSecondary` |
| `infoBanner` + `*Type` | Banners informativos | `infoType`, `warningType`, `dangerType` |

Para nuevas entidades (ej. Proveedores, Sucursales), reutilizar las mismas clases (`companyModal`, `companyFormContent`, etc.); no crear `providerModal` o similares salvo que el patrn sea realmente distinto.

### Patrn de nombres de pginas

- Pginas de listado/CRUD: `{Entidad}ManagementPage` (ej. `CompaniesManagementPage`, `UsersManagementPage`).
- Modales de creacin: `{Entidad}CreateModal` o integrado en la pgina con `openModal` / `setOpenModal`.

### Textos estndar de UI

| Contexto | Texto a usar |
|----------|--------------|
| Botn cerrar/cancelar | `Cancelar` |
| Confirmacin crear | `Confirmar creacin de {entidad}`, `Est seguro de crear esta {entidad}?`, `S, crear` |
| Confirmacin actualizar | `Confirmar actualizacin`, `Desea guardar los cambios?`, `S, guardar` |
| Botn crear | `Crear {Entidad}` (ej. `Crear Empresa`) |
| Botn guardar cambios | `Guardar cambios` |
| Estado | `Activo` / `Inactivo` |

### Modales de confirmacin

Usar siempre `companyConfirmModal`, `companyConfirmOk`, `companyConfirmCancel` con `modal.confirm`. Ver clase en *Clases CSS obligatorias > Modales de confirmacin*.

### Formato de fecha y hora (obligatorio)

Toda fecha y hora mostrada al usuario (bitcora, fechas de creacin/actualizacin, etc.) debe usar el formato de **12 horas (AM/PM)** para consistencia corporativa.

| Regla | Valor |
|-------|-------|
| Funcin a usar | `formatDateTime12h()` de `src/lib/formatDate.ts` |
| Locale | `es-ES` |
| Formato hora | 12 horas (AM/PM) |
| Ejemplo | `23/02/2026, 10:30 a. m.` |

**No usar** `toLocaleString()` sin opciones, `new Date().toLocaleString()`, ni formateadores que devuelvan 24h.

```ts
import { formatDateTime12h } from '../../../lib/formatDate';

// Correcto
<span>{formatDateTime12h(row.fechaCreacion)}</span>

// Incorrecto
<span>{row.fechaCreacion ? new Date(row.fechaCreacion).toLocaleString() : '-'}</span>
```

Referencia implementada: `UsersManagementPage.tsx`, `CompaniesManagementPage.tsx`, `PermissionsAdminListPage.tsx`.

### Formato de moneda (obligatorio)

Toda entrada monetaria visual en formularios debe usar el helper compartido:

- `frontend/src/lib/currencyFormat.ts`

Reglas obligatorias:

1. Simbolo dinamico por moneda (`CRC => "CRC"`, `USD => "$"`). Ver doc 29 para nota de encoding.
2. Formato visual con 2 decimales.
3. Parser robusto para evitar inflado de ceros al blur/focus.
4. Tope maximo unificado: `MAX_MONEY_AMOUNT`.
5. Prohibido duplicar formatter/parser inline en componentes.

Referencia detallada:

- `docs/29-EstandarFormatoMoneda.md`

**Validacin de formularios (campos de texto, email, anti-SQL):**

- `docs/31-ValidacionFormulariosFrontend.md`

---

## Directivas de Estilo RRHH (Obligatorio)

> **Este es el nico estilo a seguir en KPITAL 360.** Cualquier nueva pgina o componente debe respetar estas directivas.

KPITAL 360 es un sistema de **recursos humanos**. La interfaz debe reflejar:

- **Seriedad**  Sin colores fuertes ni llamativos
- **Confort**  Espacios cmodos, legibilidad clara
- **Profesionalidad**  Sensacin corporativa, no SaaS juvenil
- **Identificable**  Jerarqua visual clara sin saturacin excesiva

Se utilizan colores **poco saturados, tonos slate y grises neutros**. Referencia implementada: `UsersManagementPage.tsx` y su mdulo CSS.

---

## Paleta RRHH (Valores vigentes)

> **ltima actualizacin:** Ajustes aplicados  verde Activo ms visible (`#b8d9c4`), danger ms identificable (borde `#c99a9a`). Usar exclusivamente estos valores.

### Acentos principales (slate / azul corporativo)

| Uso | Color | Hex |
|-----|-------|-----|
| Men activo, subrayado seleccionado, links principales, tema Ant Design | Azul corporativo | `#20638d` |
| Hover en opciones del men (dropdown) | Fondo suave | `rgba(32, 99, 141, 0.08)` |
| Acciones, links secundarios, focus | Slate principal | `#5a6c7d` |
| Hover de botones y links | Slate oscuro | `#4a5c6d` |
| Avatar de usuario en Drawer | Gris-azul | `#6b7c8c` |

### Texto

| Uso | Color | Hex |
|-----|-------|-----|
| Ttulos, texto principal | Gris oscuro | `#3d4f5c` |
| Encabezados de tabla | Gris medio | `#4a5a68` |
| Texto secundario, subttulos | Gris suave | `#6b7a85` |

### Etiquetas de estado

| Estado | Fondo | Texto |
|--------|-------|-------|
| Activo | `#b8d9c4` | `#3d5a45` |
| Inactivo | `#f0f2f4` | `#6b7a85` |

### Botones

| Tipo | Fondo | Borde | Texto |
|------|-------|-------|-------|
| Principal | `#5a6c7d` |  | `#fff` |
| Secundario | `#fff` | `#d8dde4` | `#5a6b7a` |

### Fondos y bordes

| Uso | Color | Hex |
|-----|-------|-----|
| Fondo de pgina | Gris muy claro | `#f7f8fa`, `#f5f7f9` |
| Bordes | Gris sutil | `#e8ecf0`, `#e0e4e8`, `#e4e8ec` |
| Encabezado tabla | Gris claro | `#f2f4f6` |
| Hover filas | Gris muy sutil | `#f8f9fa` |

### Errores / advertencias / danger (suaves pero identificables)

| Uso | Color | Hex |
|-----|-------|-----|
| Fondo banner danger | `#e4cdcd` | Rojo suave |
| Fondo lista danger | `#ecd8d8` | Rojo muy suave |
| Borde danger | `#c99a9a` | Rojo pastel |
| Texto danger | `#4d2e2e` | Marrn-gris oscuro |

### Iconos de banners informativos (suaves, no fuertes)

| Tipo | Color | Hex |
|------|-------|-----|
| Info | Verde apagado | `#5a7a6a` |
| Warning | Naranja suave | `#b8860b` |
| Danger | Rojo suave | `#a85c5c` |

---

## Qu Pidi Roberto (Textual)

> "Vas a integrar Ant Design para toda la UI. Primero, instala las dependencias de AntD y asegrate de que se carguen sus estilos globales. Luego, aplica el tema de Ant Design a nivel de toda la app, personalizando variables si es necesario (por ejemplo, colores corporativos). Usa los componentes base de AntD, como botones, tablas, formularios y modales, pero siempre dentro de un patrn coherente. Si necesits personalizar o extender componentes, usa clases CSS o componentes envueltos. No generes lgica compleja en los componentes, mantn la lgica en Redux o en los hooks. As, AntD ser la base visual, pero la arquitectura de estado sigue siendo la que definimos (Redux Toolkit y TanStack Query). Ejecuta esto en orden: primero configura AntD, luego los slices, y despus los hooks de TanStack. Si hay dudas, revisa la documentacin oficial de AntD y ajusta las variables de tema segn la identidad corporativa."

---

## Decisiones Tomadas

### Ant Design 5

Se eligi Ant Design versin 5 como framework UI completo para toda la aplicacin. No se mezcla con otro framework de componentes (no Bootstrap, no Material UI, no Tailwind para componentes).

### Tema Corporativo (alineado a Paleta RRHH)

Se defini un tema corporativo en `src/config/theme.ts` con los siguientes tokens. **Deben mantenerse coherentes con la Paleta RRHH**:

| Token | Valor | Propsito |
|-------|-------|-----------|
| `colorPrimary` | `#5a6c7d` | Slate corporativo RRHH (no azul fuerte) |
| `borderRadius` | `6` a `12` | Bordes suaves (812px para cards) |
| `fontFamily` | `"Public Sans"` | Tipografa corporativa (Google Fonts) |
| `fontSize` | `14` | Tamao base legible |
| `colorBgContainer` | `#ffffff` | Fondo de contenedores blanco |
| `colorText` | `#3d4f5c` | Texto principal gris oscuro |
| `controlHeight` | `36` | Altura de controles coherente |

### ConfigProvider Dinmico

`AntDConfigProvider.tsx` envuelve toda la app y sincroniza:
- **Tema claro/oscuro**  Lee de `ThemeContext`. Dark mode usa `theme.darkAlgorithm`.
- **Locale**  Lee de `LocaleContext`. Cambia entre `esES` y `enUS` de Ant Design.

---

## Ubicacin del CSS (Obligatorio)

> **Archivo nico de estilos compartidos para pginas de configuracin.**

| Archivo | Ubicacin | Uso |
|---------|-----------|-----|
| **Mdulo CSS de referencia** | `frontend/src/pages/private/configuration/UsersManagementPage.module.css` | Tablas, filtros, cards, etiquetas, botones, banners, tabs |

**Cmo usar:** importar como CSS Module en tu pgina:
```tsx
import styles from './UsersManagementPage.module.css';

// Aplicar clases: className={styles.configTable}
```

**Regla:** No duplicar estilos. Nuevas pginas de configuracin o listados deben importar este mdulo y usar sus clases. Si falta una clase, agregarla aqu.

---

## Formularios y Modales (Patrn Oficial)

> **Todos los formularios de creacin/edicin en modales deben seguir este patrn.** Garantiza coherencia visual y UX en toda la app.

### Dnde est la referencia

| Tipo | Archivo |
|------|---------|
| **Implementacin** | `frontend/src/pages/private/configuration/CompaniesManagementPage.tsx` |
| **Estilos** | `frontend/src/pages/private/configuration/UsersManagementPage.module.css` |
| **Referencia alternativa** | `frontend/src/pages/private/employees/components/EmployeeCreateModal.tsx`  Usa el mismo patrn y estilos que Empresas (companyModal*, companyFormGrid, etc.). |

### Estructura obligatoria del modal

1. **Header del modal**
   - Fondo `#f5f7fa`, borde inferior `2px solid #e0e6ed`
   - Izquierda: icono en recuadro (`companyModalHeaderIcon`, 40x40px, fondo `#f0f9ff`, icono `#5a6c7d`) + ttulo
   - Derecha: bloque Activo/Inactivo (`companyModalEstadoPaper`) + botn cerrar (X)
   - **Orden:** Ttulo | Activo | Cerrar. No superponer elementos.

2. **Tabs con iconos**
   - Cada pestaa debe llevar icono a la izquierda del texto (ej. `BankOutlined`, `EnvironmentOutlined`)
   - Pestaa activa: texto e icono `#5a6c7d`, indicador de subrayado 3px
   - Pestaas inactivas: texto e icono `#64748b`

3. **rea de logo (si aplica)**
   - Layout grid: columna izquierda (placeholder ~90px) + columna derecha (info + botn Cargar)
   - Placeholder: 90x90px, borde punteado `#cbd5e1`, icono gris `#cbd5e1`
   - Contenedor: fondo `#f8fafc`, borde punteado `#e0e6ed`, hover con `#5a6c7d`

4. **Campos del formulario**
   - Espaciado compacto: `gutter={[12, 12]}` en `Row`, `margin-bottom: 12px` en `Form.Item`
   - Distribucin por fila segn referencia:
     - Fila 1: 2 campos (`Col span={12}` cada uno)
     - Filas 2 y 3: 3 campos (`Col span={8}` cada uno)
   - Inputs: border-radius 8px, hover/focus con borde `#5a6c7d`

5. **Footer**
   - Fondo `#f5f7fa`, borde superior `2px solid #e0e6ed`
   - Botones alineados a la derecha: Cancelar (secundario) + Crear/Guardar (principal `#5a6c7d`)
   - `footer={null}` en Modal, footer custom dentro del contenido

### Clases CSS para modales (UsersManagementPage.module.css)

| Clase | Uso |
|-------|-----|
| `.companyModal` | Contenedor del modal (border-radius, sombra) |
| `.companyModalHeader` | Flex del ttulo + icono |
| `.companyModalHeaderIcon` | Recuadro del icono (40x40px) |
| `.companyModalHeaderRight` | Contenedor Activo + cerrar |
| `.companyModalEstadoPaper` | Paper del switch Activo/Inactivo |
| `.companyModalCloseBtn` | Botn X para cerrar |
| `.companyModalTabs` | Tabs con indicador y colores |
| `.companyModalFooter` | Footer con fondo y borde |
| `.companyModalBtnCancel` | Botn Cancelar |
| `.companyModalBtnSubmit` | Botn principal Crear/Guardar |
| `.companyFormContent` | Contenedor del formulario (inputs, labels) |
| `.companyFormGrid` | Grid de campos (espaciado compacto) |
| `.logoUploadArea` | rea de carga de logo |
| `.logoUploadPlaceholder` | Recuadro placeholder 90x90px |
| `.logoUploadInfo`, `.logoUploadTitle`, `.logoUploadDesc` | Info del logo |

### Reglas funcionales

- **Solo campos en BD:** No incluir pestaas o campos que no existan en el modelo/API.
- **Validaciones:** Usar `formValidation.ts` (textRules, emailRules, optionalNoSqlInjection) para campos de texto y email. Ver `docs/31-ValidacionFormulariosFrontend.md`. Campos requeridos con `*`, mensajes claros en `rules`.
- **Estado visual:** Switch Activo/Inactivo solo informativo en header (edicin de estado va Inactivar/Reactivar en el cuerpo).
- **Botn primario de submit:** Debe iniciar deshabilitado y habilitarse solo cuando los campos requeridos tengan valor vlido (trim y reglas de formato). Esta regla aplica a todos los formularios nuevos y existentes.
- **Acciones crticas:** Crear y Guardar cambios deben pasar por confirmacin explcita (`modal.confirm`) antes de ejecutar mutaciones.

### Ejemplo de uso

```tsx
<Modal
  className={styles.companyModal}
  closable={false}
  footer={null}
  title={(
    <Flex justify="space-between" align="center" style={{ width: '100%' }}>
      <div className={styles.companyModalHeader}>
        <div className={styles.companyModalHeaderIcon}>
          <BankOutlined />
        </div>
        <span>Crear Nueva Entidad</span>
      </div>
      <Flex align="center" gap={12} className={styles.companyModalHeaderRight}>
        <div className={styles.companyModalEstadoPaper}>
          <span>Activo</span>
          <Switch checked disabled />
        </div>
        <Button type="text" icon={<CloseOutlined />} onClick={onClose} className={styles.companyModalCloseBtn} />
      </Flex>
    </Flex>
  )}
>
  <Form className={styles.companyFormContent}>
    <Tabs className={`${styles.tabsWrapper} ${styles.companyModalTabs}`} items={tabItems} />
    <div className={styles.companyModalFooter}>
      <Button onClick={onClose} className={styles.companyModalBtnCancel}>Cancelar</Button>
      <Button type="primary" className={styles.companyModalBtnSubmit}>Crear</Button>
    </div>
  </Form>
</Modal>
```

---

## Referencia de Implementacin

| Pgina | Archivo | Qu ver como referencia |
|--------|---------|-------------------------|
| **Empresas** | `CompaniesManagementPage.tsx` | Tabla, filtros expandibles, **modal de creacin/edicin** (patrn formularios) |
| **Empleados** | `EmployeeCreateModal.tsx` | Modal de creacin con el mismo patrn que Empresas (header, tabs, footer, Paleta RRHH) |
| **Usuarios** | `UsersManagementPage.tsx` | Drawer, etiquetas, botones, tabs |
| **Permisos** | `PermissionsAdminListPage.tsx` | Encabezado, banner informativo, bsqueda |
| **Roles** | `RolesManagementPage.tsx` | Selector de aplicacin, matriz de permisos |

Todas las pginas anteriores importan `UsersManagementPage.module.css` y aplican la Paleta RRHH.

### Nota de UX para Empresas

- La pantalla `Configuracin > Empresas` **no** muestra tabs de navegacin cruzada en su encabezado.
- Empresas es un mdulo dedicado: ttulo, subttulo y acciones del mdulo.
- El modal usa tabs internos (`Informacin Principal`, `Direccin`). Solo incluir pestaas con campos existentes en BD.

### Actualizacin de tabla tras mutaciones (obligatorio)

Tras **cualquier accin** que modifique datos en listados (crear, editar, inactivar, reactivar, etc.), la tabla **debe refrescar** para mostrar los datos actualizados. Esto aplica a Empresas y a cualquier otro listado similar (empleados, usuarios, etc.). Implementacin: invocar la funcin de recarga del listado despus de cada mutacin exitosa.

---

## Tabla y Filtros (Patrn Oficial de Listados)

> **Usar siempre este patrn** para listados en configuracin y mdulos administrativos.

### Dnde est la referencia

| Tipo | Archivo | Clases CSS |
|------|---------|------------|
| **Implementacin** | `frontend/src/pages/private/configuration/CompaniesManagementPage.tsx` |  |
| **Estilos** | `frontend/src/pages/private/configuration/UsersManagementPage.module.css` | `.configTable`, `.companiesTable`, `.filtersCollapse`, `.paneCard`, `.paneOptionsBox`, etc. |

### Estructura obligatoria del listado

1. **Encabezado**  Ttulo de seccin (ej. "Registros de Empresas"), icono de filtro, selector "entries per page", toggle "Mostrar inactivas".
2. **Seccin Filtros**  Dentro de `Collapse` con header "Filtros". **Colapsada por defecto** (`filtersExpanded` inicial en `false`); el usuario la expande al hacer clic.
3. **Bsqueda global**  Input "Search" + botones "Collapse All", "Show All", "Limpiar Todo".
4. **Panes de filtro**  Una tarjeta por campo (`paneCard`), con input, botn buscar, limpiar, expandir/colapsar.
5. **Lista de opciones**  Al expandir, `paneOptionsBox` con `Checkbox.Group` y `Badge` de conteo.
6. **Tabla**  Clases `configTable` + `companiesTable`.
7. **Separacin**  `margin-bottom: 24px` entre filtros y tabla (`.filtersCollapse`).

### Clases CSS para tabla y filtros

| Clase | Uso | Ubicacin en CSS |
|-------|-----|------------------|
| `.configTable` | Tabla base (encabezados, celdas, bordes) | `UsersManagementPage.module.css` |
| `.companiesTable` | Refuerzo para tablas de empresas/listados | Mismo archivo |
| `.filtersCollapse` | Collapse de filtros + `margin-bottom: 24px` | Mismo archivo |
| `.paneCard` | Tarjeta de cada filtro (borde, padding, fondo) | Mismo archivo |
| `.paneOptionsBox` | Contenedor de checkboxes al expandir filtro | Mismo archivo |
| `.filterLabel` | Etiqueta de campo de filtro | Mismo archivo |
| `.filterInput` | Input de filtro con bordes | Mismo archivo |
| `.searchInput` | Bsqueda global | Mismo archivo |
| `.registrosTitle` | Ttulo "Registros de X" | Mismo archivo |
| `.registrosFilterIcon` | Icono de filtro junto al ttulo | Mismo archivo |

### Estilos de tabla (aplicados por `.configTable` y `.companiesTable`)

| Elemento | Estilo |
|----------|--------|
| Contenedor | Borde `1px solid #e8ecf0`, border-radius 8px, box-shadow sutil |
| Encabezados | Fondo `#f2f4f6`, color `#4a5a68`, font-weight 600, uppercase, padding 16px 12px, borde inferior 2px |
| Celdas | Borde `#e8ecf0`, padding 14px 12px, color texto `#3d4f5c` |
| Filas alternadas | Pares: `#f9fafb`, impares: blanco |
| Hover fila | Fondo `#f8f9fa`, transition 0.2s |
| Esquinas | Primera/ltima celda de encabezado y ltima fila con border-radius 8px |
| Paginacin | Botones border-radius 6px, activo borde/texto `#5a6c7d` |

### Reglas funcionales de filtros

- Bsqueda global + filtros por campo (AND entre filtros activos).
- Cada filtro expandible/colapsable y limpiable individualmente.
- Controles globales: "Collapse All", "Show All", "Limpiar Todo".
- Conteos por opcin (`Badge`) recalculados segn filtros activos.
- 4-6 panes de filtro por campos clave (nombre, cdigo, estado, email, etc.).

### Ejemplo de uso

```tsx
import styles from './UsersManagementPage.module.css';

// Tabla
<Table
  className={`${styles.configTable} ${styles.companiesTable}`}
  columns={columns}
  dataSource={data}
  pagination={{ showTotal: (t, r) => `Mostrando ${r[0]} a ${r[1]} de ${t} registros` }}
/>

// Filtros
<Collapse className={styles.filtersCollapse}>
  <Collapse.Panel header="Filtros" key="filtros">
    <div className={styles.paneCard}>
      {/* input + botones + paneOptionsBox al expandir */}
    </div>
  </Collapse.Panel>
</Collapse>
```

### Clases CSS obligatorias (UsersManagementPage.module.css)

**Archivo:** `frontend/src/pages/private/configuration/UsersManagementPage.module.css`

#### Tabla y filtros (ver seccin *Tabla y Filtros* arriba)
| Clase | Uso |
|-------|-----|
| `.configTable` | Tabla: bordes, encabezados, filas alternadas, hover |
| `.companiesTable` | Refuerzo para tablas de listado |
| `.filtersCollapse` | Seccin filtros colapsable + separacin con tabla |
| `.paneCard` | Tarjeta de cada filtro por campo |
| `.paneOptionsBox` | Lista de opciones (checkboxes) al expandir |
| `.filterLabel`, `.filterInput`, `.searchInput` | Inputs de filtro |
| `.registrosTitle`, `.registrosFilterIcon` | Encabezado de listado |

#### Etiquetas, botones y banners
| Clase | Uso | Valores principales |
|-------|-----|---------------------|
| `.tagActivo` | Etiqueta estado Activo | fondo `#b8d9c4`, texto `#3d5a45` |
| `.tagInactivo` | Etiqueta estado Inactivo | fondo `#f0f2f4`, texto `#6b7a85` |
| `.exceptionListBox` | Lista danger | fondo `#ecd8d8`, borde `#c99a9a` |
| `.btnPrimary` | Botn principal | fondo `#5a6c7d` |
| `.btnSecondary` | Botn secundario | borde `#d8dde4`, texto `#5a6b7a` |
| `.infoBanner` + `.infoType` (Alert) | Mensajes informativos | Ver *Banners informativos* |
| `.infoBanner` + `.warningType` / `.dangerType` | Advertencias / errores | Ver *Banners informativos* |

#### Tabs y selectores
| Clase | Uso |
|-------|-----|
| `.pageTabs` / `.pageTab` / `.pageTabActive` | Tabs de pgina (Roles, Usuarios, Permisos) |
| `.tabsWrapper` | Tabs en Drawer o modal |
| `.appSelector` | Selector de aplicacin (KPITAL/TimeWise) |

#### Modales y formularios (ver seccin *Formularios y Modales*)
| Clase | Uso |
|-------|-----|
| `.companyModal`, `.companyModalHeader`, `.companyModalHeaderIcon` | Modal, header, icono |
| `.companyModalHeaderRight`, `.companyModalEstadoPaper`, `.companyModalCloseBtn` | Activo, switch, cerrar |
| `.companyModalTabs`, `.companyModalFooter`, `.companyModalBtnCancel`, `.companyModalBtnSubmit` | Tabs, footer, botones |
| `.companyFormContent`, `.companyFormGrid` | Formulario, grid de campos |
| `.logoUploadArea`, `.logoUploadPlaceholder`, `.logoUploadInfo` | rea de logo |
| `.employeeModalTabsScroll` | Tabs con scroll horizontal (empleados): muestra nombres completos, oculta men "Ms" y nav-operations, padding-right para evitar corte visual al scroll |
| `.historicoProvisionBlock`, `.historicoTableWrap`, `.historicoTableHeader`, `.historicoTableRow`, `.historicoAddBtn` | Seccin Provisin de Aguinaldo: tarjeta blanca estilo sectionCard, tabla estilo configTable, botn principal |

#### Modales de confirmacin
| Clase | Uso |
|-------|-----|
| `.companyConfirmModal` | Modal de confirmacin centrado, ancho 420px, estilo Paleta RRHH |
| `.companyConfirmOk`, `.companyConfirmCancel` | Botones S/Cancelar |

**Ejemplo:** `modal.confirm({ rootClassName: styles.companyConfirmModal, icon: <QuestionCircleOutlined style={{ color: '#5a6c7d', fontSize: 40 }} />, centered: true, width: 420, okButtonProps: { className: styles.companyConfirmOk }, cancelButtonProps: { className: styles.companyConfirmCancel } })`

**Regla:** Usar estas clases en *todos* los modales de confirmacin (crear, editar, inactivar, reactivar, etc.). No inventar colores ni duplicar estilos. El icono debe ser `QuestionCircleOutlined` color `#5a6c7d`; no usar el icono amarillo de advertencia por defecto.

---

### Tabs estilo control segmentado (Obligatorio)

Para secciones como **Empresas, Roles, Excepciones, Acciones** y **Roles, Usuarios, Permisos**:

| Elemento | Estilo |
|----------|--------|
| Contenedor | Fondo `#f5f5f5`, padding 46px, border-radius 810px, sombra sutil |
| Pestaa activa | Fondo blanco, texto `#333333`, font-weight 600, sombra `0 1px 3px rgba(0,0,0,0.06)`, `transform: scale(1.02)` |
| Pestaa inactiva | Sin fondo, texto `#777777`, font-weight 400 |
| Transicin | `cubic-bezier(0.34, 1.56, 0.64, 1)` para efecto burbuja |
| Contenido al cambiar pestaa | Animacin `tabPaneFadeIn` (opacidad + translateY 4px) |

**Uso:** 
- Pgina: `className={styles.pageTabs}` con `pageTab` + `pageTabActive`
- Drawer: envolver `Tabs` en `className={styles.tabsWrapper}`

---

### Banners informativos (Obligatorio)

Todo mensaje informativo (Para qu sirve, Inactivar vs Bloquear, Denegar permisos globalmente, Sin empresas asignadas, etc.) debe usar:

**Clase:** `className={\`${styles.infoBanner} ${styles.infoType}\`}` (o `warningType` / `dangerType`)

| Propiedad | Valor |
|-----------|-------|
| Fondo | Blanco `#ffffff` |
| Borde | `1px solid #e8ecf0` |
| Padding | `10px 14px` |
| Margin-bottom | `8px` |
| Ttulo | `#3d4f5c`, 13px, font-weight 600 |
| Descripcin | `#6b7a85`, 12px, line-height 1.45 |

**Iconos suaves (no fuertes):**

| Tipo | Clase | Color icono |
|------|-------|-------------|
| Informacin | `infoType` | Verde apagado `#5a7a6a` |
| Advertencia | `warningType` | Naranja suave `#b8860b` |
| Error/Danger | `dangerType` | Rojo suave `#a85c5c` |

**Ejemplo:**
```tsx
<Alert
  className={`${styles.infoBanner} ${styles.infoType}`}
  type="info"
  showIcon
  message="Para qu sirve"
  description="Define en cules empresas puede operar el usuario."
/>
```

**Regla:** Mantener banners compactos, limpios y con iconos suaves. Evitar colores fuertes.

---

## Reglas de Uso de Ant Design

### Qu S hacer

1. **Usar componentes base de AntD directamente:** `Button`, `Table`, `Form`, `Modal`, `Select`, `Input`, `DatePicker`, `Tabs`, `Card`, `Badge`, `Avatar`, `Tag`, `Space`, `Typography`, `Layout`, `Menu`.
2. **Para formularios y modales de creacin/edicin:** Usar el patrn de `CompaniesManagementPage.tsx` (modal) y las clases `companyModal*`, `companyFormContent`, `companyFormGrid`, `logoUploadArea` de `UsersManagementPage.module.css`. Ver seccin *Formularios y Modales*.
3. **Para tablas y filtros:** Usar el patrn de `CompaniesManagementPage.tsx` y las clases `configTable`, `companiesTable`, `filtersCollapse`, `paneCard`, `paneOptionsBox` de `UsersManagementPage.module.css`. Ver seccin *Tabla y Filtros*.
4. **Usar CSS Modules (`.module.css`)** para estilos especficos. Importar `UsersManagementPage.module.css` en pginas de configuracin.
5. **Usar exclusivamente la Paleta RRHH** para colores. No inventar colores fuera de ella.
6. **Consultar** `frontend/src/pages/private/configuration/UsersManagementPage.module.css` para clases y valores hex.
7. **Usar tabs estilo control segmentado** para Empresas, Roles, Excepciones, Acciones y para Roles, Usuarios, Permisos.
8. **Usar banners informativos compactos** (`infoBanner` + `infoType`/`warningType`/`dangerType`) para mensajes de gua o advertencia.
9. **Seguir la nomenclatura documentada** en *Nomenclatura y convenciones* para clases, pginas y textos.

### Qu NO hacer

1. **No usar colores fuertes ni llamativos.** Evitar azul brillante (`#1677ff`), verde fuerte (`#52c41a`), rojos saturados. En banners informativos, usar iconos suaves (ver seccin *Iconos de banners informativos*).
2. **No poner lgica de negocio en componentes UI.** Un `KpTable` no decide qu datos mostrar. Recibe datos procesados.
3. **No mezclar frameworks.** Si AntD tiene un `Select`, no uses `react-select`. Si AntD tiene un `Modal`, no hagas uno custom con CSS.
4. **No crear modales o formularios con estilos distintos.** Seguir el patrn documentado en *Formularios y Modales* para mantener coherencia.
5. **No sobreescribir estilos globales de AntD con `!important`.** Usar tokens del tema o CSS Modules.
6. **No hardcodear colores fuera de la Paleta RRHH.** Usar los hex documentados en este documento.

---

## Iconos

Se integraron mltiples bibliotecas de conos para flexibilidad:

| Biblioteca | Uso | Carga |
|-----------|-----|-------|
| **Ant Design Icons** (`@ant-design/icons`) | Header, botones, acciones | Import directo en JS |
| **Tabler Icons** | Sidebar | CSS font (`tabler-icons.min.css`) |
| **Phosphor Icons** | Complementario | CSS font (`phosphor/duotone/style.css`) |
| **Feather Icons** | Complementario | CSS font (`feather.css`) |
| **Font Awesome** | Complementario | CSS font (`fontawesome.css`) |
| **Material Icons** | Complementario | CSS font (`material.css`) |

Los CSS de fuentes de conos se cargan desde `public/assets/fonts/` en `index.html`.

---

## Tipografa

**Google Fonts: Public Sans**  Cargada desde CDN en `index.html`:

```html
<link href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
```

Aplicada globalmente en `index.css` y en el tema de AntD (`fontFamily`).

---

## Archivos Generados

| Archivo | Propsito |
|---------|-----------|
| `src/config/theme.ts` | Tokens corporativos KPITAL (colores, tipografa, radios) |
| `src/providers/AntDConfigProvider.tsx` | ConfigProvider dinmico (tema + locale) |
| `src/components/ui/KpButton.tsx` | Wrapper de Button (extensible) |
| `src/components/ui/KpTable.tsx` | Wrapper de Table (paginacin por defecto) |

---

## Orden de Ejecucin (Cumplido)

1. Instalar `antd` + `@ant-design/icons`
2. Crear `theme.ts` con tokens corporativos
3. Crear `AntDConfigProvider.tsx` conectado a Theme y Locale contexts
4. Integrar en `Providers.tsx` como wrapper
5. Crear componentes envueltos (`KpButton`, `KpTable`)
6. Migrar layout a componentes AntD (`Layout`, `Menu`, etc.)

---

## Estandar de encoding Frontend (obligatorio)

- Todos los archivos de rontend/src deben guardarse en UTF-8 sin BOM.
- No se permiten cadenas mojibake en UI (C, , , , etc.).
- Si un entorno presenta problemas con acentos, usar texto sin tilde como fallback funcional.
- Antes de merge, ejecutar barrido de caracteres corruptos en rontend/src.
