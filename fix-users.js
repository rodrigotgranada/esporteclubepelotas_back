const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  
  await db.collection('users').updateOne(
    { email: 'admin@ecpelotas.com.br' },
    { $set: { isActive: true, status: 'ACTIVE' } }
  );
  
  await db.collection('users').updateOne(
    { email: 'rodrigotgranada@gmail.com' },
    { $set: { cpf: '11111111111', isActive: true, status: 'ACTIVE' } }
  );
  
  console.log('✅ Usuários reativados e CPFs limpos.');
  process.exit(0);
});
