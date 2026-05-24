import { TRAMOS_AUTONOMOS_2026 } from './config.js';

function redondearEuros(valor) {
  return Math.round(valor * 100) / 100;
}

function normalizarNumero(valor) {
  if (valor === null || valor === undefined) {
    return null;
  }

  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

function formatearLimite(valor) {
  if (valor === Infinity) {
    return 'mas de 4.200 EUR';
  }

  return `${valor.toLocaleString('es-ES', {
    minimumFractionDigits: valor % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })} EUR`;
}

function describirTramo(tramo, indice) {
  const desde = formatearLimite(tramo.desde);
  const hasta = formatearLimite(tramo.hasta);

  if (tramo.hasta === Infinity) {
    return `Tramo ${indice + 1}: ${hasta} -> ${tramo.cuota} EUR/mes`;
  }

  return `Tramo ${indice + 1}: ${desde}-${hasta} -> ${tramo.cuota} EUR/mes`;
}

export function calcularCuotaAutonomos(rendimientoNetoMensual) {
  const rendimiento = normalizarNumero(rendimientoNetoMensual);

  if (rendimiento === null || rendimiento < 0) {
    return null;
  }

  const indiceTramo = TRAMOS_AUTONOMOS_2026.findIndex((tramo) => (
    rendimiento >= tramo.desde && rendimiento <= tramo.hasta
  ));

  if (indiceTramo === -1) {
    return null;
  }

  const tramo = TRAMOS_AUTONOMOS_2026[indiceTramo];
  const cuota = redondearEuros(tramo.cuota);

  return {
    cuota,
    tramo: describirTramo(tramo, indiceTramo),
    cuotaAnual: cuota * 12,
  };
}
