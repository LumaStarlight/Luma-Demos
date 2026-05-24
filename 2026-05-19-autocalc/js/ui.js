import { trackEvent } from './analytics.js';
import { calcularCuotaAutonomos } from './autonomos.js';
import { calcularPuntoEquilibrio } from './breakeven.js';
import { exportarCSV, exportarPDF } from './export.js';
import { calcularIRPF } from './irpf.js';
import { calcularIVA } from './iva.js';
import { isPremium, renderPremiumState, showPremiumBanner } from './premium.js';

const FIELD_CONFIG = {
  ingresos: {
    label: 'Ingresos anuales brutos',
    placeholder: '30000',
    help: 'Total anual facturado antes de impuestos y gastos.',
    min: 0,
    step: 100,
  },
  gastos: {
    label: 'Gastos deducibles anuales',
    placeholder: '8000',
    help: 'Seguridad Social, alquiler de oficina, material, formacion y otros gastos deducibles.',
    min: 0,
    step: 100,
  },
};

const SELECT_OPTIONS = {
  tipoActividad: [
    ['profesional', 'Profesional'],
    ['empresarial', 'Empresarial'],
    ['modulos', 'Modulos'],
  ],
  retencion: [
    ['0.07', '7% - Nuevos autonomos'],
    ['0.15', '15% - General'],
  ],
  tipoIVA: [
    ['0.21', '21% General'],
    ['0.10', '10% Reducido'],
    ['0.04', '4% Superreducido'],
  ],
};

function normalizarNumero(valor) {
  if (typeof valor !== 'string') {
    return Number.isFinite(Number(valor)) ? Number(valor) : NaN;
  }

  const limpio = valor.trim().replace(/\s/g, '');

  if (!limpio) {
    return NaN;
  }

  const ultimoPunto = limpio.lastIndexOf('.');
  const ultimaComa = limpio.lastIndexOf(',');
  const separadorDecimal = ultimaComa > ultimoPunto ? ',' : '.';
  const sinMiles = limpio
    .replace(new RegExp(`\\${separadorDecimal === ',' ? '.' : ','}`, 'g'), '')
    .replace(separadorDecimal, '.');

  return Number(sinMiles);
}

function crearCampoNumero(id, config) {
  return `
    <div class="form-field">
      <label for="${id}">${config.label}</label>
      <input
        id="${id}"
        name="${id}"
        type="number"
        min="${config.min}"
        step="${config.step}"
        placeholder="${config.placeholder}"
        title="${config.help}"
        aria-describedby="${id}-hint ${id}-error"
        required
      >
      <p id="${id}-hint" class="field-hint">${config.help}</p>
      <p id="${id}-error" class="field-error" aria-live="polite"></p>
    </div>
  `;
}

function crearSelect(id, label, help, options) {
  const optionMarkup = options
    .map(([value, text]) => `<option value="${value}">${text}</option>`)
    .join('');

  return `
    <div class="form-field">
      <label for="${id}">${label}</label>
      <select id="${id}" name="${id}" title="${help}" aria-describedby="${id}-hint">
        ${optionMarkup}
      </select>
      <p id="${id}-hint" class="field-hint">${help}</p>
    </div>
  `;
}

function leerDatos(form) {
  const data = new FormData(form);
  const ingresos = normalizarNumero(data.get('ingresos'));
  const gastos = normalizarNumero(data.get('gastos'));

  return {
    ingresos,
    gastos,
    tipoActividad: data.get('tipoActividad'),
    retencion: Number(data.get('retencion')),
    tipoIVA: Number(data.get('tipoIVA')),
  };
}

function validarNumero(input, valor) {
  if (!input.value.trim()) {
    return 'Este campo es obligatorio.';
  }

  if (!Number.isFinite(valor)) {
    return 'Introduce un numero valido.';
  }

  if (valor < 0) {
    return 'El importe no puede ser negativo.';
  }

  return '';
}

