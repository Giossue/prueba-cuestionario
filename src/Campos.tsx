import { useState } from 'react'
import {
  Accordion, AccordionDetails, AccordionSummary, Autocomplete, Box, Button, Checkbox, FormControlLabel,
  IconButton, MenuItem, Radio, RadioGroup, Stack, TextField, Typography,
} from '@mui/material'
import Grid from '@mui/material/Grid'
import { CAT, CIIU, GEO, esEsp, hojas, vacio, type Aviso, type Datos, type Nodo } from './lib'

export interface Ctx {
  D: Datos
  set: (k: string, v: unknown) => void
  av: Record<string, Aviso>
  ver: boolean // mostrar faltantes
  req: string[]
}
const c = (ctx: Ctx, id: string) => ({
  error: (ctx.ver && ctx.req.includes(id) && vacio(ctx.D[id])) || (!!ctx.av[id] && !ctx.av[id].ok),
  helperText: ctx.av[id]?.msg,
  required: ctx.req.includes(id),
  ...(ctx.av[id]?.ok ? { slotProps: { formHelperText: { sx: { color: 'success.main' } } } } : {}),
})

export const Cel = ({ s = 12, m, children }: { s?: number; m?: number; children: React.ReactNode }) => (
  <Grid size={{ xs: s, md: m ?? s }}>{children}</Grid>
)

