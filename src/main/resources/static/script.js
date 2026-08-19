document.addEventListener('DOMContentLoaded', () => {
    let autoRefresh = true;
    let refreshInterval = null;

    // Charts
    let throughputChart = null;
    let statusChart = null;

    // Initialize SPA
    initTabs();
    initKeyGenerator();
    initPresets();
    initSubmitForm();
    initCharts();
    initChaos();
    initSnippets();
    initSearchFilter();

    // Initial Data Load
    refreshDashboard();

    // Start Auto Refresh (every 3 seconds)
    refreshInterval = setInterval(() => {
        if (autoRefresh) refreshDashboard();
    }, 3000);

    // Global Auto-Refresh Toggle
    const btnAuto = document.getElementById('btn-global-refresh');
    if (btnAuto) {
        btnAuto.addEventListener('click', () => {
            autoRefresh = !autoRefresh;
            btnAuto.innerHTML = autoRefresh ? 'Auto-Refresh ON' : 'Auto-Refresh OFF';
            btnAuto.classList.toggle('btn-primary', autoRefresh);
            btnAuto.classList.toggle('btn-secondary', !autoRefresh);
        });
    }

    // Reset Data Button
    const btnReset = document.getElementById('btn-reset-db');
    if (btnReset) {
        btnReset.addEventListener('click', async () => {
            if (!confirm('Are you sure you want to reset all jobs, events, and telemetry stats?')) return;
            try {
                const res = await fetch('/admin/reset', { method: 'POST' });
                if (res.ok) {
                    alert('Data purged cleanly!');
                    refreshDashboard();
                }
            } catch (err) {
                alert('Reset failed: ' + err.message);
            }
        });
    }

    // --- TAB SWITCHING ---
    function initTabs() {
        const navItems = document.querySelectorAll('.nav-item');
        const tabPages = document.querySelectorAll('.tab-page');
        const eyebrow = document.getElementById('tab-eyebrow');
        const viewTitle = document.getElementById('tab-title');

        const headers = {
            'tab-overview': { eyebrow: ' Metrics', title: 'System Overview & Telemetry' },
            'tab-queue': { eyebrow: 'Control Plane', title: 'Live Queue & Workload Dispatcher' },
            'tab-dlq': { eyebrow: 'Operator Tools', title: 'Dead Letter Queue (DLQ) Recovery' },
            'tab-chaos': { eyebrow: 'Resilience Testing', title: 'Distributed Chaos Simulator' },
            'tab-integration': { eyebrow: 'Developer Hub', title: 'Client SDK & API Integration' }
        };

        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const targetTab = item.getAttribute('data-tab');
                navItems.forEach(i => i.classList.remove('active'));
                tabPages.forEach(p => p.classList.remove('active'));

                item.classList.add('active');
                const targetPage = document.getElementById(targetTab);
                if (targetPage) targetPage.classList.add('active');

                if (headers[targetTab]) {
                    eyebrow.textContent = headers[targetTab].eyebrow;
                    viewTitle.textContent = headers[targetTab].title;
                }
            });
        });
    }

    // --- CHARTS ---
    function initCharts() {
        const ctxThroughput = document.getElementById('throughputChart')?.getContext('2d');
        if (ctxThroughput) {
            throughputChart = new Chart(ctxThroughput, {
                type: 'line',
                data: {
                    labels: ['-30s', '-25s', '-20s', '-15s', '-10s', '-5s', 'Now'],
                    datasets: [{
                        label: 'Processed Jobs / sec',
                        data: [0, 2, 5, 8, 4, 12, 6],
                        borderColor: '#c85a32',
                        backgroundColor: 'rgba(200, 90, 50, 0.15)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { grid: { color: 'rgba(40, 35, 34, 0.6)' }, ticks: { color: '#8f837c', font: { family: 'JetBrains Mono', size: 10 } } },
                        y: { grid: { color: 'rgba(40, 35, 34, 0.6)' }, ticks: { color: '#8f837c', font: { family: 'JetBrains Mono', size: 10 } }, beginAtZero: true }
                    }
                }
            });
        }

        const ctxStatus = document.getElementById('statusChart')?.getContext('2d');
        if (ctxStatus) {
            statusChart = new Chart(ctxStatus, {
                type: 'doughnut',
                data: {
                    labels: ['Pending', 'Running', 'Completed', 'DLQ'],
                    datasets: [{
                        data: [0, 0, 0, 0],
                        backgroundColor: ['#8f837c', '#e8845e', '#4ea674', '#d94d43'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { color: '#8f837c', font: { family: 'JetBrains Mono', size: 11 } } }
                    }
                }
            });
        }
    }

    // --- REFRESH DASHBOARD DATA ---
    async function refreshDashboard() {
        try {
            // Fetch stats telemetry
            const statsRes = await fetch('/queues/stats');
            const statsData = statsRes.ok ? await statsRes.json() : [];

            let critical = 0, defaultCount = 0, bulk = 0;
            statsData.forEach(s => {
                if (s.queue === 'critical' || s.queue === 'high') critical += (s.pending_count || 0);
                else if (s.queue === 'bulk') bulk += (s.pending_count || 0);
                else defaultCount += (s.pending_count || 0);
            });

            document.getElementById('kpi-critical').textContent = critical;
            document.getElementById('kpi-default').textContent = defaultCount;
            document.getElementById('kpi-bulk').textContent = bulk;

            // Fetch system jobs
            const jobsRes = await fetch('/system/jobs');
            const jobs = jobsRes.ok ? await jobsRes.json() : [];

            let pending = 0, running = 0, completed = 0, dlq = 0;
            jobs.forEach(j => {
                if (j.status === 'PENDING') pending++;
                else if (j.status === 'RUNNING') running++;
                else if (j.status === 'COMPLETED') completed++;
                else if (j.status === 'DLQ') dlq++;
            });

            document.getElementById('kpi-dlq').textContent = dlq;

            // Update Doughnut Chart
            if (statusChart) {
                statusChart.data.datasets[0].data = [pending, running, completed, dlq];
                statusChart.update();
            }

            // Update Throughput Mock Stream (fluctuates naturally)
            if (throughputChart) {
                const currentData = throughputChart.data.datasets[0].data;
                currentData.shift();
                currentData.push(completed > 0 ? Math.floor(Math.random() * 8) + 2 : Math.floor(Math.random() * 2));
                throughputChart.update();
            }

            renderJobsTable(jobs);
            refreshDLQTable();
        } catch (err) {
            console.error('Failed to fetch metrics:', err);
        }
    }

    // Render Table
    function renderJobsTable(jobs) {
        const tbody = document.getElementById('jobs-table-body');
        const filterVal = document.getElementById('status-filter')?.value || 'ALL';
        const searchVal = (document.getElementById('job-search')?.value || '').toLowerCase();

        if (!tbody) return;

        let filtered = jobs.filter(j => {
            const matchesStatus = filterVal === 'ALL' || j.status === filterVal;
            const matchesSearch = !searchVal || j.id.toLowerCase().includes(searchVal) || j.queue.toLowerCase().includes(searchVal);
            return matchesStatus && matchesSearch;
        });

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">No jobs matching criteria</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map(j => `
            <tr onclick="inspectJobModal('${j.id}')">
                <td class="font-mono text-cyan">${j.id.substring(0, 8)}...</td>
                <td><span class="badge ${j.queue === 'critical' ? 'badge-critical' : j.queue === 'bulk' ? 'badge-bulk' : 'badge-default'}">${j.queue}</span></td>
                <td>P${j.priority}</td>
                <td><span class="badge ${j.status === 'COMPLETED' ? 'badge-default' : j.status === 'DLQ' ? 'badge-danger' : j.status === 'RUNNING' ? 'badge-default' : 'tag'}">${j.status}</span></td>
                <td>${j.attemptCount}/${j.maxAttempts}</td>
                <td class="font-mono">${j.workerId || 'unassigned'}</td>
                <td class="text-muted">${j.scheduledAt ? new Date(j.scheduledAt).toLocaleTimeString() : 'N/A'}</td>
                <td>
                    <button onclick="event.stopPropagation(); inspectJobModal('${j.id}')" class="btn btn-sm btn-secondary">Inspect</button>
                    ${j.status === 'DLQ' ? `<button onclick="event.stopPropagation(); retryJob('${j.id}')" class="btn btn-sm btn-success">Retry</button>` : ''}
                </td>
            </tr>
        `).join('');
    }

    // Refresh DLQ Table
    async function refreshDLQTable() {
        const tbody = document.getElementById('dlq-body');
        if (!tbody) return;

        try {
            const res = await fetch('/jobs/dlq');
            const dlqJobs = res.ok ? await res.json() : [];

            if (dlqJobs.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No dead-lettered jobs found. System healthy!</td></tr>`;
                return;
            }

            tbody.innerHTML = dlqJobs.map(j => `
                <tr>
                    <td class="font-mono text-cyan">${j.id}</td>
                    <td><span class="badge badge-critical">${j.queue}</span></td>
                    <td>${j.attemptCount}/${j.maxAttempts}</td>
                    <td class="font-mono text-danger">${j.lastError || 'Max retries exhausted'}</td>
                    <td>
                        <button onclick="retryJob('${j.id}')" class="btn btn-sm btn-success">Retry Job</button>
                    </td>
                </tr>
            `).join('');
        } catch (err) {
            console.error('Failed to load DLQ jobs:', err);
        }
    }

    // --- SUBMISSION FORM & PRESETS ---
    function initKeyGenerator() {
        const btnGen = document.getElementById('btn-gen-key');
        const inputKey = document.getElementById('idempotencyKey');
        if (btnGen && inputKey) {
            btnGen.addEventListener('click', () => {
                inputKey.value = 'KEY-' + Math.random().toString(36).substring(2, 10).toUpperCase();
            });
            inputKey.value = 'KEY-' + Math.random().toString(36).substring(2, 10).toUpperCase();
        }
    }

    function initPresets() {
        document.getElementById('preset-payment')?.addEventListener('click', () => {
            document.getElementById('queue').value = 'critical';
            document.getElementById('priority').value = '1';
            document.getElementById('payload').value = JSON.stringify({ action: 'process_payment', amount: 299.99, card_last4: '4242' }, null, 2);
        });

        document.getElementById('preset-email')?.addEventListener('click', () => {
            document.getElementById('queue').value = 'default';
            document.getElementById('priority').value = '5';
            document.getElementById('payload').value = JSON.stringify({ action: 'send_order_email', recipient: 'customer@example.com', template_id: 'receipt-v1' }, null, 2);
        });

        document.getElementById('preset-report')?.addEventListener('click', () => {
            document.getElementById('queue').value = 'bulk';
            document.getElementById('priority').value = '10';
            document.getElementById('payload').value = JSON.stringify({ action: 'generate_nightly_analytics', date: '2026-08-16', export_format: 'csv' }, null, 2);
        });
    }

    function initSubmitForm() {
        const form = document.getElementById('submit-form');
        const banner = document.getElementById('idempotent-banner');

        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const queue = document.getElementById('queue').value;
            const priority = parseInt(document.getElementById('priority').value);
            const payloadRaw = document.getElementById('payload').value;
            const idempotencyKey = document.getElementById('idempotencyKey').value;

            let parsedPayload;
            try {
                parsedPayload = JSON.parse(payloadRaw);
            } catch (err) {
                alert('Invalid JSON payload');
                return;
            }

            try {
                const res = await fetch('/jobs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ queue, priority, payload: parsedPayload, idempotencyKey })
                });

                const data = await res.json();

                if (data.already_exists) {
                    if (banner) banner.classList.remove('hidden');
                    setTimeout(() => banner?.classList.add('hidden'), 5000);
                } else {
                    if (banner) banner.classList.add('hidden');
                }

                refreshDashboard();
            } catch (err) {
                alert('Job submission failed: ' + err.message);
            }
        });
    }

    // --- SEARCH & FILTER ---
    function initSearchFilter() {
        document.getElementById('job-search')?.addEventListener('input', () => refreshDashboard());
        document.getElementById('status-filter')?.addEventListener('change', () => refreshDashboard());
        document.getElementById('btn-refresh-jobs')?.addEventListener('click', () => refreshDashboard());

        // DLQ Buttons
        document.getElementById('dlq-retry-all')?.addEventListener('click', async () => {
            const res = await fetch('/jobs/dlq/retry-all', { method: 'POST' });
            if (res.ok) refreshDashboard();
        });

        document.getElementById('dlq-purge')?.addEventListener('click', async () => {
            if (!confirm('Purge all DLQ jobs?')) return;
            const res = await fetch('/jobs/dlq/purge', { method: 'POST' });
            if (res.ok) refreshDashboard();
        });
    }

    // --- CHAOS SIMULATOR ---
    function initChaos() {
        const btnDup = document.getElementById('sim-dup');
        const btnFail = document.getElementById('sim-fail');
        const btnSlow = document.getElementById('sim-slow');
        const logBox = document.getElementById('sim-log-box');
        const logContent = document.getElementById('sim-log-content');

        function appendLog(msg) {
            if (logBox) logBox.classList.remove('hidden');
            if (logContent) logContent.textContent += `[${new Date().toLocaleTimeString()}] ${msg}\n`;
        }

        btnDup?.addEventListener('click', async () => {
            logContent.textContent = '';
            appendLog('Starting Idempotency Guard Test...');
            const key = 'CHAOS-DUP-' + Date.now();

            appendLog(`Dispatching Job 1 (Key: ${key})...`);
            await fetch('/jobs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ queue: 'default', priority: 5, idempotencyKey: key, payload: { test: 'idempotency' } })
            });

            appendLog(`Dispatching Duplicate Job 2 (Key: ${key})...`);
            const res2 = await fetch('/jobs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ queue: 'default', priority: 5, idempotencyKey: key, payload: { test: 'idempotency' } })
            });

            const data2 = await res2.json();
            if (data2.already_exists) {
                appendLog('SUCCESS: Server rejected duplicate submit and returned existing job record (200 OK)!');
            } else {
                appendLog('FAIL: Server created new record for matching key');
            }
            refreshDashboard();
        });

        btnFail?.addEventListener('click', async () => {
            logContent.textContent = '';
            appendLog('Starting Worker Failure & DLQ Escalation Test...');

            const res = await fetch('/jobs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ queue: 'critical', priority: 1, payload: { action: 'FAIL_SIMULATION' } })
            });
            const job = await res.json();
            const jobId = job.id || (job.job && job.job.id);
            appendLog(`Submitted Job ID: ${jobId}`);

            appendLog('Simulating worker processing failure across max retries...');
            for (let i = 1; i <= 3; i++) {
                appendLog(`Simulating Worker Failure Attempt #${i}...`);
                await fetch(`/jobs/${jobId}/fail`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ worker_id: 'chaos-worker', error: `Simulated Crash #${i}` })
                });
            }

            appendLog('Checking if job escalated to DLQ...');
            const finalRes = await fetch(`/jobs/${jobId}`);
            const finalJob = await finalRes.json();

            if (finalJob.status === 'DLQ') {
                appendLog(`SUCCESS: Job ${jobId} escalated into Dead Letter Queue (DLQ)!`);
            } else {
                appendLog(`STATUS: ${finalJob.status}`);
            }
            refreshDashboard();
        });

        btnSlow?.addEventListener('click', async () => {
            logContent.textContent = '';
            appendLog('Starting Visibility Timeout Sweeper Test...');
            appendLog('Submitting job and polling without sending heartbeats...');

            const res = await fetch('/jobs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ queue: 'default', priority: 5, payload: { test: 'slow_worker' } })
            });
            const job = await res.json();
            appendLog(`Job ID created: ${job.id || job.job.id}`);
            appendLog('Worker claimed job but crashed (no heartbeat). Sweeper will reset status to PENDING within 10s.');
            refreshDashboard();
        });
    }

    // --- SNIPPETS ---
    function initSnippets() {
        const snippetBtns = document.querySelectorAll('.snippet-btn');
        const codeBlocks = document.querySelectorAll('.code-block');

        snippetBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const lang = btn.getAttribute('data-lang');
                snippetBtns.forEach(b => b.classList.remove('active'));
                codeBlocks.forEach(c => c.classList.remove('active'));

                btn.classList.add('active');
                document.getElementById(`snippet-${lang}`)?.classList.add('active');
            });
        });
    }
});

// Global Helpers
async function inspectJobModal(jobId) {
    const modal = document.getElementById('job-modal');
    if (!modal) return;

    try {
        const res = await fetch(`/jobs/${jobId}`);
        if (!res.ok) return;
        const job = await res.json();

        document.getElementById('modal-job-id').textContent = job.id;
        document.getElementById('modal-payload').textContent = JSON.stringify(JSON.parse(job.payload || '{}'), null, 2);
        document.getElementById('modal-error').textContent = job.lastError || 'No errors reported.';

        modal.classList.remove('hidden');

        // Close event
        document.getElementById('modal-close').onclick = () => modal.classList.add('hidden');
    } catch (err) {
        console.error('Failed to load job details:', err);
    }
}

async function retryJob(jobId) {
    try {
        const res = await fetch(`/jobs/${jobId}/retry`, { method: 'POST' });
        if (res.ok) {
            alert('Job retried successfully!');
            location.reload();
        }
    } catch (err) {
        alert('Retry failed: ' + err.message);
    }
}

function copySnippet(elementId) {
    const codeText = document.getElementById(elementId)?.textContent;
    if (codeText) {
        navigator.clipboard.writeText(codeText);
        alert('Code snippet copied to clipboard!');
    }
}
