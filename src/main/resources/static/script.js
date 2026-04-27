document.addEventListener('DOMContentLoaded', () => {
    const elements = {
        ordersTable: document.getElementById('orders-tbody'),
        modal: document.getElementById('order-modal'),
        newOrderBtn: document.getElementById('btn-new-order'),
        closeModal: document.getElementById('close-modal'),
        orderForm: document.getElementById('place-order-form'),
        userContext: document.getElementById('user-context'),
        drawer: document.getElementById('timeline-drawer'),
        eventTimeline: document.getElementById('event-timeline'),
        drawerOrderId: document.getElementById('drawer-order-id'),
        drawerStatus: document.getElementById('drawer-status'),
        refreshBtn: document.getElementById('btn-refresh')
    };

    let jobs = [];

    loadJobs();
    setInterval(loadJobs, 5000);

    elements.userContext.onchange = () => renderJobs();
    elements.refreshBtn.onclick = () => loadJobs();
    elements.newOrderBtn.onclick = () => {
        document.getElementById('order-id').value = 'JOB-' + Math.random().toString(36).substr(2, 9).toUpperCase();
        document.getElementById('idempotency-key').value = 'IDEM-' + Date.now();
        elements.modal.style.display = 'flex';
        lucide.createIcons();
    };

    elements.closeModal.onclick = () => elements.modal.style.display = 'none';
    document.getElementById('close-drawer').onclick = () => elements.drawer.classList.remove('open');

    elements.orderForm.onsubmit = async (e) => {
        e.preventDefault();
        const scn = document.getElementById('order-scenario').value;
        const uid = elements.userContext.value;
        
        const req = {
            jobId: document.getElementById('order-id').value,
            userId: uid,
            jobType: document.getElementById('job-type').value,
            priority: document.getElementById('job-priority').value,
            payload: document.getElementById('job-payload').value,
            scenario: scn,
            idempotencyKey: document.getElementById('idempotency-key').value
        };

        const btn = document.getElementById('submit-order');
        btn.disabled = true;
        btn.innerText = 'Submitting to Queue...';

        try {
            const r = await fetch('/api/jobs', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(req)
            });
            if(r.ok) {
                elements.modal.style.display = 'none';
                loadJobs();
            }
        } catch(err) { console.error(err); }
        finally {
            btn.disabled = false;
            btn.innerText = 'Submit to Queue';
        }
    };

    async function loadJobs() {
        try {
            const r = await fetch('/api/jobs');
            jobs = await r.json();
            renderJobs();
        } catch(e) {}
    }

    function renderJobs() {
        const cur = elements.userContext.value;
        const filtered = jobs.filter(j => j.userId === cur);
        elements.ordersTable.innerHTML = filtered.map(j => {
            return `
            <tr>
                <td><span class="mono">${j.jobId}</span></td>
                <td><span class="tiny-tag">${j.jobType}</span></td>
                <td><span class="priority-tag priority-${j.priority.toLowerCase()}">${j.priority}</span></td>
                <td><span class="badge badge-${j.status.toLowerCase()}">${j.status}</span></td>
                <td><span style="font-size:12px; color:var(--text-muted);">${j.currentStep || '-'}</span></td>
                <td style="color:var(--text-muted); font-size:13px;">${new Date(j.updatedAt).toLocaleTimeString()}</td>
                <td><button class="btn-icon" onclick="viewTimeline('${j.jobId}')"><i data-lucide="activity"></i></button></td>
            </tr>
        `; }).join('') || '<tr><td colspan="7" style="text-align:center; padding:40px; color:var(--text-muted);">No jobs in your history.</td></tr>';
        lucide.createIcons();
    }

    window.viewTimeline = async (id) => {
        const job = jobs.find(j => j.jobId === id);
        elements.drawerOrderId.innerText = id;
        elements.drawerStatus.innerText = job.status;
        elements.drawerStatus.className = `badge badge-${job.status.toLowerCase()}`;
        
        elements.drawer.classList.add('open');
        elements.eventTimeline.innerHTML = '<div class="loader">Fetching Event Stream...</div>'; 
        
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
            elements.eventTimeline.innerHTML = '<div style="color:var(--accent-red);">Failed to load timeline.</div>';
        }
    }

    lucide.createIcons();
});
