import { BarnhemState } from '../types/barnhem';

/**
 * Generates a self-contained single-file HTML snapshot containing current data & interactive viewer/backup
 * so staff/creator can save or open a single HTML file anywhere.
 */
export function buildStandaloneHtmlExport(state: BarnhemState): string {
  const escapedJson = JSON.stringify(state).replace(/</g, '\\u003c');
  const title = 'Barnhem Super App (All-in-One) · Backup Snapshot';
  return `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
<link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
<style>
  body { font-family: 'Kanit', sans-serif; background: #FFFDF9; color: #3B2F2A; margin: 0; padding: 24px; }
  .card { max-width: 960px; margin: 0 auto; background: #fff; border-radius: 28px; padding: 28px; border: 2px solid #EBD8C3; box-shadow: 0 12px 30px rgba(0,0,0,0.06); }
  h1 { margin: 0 0 8px; font-size: 26px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 14px; }
  th, td { padding: 10px 12px; border-bottom: 1px solid #F3E8DC; text-align: left; }
  th { background: #FFF5BA; }
  .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; background: #D4F0F0; font-size: 12px; }
</style>
</head>
<body>
<div class="card">
  <h1>🏡 ${title}</h1>
  <p>Exported: ${new Date().toLocaleString()} · Members: ${state.members.length} · Shop Items: ${state.shopItems.length}</p>
  <div id="app"></div>
</div>
<script>
  const DATA = ${escapedJson};
  const kids = DATA.members.filter(m => m.role === 'kid');
  const rows = kids.map(k => '<tr><td>' + k.id + '</td><td>' + (k.emoji || '') + ' ' + k.nickname + '</td><td>' + k.fullName + '</td><td>Group ' + k.ageGroup + '</td><td>' + k.stars + ' ⭐</td><td>' + k.lateFineThb + ' THB</td></tr>').join('');
  document.getElementById('app').innerHTML = '<table><thead><tr><th>ID</th><th>ชื่อเล่น</th><th>ชื่อจริง</th><th>กลุ่ม</th><th>ดาวสะสม</th><th>ค่าปรับสาย</th></tr></thead><tbody>' + rows + '</tbody></table>';
</script>
</body>
</html>`;
}
