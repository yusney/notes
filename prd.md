# PRD: Gestor de Conocimiento Personal

> **Producto:** Aplicación de escritorio multi-plataforma (Tauri + React) para almacenar, organizar y recuperar conocimiento técnico de desarrollo de software, con capacidad de compartir notas vía URL.  
> **Dominio:** `[subdominio].donduque.dev`  
> **Tipo:** Multi-usuario, multi-plataforma (Windows, macOS, Linux)  
> **Versión:** 1.0  

---

## 1. Visión del Producto

Una herramienta de fricción cero que funciona como "segundo cerebro" para desarrolladores. Todo el conocimiento técnico —snippets, guías de despliegue, configuraciones, comandos— en un solo lugar, recuperable en segundos. Cada usuario tiene su espacio privado, pero puede compartir cualquier nota con el mundo mediante una URL — temporal o permanente.

**Meta principal:** De la idea al resultado en el menor número de clics posible.

---

## 2. Objetivos

| Objetivo | Descripción |
|-----------|-------------|
| **Centralización** | Unificar todo el conocimiento técnico, configuraciones y comandos útiles en un solo lugar |
| **Velocidad de recuperación** | Minimizar el tiempo que se tarda en encontrar una solución o fragmento de código previamente guardado |
| **Fricción cero** | La creación de una nota o la búsqueda de una existente debe requerir el menor número de acciones posible |
| **Colaboración selectiva** | Permitir compartir notas individuales mediante URLs temporales o permanentes, sin exponer el resto del conocimiento privado |

---

## 3. Historias de Usuario

### Prioridad P0 — MVP (Debe tener)

#### UC-01: Crear nota con texto enriquecido y código
> **Como** usuario, **quiero** crear una nota que soporte texto enriquecido y bloques de código, **para** guardar configuraciones y snippets con el formato correcto.

- **Criterios de aceptación:**
  - [ ] El editor soporta Markdown con preview en tiempo real
  - [ ] Los bloques de código tienen syntax highlighting según el lenguaje
  - [ ] Se puede indicar el lenguaje del bloque de código para activar el highlighting
  - [ ] Auto-save con debounce: la nota se guarda automáticamente al dejar de escribir (1.5s de inactividad). También existe botón manual "Guardar"
  - [ ] Indicador visual del estado de guardado: "Guardando...", "Guardado ✓", "Error al guardar"

#### UC-02: Buscar notas globalmente
> **Como** usuario, **quiero** una barra de búsqueda global, **para** encontrar coincidencias en el título y contenido de las notas al instante.

- **Criterios de aceptación:**
  - [ ] La búsqueda es en tiempo real (sin necesidad de submit)
  - [ ] Busca en título Y contenido de las notas
  - [ ] Los resultados se actualizan a medida que el usuario escribe (debounced, 300ms)
  - [ ] La búsqueda funciona sin recargar la página
  - [ ] Estado vacío: si no hay resultados, mostrar "No se encontraron notas para '{query}'" con sugerencia de crear una nueva
  - [ ] Estado vacío inicial: si el usuario no tiene notas, mostrar call-to-action "Crea tu primera nota"

#### UC-03: Copiar código al portapapeles
> **Como** usuario, **quiero** un botón de "Copiar al portapapeles" en los bloques de código, **para** usar la información instantáneamente sin seleccionar manualmente.

- **Criterios de aceptación:**
  - [ ] Cada bloque de código tiene un botón visible/on-hover de "Copiar"
  - [ ] Al hacer clic, el código se copia y se muestra feedback visual (toast "¡Copiado!")
  - [ ] No se copia el número de línea, solo el código

#### UC-04: Registro y autenticación de usuarios
> **Como** usuario, **quiero** poder registrarme e iniciar sesión, **para** tener mi espacio privado donde solo yo puedo ver, editar o borrar mis apuntes.

- **Criterios de aceptación:**
  - [ ] Registro con email + contraseña (mínimo 8 caracteres, al menos 1 número y 1 especial)
  - [ ] Login con proveedores OAuth: Google y GitHub (orientado a desarrolladores)
  - [ ] Login seguro con persistencia de sesión (7 días, renovable con refresh token)
  - [ ] Cada usuario accede solo a SUS notas, tabs y tags (aislamiento total entre usuarios)
  - [ ] Las rutas protegidas redirigen al login si no hay sesión activa
  - [ ] Cerrar sesión elimina la sesión del cliente y revoca el refresh token
  - [ ] Rate limiting en endpoints de auth: máximo 5 intentos de login por minuto por IP

#### UC-05: Navegación por Tabs (categorías principales)
> **Como** usuario, **quiero** clasificar mis notas en categorías principales visibles como pestañas, **para** separar el contexto visualmente (ej: Frontend, Backend, DevOps, General).

- **Criterios de aceptación:**
  - [ ] Las Tabs son configurables (CRUD completo)
  - [ ] Cambiar de Tab actualiza instantáneamente la lista de notas
  - [ ] Cada nota pertenece a exactamente un Tab principal
  - [ ] La navegación no recarga la página
  - [ ] Tab por defecto "General" creada automáticamente al registrar un usuario

---

### Prioridad P1 — Alta importancia

