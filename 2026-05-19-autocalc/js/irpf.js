import { IRPF_TRAMOS_2026, RETENCION_IRPF_DEFAULT } from './config.js';

const RETENCIONES_VALIDAS = new Set([0.07, 0.15]);

function redondearEuros(valor) {
  return Math.round(valor * 100) / 100;
}

function normalizarNumero(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : 0;
}

function calcularCuotaProgresiva(base) {
  let cuota = 0;
  let limiteAnterior = 0;

  for (const tramo of IRPF_TRAMOS_2026) {
    if (base <= limiteAnterior) {
      break;
    }

    const baseEnTramo = Math.min(base, tramo.hasta) - limiteAnterior;
    cuota += baseEnTramo * tramo.tipo;
    limiteAnterior = tramo.hasta;
  }

  return cuota;
}

function obtenerTipoMarginal(base) {
  const tramo = IRPF_TRAMOS_2026.find((item) => base <= item.hasta);
  return tramo ? tramo.tipo : IRPF_TRAMOS_2026.at(-1).tipo;
}

export function calcularIRPF(ingresosAnuales, gastosDeducibles, retencion) {
  const ingresos = normalizarNumero(ingresosAnuales);

  if (ingresos <= 0) {
    return null;
  }

  const gastos = Math.max(0, normalizarNumero(gastosDeducibles));
  const tipoRetencion = RETENCIONES_VALIDAS.has(retencion)
    ? retencion
    : RETENCION_IRPF_DEFAULT;
  const base = Math.max(0, ingresos - gastos);
  const cuota = calcularCuotaProgresiva(base);
  const retenciones = ingresos * tipoRetencion;

  return {
    base: redondearEuros(base),
    cuota: redondearEuros(cuota),
    retenciones: redondearEuros(retenciones),
    aPagar: redondearEuros(cuota - retenciones),
    tramo: obtenerTipoMarginal(base),
  };
}
