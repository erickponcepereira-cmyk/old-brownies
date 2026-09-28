// Português do Brasil: R$ 1.234,56 e datas dd/mm.
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const inteiro = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })

export const reais = (valor: number) => moeda.format(valor).replace(/ /g, ' ')

export const numero = (valor: number, casas = 0) =>
  casas === 0 ? inteiro.format(valor) : valor.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })

export const pct = (valor: number | null, casas = 0) => (valor === null ? '—' : `${numero(valor * 100, casas)}%`)

export const dataCurta = (data: string) => `${data.slice(8, 10)}/${data.slice(5, 7)}`

export const DIAS_SEMANA = ['', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
// "na segunda", "no sábado"
export const naDia = (dia: number) => `${dia >= 6 ? 'no' : 'na'} ${DIAS_SEMANA[dia].toLowerCase()}`

export const DIAS_CURTOS = ['', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

const horaMinuto = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Cuiaba', hour: '2-digit', minute: '2-digit' })
const diaHora = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Cuiaba', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
})

export const hora = (iso: string) => horaMinuto.format(new Date(iso))
export const dataHora = (iso: string) => diaHora.format(new Date(iso)).replace(',', '')

export const plural = (n: number, um: string, varios: string) => `${numero(n)} ${n === 1 ? um : varios}`

export function linkWhatsapp(numero: string, texto?: string) {
  const digitos = numero.replace(/\D/g, '')
  const comPais = digitos.startsWith('55') ? digitos : `55${digitos}`
  return `https://wa.me/${comPais}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`
}
