import { app } from './app';
import { config } from './config';

const port = config.port;

app.listen(port, () => {
  console.log('');
  console.log('  BTC Dynamic DCA Dashboard - Backend');
  console.log(`  http://localhost:${port}/api/health`);
  console.log(`  存储模式: ${config.databaseMode}`);
  console.log('');
});
