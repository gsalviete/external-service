# External Service - SCB

[![CI](https://github.com/gsalviete/external-service/actions/workflows/ci.yml/badge.svg)](https://github.com/gsalviete/external-service/actions/workflows/ci.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=gsalviete_external-service&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=gsalviete_external-service)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=gsalviete_external-service&metric=coverage)](https://sonarcloud.io/summary/new_code?id=gsalviete_external-service)
[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=gsalviete_external-service&metric=bugs)](https://sonarcloud.io/summary/new_code?id=gsalviete_external-service)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=gsalviete_external-service&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=gsalviete_external-service)

Microsserviço responsável por integrações externas (email e pagamentos) do Sistema de Controle de Bicicletário.

## Stack Tecnológica

- **NestJS** - Framework backend
- **TypeScript** - Linguagem
- **PostgreSQL** - Banco de dados
- **TypeORM** - ORM
- **Jest** - Testes
- **pnpm** - Gerenciador de pacotes

## Instalação

```bash
# Instalar dependências
pnpm install

# Configurar variáveis de ambiente
cp .env.example .env
```

## Execução

```bash
# Desenvolvimento
pnpm start:dev

# Produção
pnpm build
pnpm start:prod
```

## Testes

```bash
# Testes unitários
pnpm test

# Cobertura de testes
pnpm test:cov

# Testes E2E
pnpm test:e2e
```

## Estrutura

```
src/
├── email/          # Módulo de envio de emails
├── payment/        # Módulo de pagamentos
├── app.module.ts
├── app.controller.ts
├── app.service.ts
└── main.ts
```

## API Endpoints

### Email
- `POST /enviarEmail` - Enviar email

### Payment
- `POST /cobranca` - Criar cobrança
- `POST /filaCobranca` - Adicionar cobrança à fila
- `POST /processaCobrancasEmFila` - Processar cobranças pendentes
- `GET /cobranca/:id` - Buscar cobrança
- `POST /validaCartaoDeCredito` - Validar cartão de crédito
