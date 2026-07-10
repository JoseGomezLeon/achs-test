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
    http_req_duration: ['p(95)<2000'], // CI runner no es prod — umbral relajado
    errors: ['rate<0.01'],             // < 1% de errores HTTP (solo status != 200)
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3333'

export default function () {
  const res = http.get(`${BASE_URL}/health`)

  // Solo el status HTTP cuenta como error — la latencia es informativa en CI
  const statusOk = check(res, {
    'GET /health → 200': (r) => r.status === 200,
  })
  errorRate.add(!statusOk)
  latencyHome.add(res.timings.duration)

  sleep(1)
}
