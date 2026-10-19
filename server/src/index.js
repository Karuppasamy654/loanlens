import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import app from './app.js';
import { connectDB } from './config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load root .env or server .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  await connectDB();
  
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 LoanLens API Server running on http://localhost:${PORT}`);
    console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`🔬 Research Models: http://localhost:${PORT}/api/research/models`);
    console.log(`====================================================`);
  });
}

bootstrap().catch(err => {
  console.error('Fatal server startup failure:', err);
  process.exit(1);
});
