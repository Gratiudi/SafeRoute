fetch('https://saferoute-xp5x.onrender.com/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'test@test.com', password: 'wrong' })
})
.then(r => r.json().catch(() => r.text()).then(body => ({ status: r.status, body })))
.then(console.log)
.catch(console.error);
