// Parte C da especificação — números reais de 26/09/2026 (planilha v4).
// Dados puros, sem id: o motor e os testes dourados leem daqui; `semear.ts` grava no banco.
import type { CodigoCanal, CodigoTamanho, GrupoCusto, TipoTarefa } from './tipos'

export const EMPRESA = {
  nome: 'Old Brownies',
  razaoSocial: '49.568.287 Gabriel Samaniego',
  cnpj: '49.568.287/0001-40',
  chavePix: '49.568.287/0001-40',
  endereco: 'Avenida Dom Bosco, 630 — Dom Aquino, Cuiabá/MT — CEP 78015-180',
  fuso: 'America/Cuiaba',
}

export const CONFIG = {
  taxaMaquininha: 0.023,
  comissaoIfood: null as number | null,
  diasValidade: 15,
  diasMaxNoPonto: 7,
  semanasPorMes: 4.333,
  diariaProducao: 100,
  capacidadeJornada: 20,
  gasMesReferencia: 93.75,
  formasReferencia: 8,
  provisaoImposto: 0.05,
  precoFinalRevenda: 18,
  horaViradaDia: 4,
  metaLojaDia: 15,
}

export const INSUMOS = [
  { codigo: 'nescau', nome: 'Nescau / achocolatado', unidade: 'kg', precoManual: 49.9 },
  { codigo: 'trigo', nome: 'Trigo', unidade: 'kg', precoManual: 4.5 },
  { codigo: 'ovos', nome: 'Ovos', unidade: 'unidade', precoManual: 0.6 },
  { codigo: 'margarina', nome: 'Margarina Doriana 500g', unidade: 'pote', precoManual: 7.49 },
  { codigo: 'acucar', nome: 'Açúcar refinado', unidade: 'kg', precoManual: 5.79 },
  { codigo: 'castanha', nome: 'Castanha de caju', unidade: 'kg', precoManual: 59 },
  { codigo: 'manteiga', nome: 'Manteiga Piracanjuba', unidade: 'kg', precoManual: 23.79 },
  { codigo: 'mascavo', nome: 'Açúcar mascavo', unidade: 'kg', precoManual: 6.79 },
  { codigo: 'fermento', nome: 'Fermento', unidade: 'kg', precoManual: 36.2 },
  { codigo: 'sal', nome: 'Sal', unidade: 'kg', precoManual: 2.3 },
  { codigo: 'bicarbonato', nome: 'Bicarbonato de sódio', unidade: 'grama', precoManual: 0.0986 },
  { codigo: 'baunilha', nome: 'Essência de baunilha 30ml', unidade: 'frasco', precoManual: 2.4 },
  { codigo: 'jackMaca', nome: 'Whisky Jack Daniels Maçã Verde 1L', unidade: 'litro', precoManual: 149 },
  { codigo: 'jackHoney', nome: 'Whisky Jack Daniels Honey 1L', unidade: 'litro', precoManual: 159 },
  { codigo: 'etiqueta', nome: 'Etiqueta', unidade: 'unidade', precoManual: 0.8, observacao: 'CONFERIR: a nota da gráfica diz R$ 0,80 ou R$ 0,20?' },
  { codigo: 'embalagem', nome: 'Embalagem', unidade: 'unidade', precoManual: 0.1 },
  { codigo: 'demerara', nome: 'Açúcar demerara', unidade: 'kg', precoManual: 7.49 },
  { codigo: 'chocolateBranco', nome: 'Chocolate branco', unidade: 'kg', precoManual: 135.9 },
  { codigo: 'cremeLeite', nome: 'Creme de leite 200g', unidade: 'caixa', precoManual: 4.5 },
  { codigo: 'limao', nome: 'Limão', unidade: 'kg', precoManual: 5.95 },
  { codigo: 'nutella', nome: 'Nutella', unidade: 'kg', precoManual: 61.38 },
  { codigo: 'caixaOldBox', nome: 'Caixa Old Box', unidade: 'unidade', precoManual: 2 },
  { codigo: 'capuccino', nome: 'Pó de capuccino', unidade: 'kg', precoManual: 50 },
]

// Compras de exemplo da planilha: dão o preço usado de 4,30 (trigo) e 0,59 (ovos).
export const COMPRAS_EXEMPLO = [
  { insumo: 'trigo', data: '2026-09-26', quantidade: 5, valorTotal: 21.5, fornecedor: 'Compra de exemplo da planilha v4' },
  { insumo: 'ovos', data: '2026-09-26', quantidade: 30, valorTotal: 17.7, fornecedor: 'Compra de exemplo da planilha v4' },
]

