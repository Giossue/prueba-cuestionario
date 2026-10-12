import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  Accordion, AccordionDetails, AccordionSummary, AppBar, Box, Button, Container, createTheme, CssBaseline, Stack, ThemeProvider,
  Toolbar, Typography,
} from '@mui/material'
import Grid from '@mui/material/Grid'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'
import { Arbol, Basicas, Catalogo, CiiuSel, Cel, GeoSel, Lista, T, type Ctx } from './Campos'
import { avisos, CIIU, hoy, REQ, vacio, CAT, type Datos, type Nodo } from './lib'

const theme = createTheme({
  palette: { primary: { main: '#1f4e79' } },
  shape: { borderRadius: 8 },
  components: { MuiFormLabel: { styleOverrides: { asterisk: { color: '#d32f2f' } } } },
})
const Abiertas = createContext<{ abierta: Record<string, boolean>; alternar: (t: string) => void }>({ abierta: {}, alternar: () => {} })
const KEY = 'iat-borrador-react'

function encontrarNodo(nodos: Nodo[], codigo: string): Nodo | undefined {
  for (const nodo of nodos) {
    if (nodo.c === codigo) return nodo
    const hijo = encontrarNodo(nodo.k, codigo)
    if (hijo) return hijo
  }
  return undefined
}

function fechaImprimible(v: unknown): string {
  if (typeof v !== 'string') return ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  const [anio, mes, dia] = v.split('-')
  return `${dia}/${mes}/${anio}`
}

function PField({ label, value, wide = false, long = false }: { label: string; value: React.ReactNode; wide?: boolean; long?: boolean }) {
  const contenido = value ?? ''
  return <div className={`print-field${wide ? ' print-wide' : ''}${long ? ' print-long' : ''}`}><strong>{label}</strong><span>{contenido}</span></div>
}

function PSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="print-section"><h2>{title}</h2>{children}</section>
}

function PList({ title, rows, empty = 'Sin registros' }: { title: string; rows: Record<string, string>[]; empty?: string }) {
  const cols = rows.length ? Object.keys(rows[0]) : []
  return (
    <div className="print-list">
      <div className="print-list-title">{title}</div>
      {rows.length ? <table><thead><tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr></thead><tbody>
        {rows.map((row, i) => <tr key={i}>{cols.map((c) => <td key={c}>{row[c] || '—'}</td>)}</tr>)}
      </tbody></table> : <div className="print-empty">{empty}</div>}
    </div>
  )
}

