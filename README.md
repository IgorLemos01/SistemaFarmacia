# Sistema Farmácia Couto 🏥

Sistema de Gestão para Farmácia de Manipulação, Orçamentos, Exames e Clientes.

---

## 🚀 Arquitetura do Projeto

O projeto é estruturado em:

- **Frontend (`frontend/`)**: Interface SPA moderna desenvolvida em Vanilla JS com Vite. Integrada diretamente ao Supabase para autenticação (Supabase Auth), persistência de dados em tempo real e cache local.
- **Backend (`backend/`)**: Servidor Node.js + Express com Prisma ORM, preparado para microsserviços e integração direta com banco PostgreSQL.
- **Banco de Dados**: PostgreSQL gerenciado via Supabase (produção) ou Docker (desenvolvimento local).

---

## 🛠️ Requisitos Préveis

- **Node.js**: v18+ ou v20+
- **npm**: v9+
- **Docker & Docker Compose** (opcional, para ambiente de desenvolvimento local completo)

---

## ⚙️ Configuração do Ambiente Local

### 1. Clonar o Repositório

```bash
git clone https://github.com/IgorLemos01/SistemaFarmacia.git
cd SistemaFarmacia
```

### 2. Instalar Dependências

Instala dependências na raiz, frontend e backend:

```bash
npm run install:all
```

### 3. Configurar Variáveis de Ambiente

#### Frontend (`frontend/.env`):
Copie o exemplo e preencha com as credenciais do seu projeto Supabase:

```bash
cp frontend/.env.example frontend/.env
```

Conteúdo de `frontend/.env`:
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_KEY=sua-anon-key-aqui
```

#### Backend / Docker (`.env.docker`):
```bash
cp .env.docker.example .env.docker
```

---

## 💻 Executando em Desenvolvimento

### Frontend + Backend (Simultâneo)
```bash
npm run dev
```
O Frontend estará acessível em `http://localhost:5173`.

### Docker Compose (Ambiente completo)
```bash
docker-compose up --build
```

---

## 📦 Build para Produção

Para gerar os arquivos estáticos de produção do frontend:

```bash
npm run build:frontend
```
Os arquivos otimizados serão gerados em `frontend/dist/`.

---

## 🔒 Segurança & Políticas RLS

- **Variáveis de Ambiente**: Credenciais sensíveis são lidas exclusivamente de arquivos `.env` / Vercel Environment Variables.
- **Row Level Security (RLS)**: Aplique as políticas SQL contidas em `supabase/policies.sql` no seu console do Supabase para garantir a segurança dos dados.
- **Headers HTTP**: Configurados via `vercel.json` e `helmet` (Express).

---

## 📄 Licença

Projeto privado — Farmácia Couto © 2025/2026. Todos os direitos reservados.