export const SABORES = [
  { codigo: 'tradicional', nome: 'Tradicional', pesoMix: 4, validadeDias: 15, soEncomenda: false },
  { codigo: 'maca', nome: 'Jack Maçã Verde', pesoMix: 1, validadeDias: 15, soEncomenda: false },
  { codigo: 'cookie', nome: 'Cookie', pesoMix: 1, validadeDias: 15, soEncomenda: false },
  { codigo: 'castanha', nome: 'Castanha', pesoMix: 1, validadeDias: 15, soEncomenda: false },
  { codigo: 'honey', nome: 'Jack Honey', pesoMix: 1, validadeDias: 15, soEncomenda: false },
  { codigo: 'limao', nome: 'Limão Siciliano', pesoMix: 0, validadeDias: 3, soEncomenda: true },
]

const MASSA_BASE: Array<[string, number]> = [
  ['nescau', 0.5], ['trigo', 0.3], ['ovos', 10], ['margarina', 1], ['acucar', 0.4],
]
const MASSA_MEIA_MARGARINA: Array<[string, number]> = [
  ['nescau', 0.5], ['trigo', 0.3], ['ovos', 10], ['margarina', 0.5], ['acucar', 0.4],
]

// A massa de 1 forma (rende 24 grandes ou 35 pequenos).
export const RECEITAS: Record<string, Array<[string, number]>> = {
  tradicional: MASSA_BASE,
  maca: [['jackMaca', 0.175], ...MASSA_MEIA_MARGARINA],
  cookie: [
    ['manteiga', 0.14], ['mascavo', 0.12], ['acucar', 0.09], ['ovos', 1], ['fermento', 0.001],
    ['sal', 0.0037], ['bicarbonato', 3.7], ['trigo', 0.25], ['baunilha', 0.1667],
    ...MASSA_MEIA_MARGARINA,
  ],
  castanha: [...MASSA_BASE, ['castanha', 0.1]],
  honey: [...MASSA_MEIA_MARGARINA, ['jackHoney', 0.18]],
  limao: [
    ['ovos', 8], ['acucar', 0.36], ['demerara', 0.25], ['chocolateBranco', 0.65],
    ['margarina', 0.8], ['cremeLeite', 1], ['limao', 0.4], ['trigo', 0.25],
  ],
}

export const TAMANHOS: Array<{ codigo: CodigoTamanho; pecasPorForma: number }> = [
  { codigo: 'grande', pecasPorForma: 24 },
  { codigo: 'pequeno', pecasPorForma: 35 },
]

type ComposicaoSemente = { sabor: string; tamanho: CodigoTamanho; qtd: number } | { descricao: string; valor: number }

export interface ProdutoSemente {
  tipo: 'brownie' | 'combo' | 'bebida' | 'salgado'
  nome: string
  sabor?: string
  tamanho?: CodigoTamanho
  precoLoja: number
  custoManual?: number | null
  composicao?: ComposicaoSemente[]
  observacao?: string
  ifood?: boolean
}

const NUTELLA_40G = { descricao: 'Nutella 40 g', valor: 0.04 * 61.38 }
const GRANDE_TRADICIONAL = { sabor: 'tradicional', tamanho: 'grande' as const, qtd: 1 }