#### UC-06: Compartir nota mediante URL pública
> **Como** usuario, **quiero** generar un enlace URL para compartir una nota individual con otras personas, **para** que puedan verla sin necesidad de tener una cuenta.

- **Criterios de aceptación:**
  - [ ] Desde cualquier nota, existe una acción "Compartir" que genera una URL única
  - [ ] La URL apunta a una vista pública de solo lectura (sin edición, sin acceso al resto de las notas del autor)
  - [ ] Se puede configurar la duración del enlace: **permanente** (sin expiración) o **temporal** (con fecha/hora de expiración)
  - [ ] Al crear un enlace temporal, se puede elegir el tiempo de expiración: 1 hora, 24 horas, 7 días, o fecha personalizada
  - [ ] Se puede revocar/cancelar un enlace ya generado (esto invalida la URL inmediatamente)
  - [ ] Se puede ver una lista de notas compartidas y el estado de sus enlaces (activos, expirados, revocados)
  - [ ] Las URLs compartidas son impredecibles (tokens aleatorios tipo NanoID, no IDs secuenciales)
  - [ ] Se puede generar más de un enlace por nota (ej: uno temporal para un compañero, uno permanente para un blog)
  - [ ] **Si se edita la nota original**, el enlace muestra la versión actualizada (los links apuntan siempre a la versión más reciente)
  - [ ] **Si se elimina la nota original**, el enlace muestra una página "Esta nota ya no existe" (HTTP 410 Gone)
  - [ ] La vista pública renderiza Markdown con syntax highlighting (misma calidad que la vista autenticada)
  - [ ] La vista pública incluye Open Graph tags para previews en Slack/Discord/Twitter (título, descripción, lenguaje del primer bloque de código)
  - [ ] Las notas compartidas tienen `noindex` en el meta robots por defecto (no se indexan en Google)

#### UC-07: Etiquetas (Tags) para sub-clasificación
> **Como** usuario, **quiero** asignar múltiples etiquetas a una nota, **para** tener una sub-clasificación granular (ej: docker, nginx, error-fix).

- **Criterios de aceptación:**
  - [ ] Una nota puede tener múltiples tags
  - [ ] Los tags se pueden crear, editar y eliminar desde un panel de gestión
  - [ ] Al editar una nota, se pueden buscar y seleccionar tags existentes o crear nuevos

#### UC-08: Filtros cruzados
> **Como** usuario, **quiero** aplicar filtros cruzados (búsqueda + Tab + Tags), **para** encontrar resultados exactos al instante.

- **Criterios de aceptación:**
  - [ ] Los filtros son acumulativos: buscar "cors" + Tab "Backend" + Tag "seguridad" = intersección
  - [ ] Los filtros activos son visibles y removibles individualmente
  - [ ] Sin filtros activos, se muestran todas las notas del Tab actual

#### UC-09: Editar y eliminar notas
> **Como** usuario, **quiero** editar o eliminar notas existentes, **para** mantener la información actualizada.

- **Criterios de aceptación:**
  - [ ] Edición en vista dedicada (navegación a /notes/:id/edit con el editor completo)
  - [ ] Confirmación antes de eliminar (diálogo "¿Estás seguro? Esta acción no se puede deshacer")
  - [ ] Eliminación permanente (no trash/undo para MVP)
  - [ ] Si la nota tiene enlaces compartidos activos, advertir antes de eliminar: "Esta nota tiene {N} enlace(s) compartido(s) activo(s) que dejarán de funcionar"

#### UC-10: Panel de gestión de metadatos
> **Como** usuario, **quiero** un apartado para administrar tags y Tabs disponibles, **para** mantener la taxonomía organizada.

- **Criterios de aceptación:**
  - [ ] CRUD completo para Tabs
  - [ ] CRUD completo para Tags
  - [ ] Al eliminar un Tag/Tab se permite reasignar o dejar sin categoría las notas afectadas

#### UC-11: Favoritos / Pinned (notes ancladas)
> **Como** usuario, **quiero** marcar notas como favoritas y anclarlas arriba de la lista, **para** acceder instantáneamente a las notas que uso todo el tiempo (ej: comandos de Docker, scripts de deploy).

- **Criterios de aceptación:**
  - [ ] Icono de estrella/bookmark para marcar una nota como favorita
  - [ ] Las notas favoritas aparecen primero en la lista, destacadas visualmente
  - [ ] Se puede quitar el favorito con el mismo botón
  - [ ] El favorito es persistente (se guarda en la base de datos)

#### UC-12: Ordenar notas
> **Como** usuario, **quiero** ordenar mis notas por diferentes criterios, **para** encontrar lo que necesito de la forma que me resulte más útil.

- **Criterios de aceptación:**
  - [ ] Ordenar por: fecha de creación (desc por defecto), fecha de modificación, título (alfabético)
  - [ ] Los favoritos siempre aparecen primero, independientemente del orden
  - [ ] La preferencia de orden se persiste (localStorage o preferencias de usuario)

#### UC-13: Restablecer contraseña
> **Como** usuario, **quiero** poder restablecer mi contraseña si la olvido, **para** no perder acceso a mis notas.

