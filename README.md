<div align="center">

<img src="assets/img/favicon.svg" width="64" height="64" alt="Ricartech logo">

# Ricartech

**Técnico informático freelance en Sitges y comarca del Garraf**

[![Website](https://img.shields.io/badge/ricardordrgz.github.io/Ricartech-2ea44f?logo=github)](https://ricardordrgz.github.io/ricartech)
[![HTML5](https://img.shields.io/badge/HTML5-e34f26?logo=html5&logoColor=white)](#)
[![CSS3](https://img.shields.io/badge/CSS3-1572b6?logo=css3&logoColor=white)](#)
[![JavaScript](https://img.shields.io/badge/JavaScript-f7df1e?logo=javascript&logoColor=black)](#)
[![Supabase](https://img.shields.io/badge/Backend-Supabase-3ecf8e?logo=supabase&logoColor=white)](#)

</div>

---

## Descripción

Web corporativa estática para **Ricartech**, servicio de reparación y mantenimiento informático a domicilio en Sitges (Barcelona) y toda la comarca del Garraf.

Optimizada para **SEO local**, **accesibilidad** y **rendimiento**. Sin dependencias de frameworks en producción: solo HTML, CSS y JavaScript vanilla.

🌐 **Live demo:** [ricardordrgz.github.io/Ricartech](https://ricardordrgz.github.io/Ricartech/)

---

## Secciones

| Sección | Contenido |
|:---|:---|
| 🖥️ **Servicios** | Soporte remoto, instalación de sistemas, mantenimiento físico, migración SSD, gestión de datos |
| 💰 **Packs** | Paquetes combinados con descuento |
| ⚙️ **Proceso** | 4 pasos: diagnóstico → presupuesto → reparación → entrega |
| 🧮 **Calculadora** | Presupuesto interactivo para servicios individuales y consolas |
| 📋 **Registro** | Formulario multi-paso con envío a Supabase |
| 📞 **Contacto** | Email ofuscado, WhatsApp, LinkedIn, ubicación |
| ❓ **FAQ** | Preguntas frecuentes con buscador en tiempo real |

---

## Estructura del proyecto

```
ricartech/
├── index.html                  # Página principal
├── css/
│   └── styles.css              # Hoja de estilos (~2000 líneas)
├── js/
│   └── script.js              # Lógica interactiva (~1000 líneas)
├── assets/
│   ├── img/                   # Imágenes de servicio (PNG) y favicon
│   └── svg/                   # Iconos de contacto
├── dashboard/                  # Panel de administración (Supabase Auth)
├── supabase/
│   └── schema.sql              # Tabla tickets + políticas RLS
├── robots.txt                  # Directivas para crawlers
├── sitemap.xml                 # Sitemap para Google
└── README.md
```

---

## Backend de tickets

Los formularios de registro de avería se envían a **Supabase** (Postgres + Auth + RLS). El panel de administración vive en `/dashboard/` y se autentica con Supabase Auth.

El esquema y las políticas RLS están en [`supabase/schema.sql`](supabase/schema.sql). La clave pública (`anon`) solo permite insertar tickets con estado `Pendiente`; la lectura, edición y borrado quedan restringidos al email del administrador.

### Resiliencia

Si el registro falla (red, Supabase caído o límite alcanzado), el formulario ofrece **enviar el resumen por WhatsApp** con todos los datos ya rellenados, además de guardar una copia local. Así no se pierde ninguna solicitud.

> El plan gratuito de Supabase pausa proyectos tras 7 días de inactividad. Mantén activo el proyecto o revisa el panel periódicamente.

---

## Diseño

Tema oscuro profesional con sistema de **custom properties** CSS:

| Token | Valor | Uso |
|:---|:---|:---|
| `--indigo` | `#4F46E5` | Color primario, botones |
| `--indigo-light` | `#6366F1` | Hover, acentos, iconos |
| `--cyan` | `#06B6D4` | Enlaces, datos de contacto |
| `--amber` | `#F59E0B` | Precios, alertas |
| `--grad` | `indigo → cyan` | CTA principal, badges |

Tipografías: **Inter** (cuerpo), **Syne** (títulos), **JetBrains Mono** (código/etiquetas).

---

## Características técnicas

- ✅ **SEO**: Metadatos Open Graph, JSON-LD `LocalBusiness`, sitemap, robots.txt
- ✅ **Responsive**: Mobile-first con breakpoints para tablet y desktop
- ✅ **Accesible**: Navegación por teclado, roles ARIA, skip link, contraste alto
- ✅ **Rendimiento**: Sin frameworks, sin dependencias de runtime, fuentes con `display=swap`
- ✅ **Seguridad**: Email ofuscado (data-attributes + decoder JS), sin PII en el código
- ✅ **Cookies**: Banner de consentimiento con persistencia en localStorage
- ✅ **Privacidad**: Modal de política de cookies y privacidad
- ✅ **Impresión**: Estilos optimizados para imprimir

---

## Despliegue

El site se despliega en **GitHub Pages**:

```bash
git init && git branch -M main
git add . && git commit -m "Ricartech — site estático"
git remote add origin https://github.com/ricardordrgz/ricartech.git
git push -u origin main
```

> **Settings → Pages** → Branch: `main` → Folder: `/ (root)`

---

## Licencia

© 2026 Cristian Ricardo Rodríguez Arias — Todos los derechos reservados.
