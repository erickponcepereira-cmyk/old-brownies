// B5.11 — dia comercial e datas no fuso America/Cuiaba (UTC−4, sem horário de verão).
export const FUSO = 'America/Cuiaba'
const MS_DIA = 86_400_000

const formatador = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})

function partes(momento: Date) {
  const p = Object.fromEntries(formatador.formatToParts(momento).map((x) => [x.type, x.value]))
  return { data: `${p.year}-${p.month}-${p.day}`, hora: `${p.hour}:${p.minute}` }
}

export function dataLocal(momento: Date): string {
  return partes(momento).data
}

export function horaLocal(momento: Date): string {
  return partes(momento).hora
}

export function diaComercial(momento: Date, horaViradaDia = 4): string {
  return dataLocal(new Date(momento.getTime() - horaViradaDia * 3_600_000))
}

function paraUtc(data: string): number {
  const [a, m, d] = data.split('-').map(Number)
  return Date.UTC(a, m - 1, d)
}

export function somarDias(data: string, dias: number): string {
  return new Date(paraUtc(data) + dias * MS_DIA).toISOString().slice(0, 10)
}

export function diasEntre(de: string, ate: string): number {
  return Math.round((paraUtc(ate) - paraUtc(de)) / MS_DIA)
}

// 1 = segunda … 7 = domingo
export function diaSemanaIso(data: string): number {
  const d = new Date(paraUtc(data)).getUTCDay()
  return d === 0 ? 7 : d
}

export function inicioSemana(data: string): string {
  return somarDias(data, 1 - diaSemanaIso(data))
}

export function inicioMes(data: string): string {
  return `${data.slice(0, 7)}-01`
}

export function diasNoMes(data: string): number {
  const [a, m] = data.split('-').map(Number)
  return new Date(Date.UTC(a, m, 0)).getUTCDate()
}