function InformeImprimible({ D }: { D: Datos }) {
  const dato = (id: string) => D[id] === undefined || D[id] === '' ? '' : D[id]
  const seleccion = (id: string, catalogo: string) => {
    const actual = D[id] as { code?: string; esp?: string } | undefined
    if (!actual?.code) return ''
    const nodo = encontrarNodo(CAT[catalogo], actual.code)
    return nodo ? `${nodo.c} ${nodo.t}${actual.esp ? `: ${actual.esp}` : ''}` : actual.code
  }
  const causas = (id: string) => Object.entries((D[id] ?? {}) as Record<string, string>)
    .map(([codigo, esp]) => {
      const nodo = encontrarNodo(CAT[id], codigo)
      return nodo ? `${codigo} ${nodo.t}${esp ? `: ${esp}` : ''}` : `${codigo}${esp ? `: ${esp}` : ''}`
    })
  const investigadores = (D.investigadores ?? []).map((i: { nombre?: string; cargo?: string }) => ({ Nombre: i.nombre ?? '', Cargo: i.cargo ?? '' }))
  const entrevistados = (D.entrevistados ?? []).map((i: { nombre?: string; funcion?: string }) => ({ Nombre: i.nombre ?? '', Función: i.funcion ?? '' }))

  return (
    <article className="print-document">
      <header className="print-heading">
        <div>FORMATO INFORME AMPLIATORIO</div>
        <h1>INFORME TÉCNICO DE INVESTIGACIÓN DE ACCIDENTE DE TRABAJO – IAT</h1>
        <p>Anexo B · Resolución C.D. 513</p>
      </header>

      <PSection title="1. DATOS GENERALES DEL CENTRO DE TRABAJO">
        <div className="print-grid">
          <PField label="1.1 Razón social" value={dato('razon')} wide />
          <PField label="1.2 Actividad principal de la empresa" value={dato('actividad')} wide />
          <PField label="1.3 CIIU" value={dato('ciiu')} />
          <PField label="1.4 N.º de trabajadores" value={dato('ntrab')} />
          <PField label="1.5 RUC" value={dato('ruc')} />
          <PField label="1.6 Dirección y referencias" value={dato('calle')} wide />
          <PField label="1.6.1 Parroquia / sector" value={dato('parroquia')} />
          <PField label="1.6.2 Ciudad / cantón" value={dato('ciudad')} />
          <PField label="1.6.3 Provincia" value={dato('provincia')} />
          <PField label="1.7 Representante legal" value={dato('repleg')} />
          <PField label="1.7.1 E-mail" value={dato('repmail')} />
          <PField label="1.7.2 Teléfono / celular" value={dato('reptel')} />
          <PField label="1.8 Responsable de seguridad en el trabajo" value={dato('rseg')} />
          <PField label="1.8.1 E-mail" value={dato('segmail')} />
          <PField label="1.8.2 Teléfono / celular" value={dato('segtel')} />
          <PField label="1.9 Responsable de salud en el trabajo" value={dato('rsal')} />
          <PField label="1.9.1 E-mail" value={dato('salmail')} />
          <PField label="1.9.2 Teléfono / celular" value={dato('saltel')} />
        </div>
      </PSection>

      <PSection title="2. DATOS DEL TRABAJADOR">
        <div className="print-grid">
          <PField label="2.1 Nombre del trabajador" value={dato('tnombre')} wide />
          <PField label="2.2 Edad" value={dato('tedad')} />
          <PField label="2.3 Género" value={dato('tgenero')} />
          <PField label="2.4 Instrucción" value={dato('tinstr')} />
          <PField label="2.5 Vínculo laboral – plantilla" value={dato('tplantilla')} />
          <PField label="2.6 Cédula de ciudadanía" value={dato('tcedula')} />
          <PField label="2.7 Estado civil" value={dato('tcivil')} />
          <PField label="2.8 Dirección" value={dato('tdir')} wide />
          <PField label="2.9 Teléfono" value={dato('ttel')} />
          <PField label="2.10 Celular" value={dato('tcel')} />
          <PField label="2.11 Experiencia laboral (meses)" value={dato('texp')} />
          <PField label="2.12 Actividad laboral contratada" value={dato('tcontr')} />
          <PField label="2.13 Actividad laboral cumplida" value={dato('tcumpl')} wide />
        </div>
      </PSection>

      <PSection title="3. DATOS DEL ACCIDENTE DE TRABAJO">
        <div className="print-grid">
          <PField label="3.1 Sitio en la empresa o lugar del accidente" value={dato('asitio')} />
          <PField label="3.2 Calle / carretera / sector" value={dato('acalle')} />
          <PField label="3.3 Provincia" value={dato('aprovincia')} />
          <PField label="3.3 Ciudad / cantón" value={dato('aciudad')} />
          <PField label="3.4 Fecha del accidente" value={fechaImprimible(D.afecha)} />
          <PField label="3.5 Hora del accidente" value={dato('ahora')} />
          <PField label="3.6 Recepción del aviso en el IESS" value={fechaImprimible(D.aaviso)} />
          <PField label="3.8 Fecha de investigación" value={fechaImprimible(D.ainvest)} />
        </div>
        <PList title="3.7 Personas entrevistadas" rows={entrevistados} />
      </PSection>

      <PSection title="4. DESCRIPCIÓN DETALLADA DEL ACCIDENTE">
        <div className="print-grid">
          <PField label="Descripción detallada" value={dato('descripcion')} wide long />
          <PField label="4.1.1 Agente o elemento material" value={seleccion('agente', 'agente')} wide />
          <PField label="4.1.2 Parte del agente" value={seleccion('parte', 'parte')} wide />
          <PField label="4.2 Fuente o actividad durante el accidente" value={seleccion('fuente', 'fuente')} wide />
          <PField label="4.3 Análisis del tipo de contacto" value={seleccion('contacto', 'contacto')} wide />
          <PField label="4.4.1 Tipo de lesión personal" value={seleccion('lesion', 'lesion')} wide />
        </div>
      </PSection>

      <PSection title="5. ANÁLISIS DE CAUSALIDAD">
        <div className="print-grid">
          <PField label="5.1.1 Condiciones subestándar (causas directas)" value={causas('cond').join(' · ')} wide />
          <PField label="5.1.2 Acciones subestándar (causas directas)" value={causas('acc').join(' · ')} wide />
          <PField label="5.2.1 Factores de trabajo (causas indirectas)" value={causas('ftrab').join(' · ')} wide />
          <PField label="5.2.2 Factores del trabajador" value={causas('ftrabaj').join(' · ')} wide />
        </div>
        <div className="print-list print-checklist">
          <div className="print-list-title">5.3 Causas básicas</div>
          <table><thead><tr><th>Criterio</th><th>Cumple</th></tr></thead><tbody>
            {CAT.basicas.map((n) => <tr key={n.c}><td>{n.c} {n.t}</td><td className="print-answer">{D.basicas?.[n.c] ? `☒ ${D.basicas[n.c] === 'Si' ? 'Sí' : 'No'}` : '☐ Sí   ☐ No'}</td></tr>)}
          </tbody></table>
        </div>
      </PSection>

      <PSection title="6. MEDIDAS CORRECTIVAS">
        <div className="print-grid">
          <PField label="6.1 Correctivos de causas directas" value={dato('m1')} wide long />
          <PField label="6.2 Correctivos de causas indirectas" value={dato('m2')} wide long />
          <PField label="6.3 Correctivos de causas básicas" value={dato('m3')} wide long />
        </div>
      </PSection>

      <PSection title="7. IDENTIFICACIÓN DE LA INVESTIGACIÓN">
        <PList title="7.1 Investigador(es)" rows={investigadores} empty="Sin investigadores registrados" />
        <div className="print-grid">
          <PField label="7.2 Unidad Provincial de Riesgos del Trabajo" value={dato('unidad')} wide />
          <PField label="7.3 Fecha de entrega del informe" value={fechaImprimible(D.entrega)} />
        </div>
      </PSection>
    </article>
  )
}

