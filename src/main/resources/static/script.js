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

    let orders = [];
    const dynamicItemsList = document.getElementById('dynamic-items-list');
    const addItemBtn = document.getElementById('btn-add-item');
    const modalTotalPrice = document.getElementById('modal-total-price');

    loadOrders();
    setInterval(loadOrders, 5000);

    elements.userContext.onchange = () => renderOrders();
    elements.refreshBtn.onclick = () => loadOrders();
    elements.newOrderBtn.onclick = () => {
        document.getElementById('order-id').value = 'ORD-' + Math.random().toString(36).substr(2, 9).toUpperCase();
        dynamicItemsList.innerHTML = '';
        addItemRow();
        elements.modal.style.display = 'flex';
        lucide.createIcons();
    };

    addItemBtn.onclick = () => addItemRow();
    elements.closeModal.onclick = () => elements.modal.style.display = 'none';
    document.getElementById('close-drawer').onclick = () => elements.drawer.classList.remove('open');

    function addItemRow() {
        const id = Date.now();
        const row = document.createElement('div');
        row.className = 'item-entry-row';
        row.id = `item-row-${id}`;
        row.style = 'display:grid; grid-template-columns: 2fr 1fr 1fr 40px; gap:10px; margin-bottom:10px;';
        row.innerHTML = `
            <input type="text" placeholder="Item" class="item-sku" value="ITEM-${Math.floor(Math.random()*1000)}">
            <input type="number" class="item-qty" value="1" min="1">
            <input type="number" class="item-price" value="19.99" step="0.01">
            <button type="button" class="btn-icon" onclick="removeRow(${id})"><i data-lucide="trash-2" style="width:16px;"></i></button>
        `;
        dynamicItemsList.appendChild(row);
        lucide.createIcons();
        row.querySelectorAll('input').forEach(i => i.onchange = calculateTotal);
        calculateTotal();
    }

    window.removeRow = (id) => {
        const r = document.getElementById(`item-row-${id}`);
        if(r) r.remove();
        calculateTotal();
    }

    function calculateTotal() {
        let t = 0;
        document.querySelectorAll('.item-entry-row').forEach(r => {
            const q = r.querySelector('.item-qty').value;
            const p = r.querySelector('.item-price').value;
            t += q * p;
        });
        modalTotalPrice.innerText = `$${t.toFixed(2)}`;
    }

    elements.orderForm.onsubmit = async (e) => {
        e.preventDefault();
        const scn = document.getElementById('order-scenario').value;
        const cid = elements.userContext.value;
        const items = [];
        document.querySelectorAll('.item-entry-row').forEach(row => {
            items.push({
                sku: row.querySelector('.item-sku').value,
                quantity: parseInt(row.querySelector('.item-qty').value),
                unitPrice: parseFloat(row.querySelector('.item-price').value)
            });
        });

        const req = {
            orderId: document.getElementById('order-id').value,
            customerId: cid,
            scenario: scn,
            items: items,
            idempotencyKey: 'IDEM-' + Date.now()
        };

        const btn = document.getElementById('submit-order');
        btn.disabled = true;
        btn.innerText = 'Transmitting Command...';

        try {
            const r = await fetch('/api/order', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(req)
            });
            if(r.ok) {
                elements.modal.style.display = 'none';
                loadOrders();
            }
        } catch(err) { console.error(err); }
        finally {
            btn.disabled = false;
            btn.innerText = 'Confirm & Execute';
        }
    };

    async function loadOrders() {
        try {
            const r = await fetch('/api/orders');
            orders = await r.json();
            renderOrders();
        } catch(e) {}
    }

    function renderOrders() {
        const cur = elements.userContext.value;
        const filtered = orders.filter(o => o.customerId === cur);
        elements.ordersTable.innerHTML = filtered.map(o => {
            const hasDetailedStatus = o.failureReason && !o.failureReason.toLowerCase().includes(' failed');
            const statusLabel = (o.status === 'FAILED' && hasDetailedStatus) ? o.failureReason : o.status;
            
            return `
            <tr>
                <td><span class="mono">${o.orderId}</span></td>
                <td><div style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                    ${(o.items||[]).map(i=>`<span class="tiny-tag">${i.quantity}x ${i.sku}</span>`).join('')}
                </div></td>
                <td class="mono" style="font-weight:700;">$${(o.totalAmount||0).toFixed(2)}</td>
                <td><span class="badge badge-${o.status.toLowerCase()}">${statusLabel}</span></td>
                <td style="color:var(--text-muted); font-size:13px;">${new Date(o.updatedAt).toLocaleTimeString()}</td>
                <td><button class="btn-icon" onclick="viewTimeline('${o.orderId}')"><i data-lucide="map-pin"></i></button></td>
            </tr>
        `; }).join('') || '<tr><td colspan="6" style="text-align:center; padding:40px; color:var(--text-muted);">No orders in your history.</td></tr>';
        lucide.createIcons();
    }

    function getDetailedFailure(o) {
        return o.failureReason || 'SAGA_FAILED';
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
