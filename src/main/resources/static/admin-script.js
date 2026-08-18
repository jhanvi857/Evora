document.addEventListener("DOMContentLoaded", () => {
    const elements = {
        statsGrid: document.getElementById("stats-grid"),
        dlqBody: document.getElementById("dlq-body"),
        refreshBtn: document.getElementById("refresh-telemetry"),
        retryAllBtn: document.getElementById("dlq-retry-all"),
        purgeBtn: document.getElementById("dlq-purge")
    };

    elements.refreshBtn.addEventListener("click", async () => {
        await Promise.all([loadStats(), loadDLQ()]);
    });

    if (elements.retryAllBtn) {
        elements.retryAllBtn.addEventListener("click", async () => {
            elements.retryAllBtn.disabled = true;
            try {
                await fetch("/jobs/dlq/retry-all", { method: "POST" });
            } finally {
                elements.retryAllBtn.disabled = false;
                await Promise.all([loadStats(), loadDLQ()]);
            }
        });
    }

    if (elements.purgeBtn) {
        elements.purgeBtn.addEventListener("click", async () => {
            if (!confirm("Are you sure you want to purge all jobs from DLQ?")) {
                return;
            }
            elements.purgeBtn.disabled = true;
            try {
                await fetch("/jobs/dlq/purge", { method: "POST" });
            } finally {
                elements.purgeBtn.disabled = false;
                await Promise.all([loadStats(), loadDLQ()]);
            }
        });
    }

    elements.dlqBody.addEventListener("click", async (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement) || !target.matches("button[data-job-id]")) {
            return;
        }

        const jobId = target.dataset.jobId;
        if (!jobId) {
            return;
        }

        target.disabled = true;
        target.textContent = "Retrying...";

        try {
            await fetch(`/jobs/${jobId}/retry`, { method: "POST" });
        } finally {
            await Promise.all([loadStats(), loadDLQ()]);
        }
    });

    setInterval(loadStats, 4000);
    setInterval(loadDLQ, 12000);
    loadStats();
    loadDLQ();

    async function loadStats() {
        try {
            const response = await fetch("/queues/stats");
            if (!response.ok) {
                throw new Error("Failed to load queue stats");
            }

            const raw = await response.json();
            const items = normalizeStats(raw);

            if (items.length === 0) {
                elements.statsGrid.innerHTML = "<p class=\"scenario-note\">No queue stats available yet.</p>";
                return;
            }

            elements.statsGrid.innerHTML = items.map((stat) => {
                const lane = String(stat.queue || "default").toLowerCase();
                const pending = Number(stat.pending_count || 0);
                const completed = Number(stat.completed_last_1h || 0);
                const failed = Number(stat.failed_count || 0);

                return `
                    <article class="metric-card reveal">
                        <div class="metric-top">
                            <p class="metric-lane">${escapeHtml(lane)} lane</p>
                            <span class="metric-pill ${lane}">${escapeHtml(lane)}</span>
                        </div>
                        <p class="metric-nums">${pending}</p>
                        <p class="metric-row">completed 1h: ${completed}</p>
                        <p class="metric-row">failed: ${failed}</p>
                    </article>
                `;
            }).join("");
        } catch (_error) {
            elements.statsGrid.innerHTML = "<p class=\"scenario-note\">Queue stats are currently unavailable.</p>";
        }
    }

    async function loadDLQ() {
        try {
            const response = await fetch("/jobs/dlq");
            if (!response.ok) {
                throw new Error("Failed to load DLQ");
            }

            const jobs = await response.json();
            if (!Array.isArray(jobs) || jobs.length === 0) {
                elements.dlqBody.innerHTML = "<tr><td colspan=\"5\" class=\"empty-cell\">No jobs in DLQ.</td></tr>";
                return;
            }

            elements.dlqBody.innerHTML = jobs.map((job) => {
                const id = String(job.id || "");
                const queue = String(job.queue || "default").toLowerCase();
                const attempts = Number(job.attemptCount || 0);
                const lastError = String(job.lastError || "Unknown error");

                return `
                    <tr>
                        <td class="mono">${escapeHtml(shortId(id))}</td>
                        <td><span class="metric-pill ${escapeHtml(queue)}">${escapeHtml(queue)}</span></td>
                        <td>${attempts}</td>
                        <td>${escapeHtml(lastError)}</td>
                        <td><button class="btn-secondary danger" data-job-id="${escapeHtml(id)}">Retry</button></td>
                    </tr>
                `;
            }).join("");
        } catch (_error) {
            elements.dlqBody.innerHTML = "<tr><td colspan=\"5\" class=\"empty-cell\">DLQ data unavailable.</td></tr>";
        }
    }

    function normalizeStats(raw) {
        if (Array.isArray(raw)) {
            return raw;
        }

        if (raw && typeof raw === "object") {
            return Object.keys(raw)
                .filter((key) => key !== "throughput")
                .map((key) => ({ queue: key, ...raw[key] }));
        }

        return [];
    }

    function shortId(value) {
        if (!value) {
            return "-";
        }
        return value.length > 16 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value;
    }

    function escapeHtml(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;");
    }
});
