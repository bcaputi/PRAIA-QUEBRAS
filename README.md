# Praia — Registro de Perdas & Produção

App para os funcionários lançarem, pelo celular, as **quebras/perdas do dia**, o que foi
usado no **buffet**, o que foi usado na **refeição dos funcionários** e a **produção**
(com rendimento, insumos e responsável). Você vê tudo num **dashboard de custos** e num
**relatório** pronto para dar baixa no Colibri.

Mesma base de itens e mesmos custos do `Controle_Estoque_Praia_INTEGRADO` (475 itens).
Mesmo esquema de deploy do app de contagem: **Next.js + Neon (Postgres) + Vercel**.

---

## Abas

| Aba | O que faz |
|-----|-----------|
| 💥 **Quebras** | Busca o item, quantidade, **motivo da perda**. O responsável é preenchido automático pelo PIN. Custo calculado automático. |
| 🍽️ **Buffet** | Itens usados no buffet (quantidade). |
| 👥 **Refeição Func.** | Itens usados na refeição dos funcionários. |
| 🍳 **Produção** | Produto produzido, **rendimento**, **itens usados** (insumos) e responsável automático. Mostra custo total e custo por unidade. |
| 📊 **Dashboard** | Custo de perdas, buffet, refeição e produção no período; top itens e perdas por motivo. |
| 📋 **Relatório** | Resumo por item (código + qtd + custo) e **exporta CSV** para dar baixa no Colibri. |
| ⚙️ **Funcionários** | (só admin) Cadastra funcionários com PIN, ativa/desativa, troca PIN e define quem é admin. |

## Login por PIN
- Cada funcionário entra digitando o **PIN** dele — sem digitar nome, sem erro de digitação.
- Todo lançamento fica **carimbado com o nome de quem estava logado** (responsabilidade).
- O celular lembra quem entrou; o botão **"trocar"** no topo troca de usuário.
- **Primeiro acesso:** entre com o PIN **`1234`** (admin "Brunno"). Vá em ⚙️ Funcionários,
  cadastre a equipe e **troque esse PIN** (botão "PIN" ao lado do seu nome).
- Quem for marcado como **admin** vê o Dashboard, o Relatório e a aba Funcionários.

---

## Como colocar no ar (passo a passo)

### 1. Criar o banco no Neon
1. Entre no [console.neon.tech](https://console.neon.tech) (você já tem conta do app de contagem).
2. Crie um projeto novo (região **São Paulo / sa-east-1**), ex.: `praia-quebras`.
3. Abra o **SQL Editor** e:
   - cole todo o conteúdo de **`db/schema.sql`** → Run.
   - depois cole todo o **`db/seed_items.sql`** → Run. (carrega os 475 itens)
4. Em **Connection Details**, copie a **connection string** (começa com `postgresql://...`).

### 2. Subir no GitHub
```bash
cd praia-quebras
git init
git add .
git commit -m "app de perdas e producao"
git branch -M main
git remote add origin https://github.com/bcaputi/praia-quebras.git   # crie esse repo antes
git push -u origin main
```

### 3. Deploy no Vercel
1. [vercel.com/new](https://vercel.com/new) → **Import** o repo `praia-quebras`.
2. Em **Environment Variables**, adicione:
   - **Name:** `DATABASE_URL`
   - **Value:** a connection string do Neon (a mesma que você copiou).
3. **Deploy**. Pronto — o link fica fixo (ex.: `praia-quebras.vercel.app`) e você manda pros
   funcionários. Vários celulares acessam ao mesmo tempo e tudo cai no mesmo banco.

> Dica: o Neon tem integração direta no Vercel (**Add Integration → Neon**). Se usar, ele já
> cria a variável `DATABASE_URL` sozinho e você pula a parte manual.

### Rodar no seu PC (opcional, pra testar antes)
```bash
cp .env.example .env.local     # cole a connection string do Neon dentro
npm install
npm run dev                    # abre em http://localhost:3000
```

---

## Atualizar a lista de itens depois
Quando o cadastro mestre mudar, é só gerar um `seed_items.sql` novo e rodar de novo no SQL
Editor do Neon — o `ON CONFLICT` atualiza nome/custo dos itens existentes sem apagar seus
lançamentos.

---

## Sugestões para deixar melhor (já pensadas, dá pra ativar)
- **PIN por funcionário** em vez de digitar o nome — some erro de digitação e trava quem lança.
- **Foto opcional** na quebra (comprovação do que foi descartado).
- **Baixa automática no Colibri**: hoje o relatório gera CSV; se o Colibri aceitar import, dá
  pra formatar o CSV no layout exato dele.
- **Meta/alerta de perda**: avisar quando a perda do mês passar de X% do custo.
- **Fechamento diário travado**: depois que você "fecha o dia", ninguém edita mais aquele dia.

Me chama que eu ativo qualquer uma dessas.
