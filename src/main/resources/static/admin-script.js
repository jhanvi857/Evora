document.addEventListener('DOMContentLoaded', () => {
    const elements = {
        ordersTable: document.getElementById('orders-tbody'),
        refreshBtn: document.getElementById('btn-refresh'),
        drawer: document.getElementById('timeline-drawer'),
        drawerOrderId: document.getElementById('drawer-order-id'),
        drawerStatus: document.getElementById('drawer-status'),
        eventTimeline: document.getElementById('event-timeline'),
        metrics: {
            total: document.getElementById('metric-total-orders'),
            revenue: document.getElementById('metric-revenue'),
            rate: document.getElementById('metric-success-rate')
        }
    };

    let orders = [];

    loadOrders();
    setInterval(loadOrders, 5000);

    elements.refreshBtn.onclick = () => loadOrders();
    document.getElementById('close-drawer').onclick = () => elements.drawer.classList.remove('open');

    async function loadOrders() {
        try {
            const r = await fetch('/api/orders');
            orders = await r.json();
            renderOrders();
        } catch(e) {}
    }

    function renderOrders() {
        elements.ordersTable.innerHTML = orders.map(o => `
            <tr>
                <td><span class="mono">${o.orderId}</span></td>
                <td><b>${o.customerId}</b></td>
                <td><div style="max-width:200px; white-space:nowrap; overflow:hidden;">
                    ${(o.items||[]).map(i=>`<span class="tiny-tag">${i.quantity}x ${i.sku}</span>`).join('')}
                </div></td>
                <td class="mono" style="font-weight:700;">$${(o.totalAmount||0).toFixed(2)}</td>
                <td><span class="badge badge-${o.status.toLowerCase()}">${o.status}</span></td>
                <td style="color:var(--text-muted); font-size:12px;">${new Date(o.updatedAt).toLocaleTimeString()}</td>
                <td><button class="btn-icon" onclick="viewTimeline('${o.orderId}')"><i data-lucide="map-pin"></i></button></td>
            </tr>
        `).join('') || '<tr><td colspan="7" style="text-align:center; padding:40px; color:var(--text-muted);">System ledger is empty.</td></tr>';
        
        updateStats(orders);
        lucide.createIcons();
    }

    function updateStats(data) {
        const total = data.length;
        const revenue = data.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        const success = data.filter(o => ['SHIPPED', 'CONFIRMED', 'DELIVERED'].includes(o.status)).length;
        const rate = total === 0 ? 0 : Math.round((success / total) * 100);

        elements.metrics.total.innerText = total;
        elements.metrics.revenue.innerText = `$${revenue.toFixed(2)}`;
        elements.metrics.rate.innerText = `${rate}%`;
    }

    window.viewTimeline = async (id) => {
        const order = orders.find(o => o.orderId === id);
        elements.drawerOrderId.innerText = id;
        elements.drawerStatus.innerText = order.status;
        elements.drawerStatus.className = `badge badge-${order.status.toLowerCase()}`;
        elements.drawer.classList.add('open');
        
        elements.eventTimeline.innerHTML = '';
        try {
            const r = await fetch(`/api/order/${id}/timeline`);
            const evts = await r.json();
            elements.eventTimeline.innerHTML = evts.map(e => `
                <div style="margin-bottom: 20px; font-family: 'JetBrains Mono', monospace;">
                    <div style="color: var(--accent-purple); font-weight: 800; font-size: 14px; margin-bottom: 5px;">EVENT</div>
                    <pre style="background: #000; color: #00ff00; padding: 15px; border-radius: 8px; font-size: 11px; overflow-x: auto; border: 1px solid #333;">${JSON.stringify(e, null, 2)}</pre>
                </div>
            `).join('');
            lucide.createIcons();
        } catch(e){}
    }

    function getFriendlyDesc(e) {
        if (e.type === 'OrderPlacedEvent') return `<span style="color:var(--accent-purple); font-weight:800;">COMMAND_ACCEPTED</span>`;
        if (e.type === 'InventoryReservedEvent') return `<span style="color:var(--accent-green); font-weight:800;">STOCK_RESERVED</span>`;
        if (e.type === 'InventoryReservationFailedEvent') return `<span style="color:var(--accent-red); font-weight:800;">STOCK_OUT</span>`;
        if (e.type === 'PaymentChargedEvent') return `<span style="color:var(--accent-green); font-weight:800;">PAYMENT_SETTLED</span>`;
        if (e.type === 'PaymentChargeFailedEvent') return `<span style="color:var(--accent-red); font-weight:800;">PAYMENT_DECLINED</span>`;
        if (e.type === 'ShipmentCreatedEvent') return `<span style="color:var(--accent-green); font-weight:800;">SHIPMENT_READY</span>`;
        if (e.type === 'ShipmentCreationFailedEvent') return `<span style="color:var(--accent-red); font-weight:800;">SHIPPING_ERROR</span>`;
        if (e.type === 'PaymentRefundedEvent') return `<span style="color:var(--accent-yellow); font-weight:800;">ROLLBACK_PAYMENT</span>`;
        if (e.type === 'InventoryReleasedEvent') return `<span style="color:var(--accent-yellow); font-weight:800;">ROLLBACK_INVENTORY</span>`;
        if (e.type === 'OrderConfirmedEvent') return `<span style="color:var(--accent-green); font-weight:800;">ORDER_COMPLETED</span>`;
        if (e.type === 'OrderFailedEvent') return `<span style="color:var(--accent-red); font-weight:800;">SAGA_ABORTED</span>`;
        return 'LOG_ENTRY';
    }

    lucide.createIcons();
});
