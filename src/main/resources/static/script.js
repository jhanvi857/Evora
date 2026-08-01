document.addEventListener("DOMContentLoaded", () => {
    const el = {
        submitForm: document.getElementById("submit-form"),
        queue: document.getElementById("queue"),
        priority: document.getElementById("priority"),
        payload: document.getElementById("payload"),
        idempotencyKey: document.getElementById("idempotencyKey"),
        banner: document.getElementById("idempotent-banner"),
        submitResult: document.getElementById("submit-result"),
        trackId: document.getElementById("track-id"),
        trackBtn: document.getElementById("track-btn"),
        trackResult: document.getElementById("track-result"),
        simDup: document.getElementById("sim-dup"),
        simFail: document.getElementById("sim-fail"),
        simSlow: document.getElementById("sim-slow")
    };

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const newIdempotency = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));

    el.idempotencyKey.value = newIdempotency();

    el.submitForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        await submitFromForm();
    });

    el.trackBtn.addEventListener("click", async () => {
        await trackJob(el.trackId.value.trim());
    });

    el.simDup.addEventListener("click", async () => {
        const key = newIdempotency();
        el.idempotencyKey.value = key;
        await submitFromForm();
        await sleep(220);
        await submitFromForm();
    });

    el.simFail.addEventListener("click", async () => {
        el.submitResult.textContent = "Running failing worker simulation...";
        const job = await submitJob({
            queue: "default",
            priority: 5,
            payload: { scenario: "failing-worker" },
            idempotencyKey: newIdempotency()
        });

        const jobId = resolveJobId(job);
        if (!jobId) {
            el.submitResult.textContent = "Failed to create simulation job.";
            return;
        }

        for (let i = 0; i < 3; i += 1) {
            try {
                const pollRes = await fetch("/jobs/poll?worker_id=fail-worker");
                if (!pollRes.ok) {
                    continue;
                }
                const polled = await pollRes.json();
                if (resolveJobId(polled) === jobId) {
                    await fetch(`/jobs/${jobId}/fail`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ worker_id: "fail-worker", error: "simulated failure" })
                    });
                }
            } catch (_e) {
                break;
            }
        }

        el.trackId.value = jobId;
        await trackJob(jobId);
    });

    el.simSlow.addEventListener("click", async () => {
        el.submitResult.textContent = "Running slow worker simulation...";
        const job = await submitJob({
            queue: "default",
            priority: 5,
            payload: { scenario: "slow-worker" },
            idempotencyKey: newIdempotency()
        });

        const jobId = resolveJobId(job);
        if (!jobId) {
            el.submitResult.textContent = "Failed to create simulation job.";
            return;
        }

        await fetch("/jobs/poll?worker_id=slow-worker");
        alert(`Worker claimed job ${jobId} without completion. Sweeper should requeue after lock timeout.`);

        el.trackId.value = jobId;
        await trackJob(jobId);
    });

    async function submitFromForm() {
        let payloadObj;
        try {
            payloadObj = JSON.parse(el.payload.value);
        } catch (_error) {
            el.submitResult.textContent = "Payload must be valid JSON.";
            return;
        }

        const body = {
            queue: el.queue.value,
            priority: Number(el.priority.value),
            payload: payloadObj,
            idempotencyKey: el.idempotencyKey.value.trim() || newIdempotency()
        };

        const result = await submitJob(body);
        const jobId = resolveJobId(result && (result.job || result));

        if (result && result.already_exists) {
            el.banner.classList.remove("hidden");
            el.submitResult.textContent = `Existing job returned: ${jobId || "unknown"}`;
        } else if (result) {
            el.banner.classList.add("hidden");
            el.submitResult.textContent = `Job created: ${jobId || "unknown"}`;
            if (jobId) {
                el.trackId.value = jobId;
            }
            el.idempotencyKey.value = newIdempotency();
        }
    }

    async function submitJob(payload) {
        try {
            const response = await fetch("/jobs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (!response.ok) {
                el.submitResult.textContent = data.error || "Submission failed.";
                return null;
            }
            return data;
        } catch (_error) {
            el.submitResult.textContent = "Submission failed. Check service availability.";
            return null;
        }
    }

    async function trackJob(id) {
        if (!id) {
            el.trackResult.innerHTML = "<p class=\"scenario-note\">Enter a job ID to track.</p>";
            return;
        }

        el.trackResult.innerHTML = "<p class=\"scenario-note\">Loading event stream...</p>";

        try {
            const [jobRes, eventsRes] = await Promise.all([
                fetch(`/jobs/${id}`),
                fetch(`/jobs/${id}/events`)
            ]);

            if (!jobRes.ok || !eventsRes.ok) {
                el.trackResult.innerHTML = "<p class=\"scenario-note\">Unable to fetch job or events.</p>";
                return;
            }

            const job = await jobRes.json();
            const events = await eventsRes.json();
            const status = String(job.status || "PENDING");

            const items = Array.isArray(events)
                ? events.map((entry) => {
                    const eventType = String(entry.event_type || entry.eventType || "EVENT");
                    const payload = entry.payload ?? entry;
                    const itemClass = eventType.includes("COMPLETE")
                        ? "success"
                        : (eventType.includes("FAIL") || eventType.includes("DLQ") ? "failure" : "");

                    return `
                        <div class="event-item ${itemClass}">
                            <span class="event-type">${eventType}</span>
                            <pre class="event-raw">${escapeHtml(JSON.stringify(payload, null, 2))}</pre>
                        </div>
                    `;
                }).join("")
                : "";

            const badgeClass = status.includes("COMPLETE")
                ? "badge-success"
                : (status.includes("FAIL") || status.includes("DLQ") ? "badge-failed" : "badge-pending");

            el.trackResult.innerHTML = `
                <p style="margin-bottom: 0.8rem;"><span class="badge ${badgeClass}">${escapeHtml(status)}</span></p>
                ${items || '<p class="scenario-note">No events recorded yet.</p>'}
            `;
        } catch (_error) {
            el.trackResult.innerHTML = "<p class=\"scenario-note\">Tracking failed due to a network error.</p>";
        }
    }

    function resolveJobId(job) {
        return job && (job.id || job.jobId || job.job_id || null);
    }

    function escapeHtml(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;");
    }
});
