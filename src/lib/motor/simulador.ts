// B5.13 — simulador da rede (reproduz a aba SIMULADOR da planilha v4).
import type { CustoPorTamanho } from './custo'

export interface EntradaSimulador {
  diasLoja: number
  lojaPorDia: number
  precoMedioLoja: number
  vendedores: number
  vendedorPorSemana: number
  precoVendedor: number
  motoristas: number
  motoristaPorDia: number
  diasMotorista: number
  precoMotorista: number
  pontos: number
  caixasPorMes: number
  pecasPorCaixa: number
  precoPonto: number
  trocaPct: number
  semanasPorMes: number
  provisaoImposto: number
  capacidadeJornada: number
  taxaMaquininha: number
  fixosLoja: number
  fixosEmpresa: number
  pessoal: number
  divida: number
  pecasPorForma: CustoPorTamanho
}

export interface Setor { pecasMes: number; receita: number; custo: number; lucro: number }

export function simularRede(e: EntradaSimulador, custoMix: (formasSemana: number) => CustoPorTamanho) {
  const pequenosSemana = e.diasLoja * e.lojaPorDia + e.vendedores * e.vendedorPorSemana
    + e.motoristas * e.motoristaPorDia * e.diasMotorista
  const grandesMes = e.pontos * e.caixasPorMes * e.pecasPorCaixa
  // A troca do ponto é produzida a mais, mas volta para a loja: pesa na produção, não no custo.
  const grandesProduzidosSemana = (grandesMes / e.semanasPorMes) * (1 + e.trocaPct)
  const formasSemana = pequenosSemana / e.pecasPorForma.pequeno + grandesProduzidosSemana / e.pecasPorForma.grande
  const jornadas = Math.ceil(formasSemana / e.capacidadeJornada)
  const custo = custoMix(formasSemana)

  const setor = (pecasMes: number, preco: number, custoPeca: number, taxa = 0, fixo = 0): Setor => {
    const receita = pecasMes * preco
    const custoTotal = pecasMes * custoPeca + receita * taxa + fixo
    return { pecasMes, receita, custo: custoTotal, lucro: receita - custoTotal }
  }
  const spm = e.semanasPorMes
  const setores = {
    loja: setor(e.diasLoja * e.lojaPorDia * spm, e.precoMedioLoja, custo.pequeno, e.taxaMaquininha, e.fixosLoja),
    vendedores: setor(e.vendedores * e.vendedorPorSemana * spm, e.precoVendedor, custo.pequeno),
    motoristas: setor(e.motoristas * e.motoristaPorDia * e.diasMotorista * spm, e.precoMotorista, custo.pequeno),
    pontos: setor(grandesMes, e.precoPonto, custo.grande),
  }

  const lista = Object.values(setores)
  const faturamento = lista.reduce((s, x) => s + x.receita, 0)
  const lucroSetores = lista.reduce((s, x) => s + x.lucro, 0)
  const imposto = faturamento * e.provisaoImposto
  const lucroEmpresa = lucroSetores - e.fixosEmpresa - imposto
  const sobra = lucroEmpresa - e.pessoal - e.divida
  // Margem que cresce com o volume (antes dos fixos): base para o % de volume de equilíbrio.
  const margemVariavel = lucroSetores + e.fixosLoja - imposto
  const fixosDaEmpresa = e.fixosLoja + e.fixosEmpresa
  const pctEmpresaSePagar = fixosDaEmpresa / margemVariavel
  const pctPagarTudo = (fixosDaEmpresa + e.pessoal + e.divida) / margemVariavel

  return {
    pecasSemana: pequenosSemana + grandesMes / spm,
    formasSemana, jornadas, custo, setores, faturamento, lucroSetores, imposto, lucroEmpresa, sobra,
    pctEmpresaSePagar, pctPagarTudo, margemSeguranca: 1 - pctPagarTudo,
  }
}
