// TẮT ĐỔI NGÔN NGỮ CHO AGENT / SALE.
// Đo theo VAI: Agent và Sale không được còn đường nào chạm tới việc đổi ngôn
// ngữ giao diện; Superadmin / Project Admin thì phải còn nguyên.
const { chromium } = require('/home/claude/menutest/node_modules/playwright');
const http=require('http'),fs=require('fs'),path=require('path');
const APP='/home/claude/g2ui/dev';
const KIEU={'.js':'text/javascript','.css':'text/css','.html':'text/html; charset=utf-8'};
let passed=0; const failures=[];
const check=(n,c,d)=>{ if(c){passed++;console.log('  ✓ '+n);} else {failures.push(n);console.log('  ✗ '+n+(d?'\n      '+d:''));} };
(async()=>{
 const site=http.createServer((req,res)=>{const url=req.url.split('?')[0];
  if(url.startsWith('/api/')){if(url.includes('/events')){res.writeHead(200,{'Content-Type':'text/event-stream'});return res.write(': x\n\n');}res.writeHead(401,{'Content-Type':'application/json'});return res.end('{}');}
  if(/\.(png|jpg|jpeg|webp|ico|svg|mp3|wav|mp4)$/.test(url)){res.writeHead(200,{'Content-Type':'image/svg+xml'});return res.end('<svg xmlns="http://www.w3.org/2000/svg"/>');}
  const ten=url==='/'?'admin.html':url.slice(1);const p=path.join(APP,ten);
  if(p.startsWith(APP)&&fs.existsSync(p)&&fs.statSync(p).isFile()){let c=fs.readFileSync(p,'utf8');
   if(ten==='admin.html')c=c.replace(/<script[^>]*src="https:\/\/[^"]*"[^>]*><\/script>/g,'').replace(/<link[^>]*href="https:\/\/[^"]*"[^>]*>/g,'');
   res.writeHead(200,{'Content-Type':KIEU[path.extname(ten)]||'application/octet-stream'});return res.end(c);}
  res.writeHead(404);res.end('');});
 await new Promise(r=>site.listen(4996,r));
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 const pg=await b.newPage({viewport:{width:1280,height:900}});
 const loi=[]; pg.on('pageerror',e=>loi.push(e.message));
 await pg.goto('http://localhost:4996/',{waitUntil:'domcontentloaded'});await pg.waitForTimeout(2600);

 // Không còn trong DOM, với mọi vai
 const dom=await pg.evaluate(()=>({
   login: Boolean(document.getElementById('login-lang-select')),
   menuAgent: Boolean(document.getElementById('agent-menu-lang-select')),
 }));
 check('ô ngôn ngữ ở form đăng nhập đã gỡ khỏi DOM', !dom.login);
 check('ô ngôn ngữ trong bảng Công cụ của Agent/Sale đã gỡ khỏi DOM', !dom.menuAgent);

 for (const vai of ['agent','sale','superadmin','project_admin','technical']) {
   // Tải lại trang cho MỖI vai: gọi updateAgentHeaderUI nhiều lần liên tiếp với
   // vai khác nhau làm layoutHeaderQuickMenu dời node lung tung — đó là chuyện
   // của bài đo, không phải của sản phẩm.
   await pg.goto('http://localhost:4996/',{waitUntil:'domcontentloaded'});
   await pg.waitForTimeout(1800);
   const ra = await pg.evaluate((r)=>{
     (0, eval)("CURRENT_ADMIN = { id: 1, role: '" + r + "', full_name: 'X', project_id: 'qr-concierge' }");
     updateAgentHeaderUI();
     const w = document.getElementById('admin-lang-selector-wrap');
     const cha = w && w.parentElement;
     return { an: !w || w.classList.contains('hide') || getComputedStyle(w).display === 'none',
       co: Boolean(w), cls: w ? w.className : null, disp: w ? getComputedStyle(w).display : null,
       chaCls: cha ? cha.className : null, chaDisp: cha ? getComputedStyle(cha).display : null };
   }, vai);
   if (vai==='agent' || vai==='sale')
     check(`[${vai}] KHÔNG còn ô đổi ngôn ngữ ở header`, ra.an, 'ô vẫn hiện');
   else
     check(`[${vai}] vẫn giữ ô đổi ngôn ngữ ở header`, !ra.an, JSON.stringify(ra));
 }
 // Máy đã lỡ lưu tiếng khác trước khi tắt tính năng: phải được kéo về tiếng Việt,
 // vì giờ không còn ô nào để người dùng tự đổi lại.
 for (const vai of ['agent','sale','superadmin']) {
   await pg.goto('http://localhost:4996/',{waitUntil:'domcontentloaded'});
   await pg.evaluate(()=>localStorage.setItem('pastie_admin_lang','en'));
   await pg.goto('http://localhost:4996/',{waitUntil:'domcontentloaded'});
   await pg.waitForTimeout(1800);
   const ra = await pg.evaluate((r)=>{
     (0, eval)("CURRENT_ADMIN = { id: 1, role: '" + r + "', full_name: 'X', project_id: 'qr-concierge' }");
     updateAgentHeaderUI();
     return { lang: (0, eval)('currentLang'), luu: localStorage.getItem('pastie_admin_lang'),
              slogan: (document.getElementById('dpq-login-title')?.textContent||'').trim().slice(0,22) };
   }, vai);
   if (vai === 'superadmin')
     check(`[${vai}] máy nhớ tiếng Anh thì GIỮ NGUYÊN tiếng Anh`, ra.lang === 'en', JSON.stringify(ra));
   else
     check(`[${vai}] máy lỡ nhớ tiếng Anh được kéo về tiếng Việt`, ra.lang === 'vi' && ra.luu === 'vi', JSON.stringify(ra));
 }

 check('không phát sinh lỗi JavaScript', loi.length===0, loi.slice(0,3).join(' | '));
 await b.close(); site.close();
 console.log('');
 console.log(failures.length?`HỎNG ${failures.length}:\n  - `+failures.join('\n  - '):`ĐẠT ${passed}/${passed}`);
 process.exit(failures.length?1:0);
})().catch(e=>{console.error('LỖI: '+e.stack);process.exit(1);});
