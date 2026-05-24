const DEFAULT_TARIFA_HORA = 30;

function redondearEuros(valor) {
  return Math.round(valor * 100) / 100;
}

export function calcularPuntoEquilibrio(gastosFijos, margenBruto, tarifaPorHora = DEFAULT_TARIFA_HORA) {
  const gastos = Number(gastosFijos);
  const margen = Number(margenBruto);
  const tarifa = Number(tarifaPorHora);

  if (!Number.isFinite(gastos) || gastos < 0) {
    return {
      facturacionMinima: NaN,
      horasNecesarias: NaN,
      resumen: 'No se puede calcular el punto de equilibrio con gastos no validos.',
    };
  }

  if (!Number.isFinite(margen) || margen <= 0) {
    return {
      facturacionMinima: Infinity,
      horasNecesarias: Infinity,
      resumen: 'No hay margen - cualquier gasto adicional genera perdidas.',
    };
  }

  const facturacionMinima = redondearEuros(gastos / margen);
  const horasNecesarias = Number.isFinite(tarifa) && tarifa > 0
    ? redondearEuros(facturacionMinima / tarifa)
    : Infinity;

  return {
    facturacionMinima,
    horasNecesarias,
    resumen: `Necesitas facturar al menos ${facturacionMinima.toLocaleString('es-ES', {
      style: 'currency',
      currency: 'EUR',
    })}/mes para cubrir tus costes.`,
  };
}