export const PRODUTOS: ProdutoSemente[] = [
  { tipo: 'brownie', nome: 'Tradicional', sabor: 'tradicional', tamanho: 'pequeno', precoLoja: 12, ifood: true },
  { tipo: 'brownie', nome: 'Cookie', sabor: 'cookie', tamanho: 'pequeno', precoLoja: 15, ifood: true },
  { tipo: 'brownie', nome: 'Castanha', sabor: 'castanha', tamanho: 'pequeno', precoLoja: 15, ifood: true },
  { tipo: 'brownie', nome: 'Limão Siciliano', sabor: 'limao', tamanho: 'pequeno', precoLoja: 15, observacao: 'Só sob encomenda' },
  { tipo: 'brownie', nome: 'Maçã Verde (whisky)', sabor: 'maca', tamanho: 'pequeno', precoLoja: 18, ifood: true },
  { tipo: 'brownie', nome: 'Jack Honey', sabor: 'honey', tamanho: 'pequeno', precoLoja: 18, ifood: true },
  { tipo: 'brownie', nome: 'Grande tradicional', sabor: 'tradicional', tamanho: 'grande', precoLoja: 18, ifood: true },
  { tipo: 'combo', nome: 'Grande com nutella', precoLoja: 20, composicao: [GRANDE_TRADICIONAL, NUTELLA_40G], ifood: true },
  {
    tipo: 'combo', nome: 'Grande + nutella + sorvete', precoLoja: 25, ifood: true,
    composicao: [GRANDE_TRADICIONAL, NUTELLA_40G, { descricao: 'Sorvete (estimado)', valor: 3 }],
  },
  {
    tipo: 'combo', nome: 'Old Capuccino', precoLoja: 19.9, ifood: true,
    composicao: [GRANDE_TRADICIONAL, { descricao: 'Pó de capuccino', valor: 1 }, { descricao: 'Copo e mexedor', valor: 0.6 }],
  },
  {
    tipo: 'combo', nome: 'Old Box (4 pequenos)', precoLoja: 59.9, ifood: true,
    composicao: [
      { sabor: 'tradicional', tamanho: 'pequeno', qtd: 4 },
      { descricao: 'Caixa Old Box', valor: 2 },
      { descricao: 'Etiqueta', valor: 0.8 },
      { descricao: 'Acabamento', valor: 0.3 },
    ],
  },
  { tipo: 'bebida', nome: 'Café', precoLoja: 3, custoManual: 0.6, observacao: 'Custo estimado, a confirmar' },
  { tipo: 'bebida', nome: 'Água', precoLoja: 5, custoManual: 1.19, observacao: 'Custo estimado, a confirmar' },
  { tipo: 'bebida', nome: 'Capuccino', precoLoja: 5, custoManual: 1.6, observacao: 'Custo estimado, a confirmar' },
  { tipo: 'bebida', nome: 'Café gelado 180 ml', precoLoja: 6, custoManual: 2, observacao: 'Custo estimado, a confirmar' },
  { tipo: 'bebida', nome: 'Café gelado 300 ml', precoLoja: 8, custoManual: 2.9, observacao: 'Custo estimado, a confirmar' },
  { tipo: 'bebida', nome: 'Suco de polpa 300 ml', precoLoja: 6, custoManual: 3.5, observacao: 'Pior margem da casa' },
  { tipo: 'bebida', nome: 'Maracujá 300 ml', precoLoja: 8, custoManual: 4.5, observacao: 'Pior margem da casa' },
  { tipo: 'bebida', nome: 'Coca mini', precoLoja: 6, custoManual: null, observacao: 'FALTA o custo' },
  { tipo: 'bebida', nome: 'Fanta mini', precoLoja: 6, custoManual: null, observacao: 'FALTA o custo' },
  { tipo: 'salgado', nome: 'Pão de queijo', precoLoja: 6, custoManual: null, observacao: 'FALTA receita e custo' },
  { tipo: 'salgado', nome: 'Esfirra', precoLoja: 7, custoManual: null, observacao: 'FALTA receita e custo' },
]

export const CANAIS: Array<{
  codigo: CodigoCanal; nome: string; tipo: 'direto' | 'parceiro'; tamanhoPadrao: CodigoTamanho
  precoPadrao: number | null; comissao: number | null
}> = [
  { codigo: 'loja', nome: 'Loja', tipo: 'direto', tamanhoPadrao: 'pequeno', precoPadrao: null, comissao: null },
  { codigo: 'rota', nome: 'Rota', tipo: 'direto', tamanhoPadrao: 'grande', precoPadrao: 18, comissao: null },
  { codigo: 'feira', nome: 'Feira', tipo: 'direto', tamanhoPadrao: 'pequeno', precoPadrao: 15, comissao: null },
  { codigo: 'evento', nome: 'Evento', tipo: 'direto', tamanhoPadrao: 'pequeno', precoPadrao: 18, comissao: null },
  { codigo: 'ifood', nome: 'iFood', tipo: 'direto', tamanhoPadrao: 'pequeno', precoPadrao: null, comissao: null },
  { codigo: 'vendedor', nome: 'Vendedor de rua', tipo: 'parceiro', tamanhoPadrao: 'pequeno', precoPadrao: 8, comissao: null },
  { codigo: 'motorista', nome: 'Motorista de aplicativo', tipo: 'parceiro', tamanhoPadrao: 'pequeno', precoPadrao: 8, comissao: null },
  { codigo: 'ponto', nome: 'Ponto de revenda', tipo: 'parceiro', tamanhoPadrao: 'grande', precoPadrao: 10, comissao: null },
]

