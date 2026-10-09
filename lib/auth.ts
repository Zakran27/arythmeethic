// Pages /admin accessibles sans session (sinon « Mot de passe oublié » renvoie au login).
// Partagé par middleware.ts (garde) et app/admin/layout.tsx (pas de menu admin sur ces pages).
export const PUBLIC_ADMIN_PAGES = ['/admin/login', '/admin/forgot-password', '/admin/reset-password'];
