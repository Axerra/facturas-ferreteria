# Cómo publicar actualizaciones (auto-update)

La app usa **electron-updater + GitHub Releases**. Cuando publicas una versión nueva,
los demás computadores se actualizan **solos** al abrir la app.

---

## 1. Configuración inicial (UNA sola vez)

1. Crea una cuenta en https://github.com (si no tienes).
2. Crea un **repositorio** nuevo, por ejemplo `facturas-ferreteria` (público es lo más simple).
3. En `package.json`, dentro de `build.publish`, reemplaza:
   - `TU_USUARIO_GITHUB` → tu usuario de GitHub
   - `TU_REPOSITORIO` → el nombre del repositorio que creaste
4. Crea un **token de acceso**:
   GitHub → Settings → Developer settings → Personal access tokens → **Tokens (classic)**
   → Generate new token → marca el permiso **`repo`** → genera y **copia el token**
   (empieza por `ghp_...`). Guárdalo en un lugar seguro; no lo compartas.
5. Instala las dependencias (esto instala electron-updater):
   ```
   npm install
   ```

## 2. Cada vez que arregles algo y quieras publicarlo

1. Haz el arreglo en el código.
2. **Sube el número de versión** en `package.json` (ej. `"version": "1.0.0"` → `"1.0.1"`).
   *Es obligatorio: no se puede publicar dos veces la misma versión.*
3. En PowerShell, dentro de la carpeta del proyecto:
   ```
   $env:GH_TOKEN="ghp_tu_token_aqui"
   npm run release
   ```
   Esto compila el instalador y lo sube a GitHub Releases automáticamente.

## 3. Primera vez en cada computador

El auto-update solo funciona desde la versión que **ya trae** el sistema de actualización.
Por eso, la **primera** versión con updater hay que instalarla **a mano una vez** en cada PC
(el `Setup .exe` de la carpeta `dist`). De ahí en adelante, todo es automático.

## 4. Qué pasa en los otros computadores (automático)

- Al abrir la app, revisa GitHub en segundo plano.
- Si hay versión nueva, la descarga y avisa: *"Se descargó una nueva versión…"*.
- Se instala al reiniciar la app. El usuario no hace nada más.

---

### Notas
- El token (`GH_TOKEN`) solo se usa en TU computador para publicar. Los demás PC no lo necesitan.
- Si usas un repositorio **público**, los instaladores quedan visibles públicamente
  (normal para apps internas). Para repos privados, la configuración del cliente es más compleja.
- Firmar el instalador (code signing) es opcional; sin firma, Windows SmartScreen puede
  mostrar una advertencia la primera vez, pero la app y las actualizaciones funcionan igual.
