import catJson from './data/cat.json'
import geoJson from './data/geo.json'
import ciiuJson from './data/ciiu.json'

export interface Nodo { c: string; t: string; k: Nodo[] }
export interface Geo { nombre: string; cantones: { nombre: string; parroquias: string[] }[] }
export type Datos = Record<string, any>

export const CAT = catJson as unknown as Record<string, Nodo[]>
export const GEO = geoJson as Geo[]
export const CIIU = ciiuJson as [string, string][]

export const esEsp = (n: Nodo) => /especifi/i.test(n.t)
export const hojas = (ns: Nodo[], raiz = ''): { n: Nodo; grupo: string }[] =>
  ns.flatMap((n) => (n.k.length ? hojas(n.k, raiz || `${n.c} ${n.t}`) : [{ n, grupo: raiz || 'Otros' }]))

/* ---- validaciones ---- */
export const dig = (v?: string) => (v ?? '').replace(/\D/g, '')
export function ced10(c: string) {
  if (!/^\d{10}$/.test(c)) return false
  const p = +c.slice(0, 2)
  if (!((p >= 1 && p <= 24) || p === 30) || +c[2] > 5) return false
  let t = 0
  for (let i = 0; i < 9; i++) { let x = +c[i] * (i % 2 ? 1 : 2); if (x > 9) x -= 9; t += x }
  return (10 - (t % 10)) % 10 === +c[9]
}
const mod11 = (c: string, coef: number[], pos: number) => {
  const r = coef.reduce((a, k, i) => a + +c[i] * k, 0) % 11
  return (r ? 11 - r : 0) === +c[pos]
}
export function rucOk(r: string) {
  if (!/^\d{13}$/.test(r)) return false
  const p = +r.slice(0, 2)
  if (!((p >= 1 && p <= 24) || p === 30)) return false
  const t = +r[2]
  if (t < 6) return ced10(r.slice(0, 10)) && r.slice(10) !== '000'
  if (t === 6) return mod11(r, [3, 2, 7, 6, 5, 4, 3, 2], 8) && r.slice(9) !== '0000'
  if (t === 9) return mod11(r, [4, 3, 2, 7, 6, 5, 4, 3, 2], 9) && r.slice(10) !== '000'
  return false
}
export const hoy = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export interface Aviso { msg: string; ok?: boolean }
export function avisos(D: Datos): Record<string, Aviso> {
  const a: Record<string, Aviso> = {}
  const ruc = dig(D.ruc)
  if (ruc) a.ruc = rucOk(ruc) ? { msg: 'RUC válido', ok: true } : { msg: 'RUC no válido (13 dígitos, verificador y establecimiento)' }
  const ced = dig(D.tcedula)
  if (ced) a.tcedula = ced10(ced) ? { msg: 'Cédula válida', ok: true } : { msg: 'Cédula no válida (10 dígitos y dígito verificador)' }
  for (const id of ['reptel', 'segtel', 'saltel', 'ttel', 'tcel']) {
    const n = dig(D[id])
    if (n && (n.length < 7 || n.length > 10)) a[id] = { msg: 'Debe tener entre 7 y 10 dígitos' }
  }
  const { afecha: ac, aaviso: av, ainvest: iv, entrega: en } = D
  if (ac && av) {
    if (av < ac) a.aaviso = { msg: 'El aviso no puede ser anterior al accidente' }
    else if ((+new Date(av) - +new Date(ac)) / 864e5 > 10) a.aaviso = { msg: 'Aviso presentado a más de 10 días del accidente (art. 44)' }
  }
  if (ac && iv && iv < ac) a.ainvest = { msg: 'La investigación no puede ser anterior al accidente' }
  if (iv && en && en < iv) a.entrega = { msg: 'La entrega no puede ser anterior a la investigación' }
  if (D.lesion?.code === '4.4.1.5') a.lesion = { msg: 'Fallecimiento: calificación en 30 días laborables (art. 46); en los demás casos, 10 días laborables.', ok: true }
  return a
}

export const REQ = ['razon', 'actividad', 'ciiu', 'ntrab', 'ruc', 'calle', 'ciudad', 'provincia', 'repleg', 'rseg', 'tnombre', 'tedad', 'tgenero', 'tinstr', 'tplantilla', 'tcedula', 'tcontr', 'tcumpl', 'asitio', 'aprovincia', 'aciudad', 'afecha', 'ainvest', 'descripcion', 'agente', 'fuente', 'contacto', 'lesion', 'unidad', 'entrega']
export const vacio = (v: unknown) => v === undefined || v === '' || v === null || (typeof v === 'object' && !(v as { code?: string }).code)