function validarFormulario(form) {
  const datos = leerDatos(form);
  const errores = {
    ingresos: validarNumero(form.elements.ingresos, datos.ingresos),
    gastos: validarNumero(form.elements.gastos, datos.gastos),
  };

  for (const [id, mensaje] of Object.entries(errores)) {
    const input = form.elements[id];
    const error = form.querySelector(`#${id}-error`);
    input.setAttribute('aria-invalid', mensaje ? 'true' : 'false');
    error.textContent = mensaje;
  }

  const notice = form.querySelector('[data-form-notice]');
  if (!errores.ingresos && !errores.gastos && datos.ingresos === 0) {
    notice.textContent = 'Has indicado cero ingresos - los resultados seran estimaciones sin base.';
  } else if (!errores.ingresos && !errores.gastos && datos.gastos > datos.ingresos) {
    notice.textContent = 'Tus gastos superan los ingresos - estas en situacion de perdidas.';
  } else {
    notice.textContent = '';
  }

  const hayErrores = Object.values(errores).some(Boolean);
  form.querySelector('[data-calculate]').disabled = hayErrores;

  return { valido: !hayErrores, datos };
}

function emitirCalculo(form) {
  const { valido, datos } = validarFormulario(form);

  if (!valido) {
    return;
  }

  form.dispatchEvent(new CustomEvent('autocalc:calculate', {
    bubbles: true,
    detail: datos,
  }));
}

const currencyFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
});

