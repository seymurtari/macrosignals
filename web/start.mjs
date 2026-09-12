process.env.NODE_ENV='production';
const {createApp}=await import('./server.mjs');
const {server}=await createApp();
server.listen(Number(process.env.PORT||3000),'0.0.0.0',()=>console.log('MacroSignals production server ready.'));
