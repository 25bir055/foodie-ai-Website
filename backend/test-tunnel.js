async function test() {
  const url = 'https://alot-heel-examples-michelle.trycloudflare.com/api'
  console.log('Testing health...')
  const h = await fetch(`${url}/health`)
  console.log('Health:', h.status, await h.json())

  console.log('Testing login/signup...')
  const s = await fetch(`${url}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `user_${Date.now()}@foodie.com`,
      password: 'password123',
      displayName: 'Test Phone'
    })
  })
  console.log('Signup status:', s.status, await s.json())
}
test()
