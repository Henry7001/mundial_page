async function test() {
  try {
    const res = await fetch('https://worldcup26.ir/get/teams');
    const data = await res.json();
    const teams = data.teams || data;
    console.log('Total teams:', teams.length);
    const groups = {};
    teams.forEach(t => {
      const g = String(t.groups || t.group || '').toUpperCase().trim();
      if (!groups[g]) groups[g] = [];
      groups[g].push(`${t.id}: ${t.fifa_code} (groups: "${t.groups}", group: "${t.group}")`);
    });
    console.log(JSON.stringify(groups, null, 2));
  } catch (err) {
    console.error(err);
  }
}
test();
