# External Service - SCB

[![CI](https://github.com/gsalviete/external-service/actions/workflows/ci.yml/badge.svg)](https://github.com/gsalviete/external-service/actions/workflows/ci.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=gsalviete_external-service&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=gsalviete_external-service)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=gsalviete_external-service&metric=coverage)](https://sonarcloud.io/summary/new_code?id=gsalviete_external-service)
[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=gsalviete_external-service&metric=bugs)](https://sonarcloud.io/summary/new_code?id=gsalviete_external-service)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=gsalviete_external-service&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=gsalviete_external-service)

Serviço externo para integração de email e pagamentos do Sistema de Compartilhamento de Bicicletas (SCB).

## 📋 Descrição

O External Service é um microserviço responsável por gerenciar integrações externas do SCB, incluindo:

- **Email**: Envio de emails via MailerSend
- **Pagamentos**: Processamento de pagamentos via Stripe
- **Validação de Cartões**: Validação de cartões de crédito usando algoritmo de Luhn

## 🚀 Tecnologias

- **Node.js** 18+
- **NestJS** 11 - Framework progressivo para Node.js
- **TypeScript** 5.7 - Superset tipado de JavaScript
- **PostgreSQL** - Banco de dados relacional
- **TypeORM** - ORM para TypeScript/JavaScript
- **Jest** - Framework de testes
- **MailerSend** - Serviço de envio de emails
- **Stripe** - Gateway de pagamento

## 📦 Pré-requisitos

- Node.js 18 ou superior
- PostgreSQL 14 ou superior
- pnpm (gerenciador de pacotes)

## 🔧 Instalação

```bash
# Clone o repositório
git clone <url-do-repositorio>

# Entre no diretório
cd external-service

# Instale as dependências
pnpm install
```

## ⚙️ Configuração

1. **Crie o arquivo `.env`** na raiz do projeto:

```bash
cp .env.example .env
```

2. **Configure as variáveis de ambiente**:

```env
# Aplicação
NODE_ENV=development
PORT=3001

# Banco de Dados
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/external_service

# MailerSend (opcional para desenvolvimento)
MAILERSEND_API_KEY=your_mailersend_api_key_here
MAILERSEND_FROM_EMAIL=noreply@yourdomain.com
MAILERSEND_FROM_NAME=SCB External Service

# Stripe (opcional para desenvolvimento)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
```

### Obtendo as Credenciais

#### MailerSend
1. Crie uma conta em [mailersend.com](https://www.mailersend.com/)
2. Verifique seu domínio ou use o domínio de teste
3. Vá em **API Tokens** → Gere um novo token
4. Configure as variáveis `MAILERSEND_API_KEY`, `MAILERSEND_FROM_EMAIL` e `MAILERSEND_FROM_NAME`

#### Stripe
1. Crie uma conta em [stripe.com](https://stripe.com/)
2. Vá em **Developers** → **API Keys**
3. Copie a **Secret Key** (começa com `sk_test_...` para teste)
4. Configure a variável `STRIPE_SECRET_KEY`

> **Nota:** O serviço funciona sem MailerSend e Stripe configurados. Emails serão salvos no banco sem envio, e pagamentos usarão lógica mock (90% sucesso).

## 🏃 Executando o Projeto

### Desenvolvimento

```bash
# Modo desenvolvimento com hot-reload
pnpm start:dev

# Servidor estará disponível em http://localhost:3001
```

### Produção

```bash
# Build do projeto
pnpm build

# Executar em produção
pnpm start:prod
```

## 🧪 Testes

```bash
# Testes unitários
pnpm test

# Testes com coverage
pnpm test:cov

# Testes em modo watch
pnpm test:watch

# Linter
pnpm lint
```

### Cobertura de Testes

O projeto mantém **96%+ de cobertura de código** com 59 testes:

```
File                    | % Stmts | % Branch | % Funcs | % Lines
------------------------|---------|----------|---------|--------
All files               |   96.19 |    81.66 |     100 |   95.85
 email.controller.ts    |     100 |      100 |     100 |     100
 email.service.ts       |   95.34 |    78.26 |     100 |   95.12
 payment.controller.ts  |     100 |      100 |     100 |     100
 payment.service.ts     |   94.56 |    83.78 |     100 |   94.38
```

## 📚 Documentação da API

### Email

#### `POST /enviarEmail`
Envia um email via MailerSend e salva no banco de dados.

**Request:**
```json
{
  "email": "usuario@exemplo.com",
  "assunto": "Bem-vindo ao SCB",
  "mensagem": "Obrigado por se cadastrar!"
}
```

**Response:** `200 OK`

### Pagamentos

#### `POST /cobranca`
Cria um pagamento direto.

**Request:**
```json
{
  "valor": 10.50,
  "ciclista": 1
}
```

#### `POST /filaCobranca`
Adiciona um pagamento à fila (status PENDING).

#### `POST /processaCobrancasEmFila`
Processa todos os pagamentos pendentes na fila.

#### `GET /cobranca/:id`
Retorna detalhes de um pagamento.

### Cartão de Crédito

#### `POST /cartaoDeCredito/validarCartaoDeCredito`
Valida um cartão de crédito (algoritmo de Luhn, data de validade, CVV).

**Request:**
```json
{
  "numero": "4532015112830366",
  "nomeTitular": "João Silva",
  "validade": "12/2025",
  "cvv": "123"
}
```

**Response:** `200 OK`
```json
{
  "valid": true
}
```

#### `POST /cartaoDeCredito/realizarCobranca`
Processa uma cobrança no cartão de crédito via Stripe.

**Request:**
```json
{
  "valor": 50.00,
  "ciclista": 1,
  "cardData": {
    "numero": "4532015112830366",
    "nomeTitular": "Pedro Oliveira",
    "validade": "03/2027",
    "cvv": "789"
  }
}
```

### Cartões de Teste (Luhn Válido)

| Número | Bandeira | Resultado |
|--------|----------|-----------|
| 4532015112830366 | Visa | ✅ Válido |
| 5425233430109903 | Mastercard | ✅ Válido |
| 374245455400126 | Amex | ✅ Válido |
| 1234567890123456 | Inválido | ❌ Falha Luhn |

**Formato da Validade:** `MM/YYYY` (ex: `12/2025`)
**CVV:** Qualquer número de 3-4 dígitos

## 📁 Estrutura do Projeto

```
external-service/
├── src/
│   ├── email/
│   │   ├── dto/
│   │   ├── email.controller.ts
│   │   ├── email.entity.ts
│   │   ├── email.module.ts
│   │   └── email.service.ts
│   ├── payment/
│   │   ├── dto/
│   │   ├── payment.controller.ts
│   │   ├── payment.entity.ts
│   │   ├── payment.module.ts
│   │   └── payment.service.ts
│   ├── app.module.ts
│   └── main.ts
├── postman/
│   ├── external-service.postman_collection.json
│   └── README.md
├── .env.example
├── package.json
└── README.md
```

## 🌐 Deploy (Render)

### Variáveis de Ambiente no Render

```
NODE_ENV=production
MAILERSEND_API_KEY=<sua_chave_mailersend>
MAILERSEND_FROM_EMAIL=<seu_email_verificado>
MAILERSEND_FROM_NAME=SCB External Service
STRIPE_SECRET_KEY=<sua_chave_stripe>
```

> **Nota:** `DATABASE_URL` é fornecida automaticamente pelo Render ao conectar um PostgreSQL.

## 📮 Testando com Postman

Coleções Postman completas estão disponíveis em `postman/`:

1. Importe `external-service.postman_collection.json`
2. Configure o ambiente (`local` ou `production`)
3. Execute os requests!

Veja [postman/README.md](postman/README.md) para mais detalhes.

## 🐛 Troubleshooting

### Erro de Conexão com o Banco
**Solução:** Verifique se PostgreSQL está rodando e as credenciais estão corretas.

### Emails não são Enviados
**Causa:** `MAILERSEND_API_KEY` não configurada
**Comportamento:** Emails são salvos no banco mas não enviados (modo fallback)

### Pagamentos Sempre em Mock
**Causa:** `STRIPE_SECRET_KEY` não configurada
**Comportamento:** Usa lógica mock com 90% de sucesso

---

**Status do Build:** ✅ Todos os testes passando (59/59)
**Cobertura:** 96.19%
**Linter:** 0 erros
