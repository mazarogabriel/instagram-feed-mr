# Instagram Feed MR para Notion

Widget em formato de grade do Instagram, conectado à database editorial do Melina Romano Studio.

## Integração Notion utilizada

O projeto consulta a data source [MR] Conteúdos / Publicações e aplica os mesmos critérios da visualização MR na página Mídias Marketing e LAB MR:

- Rede Social contém Instagram.
- Empresa contém a página MR.
- Ordenação por Data de Publicação, da mais recente para a mais antiga.

Campos utilizados:

| Propriedade Notion | Uso no widget |
|---|---|
| Tema | Título da publicação |
| Imagens | Imagem de capa do card |
| Data de Publicação | Data exibida e ordenação |
| Status | Indicador de status no card e no mapa |

O widget é somente de leitura. Ele não altera páginas ou propriedades do Notion.

## Variáveis de ambiente

Configure estas variáveis no painel do Vercel, em Project Settings → Environment Variables:

| Variável | Obrigatória | Descrição |
|---|---|---|
| NOTION_TOKEN | Sim | Token da integração interna do Notion. Não publicar no GitHub. |
| NOTION_DATA_SOURCE_ID | Sim | ID da data source editorial [MR] Conteúdos / Publicações. |
| NOTION_COMPANY_PAGE_ID | Sim | ID da página MR usado no filtro da relação Empresa. |
| NEXT_PUBLIC_PROFILE_USERNAME | Não | Nome de usuário exibido no topo. |
| NEXT_PUBLIC_PROFILE_DISPLAY_NAME | Não | Nome do perfil. |
| NEXT_PUBLIC_PROFILE_BIO | Não | Descrição do perfil. |
| NEXT_PUBLIC_PROFILE_WEBSITE | Não | Site do perfil. |
| NEXT_PUBLIC_PROFILE_AVATAR_URL | Não | URL da imagem de perfil. |
| NEXT_PUBLIC_HIGHLIGHTS | Não | Lista JSON de destaques. |

Os IDs padrão deste repositório já apontam para a data source e para a página MR do workspace. O token precisa ser adicionado manualmente no Vercel.

## Acesso no Notion

A conexão interna precisa ter a capacidade Ler conteúdo e acesso à página/database que contém [MR] Conteúdos / Publicações.

Não são necessárias permissões para editar ou inserir conteúdo, nem acesso a comentários ou dados de usuários.

## Desenvolvimento local

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Preencha NOTION_TOKEN em .env.local antes de testar. Nunca faça commit desse arquivo.

## Publicação

1. Importe este repositório no Vercel.
2. Configure as variáveis de ambiente descritas acima.
3. Faça o deploy.
4. Copie o domínio gerado pelo Vercel.
5. Na página do Notion, use /embed e cole o domínio do widget.

O next.config.ts já permite que o projeto seja incorporado em um iframe do Notion.
