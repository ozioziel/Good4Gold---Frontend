// Marca provisional y configurable (plan.md: el nombre definitivo Gold2… sigue pendiente).
// Para cambiarla sin tocar código: VITE_BRAND_NAME=Gold2Vision en apps/web/.env.local
export const MARCA = {
  nombre: (import.meta.env.VITE_BRAND_NAME as string | undefined)?.trim() || 'Gold2Life',
  lema: 'El lado invisible del oro',
};