- **Criterios de aceptación:**
  - [ ] Link "¿Olvidaste tu contraseña?" en la pantalla de login
  - [ ] Envío de email con enlace de restablecimiento (válido por 1 hora)
  - [ ] Formulario de nueva contraseña con confirmación
  - [ ] El enlace de restablecimiento se invalida después de usado

#### UC-14: Perfil de usuario
> **Como** usuario, **quiero** configurar mi perfil básico, **para** personalizar mi experiencia y que la UI me muestre mi nombre en lugar de un email críptico.

- **Criterios de aceptación:**
  - [ ] Editar nombre visible (display name)
  - [ ] Subir avatar o usar avatar por defecto (Gravatar o inicial del nombre)
  - [ ] Cambiar email (con verificación)
  - [ ] Cambiar contraseña (con confirmación de la actual)

#### UC-15: Modo oscuro / claro
> **Como** usuario, **quiero** cambiar entre modo oscuro y modo claro, **para** usar la app cómodamente en cualquier condición de luz.

- **Criterios de aceptación:**
  - [ ] Toggle manual entre dark mode y light mode
  - [ ] Respeta la preferencia del sistema operativo como valor por defecto (`prefers-color-scheme`)
  - [ ] La preferencia se persiste y se mantiene entre sesiones
  - [ ] Ambos modos tienen buen contraste y legibilidad (incluyendo bloques de código)

---

### Prioridad P2 — Nice to have

#### UC-16: Acceso rápido a creación de notas
> **Como** usuario, **quiero** un acceso directo permanente para crear notas (botón flotante o atajo de teclado), **para** crear notas desde cualquier pantalla sin navegar.

- **Criterios de aceptación:**
  - [ ] Botón flotante visible en todas las pantallas
  - [ ] Atajo de teclado configurable (ej: `Ctrl+N`)
  - [ ] Abre el editor en modo creación inmediatamente

#### UC-17: Exportar notas
> **Como** usuario, **quiero** exportar todas mis notas (ej: ZIP con archivos Markdown), **para** garantizar que la información no quede atrapada en la aplicación.

- **Criterios de aceptación:**
  - [ ] Exportar todas las notas como archivos `.md` en un ZIP
  - [ ] Opción de exportar por Tab o por Tags
  - [ ] Los bloques de código se preservan en el Markdown exportado

#### UC-18: Vista previa social (Open Graph) para notas compartidas
> **Como** usuario, **quiero** que cuando alguien pegue mi enlace en Slack/Discord/Twitter, se vea un preview con el título y fragmento de la nota, **para** que el destinatario sepa de qué trata antes de hacer clic.

- **Criterios de aceptación:**
  - [ ] Open Graph tags: `og:title`, `og:description`, `og:type`
  - [ ] La descripción muestra las primeras ~150 caracteres del contenido (truncados limpiamente)
  - [ ] Si la nota tiene bloques de código, `og:description` indica el lenguaje del primer bloque
  - [ ] Twitter Card tags para preview en Twitter/X

---

## 4. Funcionalidades Core (Maquinaria)

| # | Funcionalidad | UC Relacionado | Prioridad |
|---|--------------|----------------|-----------|
| F-01 | Editor Markdown con syntax highlighting | UC-01 | P0 |
| F-02 | Auto-save con debounce y estado visual | UC-01 | P0 |
| F-03 | Copiar código al portapapeles con feedback | UC-03 | P0 |
| F-04 | Motor de búsqueda dinámica en título y contenido | UC-02 | P0 |
| F-05 | Sistema de autenticación multi-usuario (email + OAuth) | UC-04 | P0 |
| F-06 | Sistema de navegación por Tabs | UC-05 | P0 |
| F-07 | Compartir notas mediante URL (temporal o permanente) | UC-06 | P1 |
| F-08 | Sistema de Tags (multi-tag por nota) | UC-07 | P1 |
| F-09 | Filtros cruzados (búsqueda + Tab + Tags) | UC-08 | P1 |
| F-10 | CRUD de notas (editar, eliminar con confirmación) | UC-09 | P1 |
| F-11 | Panel de gestión de metadatos (Tabs y Tags) | UC-10 | P1 |
| F-12 | Favoritos / Pinned notes | UC-11 | P1 |
| F-13 | Ordenar notas (fecha, título, modificación) | UC-12 | P1 |
| F-14 | Restablecer contraseña | UC-13 | P1 |
| F-15 | Perfil de usuario (nombre, avatar, preferencias) | UC-14 | P1 |
| F-16 | Modo oscuro / claro | UC-15 | P1 |
| F-17 | Acceso rápido de creación (botón flotante + shortcut) | UC-16 | P2 |
| F-18 | Exportación de notas a ZIP | UC-17 | P2 |
| F-19 | Open Graph / Social Preview para notas compartidas | UC-18 | P2 |

---

## 5. Requisitos de Interfaz y Experiencia (UI/UX)