export const PROMOCOES = [
  { oferta: 'Avulso', clientePaga: 18, brownies: 1 },
  { oferta: 'Avulso, com a tabela na maleta', clientePaga: 20, brownies: 1 },
  { oferta: 'Dois por R$ 35', clientePaga: 35, brownies: 2 },
  { oferta: 'Leve 4, pague 3 (3 × R$ 20)', clientePaga: 60, brownies: 4 },
]

export const CUSTOS_FIXOS: Array<{
  nome: string; valorMensal: number; grupo: GrupoCusto; visibilidade: 'todos' | 'mentor'; observacao?: string; inicio?: string
}> = [
  { nome: 'Aluguel + água + IPTU do ponto', valorMensal: 477.44, grupo: 'ponto', visibilidade: 'todos' },
  { nome: 'Internet', valorMensal: 130, grupo: 'ponto', visibilidade: 'todos' },
  { nome: 'EMIVE (segurança)', valorMensal: 299.89, grupo: 'ponto', visibilidade: 'todos', observacao: 'Necessária pela localização' },
  { nome: 'Maria Eduarda — balcão (5 dias)', valorMensal: 2166.5, grupo: 'ponto', visibilidade: 'todos', observacao: 'O 6º dia é produção (diária, no custo do brownie)' },
  { nome: 'Energia do ponto (estimativa)', valorMensal: 300, grupo: 'ponto', visibilidade: 'todos', observacao: 'Trocar pela primeira conta (outubro)' },
  { nome: 'Mentoria', valorMensal: 1200, grupo: 'empresa', visibilidade: 'todos', inicio: '2026-10-01', observacao: 'A partir de out/2026, 14 meses' },
  { nome: 'Combustível — entregas e reposição (estimativa)', valorMensal: 493, grupo: 'empresa', visibilidade: 'todos', observacao: 'Na fase 2, usar os gastos lançados' },
  { nome: 'Parcela do carro', valorMensal: 1636.33, grupo: 'pessoal', visibilidade: 'todos', observacao: 'Faltam 50 parcelas' },
  { nome: 'Seguro do carro', valorMensal: 200, grupo: 'pessoal', visibilidade: 'todos' },
  { nome: 'IPVA 2026 (parcelado)', valorMensal: 295.74, grupo: 'pessoal', visibilidade: 'todos' },
  { nome: 'Cartão Itaú', valorMensal: 67.61, grupo: 'pessoal', visibilidade: 'todos' },
  { nome: 'Casa', valorMensal: 350, grupo: 'pessoal', visibilidade: 'todos' },
  { nome: 'Dívida com 25 pessoas físicas', valorMensal: 1630, grupo: 'divida', visibilidade: 'todos', observacao: 'Média do extrato — levantar o saldo de cada um' },
  { nome: 'DAS do MEI', valorMensal: 82.05, grupo: 'empresa', visibilidade: 'mentor', observacao: 'Área do mentor' },
  { nome: 'Contabilidade', valorMensal: 200, grupo: 'empresa', visibilidade: 'mentor', observacao: 'Área do mentor' },
]

type LinhaRotina = [number, string, string, string, string, TipoTarefa, boolean, string?]

const JANELA = 'Janela da escola'
const JANELA_REST = 'Janela da escola + restaurante'
const MALETA_ESCOLA = 'maleta na porta da escola'
const MALETA_REST = 'maleta na porta e no restaurante da esquina'

