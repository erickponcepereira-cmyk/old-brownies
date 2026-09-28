# Old Brownies — app (front-end, fase 1)

PWA de gestão da Old Brownies: venda em 3 toques, repasse a parceiro, visita ao ponto, produção e estoque,
rede, placar da semana, checklist da rotina e painel do mentor. Funciona sem internet.

Especificação: *Projeto do app, versão 2 (26/09/2026)*. Salve o texto das partes A, B e C em
`docs/ESPECIFICACAO.md`: é a referência para as próximas etapas.

## Rodar

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # motor de cálculo + testes dourados (B8)
npm run build      # tipos + build de produção com service worker
npm run preview    # testa o PWA (instalável, offline)
```

Sem variáveis de ambiente, o app roda **só no aparelho**: tudo fica no IndexedDB e entra na fila de envio.
Para ligar a nuvem, copie `.env.example` para `.env` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
A fila sobe inteira, sem duplicar.

No modo local dá para testar os três perfis no mesmo aparelho: crie a empresa como dono, gere convites
em Mais → Convites e use "Trocar de perfil" → "Tenho um código de convite".

## Estrutura

```
src/lib/motor/        funções puras da seção B5 + testes Vitest (dourados.test.ts reproduz a B8)
src/lib/db/           modelo B3 (tipos.ts), banco Dexie, sementes da parte C, criação da empresa
src/lib/sync/         gravar (Dexie + outbox na mesma transação), sincronização, nuvem, login
src/lib/dados/        leituras ao vivo, cadastros + tabela de custos, indicadores das telas
src/lib/operacoes/    lançamentos: venda, repasse, visita, produção, estoque, checklist, mentor, acesso
src/features/<tela>/  telas da B7
src/components/       casca (navegação por perfil, indicador de sync) e componentes base
DESIGN.md             tokens e regras visuais
```

Regras que o código garante:
- Estoque = soma dos movimentos. Venda desfeita gera estorno, nunca edita movimento.
- O custo unitário fica congelado em cada item de venda.
- Toda gravação vai para o Dexie **e** para a fila; ids gerados no aparelho; exclusão lógica.
- Dia comercial vira às 4h (America/Cuiaba).
- Permissões da B4 checadas também no aparelho (`sync/gravar.ts`). Quem garante de verdade é o RLS da nuvem.

## Contrato esperado do backend (Supabase / Lovable Cloud)

O front já fala com ele. Falta criar do lado do servidor:

1. Uma tabela por entidade, em snake_case (`receitaItens` → `receita_itens`, `updatedAt` → `updated_at`),
   com os campos da B3 e `id uuid pk, empresa_id, created_at, updated_at, updated_by, deleted_at`.
   `empresas.empresa_id = id`. Campos de lista (`composicao`, `itens`, `noites`, `limites_faturamento`) em `jsonb`.
2. Trigger que grava `updated_at = now()` em todo insert/update: o recebimento usa esse cursor.
3. RLS da B4, por `empresa_id` e papel do membro. `membros` legível pelo próprio `user_id`.
4. Função `aceitar_convite(p_codigo text, p_nome text)` que valida o código, cria o membro e devolve
   `{ empresa_id, membro_id, papel, user_id }`.
5. A área privada do mentor (`notas_mentor`, `configs_mentor`, `custos_fixos` com `visibilidade = 'mentor'`)
   invisível para dono e equipe no RLS. No modo local, esses dados existem no aparelho.

## Fora desta entrega

Fase 2 e 3 do roteiro: compras e fichas técnicas editáveis, gastos e dívida, captação, feiras,
semana de treino e kit do parceiro, relatório da semana, simulador (a função já existe em `motor/simulador.ts`
e está testada), projeção e alertas inteligentes, portal do parceiro.
As mensagens prontas de WhatsApp (C16) já estão ligadas aos atalhos de segunda e quinta.