| Principio | Detalle |
|-----------|---------|
| **Diseño Minimalista** | La interfaz cede todo el protagonismo al contenido. Nada de menús recargados ni distracciones. Sensación de herramienta limpia. |
| **Responsividad** | La plataforma debe ser navegable y legible desde un teléfono móvil (para consultar guías de despliegue rápidas fuera de la computadora). Uso principal: desktop. |
| **Flujo rápido** | Acceso directo permanente para crear notas desde cualquier pantalla. Foco en reducir fricción. |
| **Feedback inmediato** | Acciones como copiar, guardar, eliminar, compartir deben tener feedback visual instantáneo (toasts, transiciones). |
| **Dark mode first** | Diseñar primero en dark mode (público objetivo: devs). El light mode es un ciudadano de segunda clase que también debe verse bien. |

### Estados de la UI

Cada acción en la aplicación tiene 4 estados que DEBEN estar diseñados:

| Estado | Cuándo | Qué se muestra |
|--------|--------|---------------|
| **Loading** | Mientras se cargan datos | Skeleton/Spinner Según el contexto. Nunca pantalla en blanco. |
| **Empty** | Cuando no hay datos | Call-to-action claro. "No hay notas. Crea tu primera nota." |
| **Success** | After de una acción | Toast de confirmación efímero (2-3 segundos). |
| **Error** | Cuando algo falla | Mensaje claro y accionable. "No se pudo guardar. Reintentar." Nunca stack traces. |

---

## 6. Requisitos No Funcionales

| Categoría | Requisito | Detalle |
|-----------|-----------|---------|
| **Rendimiento** | Búsquedas sin recarga de página | Los filtros y búsquedas ejecutan en client-side o con llamadas API livianas. Sensación de inmediatez. |
| **Rendimiento** | Tiempo de búsqueda < 200ms | Para conjuntos de datos de hasta ~1000 notas, la búsqueda debe responder en menos de 200ms. |
| **Portabilidad** | Exportación de datos | El sistema permite exportar todas las notas en formato ZIP con archivos Markdown planos. La información nunca queda atrapada. |
| **Seguridad** | Aislamiento entre usuarios | Cada usuario accede solo a sus propios datos. Las notas compartidas solo exponen la nota específica, no el resto del espacio del autor. |
| **Seguridad** | URLs de compartir impredecibles | Los tokens de compartición son aleatorios (NanoID), no IDs secuenciales, para evitar adivinación. |
| **Seguridad** | Links temporales con expiración verificada | La expiración se verifica del lado del servidor. Un link expirado devuelve 410 Gone. |
| **Seguridad** | Rate limiting en API | Máximo 100 requests/minuto por usuario autenticado. Máximo 5 intentos de login/minuto por IP. |
| **Seguridad** | Protección XSS/CSRF | Sanitización de contenido Markdown en el backend. CSP headers. CSRF tokens en formularios. Input escapado en la renderización. |
| **Seguridad** | Validación de input | Límites: título máximo 200 caracteres, contenido máximo 100KB, tags máximo 20 por nota, tabs máximo 10 por usuario. |
| **Disponibilidad** | Sin requisitos de alta disponibilidad | Es uso personal. No se requiere SLA, pero debe estar disponible cuando se necesite. |
| **Arquitectura** | Clean Architecture estricta | Separación por capas con inversión de dependencias. El dominio no depende de infraestructura. Tests unitarios sin acoplamiento a BD o frameworks. |
| **Mantenibilidad** | Código limpio y convenciones | Naming consistente, sin código muerto, sin hardcode. Cada archivo tiene una responsabilidad clara. |
| **Logging** | Auditoría básica | Registrar: login/logout, generación y revocación de links compartidos, errores 5xx. Nada de logging de contenido de notas (privacidad). |
| **Backup** | Estrategia de backup de PostgreSQL | Backups diarios automatizados. Rotación de 30 días. Restauración testeada al menos una vez. |
| **Errores** | Manejo global de errores | API devuelve errores JSON estructurados con código y mensaje. Frontend muestra errores amigables. Nunca se expone información interna. |

---

## 7. Alcance del MVP

### ✅ En MVP (P0)
- Registro y autenticación de usuarios (email + OAuth Google/GitHub)
- Aislamiento de datos: cada usuario solo ve sus notas
- Auto-save con debounce y estado visual
- Crear notas con Markdown + syntax highlighting
- Copiar código al portapapeles
- Búsqueda global en título y contenido (con estado vacío)
- Navegación por Tabs (CRUD de Tabs)
- Lista de notas filtrada por Tab
- Restablecer contraseña

### 🔲 Fase 2 (P1)
- Compartir notas mediante URL (temporal o permanente)
- Sistema de Tags multi-etiqueta
- Filtros cruzados (búsqueda + Tab + Tags)
- CRUD completo de notas (editar, eliminar con confirmación)
- Panel de gestión de metadatos
- Favoritos / Pinned notes
- Ordenar notas
- Perfil de usuario
- Modo oscuro / claro

### 🔲 Fase 3 (P2)
- Acceso rápido de creación (botón flotante + shortcut)
- Exportar notas a ZIP
- Open Graph / Social Preview para notas compartidas

---

## 8. Modelo de Datos (Alto Nivel)

