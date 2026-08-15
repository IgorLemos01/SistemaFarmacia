const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting: máx 100 requisições por janela de 15 min por IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições enviadas. Tente novamente mais tarde.' }
});

// Middleware de compressão, segurança, rate limit e CORS restrito
app.use(limiter);
app.use(compression());
app.use(helmet());
const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS 
  ? process.env.CORS_ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Origem não permitida pelo CORS'));
    }
  },
  credentials: true
}));
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
