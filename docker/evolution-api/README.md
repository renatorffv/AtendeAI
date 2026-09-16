# Deploy da Evolution API (VPS própria)

A Evolution API mantém uma conexão persistente com o WhatsApp (via Baileys) e por isso **não pode rodar no
Vercel** (serverless). Ela deve ficar numa VPS (Hetzner, DigitalOcean, Contabo, etc.) rodando via Docker,
enquanto o painel AtendeAI (Next.js) fica no Vercel e conversa com ela por HTTPS.

## 1. Pré-requisitos na VPS

- Docker + Docker Compose instalados.
- Um domínio (ou subdomínio) apontando para o IP da VPS, ex: `evolution.suaempresa.com.br`.
- Nginx ou Caddy como reverse proxy com HTTPS (Let's Encrypt). Exemplo rápido com Caddy:

```
evolution.suaempresa.com.br {
    reverse_proxy localhost:8080
}
```

## 2. Subir a stack

```bash
cd docker/evolution-api
cp .env.example .env
# edite .env com uma senha de Postgres forte e uma API key forte
docker compose up -d
```

Verifique se subiu: `curl http://localhost:8080` deve responder com informações da API.

## 3. Criar uma instância por loja

Cada loja cliente do AtendeAI precisa de uma *instance* própria na Evolution API (um número de WhatsApp por
loja). Isso é feito automaticamente pelo painel AtendeAI (página **Configurações** da loja) usando a chave
`EVOLUTION_API_KEY` — não é necessário criar manualmente via curl, mas caso queira testar:

```bash
curl -X POST https://evolution.suaempresa.com.br/instance/create \
  -H "apikey: SUA_EVOLUTION_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "loja-exemplo",
    "qrcode": true,
    "webhook": {
      "url": "https://SEU-APP.vercel.app/api/webhook/evolution/ID_DA_LOJA",
      "byEvents": false,
      "events": ["MESSAGES_UPSERT"]
    }
  }'
```

O QR Code para conectar o número de WhatsApp aparece na página **Configurações** do painel — basta escanear
com o WhatsApp da loja.

## 4. Variáveis a configurar no painel AtendeAI (Vercel)

Para cada loja cadastrada em `/admin`:
- `evolutionApiUrl`: `https://evolution.suaempresa.com.br`
- `evolutionApiKey`: a mesma chave definida em `EVOLUTION_API_KEY` do `.env`
- `evolutionInstanceName`: identificador único da instância (ex: `loja-exemplo`)

O painel usa esses três valores para: criar/consultar a instância, exibir o QR Code de conexão, e enviar
mensagens (texto e imagem) de volta para o cliente.

## 5. Backup

O volume `evolution_instances` guarda a sessão autenticada do WhatsApp — faça backup dele (ou você precisará
escanear o QR Code de novo). O Postgres interno (`evolution_postgres_data`) guarda o histórico de mensagens
da própria Evolution API (independente do banco do AtendeAI).