```
┌─────────────────┐       ┌─────────────────┐
│      User       │       │      Tab        │
├─────────────────┤       ├─────────────────┤
│ Id          UUID│       │ Id          UUID│
│ Email     string│       │ Name      string│
│ DisplayName str?│       │ Color     string│
│ AvatarUrl  str? │       │ Order        int│
│ PasswordHash str│       │ UserId      UUID│──── Foreign Key → User
│ Provider   enum │       │ CreatedAt  date │
│ ProviderId  str │       └─────────────────┘
│ CreatedAt  date │                │
│ UpdatedAt  date │                │ 1:N
└─────────────────┘                │
       │                           ▼
       │ 1:N              ┌─────────────────┐       ┌─────────────────┐
       │                  │      Note        │       │    NoteTag      │
       │                  ├─────────────────┤       ├─────────────────┤
       ├─────────────────▶ Id          UUID│       │ NoteId      UUID│──── FK → Note
       │                  │ Title     string│       │ TagId       UUID│──── FK → Tag
       │                  │ Content    text │       └─────────────────┘
       │                  │ Language  str?  │               │
       │                  │ IsPinned  bool  │               │ N:M
       │                  │ TabId      UUID│──── FK → Tab   │
       │                  │ UserId     UUID│──── FK → User  ▼
       │                  │ CreatedAt  date │       ┌─────────────────┐
       │                  │ UpdatedAt  date │       │      Tag        │
       │                  └─────────────────┘       ├─────────────────┤
       │                           │                │ Id          UUID│
       │                           │ 1:N            │ Name      string│
       │                           ▼                │ Color     str?  │
       │                  ┌─────────────────┐       │ UserId      UUID│──── FK → User
       │                  │   SharedLink    │       │ CreatedAt  date │
       │                  ├─────────────────┤       └─────────────────┘
       ├─────────────────▶ Id          UUID│
       │                  │ Token     string│  ← NanoID, único, impredecible
       │                  │ NoteId     UUID│──── FK → Note
       │                  │ IsTemporary bool│
       │                  │ ExpiresAt  date?│  ← NULL si es permanente
       │                  │ IsActive   bool │  ← Se revoca manualmente
       │                  │ CreatedAt  date │
       │                  └─────────────────┘
       │
       │ 1:1
       ▼
┌─────────────────┐
│  UserPreferences│
├─────────────────┤
│ Id          UUID│
│ UserId      UUID│──── FK → User
│ Theme      enum │  ← "light", "dark", "system"
│ SortOrder  enum │  ← "created_desc", "modified_desc", "alpha"
│ CreatedAt  date │
│ UpdatedAt  date │
└─────────────────┘
```

**Notas sobre el modelo:**
- **SharedLink.Token**: Se genera con NanoID (21 caracteres, 126 bits de entropía). No es el ID de la nota, es un token independiente e impredecible.
- **SharedLink.IsActive**: Permite revocar sin eliminar el registro (auditoría). Un link inactivo devuelve 410 Gone.
- **Note.IsPinned**: Flag simple para favoritos. Los favoritos se ordenan primero.
- **UserPreferences**: Preferencias del usuario separadas de la entidad User (SRP).
- **Note.Language**: Lenguaje principal de la nota (para metadata del Open Graph).

---

## 9. Flujos de Usuario Principales

### Flujo 1: Registro → Primera nota → Buscar

```
1. Usuario visita la app → Redirección a /login
2. Se registra con email o Google/GitHub → Se crea cuenta + Tab "General" por defecto
3. Dashboard vacío → Call-to-action "Crea tu primera nota"
4. Crea nota en Tab "General" → Auto-save → Indicador "Guardado ✓"
5. Busca "docker" → Resultados instantáneos → Filtra por Tab "DevOps" → Resultados refinados
```

### Flujo 2: Crear nota → Compartir → Destinatario abre link

```
1. Usuario selecciona nota → Click en "Compartir"
2. Modal "Compartir nota" → Selección: Permanente / Temporal (1h, 24h, 7d, custom)
3. Se copia URL al portapapeles → Toast "¡Link copiado!"
4. Destinatario abre URL → Vista pública de solo lectura con Markdown renderizado
5. Si el link expiró → Página "Este enlace ha expirado" (410 Gone)
6. Si la nota fue eliminada → Página "Esta nota ya no existe" (410 Gone)
```

### Flujo 3: Nota compartida → Se edita la original → Destinatario ve cambios

```
1. Usuario comparte nota con link permanente
2. Usuario edita la nota original → Auto-save
3. Destinatario abre el mismo link → Ve la versión actualizada
4. (El link siempre muestra la versión más reciente hasta que se revoque o la nota se elimine)
```

---

## 10. API Endpoints (Alto Nivel)

### Autenticación
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/auth/register` | Registrar nuevo usuario |
| POST | `/api/auth/login` | Login con email/password |
| POST | `/api/auth/login/{provider}` | Login con OAuth (Google, GitHub) |
| POST | `/api/auth/refresh` | Renovar access token |
| POST | `/api/auth/logout` | Cerrar sesión y revocar token |
| POST | `/api/auth/forgot-password` | Solicitar restablecimiento de contraseña |
| POST | `/api/auth/reset-password` | Restablecer contraseña con token |

### Notas
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/notes` | Listar notas del usuario (con filtros: tab, tags, search) |
| GET | `/api/notes/{id}` | Obtener nota por ID |
| POST | `/api/notes` | Crear nota |
| PUT | `/api/notes/{id}` | Actualizar nota |
| DELETE | `/api/notes/{id}` | Eliminar nota |
| PATCH | `/api/notes/{id}/pin` | Marcar/desmarcar como favorito |

