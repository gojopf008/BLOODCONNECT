import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { rankEligibleDonorsWithXGBoost } from './src/lib/xgboostModel.ts';
import { DonorProfile, Requisition } from './src/types/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // JSON Body Parser
  app.use(express.json({ limit: '2mb' }));

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'healthy',
      service: 'BLOODCONNECT AI Backend',
      mlEngine: 'XGBoost GBDT Engine v2.1.0',
      timestamp: new Date().toISOString(),
    });
  });

  // XGBoost Donor Ranking API Endpoint
  app.post('/api/ml/rank-donors', (req, res) => {
    try {
      const { requisition, donors } = req.body as {
        requisition?: Requisition;
        donors?: DonorProfile[];
      };

      if (!requisition || !Array.isArray(donors)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid payload: Requisition object and donors array are required.',
        });
      }

      // Execute server-side XGBoost GBDT ranking
      const rankedDonors = rankEligibleDonorsWithXGBoost(requisition, donors);

      return res.json({
        success: true,
        rankedDonors,
        modelInfo: {
          modelName: 'XGBoost-GBDT-EmergencyDonorRanker',
          version: '2.1.0',
          treesEvaluated: 10,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('XGBoost ranking error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal ML inference error',
      });
    }
  });

  // Development vs Production Serving
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[BLOODCONNECT AI] Server operational at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[BLOODCONNECT AI] Server startup failure:', err);
  process.exit(1);
});
