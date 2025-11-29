# Instrucciones para Subir Cambios a GitHub

## Estado Actual

He preparado todos tus cambios en un commit local:
- **Commit ID**: `9d68390`
- **Mensaje**: "feat: mejoras en sistema de lecciones, logout y documentación técnica"

## Problema Encontrado

El push a GitHub está fallando con error **GH013** (Repository rule violations). Esto significa que tu repositorio tiene reglas de protección activas.

## Solución - Opción 1: Autenticación con Personal Access Token

### Paso 1: Crear Personal Access Token en GitHub
1. Ve a https://github.com/settings/tokens
2. Click en "Generate new token" → "Generate new token (classic)"
3. Dale un nombre: "MayaApp Development"
4. Selecciona permisos:
   - ✅ `repo` (todos los sub-permisos)
5. Click "Generate token"
6. **COPIA EL TOKEN** (solo se muestra una vez)

### Paso 2: Configurar Git con el Token
Abre PowerShell en `C:\Users\Giron\Desktop\MAYAAPP2.0` y ejecuta:

```powershell
# Configurar credenciales
git config credential.helper store

# Hacer push (te pedirá usuario y contraseña)
git push origin main

# Cuando te pida:
# Username: RodoGC
# Password: [PEGA TU TOKEN AQUÍ]
```

---

## Solución - Opción 2: Desactivar Protección Temporal

1. Ve a https://github.com/RodoGC/MAYAAPP2.0/settings/branches
2. Si hay reglas en "Branch protection rules", edítalas
3. Desactiva temporalmente "Require a pull request before merging"
4. Guarda cambios
5. Ejecuta en PowerShell:
```powershell
cd C:\Users\Giron\Desktop\MAYAAPP2.0
git push origin main
```
6. Reactiva las reglas de protección

---

## Solución - Opción 3: Push Manual (Sin Protección)

Si no tienes reglas de protección y solo es un problema de autenticación:

```powershell
cd C:\Users\Giron\Desktop\MAYAAPP2.0

# Verificar estado
git status

# Push
git push origin main
```

---

## Archivos Modificados en este Commit

- ✅ `backend/.env` - Configuración de MongoDB
- ✅ `backend/server.py` - Endpoint /api/speak y mejoras
- ✅ `frontend/.env` - URL del backend
- ✅ `frontend/app/(tabs)/profile.tsx` - Fix logout
- ✅ `frontend/app/(tabs)/dictionary.tsx` - Audio TTS
- ✅ `frontend/app/lesson/[id].tsx` - Sistema de feedback mejorado
- ✅ `frontend/app/login.tsx` - Mejoras de UI
- ✅ `DOCUMENTACION_TECNICA.md` - **NUEVO** - Documentación completa

---

## Verificar que el Push Funcionó

Después de hacer push exitosamente, verifica en:
https://github.com/RodoGC/MAYAAPP2.0/commits/main

Deberías ver el commit "feat: mejoras en sistema de lecciones, logout y documentación técnica"

---

## ¿Necesitas Ayuda?

Si ninguna opción funciona, avísame y te ayudaré con otra alternativa.