const Seccion = ({ t, children }: { t: string; children: React.ReactNode }) => {
  const { abierta, alternar } = useContext(Abiertas)
  return (
    <Accordion expanded={abierta[t] !== false} onChange={() => alternar(t)} disableGutters sx={{ mb: 2, '&:before': { display: 'none' } }}>
      <AccordionSummary expandIcon={<span>▼</span>} sx={{ bgcolor: '#deeaf6' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{t}</Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 2 }}>{children}</AccordionDetails>
    </Accordion>
  )
}
const G = ({ children }: { children: React.ReactNode }) => <Grid container spacing={1.5}>{children}</Grid>
const Sub = ({ t }: { t: string }) => <Typography variant="subtitle2" color="primary" sx={{ mt: 2, mb: 1 }}>{t}</Typography>

export default function App() {
  const [D, setD] = useState<Datos>(() => {
    try { return { entrega: hoy(), ...JSON.parse(localStorage.getItem(KEY) ?? '{}') } } catch { return { entrega: hoy() } }
  })
  const [ver, setVer] = useState(false)
  const [abierta, setAbierta] = useState<Record<string, boolean>>({})
  const alternar = (t: string) => setAbierta((a) => ({ ...a, [t]: a[t] === false }))
  const [guardado, setGuardado] = useState('')
  const [dbReady, setDbReady] = useState(false)
  const editadoDuranteCarga = useRef(false)
  const archivo = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelado = false
    const cargarBorrador = async () => {
      try {
        const respuesta = await fetch('/api/draft')
        if (!respuesta.ok) throw new Error('No se pudo leer SQLite')
        const { draft } = await respuesta.json() as { draft: Datos | null }
        if (cancelado) return
        if (draft && !editadoDuranteCarga.current) {
          setD({ entrega: hoy(), ...draft })
          setGuardado('SQLite · borrador recuperado')
        } else if (!draft && !editadoDuranteCarga.current) {
          const anterior = localStorage.getItem(KEY)
          if (anterior) {
            try { setD({ entrega: hoy(), ...JSON.parse(anterior) as Datos }) } catch { localStorage.removeItem(KEY) }
          }
          setGuardado('SQLite · listo para guardar')
        } else {
          setGuardado('SQLite · listo para guardar')
        }
      } catch {
        if (!cancelado) setGuardado('SQLite no disponible · guardado local')
      } finally {
        if (!cancelado) setDbReady(true)
      }
    }
    void cargarBorrador()
    return () => { cancelado = true }
  }, [])

  useEffect(() => {
    if (!dbReady) return
    let cancelado = false
    const t = setTimeout(async () => {
      const json = JSON.stringify(D)
      localStorage.setItem(KEY, json)
      try {
        const respuesta = await fetch('/api/draft', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ draft: D }),
        })
        if (!respuesta.ok) throw new Error('No se pudo guardar en SQLite')
        if (!cancelado) setGuardado('SQLite · guardado ' + new Date().toLocaleTimeString())
      } catch {
        if (!cancelado) setGuardado('SQLite no disponible · guardado local ' + new Date().toLocaleTimeString())
      }
    }, 500)
    return () => { cancelado = true; clearTimeout(t) }
  }, [D, dbReady])

  const set = (k: string, v: unknown) => {
    editadoDuranteCarga.current = true
    setD((d) => {
      const n = { ...d, [k]: v }
      if (k === 'ciiu' && v) { // 1.2 desde CIIU, sin pisar texto escrito a mano
        const prev = CIIU.find((x) => x[0] === d.ciiu)?.[1]
        const nuevo = CIIU.find((x) => x[0] === v)?.[1]
        if (nuevo && (!d.actividad || d.actividad === prev)) n.actividad = nuevo
      }
      return n
    })
  }
  const av = useMemo(() => avisos(D), [D])
  const ctx: Ctx = { D, set, av, ver, req: REQ }

  const faltan = () => {
    const f = REQ.filter((id) => vacio(D[id]))
    if (!Object.keys(D.cond ?? {}).length && !Object.keys(D.acc ?? {}).length) f.push('causas directas')
    const nb = CAT.basicas.filter((n) => !D.basicas?.[n.c]).length
    if (nb) f.push(`causas básicas (${nb} sin marcar)`)
    if (!(D.investigadores ?? []).some((i: { nombre?: string }) => i.nombre)) f.push('investigadores')
    return f
  }
  const imprimir = () => {
    setVer(true)
    const f = faltan()
    if (f.length && !confirm(`Faltan datos obligatorios:\n- ${f.slice(0, 12).join('\n- ')}${f.length > 12 ? '\n…' : ''}\n\n¿Imprimir de todas formas?`)) return
    setAbierta({}) // abrir todo para imprimir
    setTimeout(() => window.print(), 400)
  }
  const nuevo = () => {
    if (!confirm('¿Borrar el borrador y empezar uno nuevo?')) return
    editadoDuranteCarga.current = true
    localStorage.removeItem(KEY)
    setVer(false)
    setD({ entrega: hoy() })
  }
  const descargar = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(D, null, 1)], { type: 'application/json' }))
    a.download = `iat-${D.afecha || 'borrador'}.json`
    a.click()
  }
  const cargar = async (f?: File) => { if (f) { editadoDuranteCarga.current = true; setD({ entrega: hoy(), ...JSON.parse(await f.text()) }) } }

  return (
    <ThemeProvider theme={theme}>
      <Abiertas.Provider value={{ abierta, alternar }}>
      <CssBaseline />
      <AppBar position="sticky" className="no-print">
        <Toolbar sx={{ gap: 1, flexWrap: 'wrap' }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6">Informe técnico de investigación de accidente de trabajo – IAT</Typography>
            <Typography variant="caption">Anexo B · Resolución C.D. 513 · {guardado}</Typography>
          </Box>
          <Button color="inherit" onClick={nuevo}>Nuevo</Button>
          <Button color="inherit" onClick={descargar}>Descargar JSON</Button>
          <Button color="inherit" onClick={() => archivo.current?.click()}>Cargar JSON</Button>
          <input ref={archivo} type="file" accept=".json" hidden onChange={(e) => { cargar(e.target.files?.[0]); e.target.value = '' }} />
          <Button variant="contained" color="secondary" onClick={imprimir}>Imprimir</Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 2 }}>
        <Typography variant="h6" align="center" sx={{ display: { xs: 'none' }, '@media print': { display: 'block' }, mb: 2 }}>
          INFORME TÉCNICO DE INVESTIGACIÓN DE ACCIDENTE DE TRABAJO – IAT
        </Typography>

        <Seccion t="1. DATOS GENERALES DEL CENTRO DE TRABAJO">
          <G>
            <Cel m={6}><T ctx={ctx} id="razon" label="1.1 Razón social" /></Cel>
            <Cel m={6}><T ctx={ctx} id="actividad" label="1.2 Actividad principal de la empresa" /></Cel>
            <Cel><Sub t="1.3 CIIU" /><CiiuSel ctx={ctx} id="ciiu" /></Cel>
            <Cel m={6}><T ctx={ctx} id="ntrab" label="1.4 N.º de trabajadores" type="number" /></Cel>
            <Cel m={6}><T ctx={ctx} id="ruc" label="1.5 RUC" /></Cel>
            <Cel><T ctx={ctx} id="calle" label="1.6 Calle principal / número / intersección. Referencias" /></Cel>
            <GeoSel ctx={ctx} ip="provincia" ic="ciudad" ipar="parroquia" et={['1.6.3 Provincia', '1.6.2 Ciudad / cantón', '1.6.1 Parroquia / Sector']} />
            <Cel m={6}><T ctx={ctx} id="repleg" label="1.7 Representante legal o apoderado" /></Cel>
            <Cel m={3}><T ctx={ctx} id="repmail" label="1.7.1 E-mail" type="email" /></Cel>
            <Cel m={3}><T ctx={ctx} id="reptel" label="1.7.2 Teléfono / Celular" /></Cel>
            <Cel m={6}><T ctx={ctx} id="rseg" label="1.8 Responsable de Seguridad en el Trabajo" /></Cel>
            <Cel m={3}><T ctx={ctx} id="segmail" label="1.8.1 E-mail" type="email" /></Cel>
            <Cel m={3}><T ctx={ctx} id="segtel" label="1.8.2 Teléfono / Celular" /></Cel>
            <Cel m={6}><T ctx={ctx} id="rsal" label="1.9 Responsable de Salud en el Trabajo" /></Cel>
            <Cel m={3}><T ctx={ctx} id="salmail" label="1.9.1 E-mail" type="email" /></Cel>
            <Cel m={3}><T ctx={ctx} id="saltel" label="1.9.2 Teléfono / Celular" /></Cel>
          </G>
        </Seccion>

        <Seccion t="2. DATOS DEL TRABAJADOR">
          <G>
            <Cel m={6}><T ctx={ctx} id="tnombre" label="2.1 Nombre del trabajador" /></Cel>
            <Cel m={3}><T ctx={ctx} id="tedad" label="2.2 Edad" type="number" /></Cel>
            <Cel m={3}><T ctx={ctx} id="tgenero" label="2.3 Género" opts={['Masculino', 'Femenino', 'Otro']} /></Cel>
            <Cel m={6}><T ctx={ctx} id="tinstr" label="2.4 Instrucción" opts={['B – Básica', 'M – Media', 'S – Superior', 'E – Especialización', 'N – Ninguna']} /></Cel>
            <Cel m={6}><T ctx={ctx} id="tplantilla" label="2.5 Vínculo laboral – ¿plantilla?" opts={['Sí', 'No']} /></Cel>
            <Cel m={4}><T ctx={ctx} id="tcedula" label="2.6 Cédula de ciudadanía" /></Cel>
            <Cel m={4}><T ctx={ctx} id="tcivil" label="2.7 Estado civil" opts={['Soltero/a', 'Casado/a', 'Unión de hecho', 'Divorciado/a', 'Viudo/a']} /></Cel>
            <Cel m={4}><T ctx={ctx} id="texp" label="2.11 Experiencia laboral (meses)" type="number" /></Cel>
            <Cel><T ctx={ctx} id="tdir" label="2.8 Calle principal / número / intersección" /></Cel>
            <Cel m={6}><T ctx={ctx} id="ttel" label="2.9 Teléfono" /></Cel>
            <Cel m={6}><T ctx={ctx} id="tcel" label="2.10 Celular" /></Cel>
            <Cel m={6}><T ctx={ctx} id="tcontr" label="2.12 Actividad laboral contratada" /></Cel>
            <Cel m={6}><T ctx={ctx} id="tcumpl" label="2.13 Actividad laboral cumplida" /></Cel>
          </G>
        </Seccion>

        <Seccion t="3. DATOS DEL ACCIDENTE DE TRABAJO">
          <G>
            <Cel m={6}><T ctx={ctx} id="asitio" label="3.1 Sitio en la empresa o lugar del accidente" /></Cel>
            <Cel m={6}><T ctx={ctx} id="acalle" label="3.2 Calle o carretera o sector" /></Cel>
            <GeoSel ctx={ctx} ip="aprovincia" ic="aciudad" et={['3.3 Provincia', '3.3 Ciudad / cantón']} />
            <Cel m={4}><T ctx={ctx} id="afecha" label="3.4 Fecha del accidente" type="date" /></Cel>
            <Cel m={4}><T ctx={ctx} id="ahora" label="3.5 Hora del accidente" type="time" /></Cel>
            <Cel m={4}><T ctx={ctx} id="aaviso" label="3.6 Fecha de recepción del aviso en el IESS" type="date" /></Cel>
            <Cel><Sub t="3.7 Personas entrevistadas" /><Lista ctx={ctx} id="entrevistados" cols={[['nombre', 'Nombre'], ['funcion', 'Función']]} btn="Agregar entrevistado" /></Cel>
            <Cel m={4}><T ctx={ctx} id="ainvest" label="3.8 Fecha de la investigación" type="date" /></Cel>
          </G>
        </Seccion>

        <Seccion t="4. DESCRIPCIÓN DETALLADA DEL ACCIDENTE">
          <Stack spacing={2}>
            <T ctx={ctx} id="descripcion" label="Descripción detallada del accidente" multiline rows={6} ph="Relate cómo ocurrió el accidente, quién, dónde, qué tarea realizaba y qué ocurrió…" />
            <Catalogo ctx={ctx} id="agente" label="4.1.1 Agente o elemento material del accidente" clave="agente" />
            <Catalogo ctx={ctx} id="parte" label="4.1.2 Parte del agente" clave="parte" />
            <Catalogo ctx={ctx} id="fuente" label="4.2 Fuente o actividad durante el accidente" clave="fuente" />
            <Catalogo ctx={ctx} id="contacto" label="4.3 Análisis del tipo de contacto" clave="contacto" />
            <Catalogo ctx={ctx} id="lesion" label="4.4.1 Tipo de lesión personal (consecuencias)" clave="lesion" />
          </Stack>
        </Seccion>

        <Seccion t="5. ANÁLISIS DE CAUSALIDAD">
          <Stack spacing={3}>
            <Arbol ctx={ctx} id="cond" titulo="5.1.1 Condiciones subestándar (causas directas)" clave="cond" />
            <Arbol ctx={ctx} id="acc" titulo="5.1.2 Acciones subestándar (conducta del hombre)" clave="acc" />
            <Arbol ctx={ctx} id="ftrab" titulo="5.2.1 Factores de trabajo (causas indirectas)" clave="ftrab" />
            <Arbol ctx={ctx} id="ftrabaj" titulo="5.2.2 Factores del trabajador" clave="ftrabaj" />
            <Box><Typography variant="subtitle1" sx={{ fontWeight: 700 }}>5.3 Causas básicas</Typography><Basicas ctx={ctx} /></Box>
          </Stack>
        </Seccion>

        <Seccion t="6. MEDIDAS CORRECTIVAS">
          <Stack spacing={2}>
            <T ctx={ctx} id="m1" label="6.1 Correctivos de causas directas" multiline rows={4} />
            <T ctx={ctx} id="m2" label="6.2 Correctivos de causas indirectas" multiline rows={4} />
            <T ctx={ctx} id="m3" label="6.3 Correctivos de causas básicas" multiline rows={4} />
            <Typography variant="caption" color="text.secondary" className="no-print">Texto libre por ahora. Aquí irán las recomendaciones de la IA en la siguiente etapa.</Typography>
          </Stack>
        </Seccion>

        <Seccion t="7. IDENTIFICACIÓN DE LA INVESTIGACIÓN">
          <G>
            <Cel><Sub t="7.1 Nombre(s) del investigador(es)" /><Lista ctx={ctx} id="investigadores" cols={[['nombre', 'Nombre'], ['cargo', 'Cargo (opcional)']]} btn="Agregar investigador" /></Cel>
            <Cel m={8}><T ctx={ctx} id="unidad" label="7.2 Unidad Provincial de Riesgos del Trabajo" /></Cel>
            <Cel m={4}><T ctx={ctx} id="entrega" label="7.3 Fecha de entrega del informe" type="date" /></Cel>
          </G>
        </Seccion>
      </Container>
      <InformeImprimible D={D} />
      </Abiertas.Provider>
    </ThemeProvider>
  )
}
