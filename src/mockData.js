export const generateMockWebhooks = (count = 20) => {
  const statuses = ['SUCCESS', 'FAILED', 'PENDING', 'RETRIYING'];
  const methods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  const sources = ['stripe', 'github', 'shopify', 'custom'];

  return Array.from({ length: count }).map((_, i) => {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const date = new Date(Date.now() - Math.random() * 10000000);
    const id = `req_${Math.random().toString(36).substring(2, 11)}`;
    
    return {
      id,
      vaultId: 'vlt_production_main',
      method: methods[Math.floor(Math.random() * methods.length)],
      source: sources[Math.floor(Math.random() * sources.length)],
      status,
      createdAt: date.toISOString(),
      payload: {
        event: 'payment.succeeded',
        data: {
          amount: Math.floor(Math.random() * 10000),
          currency: 'usd',
          customer: `cus_${Math.random().toString(36).substring(2, 11)}`
        }
      },
      headers: {
        'x-hookvault-id': id,
        'content-type': 'application/json',
        'user-agent': 'Stripe/1.0 (+https://stripe.com/docs/webhooks)'
      },
      attempts: Array.from({ length: status === 'FAILED' ? 5 : (status === 'SUCCESS' ? 1 : Math.floor(Math.random() * 3)) }).map((_, j) => ({
        id: `att_${Math.random().toString(36).substring(2, 11)}`,
        attemptNumber: j + 1,
        responseCode: status === 'SUCCESS' && j === 0 ? 200 : 500,
        responseBody: status === 'SUCCESS' && j === 0 ? '{"ok": true}' : 'Internal Server Error',
        latencyMs: Math.floor(Math.random() * 500) + 50,
        createdAt: new Date(date.getTime() + (j * 10000)).toISOString()
      }))
    };
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};