### Tabs
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/tabs` | Listar tabs del usuario |
| POST | `/api/tabs` | Crear tab |
| PUT | `/api/tabs/{id}` | Actualizar tab |
| DELETE | `/api/tabs/{id}` | Eliminar tab |

### Tags
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/tags` | Listar tags del usuario |
| POST | `/api/tags` | Crear tag |
| PUT | `/api/tags/{id}` | Actualizar tag |
| DELETE | `/api/tags/{id}` | Eliminar tag |

### Compartir
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/notes/{id}/share` | Generar enlace compartido |
| GET | `/api/notes/{id}/shares` | Listar enlaces de una nota |
| DELETE | `/api/shares/{token}` | Revocar enlace compartido |
| GET | `/s/{token}` | Vista pública de nota compartida (sin auth) |

### Perfil
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/profile` | Obtener perfil del usuario |
| PUT | `/api/profile` | Actualizar perfil |
| PUT | `/api/profile/password` | Cambiar contraseña |

---

## 11. Deployment y CI/CD

### Infraestructura

| Componente | Tecnología | Detalle |
|-----------|-----------|---------|
| **Backend hosting** | VPS con Dokploy | Self-hosted PaaS, deploy automático desde GitHub |
| **Desktop app** | Tauri + React | Binarios nativos (.exe, .dmg, .AppImage) distribuidos vía GitHub Releases |
| **Base de datos** | PostgreSQL en VPS | Mismo servidor que el backend en MVP. Migrable a servicio externo si escala. |
| **Containerización** | Docker (solo backend) | Cada deploy del backend genera una imagen Docker nueva |
| **CI/CD** | GitHub Actions | Build, test y deploy automático del backend + build de la app desktop |
| **Repositorio** | GitHub | Source code, issues, project management, releases con binarios desktop |

### Flujo de Deployment

```
Developer push a GitHub
        │
        ▼
GitHub Actions se dispara
        │
        ├── 1. Test: dotnet test (backend)
        ├── 2. Test: npm run test (frontend)
        ├── 3. Build: dotnet publish (backend)
        ├── 4. Build Docker image (backend)
        ├── 5. Push Docker image a GitHub Container Registry
        ├── 6. Deploy a Dokploy via webhook
        │       │
        │       ▼
        │   Dokploy pulls nueva imagen
        │   ├── Stop container anterior
        │   ├── Run nuevo container
        │   └── Health check → OK → Deploy exitoso
        │
        └── 7. Build desktop app (Tauri)
                │
                ├── Build Windows (.msi, .exe)
                ├── Build macOS (.dmg, .app)
                ├── Build Linux (.AppImage, .deb)
                └── Upload a GitHub Releases (solo en tags v*.*.*)
```

### Reglas de Deployment

| Regla | Detalle |
|-------|---------|
| **Rama principal** | `main` = producción. Solo merge vía PR aprobado. |
| **Branching** | `feature/*` para features, `bugfix/*` para fixes, `hotfix/*` para urgentes. |
| **No deploy sin tests** | Si los tests fallan, el pipeline se detiene. No deploy manual sin CI verde. |
| **Rollback** | Dokploy mantiene la imagen anterior. Rollback manual si algo falla. |
| **Variables de entorno** | Configuradas en Dokploy, nunca en el código. `.env.example` en repo sin valores reales. |
| **SSL** | Dokploy maneja SSL con Let's Encrypt automáticamente. |

### Docker (Backend)

```dockerfile
# Dockerfile conceptual (se definirá en detalle en diseño técnico)
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
# Build steps...

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
# Runtime steps...
EXPOSE 8080
ENTRYPOINT ["dotnet", "Notes.Api.dll"]
```

### Estructura del Repositorio

```
notes/
├── src/
│   ├── Notes.Api/                 # Presentation layer (.NET)
│   ├── Notes.Application/          # Use cases, DTOs, interfaces
│   ├── Notes.Domain/                # Entities, Value Objects, Enums
│   └── Notes.Infrastructure/        # EF Core, repositories, external services
├── desktop/                        # Tauri + React app
│   ├── src/                        # React components, hooks, state
│   ├── src-tauri/                  # Rust shell (config, commands, native)
│   │   ├── src/
│   │   │   └── main.rs             # Entry point Tauri
│   │   ├── Cargo.toml
│   │   └── tauri.conf.json
│   ├── package.json
│   └── vite.config.ts
├── tests/
│   ├── Notes.Domain.Tests/
│   ├── Notes.Application.Tests/
│   ├── Notes.Infrastructure.Tests/
│   └── Notes.Api.Tests/
├── docker-compose.yml              # Para desarrollo local (backend + db)
├── Dockerfile                      # Build de producción backend
├── .github/
│   └── workflows/
│       ├── deploy-backend.yml      # Deploy API a Dokploy
│       └── build-desktop.yml       # Build Tauri desktop app
└── README.md
```

### Distribución de la App Desktop

