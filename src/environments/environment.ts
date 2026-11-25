/**
 * Production (ng build) : l'API est servie sur le même domaine que l'application, sous /app/api
 * (le serveur web renvoie /app/** vers le backend). Même origine : pas de CORS, et une politique CSP stricte possible.
 */
export const environment = {
  apiUrl: '/app/api'
};