// C11 — a rotina da semana (39 tarefas). Atalhos: ver `ATALHOS` em features/checklist.
export const ROTINA: LinhaRotina[] = [
  [1, '06:00', '07:00', JANELA, 'maleta na porta', 'escola', true, 'venda:loja'],
  [1, '07:00', '09:00', 'Mensagem aos pontos', 'quanto vendeu, quanto tem, precisa repor? · contar o estoque', 'mensagem', true, 'mensagens:pontos'],
  [1, '09:00', '11:00', 'Produção', 'com a Maria Eduarda: reposição dos pontos e estoque da semana', 'operacao', true, 'producao'],
  [1, '11:00', '14:00', JANELA_REST, MALETA_REST, 'escola', true, 'venda:loja'],
  [1, '14:00', '17:00', 'Reunião da semana', 'placar, relatório de vendas, zonas dos vendedores', 'operacao', true, 'placar'],
  [1, '17:00', '18:00', JANELA, MALETA_ESCOLA, 'escola', true, 'venda:loja'],
  [1, '18:00', '19:00', 'Separar as caixas', 'da entrega de terça', 'preparo', false, 'estoque'],
  [2, '06:00', '07:00', JANELA, MALETA_ESCOLA, 'escola', true, 'venda:loja'],
  [2, '07:00', '09:00', 'Treino da equipe da loja', 'atendimento, porta da escola, iFood', 'operacao', false],
  [2, '09:00', '11:00', 'Entrega nos pontos', 'contar junto, trocar, repor, receber', 'operacao', true, 'visita'],
  [2, '11:00', '14:00', JANELA_REST, MALETA_REST, 'escola', true, 'venda:loja'],
  [2, '14:00', '17:00', 'Captação presencial', 'salões do polo da semana', 'captacao', false, 'captacao'],
  [2, '17:00', '18:00', JANELA, 'sair às 17h45', 'escola', true, 'venda:loja'],
  [2, '18:00', '21:00', 'Feira do Jardim das Américas', '18h às 21h, na praça, com os vendedores em treino · depois, descanso', 'feira', true, 'venda:feira'],
  [3, '06:00', '07:00', JANELA, MALETA_ESCOLA, 'escola', true, 'venda:loja'],
  [3, '07:00', '09:00', 'Captação à distância', 'WhatsApp, Instagram, ligações', 'captacao', false, 'captacao'],
  [3, '09:00', '11:00', 'Captação de pontos', 'na rua se houver alguém no balcão; se não, de dentro da loja', 'captacao', false, 'captacao'],
  [3, '11:00', '14:00', JANELA_REST, MALETA_REST, 'escola', true, 'venda:loja'],
  [3, '14:00', '16:00', 'Entrevistas', '14h–16h: vendedores e motoristas · 16h–17h: pausa', 'captacao', false, 'captacao'],
  [3, '17:00', '18:00', JANELA, MALETA_ESCOLA, 'escola', true, 'venda:loja'],
  [3, '18:00', '19:00', 'Jantar', 'abastecer as maletas', 'preparo', false, 'estoque'],
  [3, '19:00', '23:00', 'ROTA', '19h às 23h, com vendedor em treino', 'rota', true, 'venda:rota'],
  [4, '06:00', '07:00', JANELA, MALETA_ESCOLA, 'escola', true, 'venda:loja'],
  [4, '07:00', '09:00', 'Mensagem para todos', 'vendedores, motoristas e pontos', 'mensagem', true, 'mensagens:todos'],
  [4, '09:00', '11:00', 'Gatilho de produção', 'estoque não cobre sexta e sábado? reforço com a Maria Eduarda', 'operacao', true, 'estoque:previsao'],
  [4, '11:00', '14:00', JANELA_REST, MALETA_REST, 'escola', true, 'venda:loja'],
  [4, '14:00', '17:00', 'Reposição da rede', 'retirada na loja · captação à distância', 'operacao', false, 'repasse'],
  [4, '17:00', '18:00', JANELA, MALETA_ESCOLA, 'escola', true, 'venda:loja'],
  [5, '06:00', '07:00', JANELA, MALETA_ESCOLA, 'escola', true, 'venda:loja'],
  [5, '07:00', '09:00', 'Conferir maletas', 'estoque e escala da noite', 'preparo', false, 'estoque'],
  [5, '09:00', '11:00', 'Captação à distância', 'leve — a noite é longa', 'captacao', false, 'captacao'],
  [5, '11:00', '14:00', JANELA_REST, MALETA_REST, 'escola', true, 'venda:loja'],
  [5, '17:00', '18:00', JANELA, MALETA_ESCOLA, 'escola', true, 'venda:loja'],
  [5, '18:00', '19:00', 'Escala da noite', 'vendedores nas feiras (Imperial e Jardim das Américas) e nas zonas', 'preparo', false, 'rede'],
  [5, '19:00', '23:00', 'ROTA', '19h às 23h ou mais · os quatro melhores horários da semana', 'rota', true, 'venda:rota'],
  [6, '17:00', '18:00', 'Conferir a rede', 'estoque de vendedores e motoristas', 'preparo', false, 'rede'],
  [6, '18:00', '19:00', 'Preparar as maletas', '', 'preparo', false, 'estoque'],
  [6, '19:00', '00:00', 'ROTA', '19h até meia-noite', 'rota', true, 'venda:rota'],
  [7, '07:00', '10:00', 'Teste da missa da manhã (opcional)', '1 vez por mês, com a maleta', 'rota', false, 'venda:evento'],
]