const percentFormatter = new Intl.NumberFormat('es-ES', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function redondearEuros(valor) {
  return Math.round(valor * 100) / 100;
}

function formatearMoneda(valor) {
  if (!Number.isFinite(valor)) {
    return 'Error en calculo';
  }

  return currencyFormatter.format(redondearEuros(valor));
}

function formatearPorcentaje(valor) {
  if (!Number.isFinite(valor)) {
    return 'Error en calculo';
  }

  return percentFormatter.format(valor);
}

function claseValor(valor) {
  if (!Number.isFinite(valor) || valor === 0) {
    return 'result-value neutral';
  }

  return valor > 0 ? 'result-value negative' : 'result-value positive';
}

function crearFila(label, value, className = 'result-value neutral') {
  return `
    <div class="result-row">
      <span>${label}</span>
      <strong class="${className}">${value}</strong>
    </div>
  `;
}

function crearCard(title, rows) {
  return `
    <article class="result-card">
      <h3>${title}</h3>
      <div class="result-card__rows">
        ${rows.join('')}
      </div>
    </article>
  `;
}

function crearCardPuntoEquilibrio(puntoEquilibrio, facturacionMensualActual) {
  const minimo = puntoEquilibrio.facturacionMinima;

  if (!Number.isFinite(minimo)) {
    return crearCard('Punto de equilibrio', [
      crearFila('Facturacion minima', 'Sin margen suficiente'),
      crearFila('Estimacion', puntoEquilibrio.resumen),
    ]);
  }

  const progreso = facturacionMensualActual > 0
    ? Math.min(100, Math.max(0, (facturacionMensualActual / minimo) * 100))
    : 0;
  const estado = facturacionMensualActual >= minimo ? 'positive' : 'negative';
  const barra = facturacionMensualActual > 0
    ? `
      <div class="breakeven-progress" aria-label="Progreso hacia el punto de equilibrio">
        <span class="breakeven-progress__bar ${estado}" style="width: ${progreso.toFixed(1)}%"></span>
      </div>
    `
    : '';

  return `
    <article class="result-card result-card--wide">
      <h3>Punto de equilibrio</h3>
      <div class="result-card__rows">
        ${crearFila('Facturacion minima mensual', formatearMoneda(minimo), 'result-value negative')}
        ${crearFila('Facturacion mensual actual', formatearMoneda(facturacionMensualActual))}
        ${crearFila('Horas estimadas al mes', Number.isFinite(puntoEquilibrio.horasNecesarias) ? `${puntoEquilibrio.horasNecesarias} h` : 'No calculable')}
      </div>
      ${barra}
      <p class="breakeven-summary">${puntoEquilibrio.resumen}</p>
    </article>
  `;
}

function calcularResultados(datos) {
  const irpf = calcularIRPF(datos.ingresos, datos.gastos, datos.retencion);
  const rendimientoMensual = Math.max(0, (datos.ingresos - datos.gastos) / 12);
  const autonomos = calcularCuotaAutonomos(rendimientoMensual);
  const iva = calcularIVA(datos.ingresos, datos.gastos, datos.tipoIVA);

  if (!irpf || !autonomos || !iva) {
    return null;
  }

  const costesFiscales = Math.max(0, irpf.aPagar) + autonomos.cuotaAnual + Math.max(0, iva.aIngresar);
  const ingresoNeto = datos.ingresos - datos.gastos - costesFiscales;
  const porcentajeSobreIngresos = datos.ingresos > 0 ? costesFiscales / datos.ingresos : 0;
  const margenBruto = datos.ingresos > 0 ? 1 - (costesFiscales / datos.ingresos) : 0;
  const puntoEquilibrio = calcularPuntoEquilibrio(
    autonomos.cuota + (datos.gastos / 12),
    margenBruto,
  );

  return {
    datos,
    irpf,
    autonomos,
    iva,
    puntoEquilibrio,
    resumen: {
      costesFiscales: redondearEuros(costesFiscales),
      porcentajeSobreIngresos,
      ingresoNeto: redondearEuros(ingresoNeto),
    },
    avisos: {
      perdidas: datos.gastos > datos.ingresos,
    },
  };
}

export function renderResults(resultados, target = document.querySelector('[data-results]')) {
  if (!target) {
    return;
  }

  if (!resultados) {
    target.hidden = false;
    target.innerHTML = `
      <p class="results-empty">Error en calculo. Revisa los datos introducidos.</p>
    `;
    return;
  }

  const { datos, irpf, autonomos, iva, puntoEquilibrio, resumen, avisos } = resultados;
  const warning = avisos.perdidas
    ? '<p class="results-warning">Tus gastos superan los ingresos. Se muestran estimaciones en situacion de perdidas.</p>'
    : '';

  target.hidden = false;
  target.innerHTML = `
    <div class="results-header">
      <div>
        <p class="eyebrow">Resultado estimado</p>
        <div class="results-title-row">
          <h2>Resumen fiscal anual</h2>
          <span data-premium-slot></span>
        </div>
      </div>
      <div class="results-actions">
        <p class="calculation-status" aria-live="polite">Calculado al instante</p>
        <button class="secondary-action" type="button" data-export-pdf>Descargar PDF</button>
        <button class="secondary-action" type="button" data-export-csv>Descargar CSV</button>
      </div>
    </div>
    ${warning}
    <div class="results-grid">
      ${crearCard('IRPF', [
        crearFila('Base liquidable', formatearMoneda(irpf.base)),
        crearFila('Cuota integra', formatearMoneda(irpf.cuota)),
        crearFila('Retenciones aplicadas', formatearMoneda(irpf.retenciones), 'result-value positive'),
        crearFila('Total a pagar/devolver', formatearMoneda(irpf.aPagar), claseValor(irpf.aPagar)),
      ])}
      ${crearCard('Cuota de autonomos', [
        crearFila('Tramo asignado', autonomos.tramo),
        crearFila('Cuota mensual', formatearMoneda(autonomos.cuota), 'result-value negative'),
        crearFila('Cuota anual', formatearMoneda(autonomos.cuotaAnual), 'result-value negative'),
      ])}
      ${crearCard('IVA', [
        crearFila('IVA repercutido', formatearMoneda(iva.repercutido), 'result-value negative'),
        crearFila('IVA soportado', formatearMoneda(iva.soportado), 'result-value positive'),
        crearFila('Resultado a ingresar', formatearMoneda(iva.aIngresar), claseValor(iva.aIngresar)),
      ])}
      ${crearCard('Resumen anual', [
        crearFila('Costes fiscales estimados', formatearMoneda(resumen.costesFiscales), 'result-value negative'),
        crearFila('Peso sobre ingresos', formatearPorcentaje(resumen.porcentajeSobreIngresos)),
        crearFila('Ingreso neto estimado', formatearMoneda(resumen.ingresoNeto), claseValor(-resumen.ingresoNeto)),
      ])}
      ${crearCardPuntoEquilibrio(puntoEquilibrio, datos.ingresos / 12)}
    </div>
  `;

  renderPremiumState(target);

  target.querySelector('[data-export-pdf]')?.addEventListener('click', () => {
    const premium = isPremium();
    exportarPDF(resultados, premium);

    if (!premium) {
      showPremiumBanner(target);
    }
  });
  target.querySelector('[data-export-csv]')?.addEventListener('click', () => {
    exportarCSV(resultados);
  });

  if (!isPremium()) {
    showPremiumBanner(target);
  }
}

export function initUI(root = document.querySelector('main')) {
  if (!root) {
    return null;
  }

  root.innerHTML = `
    <section class="calculator" aria-labelledby="calculator-title">
      <div class="section-heading">
        <p class="eyebrow">Estimacion fiscal</p>
        <h2 id="calculator-title">Calcula tu escenario como autonomo</h2>
        <p>
          Ajusta ingresos, gastos y tipos fiscales para ver una estimacion
          reactiva cuando esten conectados los modulos de resultados.
        </p>
      </div>

      <form class="tax-form" novalidate>
        <div class="form-grid">
          ${crearCampoNumero('ingresos', FIELD_CONFIG.ingresos)}
          ${crearCampoNumero('gastos', FIELD_CONFIG.gastos)}
          ${crearSelect('tipoActividad', 'Tipo de actividad', 'Elige el regimen que mejor encaja con tu actividad.', SELECT_OPTIONS.tipoActividad)}
          ${crearSelect('retencion', 'Tipo de retencion IRPF', 'Selecciona la retencion que aplicas en tus facturas profesionales.', SELECT_OPTIONS.retencion)}
          ${crearSelect('tipoIVA', 'Tipo de IVA', 'Tipo de IVA habitual en tus facturas emitidas.', SELECT_OPTIONS.tipoIVA)}
        </div>

        <p class="form-notice" data-form-notice aria-live="polite"></p>

        <button class="primary-action" type="button" data-calculate>
          Calcular
        </button>
      </form>

      <section class="results-panel" data-results hidden aria-live="polite">
        <p class="results-empty">Introduce tus datos para ver el calculo.</p>
      </section>
    </section>
  `;

  const form = root.querySelector('.tax-form');
  const calculateButton = form.querySelector('[data-calculate]');

  form.addEventListener('input', () => emitirCalculo(form));
  form.addEventListener('change', () => emitirCalculo(form));
  calculateButton.addEventListener('click', () => emitirCalculo(form));
  root.addEventListener('autocalc:calculate', (event) => {
    window.clearTimeout(root.dataset.calculationTimer);
    root.dataset.calculationTimer = window.setTimeout(() => {
      const status = root.querySelector('.calculation-status');
      if (status) {
        status.textContent = 'Calculando...';
      }
    }, 200);

    const resultados = calcularResultados(event.detail);
    window.clearTimeout(root.dataset.calculationTimer);
    renderResults(resultados, root.querySelector('[data-results]'));

    if (resultados) {
      trackEvent('calculo_realizado', {
        ingresos: resultados.datos.ingresos,
        tipoActividad: resultados.datos.tipoActividad,
      });
    }
  });

  validarFormulario(form);

  return form;
}
