#!/usr/bin/env node
/**
 * Sinh dữ liệu thực đơn mẫu cho Agent:
 * - Có hình ảnh phù hợp với từng món ăn
 * - Danh mục không có chữ "seed"
 * - Cho phép nhập email Agent (qua đối số dòng lệnh hoặc prompt nhập tay)
 *
 * Cách dùng:
 *   node scripts/seed-menu.js                                 # Hỏi email hoặc dùng mặc định
 *   node scripts/seed-menu.js someone@example.com             # Nhập email trực tiếp
 *   node scripts/seed-menu.js --agent someone@example.com     # Cú pháp cờ --agent
 *   node scripts/seed-menu.js --clean                         # Xoá thực đơn mẫu
 */

const readline = require('readline');
const path = require('path');
const db = require(path.join(__dirname, '..', 'database.js'));
const {
  seedMenuForAgent,
  cleanSeedMenuForAgent,
  listAvailableAgents,
  findAgentAccount
} = require(path.join(__dirname, '..', 'menu-seed-service.js'));

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : null;
};

// Tìm email từ cờ --agent hoặc tham số vị trí đầu tiên không bắt đầu bằng --
let agentInput = value('agent') || args.find(arg => !arg.startsWith('--')) || null;
const cleanOnly = flag('clean');
const keepOld = flag('keep');

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans.trim());
  }));
}

async function main() {
  await db.initPromise;

  // Nếu chưa truyền email Agent, hiển thị prompt cho người dùng nhập
  if (!agentInput) {
    const agents = await listAvailableAgents();
    console.log('===========================================================');
    console.log('       CÔNG CỤ SINH THỰC ĐƠN MẪU (KÈM HÌNH ẢNH MÓN)        ');
    console.log('===========================================================');
    if (agents.length > 0) {
      console.log('Danh sách Agent hiện có trong hệ thống:');
      agents.forEach(a => {
        console.log(`  • ${a.username.padEnd(30)} | ${a.full_name || 'Chưa đặt tên'} (Dự án: ${a.project_id})`);
      });
      console.log('-----------------------------------------------------------');
    }

    const defaultEmail = agents[0]?.username || 'agenttest@tempmail.id.vn';
    const answer = await askQuestion(`Nhập email tài khoản Agent cần sinh menu [Mặc định: ${defaultEmail}]: `);
    agentInput = answer || defaultEmail;
  }

  console.log(`\nĐang xử lý thực đơn cho Agent: "${agentInput}"...`);

  const result = await seedMenuForAgent({
    agentIdentifier: agentInput,
    cleanOnly,
    keepOld
  });

  console.log('\n-----------------------------------------------------------');
  console.log(`✓ Agent    : ${result.agent.full_name || result.agent.username} (ID: ${result.agent.id})`);
  console.log(`✓ Dự án    : ${result.agent.project_id}`);
  if (cleanOnly) {
    console.log(`✓ Đã dọn   : ${result.cleaned.removedItemsCount} món mẫu và ${result.cleaned.removedCatsCount} danh mục mẫu.`);
  } else {
    console.log(`✓ Danh mục : ${result.categoryCount} nhóm (Tên sạch, không có chữ seed)`);
    console.log(`✓ Món ăn   : ${result.itemCount} món (TẤT CẢ đều có ảnh món ăn chất lượng cao & 4 ngôn ngữ)`);
    console.log(`✓ Thông báo: ${result.message}`);
  }
  console.log('-----------------------------------------------------------\n');

  await db.pool.end();
}

main().catch(async (error) => {
  console.error('\n❌ LỖI:', error.message);
  try { await db.pool.end(); } catch (_) {}
  process.exit(1);
});
