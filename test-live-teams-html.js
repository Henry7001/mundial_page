async function test() {
  try {
    const res = await fetch('https://worldcup26.ir/get/teams');
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Response (first 500 chars):', text.slice(0, 500));
  } catch (err) {
    console.error(err);
  }
}
test();
