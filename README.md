# Graph Astro Elecciones

[![Deploy Status](https://github.com/hzudev/front-graph/actions/workflows/deploy.yml/badge.svg)](https://github.com/hzudev/front-graph/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Aplicación web para visualizar y explorar datos de elecciones en **Bolivia**, desarrollada con Astro, React y TypeScript.

## 🚀 Características

- **Búsqueda avanzada**: Busca candidatos, partidos y listas con filtros por departamento y tipo
- **Mapa interactivo**: Visualización geográfica de datos electorales
- **Dashboard dinámico**: Visualización de estadísticas y resultados en tiempo real
- **Página 404 personalizada**: Manejo elegante de rutas no encontradas
- **Diseño responsive**: Optimizado para dispositivos móviles y desktop
- **Modo oscuro**: Soporte para tema claro y oscuro
- **Rendimiento optimizado**: Generación estática para carga rápida

- **[Astro](https://astro.build/)**: Framework web estático
- **[React](https://react.dev/)**: Biblioteca UI
- **[TypeScript](https://www.typescriptlang.org/)**: Tipado estático
- **[Tailwind CSS](https://tailwindcss.com/)**: Framework CSS
- **[Leaflet](https://leafletjs.com/)**: Mapas interactivos
- **[Radix UI](https://www.radix-ui.com/)**: Componentes accesibles
- **[CSV Data](https://en.wikipedia.org/wiki/Comma-separated_values)**: Almacenamiento local de datos
- **[SWR](https://swr.vercel.app/)**: React Hooks para data fetching

```bash
# Clonar el repositorio
git clone https://github.com/hzudev/front-graph.git
cd front-graph

# Instalar dependencias
pnpm install

# Los datos se cargan automáticamente desde public/data/*.csv
```

## 🏃‍♂️ Desarrollo

```bash
# Iniciar servidor de desarrollo
pnpm dev

# El sitio estará disponible en http://localhost:4321
```

## 🏗️ Build

```bash
# Generar build de producción
pnpm build

# Preview del build
pnpm preview

# Verificar tipos y errores
pnpm lint
```

### Regenerar índice de municipios

El archivo `public/municipalities-index.json` está pre-generado y commiteado al repositorio. El build usa este archivo cacheado por defecto.

**Para regenerar el índice localmente** (cuando hay cambios en los datos de municipios):

```bash
# Regenerar el índice de municipios
pnpm run generate-municipalities
```

Este comando:

- Descarga el GeoJSON municipal desde Appwrite
- Genera el índice con coordenadas y polígonos simplificados
- Actualiza `public/municipalities-index.json`

**Nota**: El script de build (`prebuild`) usa el archivo cacheado si la descarga falla (ej: error 403 de Cloudflare en GitHub Actions). Esto asegura que el build no falle por problemas de red.

## 🌐 Despliegue

El proyecto está configurado para desplegarse automáticamente en GitHub Pages mediante GitHub Actions.

### Despliegue automático:

1. Push a la rama `main`
2. GitHub Actions ejecuta el workflow de deploy
3. El sitio se publica en: https://hzudev.github.io/front-graph/

**Para instrucciones detalladas de configuración y despliegue, consulta [DEPLOY.md](./DEPLOY.md)**

### Datos Locales

El proyecto utiliza archivos CSV locales como fuente de verdad:

- `public/data/candidatos.csv`: Información de candidatos, trayectorias y militancia.
- `public/data/encuestas.csv`: Resultados de estudios de opinión pública.

### GitHub Pages

El proyecto usa las siguientes configuraciones en `astro.config.mjs`:

```javascript
export default defineConfig({
  output: 'static',
  site: 'https://hzudev.github.io',
  base: '/front-graph',
});
```

Asegúrate de actualizar `site` y `base` según tu repositorio.

## 📁 Estructura del proyecto

```
graph-astro-elecciones/
├── .github/
│   └── workflows/
│       └── deploy.yml          # Workflow de GitHub Actions
├── public/
│   ├── 404.html                # Fallback 404 para GitHub Pages
│   └── favicon.svg
├── scripts/
│   └── generate-municipality-index.ts  # Script de generación de índices
├── src/
│   ├── components/
│   │   ├── dashboard/          # Componentes del dashboard
│   │   ├── entity/             # Componentes de entidades
│   │   ├── search/             # Componentes de búsqueda
│   │   └── ui/                 # Componentes UI reutilizables
│   ├── layouts/
│   │   └── Layout.astro        # Layout principal
│   ├── lib/
│   │   ├── queries/            # Funciones de API con Appwrite
│   │   └── utils/              # Utilidades
│   ├── pages/
│   │   ├── 404.astro           # Página 404 personalizada
│   │   ├── index.astro         # Página de inicio
│   │   ├── search.astro        # Página de búsqueda
│   │   └── mapa.astro          # Mapa interactivo
│   └── styles/
│       └── global.css          # Estilos globales
├── .env.example                # Plantilla de variables de entorno
├── .gitignore                  # Archivos ignorados por Git
├── astro.config.mjs            # Configuración de Astro
├── tailwind.config.js          # Configuración de Tailwind
├── tsconfig.json               # Configuración de TypeScript
├── DEPLOY.md                   # Guía de despliegue
├── CONTRIBUTING.md             # Guía para contribuidores
├── LICENSE                     # Licencia MIT
└── package.json
```

## 📄 Página 404

El proyecto incluye una página 404 personalizada que funciona correctamente en GitHub Pages:

- **Diseño moderno**: Interfaz amigable con gradientes y animaciones
- **Navegación útil**: Botones para volver al inicio, buscar o regresar
- **Redirección automática**: Fallback en `public/404.html` que redirige a la página Astro
- **Responsive**: Se adapta a todos los tamaños de pantalla

### Archivos relacionados:

- `src/pages/404.astro` - Página 404 principal con diseño completo
- `public/404.html` - Fallback para GitHub Pages con redirección automática

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor lee [CONTRIBUTING.md](./CONTRIBUTING.md) para más detalles sobre nuestro código de conducta y el proceso para enviar pull requests.

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo [LICENSE](./LICENSE) para más detalles.

## 🔗 Enlaces

- **Sitio web**: https://hzudev.github.io/front-graph/
- **Repositorio**: https://github.com/hzudev/front-graph
- **Issues**: https://github.com/hzudev/front-graph/issues
- **Documentación de despliegue**: [DEPLOY.md](./DEPLOY.md)

## 👥 Autor

- **hzudev** - [GitHub](https://github.com/hzudev)

---

**Nota**: Este proyecto visualiza datos de elecciones en Bolivia. Los datos se obtienen mediante archivos CSV locales y se procesan en el cliente para una experiencia dinámica.
