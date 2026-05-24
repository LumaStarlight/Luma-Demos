import { IVA_GENERAL, IVA_REDUCIDO, IVA_SUPERREDUCIDO } from './config.js';

const TIPOS_IVA_VALIDOS = new Set([IVA_GENERAL, IVA_REDUCIDO, IVA_SUPERREDUCIDO]);

function redondearEuros(valor) {
  return Math.round(valor * 100) / 100;
}

function normalizarNumero(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : 0;
}

export function calcularIVA(ingresosBrutos, gastosConIVA, tipoIVA = IVA_GENERAL) {
  const ingresos = Math.max(0, normalizarNumero(ingresosBrutos));
  const gastos = Math.max(0, normalizarNumero(gastosConIVA));
  const tipoAplicable = TIPOS_IVA_VALIDOS.has(tipoIVA) ? tipoIVA : IVA_GENERAL;
  const repercutido = ingresos * tipoAplicable;
  const soportado = gastos * tipoAplicable;

  return {
    repercutido: redondearEuros(repercutido),
    soportado: redondearEuros(soportado),
    aIngresar: redondearEuros(repercutido - soportado),
  };
}
