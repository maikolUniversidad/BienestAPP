# BienestAPP — App móvil (Expo / React Native)

App del afiliado: dashboard, diario, hábitos, mascota, chat IA y botón SOS global.

## Estructura de carpetas

```
mobile/
├── App.tsx                       # navegación + SOS global
├── src/
│   ├── theme/                    # tokens de diseño (colores, tipografía)
│   ├── lib/
│   │   ├── api.ts                # cliente REST (JWT, expo-secure-store)
│   │   └── store.ts              # estado global (zustand)
│   ├── screens/
│   │   ├── DashboardScreen.tsx
│   │   ├── JournalScreen.tsx
│   │   ├── HabitsScreen.tsx
│   │   ├── PetScreen.tsx
│   │   ├── ChatScreen.tsx        # chat IA con UI de crisis
│   │   └── ProfileScreen.tsx
│   └── components/
│       ├── SosButton.tsx         # FAB rojo persistente
│       ├── CrisisModal.tsx       # protocolo de crisis (contención + acciones)
│       ├── MoodSelector.tsx
│       └── HabitRing.tsx
└── package.json
```

## Desarrollo

```bash
npm install
npx expo start
```

Configura la URL del backend en `src/lib/api.ts` (`API_URL`). Por defecto
`http://localhost:3000/api/v1` (usa la IP de tu máquina en dispositivo físico).

## Notas de seguridad UI

- El **botón SOS** es persistente en todas las pantallas.
- El **chat IA** muestra el aviso "acompañamiento, no reemplaza atención profesional" y,
  ante respuesta con `crisisProtocol.active`, abre `CrisisModal` con mensaje de contención,
  líneas de emergencia y botón para conectar con call center.
- Tokens en `expo-secure-store`, nunca en almacenamiento plano.
