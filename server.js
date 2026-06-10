const express = require('express');
const path = require('path');
const client = require('prom-client');

const app = express();
const PORT = process.env.PORT || 3000;

// Prometheus metrics
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});
register.registerMetric(httpRequestsTotal);

// Count requests
app.use((req, res, next) => {
  res.on('finish', () => {
    if (req.path !== '/metrics') {
      httpRequestsTotal.inc({
        method: req.method,
        route: req.path,
        status_code: res.statusCode
      });
    }
  });
  next();
});

// Health check (for Jenkins + Grafana)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', app: 'zomato-app' });
});

// Prometheus scrape endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Serve React production build
app.use(express.static(path.join(__dirname, 'build')));

// React router fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Zomato app running on port ${PORT}`);
  console.log(`Metrics: http://localhost:${PORT}/metrics`);
  console.log(`Health:  http://localhost:${PORT}/health`);
});
