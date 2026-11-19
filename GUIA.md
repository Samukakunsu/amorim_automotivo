# Amorim Pintura Automotiva — Sistema de Orçamentos (versão web)

Funciona no notebook, tablet e celular, com os mesmos dados em todos os aparelhos (tempo real).
Tecnologias: React + Vite, Supabase (banco, login, fotos) e Vercel (hospedagem).

Tudo abaixo é feito UMA vez (cerca de 30 minutos). Todos os serviços têm plano gratuito.

## Passo 1 — Criar o banco no Supabase
1. Acesse https://supabase.com, crie uma conta e clique em **New project**. Escolha um nome (ex.: amorim), uma senha forte para o banco (guarde) e a região **South America (São Paulo)**.
2. Quando o projeto ficar pronto, abra **SQL Editor > New query**, cole TODO o conteúdo do arquivo `supabase/schema.sql` e clique em **Run**. Isso cria tabelas, regras de segurança (RLS), pastas de fotos e a lista inicial de serviços/avarias.
3. Em **Project Settings > API**, copie a **Project URL** e a chave **anon public**. Você usa no Passo 3.

## Passo 2 — Criar o login compartilhado
1. No Supabase: **Authentication > Users > Add user > Create new user**.
2. E-mail: `amorim@amorimpintura.app` — Senha: a que vocês vão usar (mínimo 6 caracteres; o Supabase não aceita "9912").
3. Marque **Auto Confirm User**. Em **Authentication > Providers > Email**, desligue o cadastro público (**Allow new users to sign up = off**) para ninguém de fora criar conta.
4. Na tela de entrada do sistema o usuário é só `amorim` (o sistema completa o e-mail sozinho).

## Passo 3 — Publicar na Vercel
1. Coloque a pasta do projeto em um repositório no GitHub (conta em github.com > **New repository** > envie os arquivos). NÃO envie `node_modules` nem `.env`.
2. Em https://vercel.com, entre com o GitHub, **Add New > Project** e escolha o repositório. A Vercel detecta o Vite sozinha.
3. Antes de clicar em Deploy, abra **Environment Variables** e cadastre:
   - `VITE_SUPABASE_URL` = a Project URL
   - `VITE_SUPABASE_ANON_KEY` = a chave anon public
   - `VITE_DOMINIO_LOGIN` = `amorimpintura.app`
4. Clique em **Deploy**. Você recebe um endereço (ex.: amorim.vercel.app). Abra no notebook, tablet e celular e entre com `amorim` e a senha.
5. No celular/tablet: menu do navegador > **Adicionar à tela inicial**, para abrir como aplicativo.

## Passo 4 — Primeiro uso
1. **Configurações**: confira nome, endereço e telefones; envie a **logo** e a **marca d'água** do recibo.
2. **Serviços e valores** e **Avarias**: ajuste as listas.
3. Para trazer os dados do programa antigo: no programa de computador use **Exportar dados + fotos**; aqui, em **Configurações > Importar do programa antigo**, escolha o .zip. Os orçamentos são somados (repetidos são ignorados) e entram como "Entregue".

## Uso diário
- **Painel**: carros na oficina por situação; mude a situação direto no cartão.
- **Orçamentos**: busca por placa/cliente/modelo (em todos os períodos), filtros de mês, ano e situação, exportar Excel, editar, imprimir e excluir (com confirmação).
- **Novo orçamento**: ao digitar uma placa já cadastrada, cliente e veículo são preenchidos. O total é calculado sozinho. No tablet/celular, **Tirar foto** abre a câmera.
- **Imprimir**: abre o recibo A4 em uma página só (com o horário de funcionamento). Use o botão Imprimir ou Ctrl+P.
- O que um aparelho altera aparece nos outros em poucos segundos, sem recarregar.

## Backup (importante)
- **Configurações > Baixar backup completo** gera um .zip com dados, fotos e logo. Faça toda semana e guarde fora do computador (pen drive, Google Drive).
- **Restaurar backup** substitui todos os dados pelo conteúdo do arquivo (pede confirmação).
- Veja no painel do Supabase (Database > Backups) o que o seu plano oferece: no plano gratuito os backups automáticos são limitados e projetos sem uso por muito tempo podem ser pausados. Por isso o backup manual semanal é a sua garantia.

## Segurança
- Só quem tem o login acessa os dados (regras RLS no banco). As fotos ficam em pasta privada; logo e marca d'água em pasta pública (a logo aparece na tela de entrada).
- A chave anon pode ficar no site; nunca use a chave `service_role` aqui.
- Troca de senha: **Configurações > Alterar senha** (vale para todos).

## Testar no computador (opcional)
```
npm install
copie .env.example para .env e preencha
npm run dev
```
Sem o `.env`, o sistema abre em **modo demonstração** (começa vazio, guarda só no navegador; usuário amorim, senha 9912).

## Estrutura
- `supabase/schema.sql` — tabelas, RLS, storage, função de salvar orçamento.
- `src/lib/` — acesso aos dados (Supabase e demonstração), backup, Excel.
- `src/pages/` — telas. `src/styles.css` — identidade visual.
