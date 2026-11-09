// Afronden zoals Excel ROUND / ROUNDUP (half weg van nul).
// Excel rekent met 15 significante cijfers; daarom eerst ruis wegpoetsen,
// zodat bijv. 240/19.2 = 12.499999… als 12.5 wordt gezien en naar 13 gaat.

function ontruis(x: number): number {
  return Number(x.toPrecision(12));
}

/** Excel ROUND(x; 0): half weg van nul. */
export function excelRound(x: number): number {
  const v = ontruis(Math.abs(x));
  return Math.sign(x) * Math.floor(v + 0.5);
}

/** Excel ROUNDUP(x; 0): weg van nul. */
export function excelRoundUp(x: number): number {
  const v = ontruis(Math.abs(x));
  return Math.sign(x) * Math.ceil(v);
}

/** Rond af op stap s (1, 0,5 of 0,25) en geef een schoon getal terug. */
export function roundStap(x: number, s: number): number {
  return ontruis(excelRound(x / s) * s);
}

/** Som zonder drijvende-kommaruis. */
export function schoon(x: number): number {
  return ontruis(x);
}
