import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
const files = new Map([['/', ['index.html','text/html']], ['/app.js',['app.js','text/javascript']], ['/style.css',['style.css','text/css']], ['/products.json',['products.json','application/json']]]);
createServer(async (req,res) => { const entry = files.get(new URL(req.url,'http://localhost').pathname); if (!entry) { res.writeHead(404).end(); return; } try { const data = await readFile(new URL(`../shop/${entry[0]}`, import.meta.url)); res.writeHead(200, {'content-type': `${entry[1]}; charset=utf-8`}); res.end(data); } catch { res.writeHead(500).end(); } }).listen(4180,'127.0.0.1',()=>console.log('Shop at http://127.0.0.1:4180'));
