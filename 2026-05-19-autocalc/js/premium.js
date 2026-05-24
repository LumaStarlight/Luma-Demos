import { trackEvent } from './analytics.js';

// Para activar tu propio Payment Link de Stripe:
// 1. Crea un Payment Link en dashboard.stripe.com
// 2. Pon el modo test y copia la URL
// 3. Reemplaza STRIPE_PAYMENT_LINK
// 4. Configura la URL de redireccion exitosa a: https://tudominio.com/?premium=1
// REEMPLAZAR: por tu Payment Link real de Stripe.
export const STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/test_<placeholder>';

const PREMIUM_STORAGE_KEY = 'autocalc_premium';
const PREMIUM_BANNER_ID = 'premium-banner';
const PREMIUM_MODAL_ID = 'premium-modal';

function canUseStorage() {
  try {
    window.localStorage.setItem('__autocalc_storage_test__', '1');
    window.localStorage.removeItem('__autocalc_storage_test__');
    return true;
  } catch {
    return false;
  }
}

export function isPremium() {
  try {
    return canUseStorage() && window.localStorage.getItem(PREMIUM_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function unlockPremium() {
  try {
    if (canUseStorage()) {
      window.localStorage.setItem(PREMIUM_STORAGE_KEY, 'true');
    }
  } catch {
    return;
  }

  document.querySelector(`#${PREMIUM_BANNER_ID}`)?.remove();
  document.querySelector('[data-premium-slot]')?.replaceChildren(createPremiumBadge());
}

function createPremiumBadge() {
  const badge = document.createElement('span');
  badge.className = 'premium-badge';
  badge.textContent = '🌟 Premium';
  return badge;
}

function ensureModal() {
  const existing = document.querySelector(`#${PREMIUM_MODAL_ID}`);
  if (existing) {
    return existing;
  }

  const modal = document.createElement('dialog');
  modal.id = PREMIUM_MODAL_ID;
  modal.className = 'premium-modal';
  modal.innerHTML = `
    <form method="dialog" class="premium-modal__content">
      <h2>Pago premium</h2>
      <p>
        Serás redirigido a Stripe para completar el pago. Al volver,
        tu premium se activará automáticamente.
      </p>
      <button class="primary-action" type="submit">Entendido</button>
    </form>
  `;

  document.body.append(modal);
  return modal;
}

function showPaymentFallback() {
  let fallback = document.querySelector('[data-payment-fallback]');
  if (!fallback) {
    fallback = document.createElement('p');
    fallback.className = 'payment-fallback';
    fallback.dataset.paymentFallback = 'true';
    fallback.innerHTML = `
      Si el navegador bloquea la ventana de pago,
      <a href="${STRIPE_PAYMENT_LINK}" target="_blank" rel="noopener noreferrer">
        abre Stripe desde este enlace
      </a>.
    `;
    document.querySelector('#premium-banner')?.append(fallback);
  }
}

function openPaymentFlow() {
  trackEvent('clic_premium', {});
  ensureModal().showModal();
  const paymentWindow = window.open(STRIPE_PAYMENT_LINK, '_blank', 'noopener,noreferrer');
  if (!paymentWindow) {
    showPaymentFallback();
  }
}

function createPremiumBanner() {
  const banner = document.createElement('aside');
  banner.id = PREMIUM_BANNER_ID;
  banner.className = 'premium-banner';
  banner.innerHTML = `
    <div>
      <p class="premium-banner__eyebrow">Informe profesional</p>
      <h2>🌟 Desbloquea el informe completo</h2>
      <ul>
        <li>PDF profesional sin watermark</li>
        <li>Desglose detallado</li>
        <li>Recomendaciones personalizadas</li>
        <li>Exportación CSV completa</li>
      </ul>
      <p class="premium-banner__price">4,99 € — Pago único, acceso de por vida</p>
    </div>
    <button class="premium-banner__cta" type="button" data-unlock-premium>
      Desbloquear Premium — 4,99 €
    </button>
  `;

  banner.querySelector('[data-unlock-premium]')?.addEventListener('click', openPaymentFlow);
  return banner;
}

export function showPremiumBanner(target = document.querySelector('[data-results]')) {
  if (isPremium() || !target || document.querySelector(`#${PREMIUM_BANNER_ID}`)) {
    return;
  }

  target.append(createPremiumBanner());
}

export function renderPremiumState(target = document.querySelector('[data-results]')) {
  const slot = target?.querySelector('[data-premium-slot]');
  if (!slot) {
    return;
  }

  slot.innerHTML = '';

  if (isPremium()) {
    slot.append(createPremiumBadge());
  }
}

export function activatePremiumFromReturnUrl() {
  const params = new URLSearchParams(window.location.search);
  const premiumValue = params.get('premium');
  const shouldActivate = premiumValue === '1' || premiumValue === 'true';

  if (!shouldActivate) {
    return false;
  }

  unlockPremium();
  params.delete('premium');
  const nextQuery = params.toString();
  const cleanUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`;
  window.history.replaceState({}, '', cleanUrl);

  return true;
}
