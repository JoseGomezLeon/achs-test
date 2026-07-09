import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

const errorRate = new Rate('errors')
const latencyHome = new Trend('latency_home', true)

export const options = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'], // p95 < 500 ms
    errors: ['rate<0.01'], // < 1% de errores
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3333'

export default function () {
  const res = http.get(`${BASE_URL}/health`)
  const ok = check(res, {
    'GET /health → 200': (r) => r.status === 200,
    'GET /health < 500ms': (r) => r.timings.duration < 500,
  })
  errorRate.add(!ok)
  latencyHome.add(res.timings.duration)

  sleep(1)
}