export function T({ ctx, id, label, type = 'text', multiline, rows, opts, ph }: {
  ctx: Ctx; id: string; label: string; type?: string; multiline?: boolean; rows?: number; opts?: string[]; ph?: string
}) {
  return (
    <TextField
      fullWidth size="small" label={label} type={type} multiline={multiline} minRows={rows} select={!!opts}
      placeholder={ph} value={ctx.D[id] ?? ''} onChange={(e) => ctx.set(id, e.target.value)}
      {...(type === 'date' || type === 'time' ? { slotProps: { inputLabel: { shrink: true } } } : {})}
      {...c(ctx, id)}
    >
      {opts?.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
    </TextField>
  )
}

/* Provincia → cantón (→ parroquia) */
export function GeoSel({ ctx, ip, ic, ipar, et }: { ctx: Ctx; ip: string; ic: string; ipar?: string; et: string[] }) {
  const prov = GEO.find((p) => p.nombre === ctx.D[ip])
  const cant = prov?.cantones.find((x) => x.nombre === ctx.D[ic])
  const caja = (id: string, label: string, opts: string[], dep: string[], disabled = false) => (
    <Cel s={12} m={ipar ? 4 : 6}>
      <Autocomplete
        size="small" options={opts} value={ctx.D[id] || null} disabled={disabled}
        onChange={(_, v) => { ctx.set(id, v ?? ''); dep.forEach((d) => ctx.set(d, '')) }}
        renderInput={(p) => <TextField {...p} label={label} {...c(ctx, id)} />}
      />
    </Cel>
  )
  return (
    <>
      {caja(ip, et[0], GEO.map((p) => p.nombre), [ic, ...(ipar ? [ipar] : [])])}
      {caja(ic, et[1], prov?.cantones.map((x) => x.nombre) ?? [], ipar ? [ipar] : [], !prov)}
      {ipar && caja(ipar, et[2], cant?.parroquias ?? [], [], !cant)}
    </>
  )
}

/* CIIU: sección > división > grupo > clase > subclase */
export function CiiuSel({ ctx, id }: { ctx: Ctx; id: string }) {
  const nom = ['Sección', 'División', 'Grupo', 'Clase', 'Subclase']
  const lon = [1, 3, 4, 5, 8]
  const v: string = ctx.D[id] ?? ''
  const [pend, setPend] = useState<string[]>([])
  const sel = (n: number) => (v ? [v[0], v.slice(0, 3), v.slice(0, 4), v.slice(0, 5), v][n] : pend[n] ?? '')
  const hijos = (n: number) => {
    const p = n ? sel(n - 1) : ''
    return CIIU.filter(([k]) => k.length === lon[n] && (n === 4) === k.includes('.') && (!n || (p && k.startsWith(p))))
  }
  const elegir = (n: number, val: string) => {
    const nuevo = [...[0, 1, 2, 3].map(sel).slice(0, n), val]
    setPend(nuevo)
    ctx.set(id, n === 4 ? val : '')
  }
  const corto = (t: string) => (t.length > 90 ? t.slice(0, 87) + '…' : t)
  return (
    <Grid container spacing={1.5}>
      {nom.map((N, n) => (
        <Cel key={N} s={12} m={n === 0 ? 3 : 9}>
          {(n === 0 || sel(n - 1)) && (
            <TextField
              select fullWidth size="small" label={N} value={sel(n)} onChange={(e) => elegir(n, e.target.value)}
              {...(n === 4 ? c(ctx, id) : {})}
            >
              {hijos(n).map(([k, t]) => <MenuItem key={k} value={k} sx={{ whiteSpace: 'normal' }}>{k} {corto(t)}</MenuItem>)}
            </TextField>
          )}
        </Cel>
      ))}
    </Grid>
  )
}

/* Catálogo: una hoja del árbol, agrupada por categoría, con buscador */
export function Catalogo({ ctx, id, label, clave }: { ctx: Ctx; id: string; label: string; clave: string }) {
  const op = hojas(CAT[clave])
  const cur = ctx.D[id] as { code?: string; esp?: string } | undefined
  const act = op.find((o) => o.n.c === cur?.code)
  return (
    <Stack spacing={1}>
      <Autocomplete
        size="small" options={op} value={act ?? null} groupBy={(o) => o.grupo}
        getOptionLabel={(o) => `${o.n.c} ${o.n.t}`} isOptionEqualToValue={(a, b) => a.n.c === b.n.c}
        onChange={(_, o) => ctx.set(id, o ? { code: o.n.c, esp: '' } : '')}
        renderInput={(p) => <TextField {...p} label={label} {...c(ctx, id)} />}
      />
      {act && esEsp(act.n) && (
        <TextField size="small" label="Especifique" value={cur?.esp ?? ''} onChange={(e) => ctx.set(id, { code: act.n.c, esp: e.target.value })} />
      )}
    </Stack>
  )
}

/* Árbol de casillas (causas) */
export function Arbol({ ctx, id, titulo, clave }: { ctx: Ctx; id: string; titulo: string; clave: string }) {
  const sel: Record<string, string> = ctx.D[id] ?? {}
  const toggle = (n: Nodo, on: boolean) => {
    const s = { ...sel }
    if (on) s[n.c] = s[n.c] ?? ''; else delete s[n.c]
    ctx.set(id, s)
  }
  const nodo = (n: Nodo, nivel: number): React.ReactNode =>
    n.k.length ? (
      <Box key={n.c} sx={{ ml: nivel ? 2 : 0, mt: 1 }}>
        <Typography variant="subtitle2" color="primary">{n.c} {n.t}</Typography>
        {n.k.map((k) => nodo(k, nivel + 1))}
      </Box>
    ) : (
      <Box key={n.c} sx={{ ml: nivel ? 2 : 0 }}>
        <FormControlLabel
          control={<Checkbox size="small" checked={n.c in sel} onChange={(e) => toggle(n, e.target.checked)} />}
          label={<Typography variant="body2">{n.c} {n.t}</Typography>}
        />
        {n.c in sel && esEsp(n) && (
          <TextField size="small" fullWidth label="Especifique" value={sel[n.c]} sx={{ mb: 1 }}
            onChange={(e) => ctx.set(id, { ...sel, [n.c]: e.target.value })} />
        )}
      </Box>
    )
  const total = Object.keys(sel).length
  return (
    <Stack spacing={1}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{titulo} {total > 0 && `· ${total} seleccionada(s)`}</Typography>
      {CAT[clave].map((n) => (
        <Accordion key={n.c} disableGutters variant="outlined" defaultExpanded={Object.keys(sel).some((k) => k.startsWith(n.c + '.'))}>
          <AccordionSummary><Typography variant="body2" sx={{ fontWeight: 600 }}>{n.c} {n.t}</Typography></AccordionSummary>
          <AccordionDetails>{n.k.length ? n.k.map((k) => nodo(k, 0)) : nodo(n, 0)}</AccordionDetails>
        </Accordion>
      ))}
    </Stack>
  )
}

/* Causas básicas Cumple Sí/No */
export function Basicas({ ctx }: { ctx: Ctx }) {
  const b: Record<string, string> = ctx.D.basicas ?? {}
  return (
    <Stack divider={<Box sx={{ borderBottom: '1px dotted #ccd' }} />}>
      {CAT.basicas.map((n) => (
        <Stack key={n.c} direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, py: 0.5 }}>
          <Typography variant="body2" sx={{ flex: 1 }}>{n.c} {n.t}</Typography>
          <RadioGroup row value={b[n.c] ?? ''} onChange={(e) => ctx.set('basicas', { ...b, [n.c]: e.target.value })}>
            <FormControlLabel value="Si" control={<Radio size="small" />} label="Sí" />
            <FormControlLabel value="No" control={<Radio size="small" />} label="No" />
          </RadioGroup>
        </Stack>
      ))}
    </Stack>
  )
}

/* Lista repetible */
export function Lista({ ctx, id, cols, btn }: { ctx: Ctx; id: string; cols: [string, string][]; btn: string }) {
  const arr: Record<string, string>[] = ctx.D[id] ?? []
  const upd = (i: number, k: string, v: string) => ctx.set(id, arr.map((f, j) => (j === i ? { ...f, [k]: v } : f)))
  return (
    <Stack spacing={1}>
      {arr.map((f, i) => (
        <Stack key={i} direction="row" spacing={1}>
          {cols.map(([k, ph]) => (
            <TextField key={k} size="small" fullWidth label={ph} value={f[k] ?? ''} onChange={(e) => upd(i, k, e.target.value)} />
          ))}
          <IconButton color="error" aria-label="Quitar" onClick={() => ctx.set(id, arr.filter((_, j) => j !== i))}>✕</IconButton>
        </Stack>
      ))}
      <Box><Button size="small" variant="outlined" onClick={() => ctx.set(id, [...arr, {}])}>+ {btn}</Button></Box>
    </Stack>
  )
}
