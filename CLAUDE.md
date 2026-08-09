# Sistema Farmácia Couto

Este projeto é estruturado em duas partes principais:
1. **Frontend (Vite / Vanilla JS)**: Interface responsiva integrada ao Supabase para gerenciamento de clientes, manipulações, receitas e exames.
2. **Backend (Node/Prisma placeholder)**: Camada de API de integração estruturada para o banco PostgreSQL.

## Comandos Úteis

### Instalação de Dependências
Instalar em todos os diretórios:
```bash
npm run install:all
```

### Executar em Desenvolvimento Local
Rodar frontend (Vite na porta 5173) e backend concurrently:
```bash
npm run dev
```

### Build para Produção
Compilar frontend utilizando Vite:
```bash
npm run build:frontend
```

### Docker
Iniciar o ambiente completo via Docker Compose:
```bash
docker-compose up --build
```