| Aspecto | Detalle |
|---------|---------|
| **Formatos** | Windows: `.msi` (instalador) + `.exe` (portable)<br>macOS: `.dmg` (instalador) + `.app` (portable)<br>Linux: `.AppImage` (portable) + `.deb` (Debian/Ubuntu) |
| **Canal** | GitHub Releases con auto-updater de Tauri |
| **Versionado** | Tags `v1.0.0`, `v1.1.0` en GitHub disparan build de desktop |
| **Auto-update** | Tauri updater integrado. La app notifica cuando hay nueva versión y se actualiza automáticamente. |
| **Firma** | Binarios firmados (Windows: certificado, macOS: notarización Apple, Linux: GPG opcional) |
| **Backend URL** | Configurable en `tauri.conf.json` o variable de entorno. Default: `https://api.donduque.dev` |

### Configuración de Desarrollo (Tauri)

```json
// tauri.conf.json (conceptual)
{
  "productName": "Notes App",
  "identifier": "dev.donduque.notes",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:5173"
  },
  "app": {
    "windows": [
      {
        "title": "Notes",
        "width": 1280,
        "height": 800,
        "minWidth": 800,
        "minHeight": 600
      }
    ]
  }
}
```

---

## 12. Decisiones Técnicas

### ✅ Decididas

| Decisión | Elección | Justificación |
|----------|----------|---------------|
| Stack Backend | **.NET 10 + C# 14** | Ecosistema maduro, tipado fuerte, rendimiento nativo, Clean Architecture de primera mano. |
| Stack Frontend | **Tauri v2 + React 19** | Aplicación de escritorio nativa (binario ~10MB) con UI en React. Multi-plataforma (Windows, macOS, Linux). Consume API .NET vía HTTP. |
| Base de datos | **PostgreSQL** | Soporte nativo de Full-Text Search (FTS), robustez probada, extensibilidad con tipos JSONB. |
| Deployment Backend | **VPS con Dokploy + Docker** | Contenerización con Docker, deploy automático desde GitHub vía Dokploy. Imagen Docker por cada deploy. |
| Repositorio | **GitHub** | Source code, CI/CD pipeline, issues y project management. |
| Principio arquitectónico | **Clean Architecture** | Separación estricta de responsabilidades (Domain → Application → Infrastructure → API). Inversión de dependencias. Testeabilidad total. |
| Principio de código | **Buenas prácticas siempre** | SOLID, DRY, KISS, naming consistente, tests donde corresponda, sin atajos. |
| Política de guardado | **Auto-save con debounce (1.5s)** | Fricción cero. El usuario escribe y se guarda solo. Botón manual como fallback. |
| Política de edición | **Vista dedicada (/notes/:id/edit)** | Mejor UX para notas largas. Inline sería confuso con bloques de código. |
| Política de auth | **Email/Password + OAuth (Google, GitHub)** | Ambos métodos. Los devs esperan login con GitHub. Email para flexibilidad. |
| Comportamiento de links al editar | **Links apuntan a versión actualizada** | Si se edita la nota, el link muestra la nueva versión. Simple y predecible. |
| Comportamiento de links al eliminar | **Página "Nota ya no existe" (410)** | UX claro. No 404 genérico. El usuario sabe que existed pero fue removida. |
| Generación de tokens | **NanoID (21 chars, 126 bits entropía)** | Impredecible, compacto, URL-friendly. No UUID v4 (muy largo para URLs). |
| Editor Markdown | **TipTap** | Extensible, React-first, custom nodes fáciles (bloques de código con botón copiar), buena API. |
| Búsqueda | **Híbrida** (flexsearch client-side + Postgres FTS server-side) | flexsearch para instantáneo en <500 notas, Postgres FTS para filtros complejos o grandes volúmenes. |
| Estilos | **Tailwind CSS** | Utility-first, rápido de prototipar, consistente, tree-shakeable. |
| Motor de expiración de links | **Verificación on-read** | Al servir el link se chequea `ExpiresAt`. Simple, sin cron jobs. |
| ORM | **Entity Framework Core** | Clean Architecture friendly, migrations, LINQ, testeable con in-memory DB. |
| API estilo | **Controllers RESTful tradicionales** | Explícitos, testeables con WebApplicationFactory, claros para Clean Architecture. |
| State management (Frontend) | **Zustand** | Simple, sin boilerplate, performante, buen devtools. |
| Comunicación Tauri ↔ API | **HTTP fetch nativo** | Más simple, sin dependencia de plugins de Tauri. |
| Auto-update desktop | **Tauri updater integrado** | Notifica al usuario y descarga automáticamente. |

### ⏳ Pendientes

> Todas las decisiones técnicas principales están definidas. Decisiones futuras (ej: migrar a gRPC, cambiar estrategia de búsqueda) se tomarán durante la evolución del producto.

---

## 13. Estrategia de Testing

| Capa | Tipo de Test | Qué se testea | Framework sugerido |
|------|-------------|---------------|-------------------|
| **Domain** | Unitarios | Entidades, Value Objects, reglas de negocio | xUnit |
| **Application** | Unitarios | Casos de uso, validaciones, DTOs | xUnit + FluentAssertions |
| **Infrastructure** | Integración | Repositorios contra BD real (PostgreSQL test container) | xUnit + Testcontainers |
| **API** | Integración | Endpoints, autenticación, autorización | xUnit + WebApplicationFactory |
| **Frontend** | Unitarios + Integración | Componentes, hooks, flujos | Vitest + React Testing Library |
| **E2E** | End-to-end | Flujos críticos (login, crear nota, compartir) | Playwright |

