const form = document.querySelector('#policy-form');
const status = document.querySelector('#status');
const list = document.querySelector('#policies');
async function refresh() {
  const response = await fetch('/api/policies');
  const data = await response.json();
  list.replaceChildren();
  for (const policy of data.policies) {
    const item = document.createElement('li');
    item.textContent = `#${policy.id} · ${policy.holderName} · ${policy.policyType}`;
    list.append(item);
  }
}
form.addEventListener('submit', async event => {
  event.preventDefault();
  status.textContent = 'Creating policy…';
  try {
    const response = await fetch('/api/policies', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ holderName: document.querySelector('#holder').value, policyType: document.querySelector('#type').value }) });
    const data = await response.json();
    status.textContent = response.ok ? `Policy #${data.id} created.` : data.error;
    if (response.ok) await refresh();
  } catch { status.textContent = 'Unable to connect to the demo service.'; }
});
refresh().catch(() => { status.textContent = 'Unable to load policies.'; });
