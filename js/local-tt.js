export async function loadLocalTTContent() {
    const panel = document.getElementById('localTTContent');
    if (!panel) return;

    try {
        const res = await fetch('data/local_tt.json');
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();

        const sites = (data.darkSkySites || [])
            .map(s => `<li><strong>${s.name}</strong> — ${s.description}</li>`)
            .join('');

        const tips = (data.seasonalTips || [])
            .map(t => `<p><strong>${t.season}:</strong> ${t.tip}</p>`)
            .join('');

        const highlights = (data.southernSkyHighlights || [])
            .map(h => `<li>${h}</li>`)
            .join('');

        panel.innerHTML = `
            <h4>Dark-sky sites</h4>
            <ul>${sites}</ul>
            <h4>Seasonal tips</h4>
            ${tips}
            <h4>Southern sky highlights</h4>
            <ul>${highlights}</ul>
        `;
    } catch (err) {
        console.warn('Could not load local T&T content:', err);
        panel.innerHTML = '<p>Local stargazing tips will appear here when available.</p>';
    }
}
