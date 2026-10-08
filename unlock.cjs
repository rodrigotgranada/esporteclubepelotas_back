const { MongoClient } = require('mongodb'); 
async function run() { 
  const client = new MongoClient('mongodb://localhost:27017/esporte_clube_pelotas'); 
  await client.connect(); 
  const db = client.db(); 
  await db.collection('users').updateOne({ cpf: '111.111.111-11' }, { $set: { failedLoginAttempts: 0, lockoutUntil: null, status: 'ACTIVE', role: 'ADMIN' } }); 
  await client.close(); 
  console.log('User unlocked'); 
} 
run();