export const TAREFAS_AVULSAS: Array<{ origem: 'mentor' | 'sistema'; titulo: string; detalhe: string; quando: 'segunda' | 'semana' | 'outubro' }> = [
  {
    origem: 'sistema', quando: 'segunda', titulo: 'Reativar o iFood',
    detalhe: 'Fotos no estilo da marca, cardápio enxuto, preço do app acima do balcão, aberto 11h–14h e 19h–23h',
  },
  { origem: 'mentor', quando: 'semana', titulo: 'Ligar para a gráfica: a etiqueta custa R$ 0,80 ou R$ 0,20?', detalhe: 'Se for R$ 0,20, todo brownie fica R$ 0,60 mais barato' },
  { origem: 'mentor', quando: 'semana', titulo: 'Confirmar a taxa real da maquininha', detalhe: 'Hoje o app usa 2,3%' },
  { origem: 'mentor', quando: 'outubro', titulo: 'Trazer a primeira conta de energia do ponto', detalhe: 'Troca a estimativa de R$ 300' },
  { origem: 'mentor', quando: 'outubro', titulo: 'Levantar o saldo de cada um dos 25 credores', detalhe: 'Hoje a dívida é a média do extrato: R$ 1.630 por mês' },
]

export const ZONAS = [
  { codigo: 'Z1', nome: 'Centro Histórico e Orla', ruas: 'Praça da Mandioca e Travessa Aníbal de Toledo (fechada para carros das 20h às 3h), R. Ricardo Franco, R. Pedro Celestino, Av. Mato Grosso, Orla do Porto, Sesc Arsenal', melhoresNoites: 'quinta a sábado' },
  { codigo: 'Z2', nome: 'Popular, Quilombo, Goiabeiras e Santa Rosa', ruas: 'Praça Popular, Av. São Sebastião, Av. Sen. Filinto Müller, R. Pres. Castelo Branco, Av. Isaac Póvoas, Av. Getúlio Vargas, entorno do Goiabeiras e do Shopping Estação', melhoresNoites: 'quarta a sábado' },
  { codigo: 'Z3', nome: 'Av. do CPA e Norte', ruas: 'Av. do CPA inteira, Av. Brasil (CPA II), Morada do Ouro, Parque das Águas, entorno do Pantanal Shopping', melhoresNoites: 'sexta a domingo' },
  { codigo: 'Z4', nome: 'Sul universitário', ruas: 'Av. Fernando Corrêa da Costa inteira: Jardim das Américas, UFMT e Boa Esperança, Coxipó · Dom Aquino', melhoresNoites: 'segunda a sexta' },
  { codigo: 'Z5', nome: 'Várzea Grande · teste', ruas: 'Eixo do aeroporto e do VG Shopping, Av. da FEB, Centro (Couto Magalhães, sair antes das 21h), Cristo Rei (Univag), Av. Gov. Júlio Campos', melhoresNoites: 'quinta a sábado' },
]

export const POLOS = [
  { codigo: 'A', nome: 'Popular e Goiabeiras' },
  { codigo: 'B', nome: 'Duque de Caxias, Quilombo e Jd. Cuiabá' },
  { codigo: 'C', nome: 'Jd. das Américas, Jd. Itália e Boa Esperança' },
  { codigo: 'D', nome: 'Av. do CPA, Alvorada e Bosque da Saúde' },
  { codigo: 'E', nome: 'Centro, Araés e Dom Aquino' },
  { codigo: 'VG', nome: 'Várzea Grande · teste' },
]

// Referência fixa do placar: loja 15/dia + 5 vendedores + 5 motoristas + 5 pontos.
export const META_REDE_COMPLETA = 440

// Limites da área do mentor: valores a conferir com o contador.
export const LIMITES_FATURAMENTO = [
  { nome: 'Alerta (80% do teto)', valor: 64800 },
  { nome: 'Teto do MEI — conferir com o contador', valor: 81000 },
]
