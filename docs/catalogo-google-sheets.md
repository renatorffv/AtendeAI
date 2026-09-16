# Catálogo de produtos via Google Sheets

O catálogo de cada loja fica numa planilha do Google Sheets. O AtendeAI sincroniza essa planilha para o banco
de dados periodicamente (1x por dia, ou a cada 15 minutos se a conta Vercel estiver no plano Pro) e também sob demanda (botão **Sincronizar agora** na página
**Catálogo** do painel). O Claude consulta o catálogo já sincronizado ao responder clientes.

## 1. Layout da planilha

Crie uma planilha com uma aba chamada **Produtos** e este cabeçalho na primeira linha (nessa ordem exata):

| SKU | Nome | Categoria | Descrição | Cores | Tamanhos | Estoque por Tamanho | Preço | Link Imagem 1 | Link Imagem 2 | Link Imagem 3 | Ativo |
|-----|------|-----------|------------|-------|----------|----------------------|-------|----------------|----------------|----------------|-------|

Regras de preenchimento:

- **SKU**: código único do produto (ex: `BLU-001`). Não repita entre linhas.
- **Nome**: ex: "Blusa Floral Manga Longa".
- **Categoria**: ex: "Blusa", "Saia", "Vestido", "Calça".
- **Descrição**: frase curta que ajuda o Claude a encontrar produtos parecidos (ex: "blusa estampa floral,
  tecido leve, manga longa, ideal para o dia a dia").
- **Cores**: separadas por vírgula (ex: "Azul, Rosa, Branco").
- **Tamanhos**: separados por vírgula (ex: "P,M,G,GG").
- **Estoque por Tamanho**: formato `TAMANHO:QUANTIDADE` separado por vírgula (ex: `P:3,M:5,G:2,GG:0`). Um
  tamanho com `0` é tratado como sem estoque.
- **Preço**: apenas número (ex: `129.90`).
- **Link Imagem 1/2/3**: link da foto do produto (veja o passo a passo abaixo). Pelo menos 1 imagem é
  recomendada — o bot envia a foto junto da resposta no WhatsApp.
- **Ativo**: `SIM` ou `NAO`. Produtos `NAO` são ignorados pelo bot (não aparecem no estoque nem são
  sugeridos), mas continuam na planilha para reativar depois.

## 2. Como colocar as imagens (passo a passo)

1. Crie uma pasta no Google Drive só para as fotos dos produtos.
2. Suba a foto do produto nessa pasta.
3. Clique com o botão direito na foto → **Compartilhar** → mude o acesso para **"Qualquer pessoa com o
   link"** (papel: Leitor).
4. Clique em **Copiar link**. Vai ficar parecido com:
   `https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrSt/view?usp=sharing`
5. Cole esse link direto na coluna "Link Imagem 1" da planilha — **não precisa converter manualmente**. O
   AtendeAI converte automaticamente esse formato para o link direto de imagem que o WhatsApp consegue
   exibir.
6. Repita para "Link Imagem 2" e "Link Imagem 3" se quiser mostrar mais ângulos/variações.

> Alternativa: se preferir, você também pode usar diretamente um link de imagem já público de qualquer outro
> serviço (ex: link de imagem hospedada em outro site) — nesse caso o link é usado como está, sem conversão.

## 3. Conectar a planilha ao AtendeAI

1. No Google Cloud Console, ative a **Google Sheets API** no projeto da sua conta de serviço.
2. Compartilhe a planilha com o e-mail da conta de serviço usada pelo AtendeAI (você encontra esse e-mail nas
   variáveis de ambiente do projeto, `GOOGLE_SERVICE_ACCOUNT_EMAIL`), com permissão de **Leitor**.
3. Copie o **ID da planilha** (está na URL, entre `/d/` e `/edit`):
   `https://docs.google.com/spreadsheets/d/ESTE_TRECHO_AQUI/edit`
4. Cole esse ID no campo **Google Sheet ID** da página **Configurações** da loja, no painel AtendeAI.
5. Clique em **Sincronizar agora** na página **Catálogo** para importar os produtos pela primeira vez.

A partir daí, qualquer edição na planilha (novo produto, mudança de estoque, novo preço) é refletida no bot
automaticamente na próxima sincronização automática (1x por dia) ou, se quiser ver a mudança na hora, clicando
no botão **Sincronizar agora**.
