async function test() {
  const url = 'https://worldcup26.ir/get/teams';
  console.log('Fetching live teams from', url);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP status ' + res.status);
    const data = await res.json();
    const teams = data.teams || data;
    console.log('Total teams received:', teams.length);
    
    // Look up specific teams: 4 (Czechia), 6 (Bosnia), 16 (Turkiye), 11 (Haiti)
    const targetIds = ['4', '6', '11', '16', '23', '35', '42'];
    targetIds.forEach(id => {
      const team = teams.find(t => String(t.id) === String(id));
      if (team) {
        console.log(`Live Team ID ${id}:`, JSON.stringify(team, null, 2));
      } else {
        console.log(`Live Team ID ${id} NOT FOUND!`);
      }
    });
  } catch (err) {
    console.error('Fetch failed:', err.message);
  }
}
test();
