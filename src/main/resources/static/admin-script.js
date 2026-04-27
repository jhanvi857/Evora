document.addEventListener('DOMContentLoaded', () => {
    const elements = {
        ordersTable: document.getElementById('orders-tbody'),
        refreshBtn: document.getElementById('btn-refresh'),
        replayBtn: document.getElementById('btn-replay'),
        drawer: document.getElementById('timeline-drawer'),
        drawerOrderId: document.getElementById('drawer-order-id'),
        drawerStatus: document.getElementById('drawer-status'),
        eventTimeline: document.getElementById('event-timeline'),
        metrics: {
            total: document.getElementById('metric-total-jobs'),
            rate: document.getElementById('metric-success-rate'),
            failed: document.getElementById('metric-failed-jobs')
        }
    };

    let jobs = [];

    loadJobs();
    setInterval(loadJobs, 5000);

    elements.refreshBtn.onclick = () => loadJobs();
    elements.replayBtn.onclick = async () => {
        elements.replayBtn.disabled = true;
        elements.replayBtn.innerText = 'Replaying...';
        try {
            const r = await fetch('/admin/replay', { method: 'POST' });
            if (r.ok) {
                const res = await r.json();
                alert(`Replayed ${res.eventsReplayed} events successfully.`);
                loadJobs();
            }
        } catch(e) { alert('Replay failed.'); }
        finally {
            elements.replayBtn.disabled = false;
            elements.replayBtn.innerHTML = '<i data-lucide="rotate-ccw"></i> Replay Events';
            lucide.createIcons();
        }
    };

    document.getElementById('close-drawer').onclick = () => elements.drawer.classList.remove('open');

    async function loadJobs() {
        try {
            const r = await fetch('/api/jobs');
            jobs = await r.json();
            renderJobs();
        } catch(e) {}
    }

    function renderJobs() {
        elements.ordersTable.innerHTML = jobs.map(j => `
            <tr>
                <td><span class="mono">${j.jobId}</span></td>
                <td><b>${j.userId}</b></td>
                <td><span class="tiny-tag">${j.jobType}</span></td>
                <td><span class="priority-tag priority-${j.priority.toLowerCase()}">${j.priority}</span></td>
                <td><span class="badge badge-${j.status.toLowerCase()}">${j.status}</span></td>
                <td style="color:var(--text-muted); font-size:12px;">${new Date(j.updatedAt).toLocaleTimeString()}</td>
                <td><button class="btn-icon" onclick="viewTimeline('${j.jobId}')"><i data-lucide="activity"></i></button></td>
            </tr>
        `).join('') || '<tr><td colspan="7" style="text-align:center; padding:40px; color:var(--text-muted);">System queue is empty.</td></tr>';
        
        updateStats(jobs);
        lucide.createIcons();
    }

    function updateStats(data) {
        const total = data.length;
        const success = data.filter(j => j.status === 'COMPLETED').length;
        const failed = data.filter(j => j.status.includes('FAILED')).length;
        const rate = total === 0 ? 0 : Math.round((success / total) * 100);

        elements.metrics.total.innerText = total;
        elements.metrics.rate.innerText = `${rate}%`;
        elements.metrics.failed.innerText = failed;
    }

    window.viewTimeline = async (id) => {
        const job = jobs.find(j => j.jobId === id);
        elements.drawerOrderId.innerText = id;
        elements.drawerStatus.innerText = job.status;
        elements.drawerStatus.className = `badge badge-${job.status.toLowerCase()}`;
        elements.drawer.classList.add('open');
        
        elements.eventTimeline.innerHTML = '<div class="loader">Accessing Event Store...</div>';
        try {
            const r = await fetch(`/api/jobs/${id}/timeline`);
            const evts = await r.json();
            elements.eventTimeline.innerHTML = evts.map(e => `
                <div style="margin-bottom: 20px; font-family: 'JetBrains Mono', monospace;">
                    <div style="color: var(--accent-purple); font-weight: 800; font-size: 14px; margin-bottom: 5px;">EVENT: ${e.aggregateId} [v${e.version}]</div>
                    <pre style="background: #000; color: #00ff00; padding: 15px; border-radius: 8px; font-size: 11px; overflow-x: auto; border: 1px solid #333;">${JSON.stringify(e, null, 2)}</pre>
                </div>
            `).join('');
            lucide.createIcons();
        } catch(e){
            elements.eventTimeline.innerHTML = '<div style="color:var(--accent-red);">Trace failed.</div>';
        }
    }

    lucide.createIcons();
});
