const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Rota de status do servidor
app.get('/status', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'Sistema Farmácia Couto Backend'
  });
});

// Nota de Integração:
// Este backend foi desenhado para uso com Prisma no futuro.
// Atualmente, as operações de leitura/escrita e controle de login são
// efetuadas de forma direta e segura no lado do cliente utilizando o Supabase.

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
