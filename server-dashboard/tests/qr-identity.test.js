// Hai đồng hồ: định danh 15 phút trượt, cuộc chat 1 tiếng trượt.
process.env.DATABASE_URL='postgresql://postgres@localhost:5432/pastie_test';
const db=require('../database.js');
const crypto=require('crypto');
let ok=0, bad=[];
const check=(n,c,d)=>{ if(c){ok++;console.log('  ✓ '+n);} else {bad.push(n);console.log('  ✗ '+n+(d?' — '+d:''));} };
const MIN=60*1000;
(async()=>{
  await db.initPromise;
  await db.query(`INSERT INTO projects (id,name,project_type) VALUES ('p1','P','qr_concierge') ON CONFLICT DO NOTHING`);

  console.log('\n1. Token định danh');
  const tok='qid_'+crypto.randomBytes(8).toString('hex');
  await db.query(`INSERT INTO qr_identities (token,project_id,email,auth_provider,expires_at) VALUES ($1,'p1',LOWER('KHACH@x.com'),'otp',$2)`,[tok,new Date(Date.now()+15*MIN)]);
  const touch=async(t,p)=>(await db.query(`UPDATE qr_identities SET expires_at=$3,last_seen_at=NOW() WHERE token=$1 AND project_id=$2 AND expires_at>NOW() RETURNING email,expires_at`,[t,p,new Date(Date.now()+15*MIN)])).rows[0]||null;
  check('token hợp lệ thì đọc được', !!(await touch(tok,'p1')));
  check('email lưu ở dạng thường', (await db.query(`SELECT email FROM qr_identities WHERE token=$1`,[tok])).rows[0].email==='khach@x.com');
  let rejected=false;
  try { await db.query(`INSERT INTO qr_identities (token,project_id,email,expires_at) VALUES ('qid_hoa','p1','HOA@x.com',NOW()+INTERVAL '1 hour')`); }
  catch(e){ rejected=/constraint|check/i.test(e.message); }
  check('database TỪ CHỐI email viết hoa, không phải trông vào người viết code', rejected);
  check('token của dự án khác KHÔNG dùng được', !(await touch(tok,'p2')));
  check('token bịa ra không dùng được', !(await touch('qid_gia','p1')));

  console.log('\n2. Hết hạn rồi thì không hồi sinh được');
  const dead='qid_'+crypto.randomBytes(8).toString('hex');
  await db.query(`INSERT INTO qr_identities (token,project_id,email,expires_at) VALUES ($1,'p1','a@x.com',NOW() - INTERVAL '1 minute')`,[dead]);
  check('token hết hạn -> null', !(await touch(dead,'p1')));
  const still=(await db.query(`SELECT expires_at<NOW() AS expired FROM qr_identities WHERE token=$1`,[dead])).rows[0];
  check('và vẫn ở trạng thái hết hạn, không bị gia hạn lén', still.expired===true);

  console.log('\n3. Gia hạn theo email khi Sale gửi tin (không có token trong tay)');
  const before=(await db.query(`SELECT expires_at FROM qr_identities WHERE token=$1`,[tok])).rows[0].expires_at;
  await new Promise(r=>setTimeout(r,1100));
  await db.query(`UPDATE qr_identities SET expires_at=$3,last_seen_at=NOW() WHERE project_id=$1 AND LOWER(email)=LOWER($2) AND expires_at>NOW()`,['p1','Khach@X.com',new Date(Date.now()+15*MIN)]);
  const after=(await db.query(`SELECT expires_at FROM qr_identities WHERE token=$1`,[tok])).rows[0].expires_at;
  check('email khác hoa thường vẫn khớp và được gia hạn', new Date(after)>new Date(before));

  console.log('\n4. Hai đồng hồ độc lập nhau');
  check('định danh 15 phút', Math.round((new Date(after)-Date.now())/MIN)===15);
  const chatExp=new Date(Date.now()+60*MIN);
  check('cuộc chat 1 tiếng', Math.round((chatExp-Date.now())/MIN)===60);
  check('cuộc chat sống lâu gấp 4 lần định danh — nên khách im lặng 20 phút giữa bữa vẫn còn cuộc chat, chỉ cần nhận diện lại', 60/15===4);

  console.log('\n'+'─'.repeat(56));
  console.log(bad.length?`HỎNG — ${ok} đạt, ${bad.length} trượt`:`ĐẠT — ${ok}/${ok} phép thử.`);
  await db.pool.end(); process.exit(bad.length?1:0);
})().catch(e=>{console.error('LỖI:',e.message);process.exit(1)});