**Principios de testing:**
- Tests unitarios para lógica de Application (sin BD, sin framework)
- Tests de integración para repositorios (con BD real, no mocks)
- Tests E2E solo para flujos críticos del usuario
- No se mockea lo que no se necesita. Si testeo un caso de uso, mockeo el repo. Si testeo el repo, uso BD real.
- Coverage mínimo: 80% en Application, 60% en Infrastructure.

---

## 14. Métricas de Éxito

| Métrica | Objetivo | Cómo se mide |
|---------|----------|-------------|
| Tiempo de creación de nota | < 3 segundos desde el clic hasta que el editor está listo | Telemetría del frontend |
| Tiempo de búsqueda | < 200ms para ~1000 notas | Telemetría de la API |
| Tasa de auto-save exitoso | > 99.5% | Logging de errores de guardado |
| Tiempo hasta compartir una nota | < 5 segundos desde el clic "Compartir" hasta el link copiado | Telemetría del frontend |
| Links compartidos rotos | < 1% | Monitoreo de responses 410 vs 200 |
| Tasa de adopción de dark mode | > 70% (como validación de que el feature era necesario) | Preferencias de usuario en DB |

---

## 15. Principios de Desarrollo

> Estas reglas NO son opcionales. Se aplican en CADA línea de código.

| Principio | Aplicación |
|-----------|------------|
| **Clean Architecture** | Separación estricta por capas (Domain → Application → Infrastructure → API). Inversión de dependencias siempre. |
| **SOLID** | Cada clase tiene una única responsabilidad. Abierto para extensión, cerrado para modificación. |
| **DRY** | Sin duplicación de lógica. Si se repite, se extrae. |
| **KISS** | La solución más simple que funcione correctamente. Nada de over-engineering. |
| **Naming consistente** | Variables, métodos y clases en inglés. Nombres descriptivos, sin abreviaciones crípticas. |
| **Tests donde corresponda** | Tests unitarios para lógica de Application. Tests de integración para repositorios. No tests por testear. |
| **Sin atajos** | No se hardcodea, no se comenta código muerto, no se ignora un error "por ahora". |

---

## 16. Arquitectura General

```
┌─────────────────────────────────────────────────────────┐
│              Tauri v2 + React (Desktop App)               │
│  ┌──────────────────────────────────────────────────┐    │
│  │  React UI Layer                                    │    │
│  │  ├─ Components · State Management · Editor       │    │
│  │  └─ Markdown · Syntax Highlighting · Copy Code   │    │
│  ├──────────────────────────────────────────────────┤    │
│  │  Tauri Shell (Rust)                              │    │
│  │  ├─ Window management · System tray              │    │
│  │  ├─ Auto-updater · Native notifications          │    │
│  │  └─ HTTP client → API .NET                      │    │
│  └──────────────────────────────────────────────────┘    │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTPS / JSON API
                        ▼
┌─────────────────────────────────────────────────────────┐
│                  .NET 10 API (Backend)                    │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  Domain   │  │  Application │  │  Infrastructure   │   │
│  │ Entities │  │  Use Cases   │  │  Repositories     │   │
│  │ Value    │  │  Interfaces  │  │  External Services │   │
│  │ Objects  │  │  DTOs        │  │  Persistence       │   │
│  └──────────┘  └──────────────┘  └──────────────────┘   │
│         ▲              │                  │                │
│         │              │                  │                │
│         └──────────────┴──────────────────┘                │
│            Inversión de dependencias                      │
│            (Domain NO depende de nadie)                    │
└───────────────────────┬─────────────────────────────────┘
                        │ Npgsql / EF Core
                        ▼
┌─────────────────────────────────────────────────────────┐
│                    PostgreSQL                             │
│  Users · Notes · Tags · Tabs · SharedLinks · Preferences │
└─────────────────────────────────────────────────────────┘
```

**Reglas de Clean Architecture:**
- **Domain**: Entidades, Value Objects, Enums. Cero dependencias externas.
- **Application**: Casos de uso (CQRS si aplica), DTOs, interfaces de repositorios, validadores.
- **Infrastructure**: Implementaciones concretas (EF Core/Npgsql, servicios de email, storage).
- **API/Presentation**: Controllers o Minimal APIs, middleware, filtros, presentación.
- **Regla de oro**: Las dependencias apuntan SIEMPRE hacia adentro. Domain no conoce a nadie, Infrastructure sí conoce a Application.

---

## 17. Fuera de Alcance

Lo que **NO** hace esta aplicación:

- ❌ Colaboración en tiempo real o edición compartida de notas
- ❌ Comentarios en notas compartidas
- ❌ Versionado/historial de cambios en notas
- ❌ API pública o integraciones externas
- ❌ Modo offline (PWA)
- ❌ Notificaciones por email u otro canal
- ❌ Importación desde otras herramientas (Obsidian, Notion, etc.)
- ❌ Búsqueda con IA o sugerencias inteligentes
- ❌ Integración con Git/GitHub para sincronizar notas