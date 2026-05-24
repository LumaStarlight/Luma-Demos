import { trackEvent } from './analytics.js';
import { initUI } from './ui.js';
import { activatePremiumFromReturnUrl } from './premium.js';

const premiumActivated = activatePremiumFromReturnUrl();
initUI();

if (premiumActivated) {
  trackEvent('pago_exitoso', {});
  const toast = document.createElement('p');
  toast.className = 'premium-toast';
  toast.textContent = 'Premium activado. Ya puedes descargar el informe completo.';
  toast.setAttribute('role', 'status');
  document.body.append(toast);
  window.setTimeout(() => toast.remove(), 5000);
}
