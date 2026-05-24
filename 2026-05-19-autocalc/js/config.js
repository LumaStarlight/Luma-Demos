// Fuente: https://sede.agenciatributaria.gob.es/Sede/ayuda/manuales-videos-folletos/manuales-practicos/irpf-2024/c03-rendimientos-trabajo/cuestiones-generales/reducciones-rendimiento-neto/reduccion-obtencion-rendimientos-trabajo.html
// ESTIMACION: tramos estatales IRPF basados en la escala general vigente 2025; sujetos a confirmacion oficial para 2026.
export const IRPF_TRAMOS_2026 = [
  { hasta: 12450, tipo: 0.19 },
  { hasta: 20200, tipo: 0.24 },
  { hasta: 35200, tipo: 0.3 },
  { hasta: 60000, tipo: 0.37 },
  { hasta: 300000, tipo: 0.45 },
  { hasta: Infinity, tipo: 0.47 },
];

// Fuente: https://www.seg-social.es/wps/portal/wss/internet/Trabajadores/CotizacionRecaudacionTrabajadores/36537
// ESTIMACION: tabla de cuotas 2026 simplificada para MVP, basada en el sistema oficial de rendimientos netos; sujeta a confirmacion oficial.
export const TRAMOS_AUTONOMOS_2026 = [
  { desde: 0, hasta: 670, cuota: 200 },
  { desde: 670.01, hasta: 900, cuota: 230 },
  { desde: 900.01, hasta: 1166.7, cuota: 260 },
  { desde: 1166.71, hasta: 1400, cuota: 291 },
  { desde: 1400.01, hasta: 1700, cuota: 321 },
  { desde: 1700.01, hasta: 2030, cuota: 350 },
  { desde: 2030.01, hasta: 2430, cuota: 380 },
  { desde: 2430.01, hasta: 2760, cuota: 410 },
  { desde: 2760.01, hasta: 3190, cuota: 440 },
  { desde: 3190.01, hasta: 3700, cuota: 470 },
  { desde: 3700.01, hasta: 4200, cuota: 500 },
  { desde: 4200.01, hasta: Infinity, cuota: 530 },
];

// Fuente: https://sede.agenciatributaria.gob.es/Sede/iva.html
// ESTIMACION: tipos de IVA vigentes en 2025 mantenidos para 2026 salvo cambio normativo.
export const IVA_GENERAL = 0.21;

// Fuente: https://sede.agenciatributaria.gob.es/Sede/iva.html
// ESTIMACION: tipos de IVA vigentes en 2025 mantenidos para 2026 salvo cambio normativo.
export const IVA_REDUCIDO = 0.1;

// Fuente: https://sede.agenciatributaria.gob.es/Sede/iva.html
// ESTIMACION: tipos de IVA vigentes en 2025 mantenidos para 2026 salvo cambio normativo.
export const IVA_SUPERREDUCIDO = 0.04;

// Fuente: https://sede.agenciatributaria.gob.es/Sede/irpf/retenciones-ingresos-cuenta.html
// ESTIMACION: retencion reducida para nuevos profesionales mantenida desde normativa vigente.
export const RETENCION_IRPF_DEFAULT = 0.07;

// Fuente: https://sede.agenciatributaria.gob.es/Sede/irpf/retenciones-ingresos-cuenta.html
// ESTIMACION: retencion profesional general mantenida desde normativa vigente.
export const RETENCION_IRPF_PROFESIONAL = 0.15;
