# BienestAPP — Web Admin & Call Center (Next.js)

Panel administrativo para Nueva EPS y consola de operadores del call center.

## Estructura de carpetas

```
web-admin/
├── src/
│   ├── app/                      # App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx              # login
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx        # sidebar + topbar
│   │   │   ├── overview/         # KPIs agregados anónimos
│   │   │   ├── callcenter/       # cola priorizada + detalle de caso
│   │   │   ├── alerts/           # alertas de riesgo (restringido)
│   │   │   ├── content/          # gestión de contenidos
│   │   │   ├── campaigns/        # campañas de bienestar
│   │   │   ├── operators/        # gestión de operadores
│   │   │   └── audit/            # auditoría (solo lectura)
│   ├── lib/
│   │   └── api.ts                # cliente REST (JWT)
│   └── components/               # CaseQueueTable, RiskBadge, MetricCard, ...
└── package.json
```

## Desarrollo

```bash
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1" > .env.local
npm run dev   # http://localhost:3001
```

Roles: la cola de call center requiere rol `CALLCENTER_OPERATOR`+. Usuario demo del seed:
`operador@demo.co` / `Bienestar123`.
