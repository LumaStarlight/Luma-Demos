import { trackEvent } from './analytics.js';

const WATERMARK = 'Vista previa - Desbloquea el informe completo';

function formatCurrency(value) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number.isFinite(value) ? value : 0);
}

function downloadText(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function buildRows(resultados) {
  return [
    ['Ingresos anuales', resultados.datos.ingresos],
    ['Gastos deducibles', resultados.datos.gastos],
    ['Base IRPF', resultados.irpf.base],
    ['Cuota IRPF', resultados.irpf.cuota],
    ['Retenciones', resultados.irpf.retenciones],
    ['IRPF a pagar/devolver', resultados.irpf.aPagar],
    ['Cuota autonomos mensual', resultados.autonomos.cuota],
    ['Cuota autonomos anual', resultados.autonomos.cuotaAnual],
    ['IVA repercutido', resultados.iva.repercutido],
    ['IVA soportado', resultados.iva.soportado],
    ['IVA a ingresar', resultados.iva.aIngresar],
    ['Facturacion minima mensual', resultados.puntoEquilibrio.facturacionMinima],
    ['Ingreso neto estimado', resultados.resumen.ingresoNeto],
  ];
}

export function exportarPDF(resultados, premium = false) {
  const jsPDF = window.jspdf?.jsPDF;

  if (!jsPDF) {
    window.alert('No se pudo cargar jsPDF. Revisa la conexion y vuelve a intentarlo.');
    return;
  }

  const doc = new jsPDF();
  const rows = buildRows(resultados);
  let y = 22;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('AutoCalc - Informe fiscal 2026', 16, y);
  y += 12;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Estimacion orientativa para autonomos en Espana. No sustituye asesoramiento fiscal.', 16, y);
  y += 12;

  rows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(String(label), 16, y);
    doc.setFont('helvetica', 'normal');
    doc.text(formatCurrency(value), 118, y);
    y += 8;
  });

  if (premium) {
    doc.setTextColor(46, 125, 50);
    doc.text('Premium: informe completo sin watermark.', 16, y + 6);
  } else {
    doc.setTextColor(180, 67, 9);
    doc.setFontSize(16);
    doc.text(WATERMARK, 28, 150, { angle: 35 });
  }

  doc.save('autocalc-informe-2026.pdf');
  trackEvent('descarga_pdf', { premium });
}

export function exportarCSV(resultados) {
  const header = 'concepto,importe_eur';
  const lines = buildRows(resultados).map(([label, value]) => {
    const safeLabel = String(label).replaceAll('"', '""');
    return `"${safeLabel}",${Number.isFinite(value) ? value : ''}`;
  });

  downloadText('autocalc-resultados-2026.csv', [header, ...lines].join('\n'), 'text/csv;charset=utf-8');
  trackEvent('descarga_csv', {});
}
