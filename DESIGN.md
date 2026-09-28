---
version: alpha
name: Old Brownies — Balcão Noturno
description: App de operação da Old Brownies. Preto e osso, anos 20, feito para ler na rua, à noite, com uma mão.
colors:
  tinta: "#0B0B0A"
  carvao: "#151513"
  grafite: "#1F1F1C"
  fio: "#3A3833"
  osso: "#F1ECE0"
  cinza: "#A8A295"
  verde: "#5BD48A"
  vermelho: "#FF5A4E"
  ambar: "#F2B544"
typography:
  marca: { fontFamily: Cinzel, fontSize: 13px, fontWeight: 700, letterSpacing: 0.32em }
  titulo-tela: { fontFamily: Cinzel, fontSize: 24px, fontWeight: 700, lineHeight: 1.15, letterSpacing: 0.04em }
  titulo-secao: { fontFamily: Cinzel, fontSize: 13px, fontWeight: 700, letterSpacing: 0.18em }
  numero-hero: { fontFamily: Josefin Sans, fontSize: 40px, fontWeight: 700, lineHeight: 1, fontFeature: "tnum" }
  numero-md: { fontFamily: Josefin Sans, fontSize: 24px, fontWeight: 700, lineHeight: 1.1, fontFeature: "tnum" }
  corpo: { fontFamily: Josefin Sans, fontSize: 17px, fontWeight: 600, lineHeight: 1.45 }
  corpo-sm: { fontFamily: Josefin Sans, fontSize: 15px, fontWeight: 600, lineHeight: 1.4 }
  rotulo: { fontFamily: Josefin Sans, fontSize: 13px, fontWeight: 700, letterSpacing: 0.08em }
  botao: { fontFamily: Josefin Sans, fontSize: 18px, fontWeight: 700, letterSpacing: 0.04em }
rounded:
  deco: 2px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  toque: 56px
components:
  botao-primario: { backgroundColor: "{colors.osso}", textColor: "{colors.tinta}", rounded: "{rounded.deco}", height: 56px }
  botao-secundario: { backgroundColor: "{colors.tinta}", textColor: "{colors.osso}", rounded: "{rounded.deco}", height: 56px }
  cartao: { backgroundColor: "{colors.carvao}", rounded: "{rounded.deco}", padding: 16px }
  moldura: { backgroundColor: "{colors.carvao}", rounded: "{rounded.deco}", padding: 16px }
---

# Old Brownies — Balcão Noturno

## Overview
Ferramenta de trabalho, não vitrine. O Gabriel lança vendas no carro, na feira e no semáforo,
de noite, com uma mão e sem sinal. O Erick lê a empresa de longe. A Maria Eduarda usa no balcão.
A identidade vem da marca: preto e branco, anos 20, art déco. O "enfeite" é só tipográfico e de filete,
sem nada que tire atenção do número.

## Colors
- **Tinta (#0B0B0A):** fundo. Tema escuro por padrão: não ofusca à noite.
- **Carvão / Grafite:** superfícies, em dois degraus de elevação, sem sombra.
- **Fio (#3A3833):** filetes e bordas. O art déco mora nos filetes duplos.
- **Osso (#F1ECE0):** texto e a ação principal da tela. É o único "destaque" da marca.
- **Cinza (#A8A295):** texto secundário (contraste 7,8:1 sobre tinta).
- **Verde / Vermelho / Âmbar:** só estado. Verde = em dia ou meta batida, vermelho = abaixo do custo,
  vencido ou parado, âmbar = atenção (vencendo, sem visita). Estado não segue a marca.

## Typography
Cinzel (caixa-alta natural, romana) nos títulos e na marca. Josefin Sans no texto, sempre em 600 ou 700,
porque o 400 é fino demais para tela escura. Números com `tabular-nums`, alinhados à direita nas tabelas.

## Layout
Coluna única, máximo de 30rem, margem de 16px. Navegação inferior fixa por perfil, com botão "+ Venda"
sempre à mão para o dono. Toda ação primária fica no terço inferior da tela, onde o polegar alcança.

## Elevation & Depth
Plano. Profundidade por tom (tinta → carvão → grafite) e por moldura dupla (borda + contorno com 3px de folga),
reservada ao número mais importante da tela.

## Shapes
Cantos de 2px, retos e secos como uma caixa de brownie. Nada de pílula.

## Components
- **Botões:** altura mínima de 56px, texto em 18px. Primário em osso, secundário vazado.
- **Stepper (− n +):** alvos de 56px, número grande no meio.
- **Seção:** título Cinzel em 13px com filete duplo à direita.
- **Barra de meta:** trilho em fio, preenchimento osso, verde quando bate a meta.
- **Folha (bottom sheet):** formulários curtos sobem de baixo, sem trocar de tela.

## Do's and Don'ts
- Faça: um número grande por bloco, com rótulo curto em caixa-alta.
- Faça: feedback de toque por escala (0,98), sem animação decorativa; respeite `prefers-reduced-motion`.
- Não faça: roxo, gradiente, blur, sombra difusa, ícone decorativo.
- Não faça: cor da marca para indicar estado, nem vermelho fora de alerta.
