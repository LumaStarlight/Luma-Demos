// analytics.js — Eventos de tracking (Plausible / GA4)
//
// Selector de proveedor:
//   Por defecto usa Plausible (window.plausible).
//   Para cambiar a GA4, reemplaza el snippet en index.html y
//   descomenta la rama de gtag en trackEvent().

/**
 * Envía un evento de analytics de forma segura.
 * Si el bloqueador de anuncios bloquea el script de analytics,
 * la página sigue funcionando sin errores en consola.
 *
 * @param {string} name   Nombre del evento
 * @param {object} [data] Datos adicionales (props en Plausible, params en GA4)
 */
export function trackEvent(name, data = {}) {
  try {
    if (typeof window.plausible === 'function') {
      // Plausible: evento personalizado con props
      window.plausible(name, { props: data });
      return;
    }
  } catch {
    // Plausible bloqueado o no disponible — ignorar silenciosamente
  }

  try {
    if (typeof window.gtag === 'function') {
      // GA4: evento personalizado con params
      window.gtag('event', name, data);
      return;
    }
  } catch {
    // GA4 bloqueado o no disponible — ignorar silenciosamente
  }
}
