const Invoices = {
    items: [],

    init() {
        this.items = [];
        this.setupListeners();
        this.setNextNumber();
        this.setTodayDate();
        this.clearSearchFields();
    },

    setupListeners() {
        document.getElementById('invoice-payment').addEventListener('input', () => {
            this.updatePaymentSummary();
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.product-search-container')) {
                document.getElementById('invoice-product-list').classList.remove('active');
            }
        });
    },

    clearSearchFields() {
        document.getElementById('invoice-product-search').value = '';
        document.getElementById('invoice-product-id').value = '';
        document.getElementById('invoice-unit-price').value = '';
        document.getElementById('invoice-quantity').value = 1;
    },

    setNextNumber() {
        const next = (Storage.get('lastInvoiceNumber') || 0) + 1;
        document.getElementById('invoice-number').value = String(next).padStart(6, '0');
    },

    setTodayDate() {
        document.getElementById('invoice-date').value = new Date().toISOString().split('T')[0];
    },

    searchProduct(query) {
        const list = document.getElementById('invoice-product-list');
        const results = Products.search(query);
        
        if (query.length === 0) {
            list.classList.remove('active');
            return;
        }

        if (results.length === 0) {
            list.innerHTML = '<div class="product-search-no-results">No se encontraron productos</div>';
        } else {
            list.innerHTML = results.map(p => `
                <div class="product-search-item" onclick="Invoices.selectProduct(${p.id})">
                    <span class="product-name">${p.name}</span>
                    <span class="product-price">${Products.formatCurrency(p.price)}</span>
                </div>
            `).join('');
        }
        
        list.classList.add('active');
    },

    selectProduct(productId) {
        const product = Products.getById(productId);
        if (!product) return;

        document.getElementById('invoice-product-search').value = product.name;
        document.getElementById('invoice-product-id').value = product.id;
        document.getElementById('invoice-unit-price').value = product.price;
        document.getElementById('invoice-product-list').classList.remove('active');
    },

    addItem() {
        const productId = parseInt(document.getElementById('invoice-product-id').value);
        const quantity = parseInt(document.getElementById('invoice-quantity').value);

        if (!productId || isNaN(quantity) || quantity <= 0) {
            alert('Seleccione un producto y cantidad válida');
            return;
        }

        const product = Products.getById(productId);
        if (!product) return;

        this.items.push({
            productId: product.id,
            name: product.name,
            quantity: quantity,
            unitPrice: product.price,
            total: quantity * product.price
        });

        this.updateTable();
        this.clearSearchFields();
    },

    removeItem(index) {
        this.items.splice(index, 1);
        this.updateTable();
    },

    updateTable() {
        const tbody = document.getElementById('invoice-items-body');
        tbody.innerHTML = this.items.map((item, i) => `
            <tr>
                <td style="text-align:center;">${item.quantity}</td>
                <td>${item.name}</td>
                <td style="text-align:right;">${Products.formatCurrency(item.unitPrice)}</td>
                <td style="text-align:right;">${Products.formatCurrency(item.total)}</td>
                <td><button class="btn btn-danger btn-small" onclick="Invoices.removeItem(${i})">X</button></td>
            </tr>
        `).join('');

        this.updateTotals();
        this.updatePaymentSummary();
    },

    updateTotals() {
        const total = this.items.reduce((sum, item) => sum + item.total, 0);

        document.getElementById('invoice-total').textContent = Products.formatCurrency(total);
    },

    updatePaymentSummary() {
        const total = this.items.reduce((sum, item) => sum + item.total, 0);
        const payment = parseInt(document.getElementById('invoice-payment').value) || 0;
        const balance = total - payment;

        document.getElementById('invoice-pay-total').textContent = Products.formatCurrency(total);
        document.getElementById('invoice-pay-paid').textContent = Products.formatCurrency(payment);
        document.getElementById('invoice-pay-balance').textContent = Products.formatCurrency(Math.max(0, balance));

        const statusEl = document.getElementById('invoice-payment-status-text');
        if (payment >= total && total > 0) {
            statusEl.textContent = 'PAGADO';
            statusEl.className = 'badge badge-paid';
        } else if (payment > 0) {
            statusEl.textContent = 'ABONADO';
            statusEl.className = 'badge badge-partial';
        } else {
            statusEl.textContent = 'PENDIENTE';
            statusEl.className = 'badge badge-pending';
        }

        // Update progress bar
        const progressFill = document.getElementById('payment-progress-fill');
        const progressText = document.getElementById('payment-progress-text');
        const pct = total > 0 ? Math.min(100, Math.round((payment / total) * 100)) : 0;
        if (progressFill) {
            progressFill.style.width = pct + '%';
            progressFill.className = 'payment-progress-fill' + (pct >= 100 ? ' complete' : pct > 0 ? ' partial' : '');
        }
        if (progressText) {
            progressText.textContent = pct + '%';
        }
    },

    quickPay(percent) {
        const total = this.items.reduce((sum, item) => sum + item.total, 0);
        const payment = Math.round(total * percent / 100);
        document.getElementById('invoice-payment').value = payment;
        this.updatePaymentSummary();
    },

    clearForm() {
        this.items = [];
        document.getElementById('invoice-client-name').value = '';
        document.getElementById('invoice-client-id').value = '';
        document.getElementById('invoice-client-phone').value = '';
        document.getElementById('invoice-client-address').value = '';
        document.getElementById('invoice-shipping-address').value = '';
        document.getElementById('invoice-dispatch-status').value = 'pendiente';
        document.getElementById('invoice-payment').value = 0;
        this.clearSearchFields();
        this.updateTable();
        this.setNextNumber();
        this.setTodayDate();
    },

    getClientData() {
        return {
            name: document.getElementById('invoice-client-name').value.trim(),
            id: document.getElementById('invoice-client-id').value.trim(),
            phone: document.getElementById('invoice-client-phone').value.trim(),
            address: document.getElementById('invoice-client-address').value.trim()
        };
    },

    getFormData() {
        const total = this.items.reduce((sum, item) => sum + item.total, 0);
        const payment = parseInt(document.getElementById('invoice-payment').value) || 0;
        let paymentStatus = 'pendiente';
        if (payment >= total && total > 0) {
            paymentStatus = 'pagado';
        } else if (payment > 0) {
            paymentStatus = 'abonado';
        }

        return {
            number: document.getElementById('invoice-number').value,
            date: document.getElementById('invoice-date').value,
            shippingAddress: document.getElementById('invoice-shipping-address').value.trim(),
            dispatchStatus: document.getElementById('invoice-dispatch-status').value,
            payment,
            paymentStatus
        };
    },

    async save() {
        if (this.items.length === 0) {
            alert('Agregue al menos un producto');
            return;
        }

        const client = this.getClientData();
        if (!client.name) {
            alert('Ingrese el nombre del cliente');
            return;
        }

        const formData = this.getFormData();
        const total = this.items.reduce((sum, item) => sum + item.total, 0);

        const invoice = {
            number: parseInt(formData.number),
            date: formData.date,
            client,
            shippingAddress: formData.shippingAddress,
            items: [...this.items],
            total,
            payment: formData.payment,
            balance: total - formData.payment,
            paymentStatus: formData.paymentStatus,
            dispatchStatus: formData.dispatchStatus,
            type: 'factura',
            createdAt: new Date().toISOString()
        };

        const invoices = Storage.getInvoices();
        invoices.push(invoice);
        Storage.saveInvoices(invoices);

        // Update invoice number
        Storage.set('lastInvoiceNumber', invoice.number);

        const saved = await Backup.saveInvoice(invoice);
        if (saved) {
            alert('Factura guardada y respaldada en disco exitosamente');
        } else {
            alert('Factura guardada. Seleccione una carpeta de respaldo en Inicio para guardar en disco.');
        }
        this.clearForm();
        History.load();
        App.updateDashboard();
    },

    async print() {
        if (this.items.length === 0) {
            alert('Agregue al menos un producto');
            return;
        }

        const client = this.getClientData();
        if (!client.name) {
            alert('Ingrese el nombre del cliente');
            return;
        }

        const formData = this.getFormData();
        const total = this.items.reduce((sum, item) => sum + item.total, 0);

        // Save invoice first
        const invoice = {
            number: parseInt(formData.number),
            date: formData.date,
            client,
            shippingAddress: formData.shippingAddress,
            items: [...this.items],
            total,
            payment: formData.payment,
            balance: total - formData.payment,
            paymentStatus: formData.paymentStatus,
            dispatchStatus: formData.dispatchStatus,
            type: 'factura',
            createdAt: new Date().toISOString()
        };

        const invoices = Storage.getInvoices();
        invoices.push(invoice);
        Storage.saveInvoices(invoices);
        Storage.set('lastInvoiceNumber', invoice.number);

        Backup.saveInvoice(invoice);

        // Print
        const html = this.generatePrintHTML(formData, client, total);
        this.openPrintWindow(html);

        // Clear form for next invoice
        this.clearForm();
        History.load();
        App.updateDashboard();
    },

    deleteLast() {
        const invoices = Storage.getInvoices();
        if (invoices.length === 0) {
            alert('No hay facturas para eliminar');
            return;
        }

        const lastInvoice = invoices[invoices.length - 1];
        const confirmMsg = `¿Eliminar factura No. ${String(lastInvoice.number).padStart(6, '0')}?\n` +
                          `Cliente: ${lastInvoice.client.name}\n` +
                          `Total: ${Products.formatCurrency(lastInvoice.total)}`;

        if (!confirm(confirmMsg)) return;

        invoices.pop();
        Storage.saveInvoices(invoices);
        
        this.clearForm();
        History.load();
        App.updateDashboard();
        alert('Factura eliminada');
    },

    generatePrintHTML(formData, client, total) {
        const itemsHTML = this.items.map(item => `
            <tr>
                <td style="text-align:center;">${item.quantity}</td>
                <td>${item.name}</td>
                <td style="text-align:right;">${Products.formatCurrency(item.unitPrice)}</td>
                <td style="text-align:right;">${Products.formatCurrency(item.total)}</td>
            </tr>
        `).join('');

        const balance = total - formData.payment;
        const statusClass = formData.paymentStatus === 'pagado' ? 'badge-paid' : 
                           formData.paymentStatus === 'abonado' ? 'badge-partial' : 'badge-pending';
        const statusText = formData.paymentStatus === 'pagado' ? 'PAGADO' : 
                          formData.paymentStatus === 'abonado' ? 'ABONADO' : 'PENDIENTE';

        const dispatchClass = formData.dispatchStatus === 'despachado' ? 'badge-dispatched' :
                             formData.dispatchStatus === 'cliente_recoge' ? 'badge-pickup' : 'badge-waiting';
        const dispatchText = formData.dispatchStatus === 'despachado' ? 'DESPACHADO' :
                            formData.dispatchStatus === 'cliente_recoge' ? 'CLIENTE RECOGE' : 'PENDIENTE';

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Factura ${formData.number}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 30px; }
                .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
                .company-name { font-size: 24px; font-weight: bold; }
                .company-info { font-size: 12px; color: #555; margin-top: 5px; }
                .doc-type { font-size: 18px; font-weight: bold; color: #1a237e; margin: 10px 0; }
                .info-row { display: flex; justify-content: space-between; margin: 5px 0; font-size: 14px; }
                .info-label { font-weight: bold; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th { background-color: #1a237e; color: white; padding: 10px; text-align: left; }
                td { padding: 10px; border-bottom: 1px solid #ddd; }
                .totals { max-width: 350px; margin-left: auto; margin-top: 20px; }
                .total-line { display: flex; justify-content: space-between; padding: 5px 0; }
                .total-final { border-top: 2px solid #1a237e; font-weight: bold; font-size: 18px; margin-top: 5px; }
                .payment-section { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-top: 20px; }
                .badge { padding: 5px 15px; border-radius: 15px; font-size: 14px; font-weight: bold; display: inline-block; }
                .badge-pending { background: #fff3e0; color: #e65100; }
                .badge-paid { background: #e8f5e9; color: #2e7d32; }
                .badge-partial { background: #fff8e1; color: #f57f17; }
                .badge-dispatched { background: #e8f5e9; color: #2e7d32; }
                .badge-waiting { background: #e3f2fd; color: #1565c0; }
                .badge-pickup { background: #f3e5f5; color: #7b1fa2; }
                .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
                .shipping { background: #e8eaf6; padding: 10px; border-radius: 5px; margin-top: 10px; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="company-name">GALLINAZA Y MATERIALES TEJADA</div>
                <div class="company-info">NIT: 4640733-0</div>
                <div class="company-info">Arcadio Tejada Núñez Responsable del IVA</div>
                <div class="company-info">Vda. La Florida Piendamó</div>
                <div class="company-info">Cel: 3168305501 - 3117096101</div>
            </div>

            <div class="doc-type">FACTURA DE VENTA</div>

            <div class="info-row">
                <div><span class="info-label">Fecha:</span> ${formData.date}</div>
                <div><span class="info-label">No. Factura:</span> ${formData.number}</div>
            </div>
            <div class="info-row">
                <div><span class="info-label">Cliente:</span> ${client.name || 'N/A'}</div>
                <div><span class="info-label">NIT/Cédula:</span> ${client.id || 'N/A'}</div>
            </div>
            <div class="info-row">
                <div><span class="info-label">Teléfono:</span> ${client.phone || 'N/A'}</div>
                <div><span class="info-label">Dirección:</span> ${client.address || 'N/A'}</div>
            </div>

            ${formData.shippingAddress ? `
            <div class="shipping">
                <span class="info-label">Dirección de Envío:</span> ${formData.shippingAddress}
            </div>` : ''}

            <table>
                <thead>
                    <tr>
                        <th style="text-align:center;">Cant.</th>
                        <th>Detalles</th>
                        <th style="text-align:right;">Valor Unitario</th>
                        <th style="text-align:right;">Valor Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHTML}
                </tbody>
            </table>

            <div class="totals">
                <div class="total-line total-final">
                    <span>TOTAL:</span>
                    <span>${Products.formatCurrency(total)}</span>
                </div>
            </div>

            <div class="payment-section">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <strong>Estado de Pago:</strong>
                    <span class="badge ${statusClass}">${statusText}</span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <strong>Estado de Despacho:</strong>
                    <span class="badge ${dispatchClass}">${dispatchText}</span>
                </div>
                <div class="total-line">
                    <span>Total:</span>
                    <span>${Products.formatCurrency(total)}</span>
                </div>
                <div class="total-line">
                    <span>Abono:</span>
                    <span>${Products.formatCurrency(formData.payment)}</span>
                </div>
                <div class="total-line" style="font-weight:bold;">
                    <span>Saldo:</span>
                    <span>${Products.formatCurrency(Math.max(0, balance))}</span>
                </div>
            </div>

            <div class="footer">
                <p>Gallinaza y Materiales Tejada - Vda. La Florida Piendamó</p>
                <p>Cel: 3168305501 - 3117096101</p>
            </div>
        </body>
        </html>`;
    },

    openPrintWindow(html) {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
    },

    showPaymentModal(invoiceId) {
        const invoices = Storage.getInvoices();
        const invoice = invoices.find(inv => inv.number === invoiceId);
        if (!invoice) return;

        document.getElementById('payment-invoice-id').value = invoiceId;
        document.getElementById('payment-modal-total').value = Products.formatCurrency(invoice.total);
        document.getElementById('payment-modal-balance').value = Products.formatCurrency(invoice.balance);
        document.getElementById('payment-modal-amount').value = '';
        document.getElementById('payment-modal-amount').max = invoice.balance;
        document.getElementById('payment-modal-amount').placeholder = `Máximo: ${Products.formatCurrency(invoice.balance)}`;
        document.getElementById('payment-modal').classList.add('active');
    },

    closePaymentModal() {
        document.getElementById('payment-modal').classList.remove('active');
    },

    processPayment() {
        const invoiceId = parseInt(document.getElementById('payment-invoice-id').value);
        const amount = parseInt(document.getElementById('payment-modal-amount').value);

        if (isNaN(amount) || amount <= 0) {
            alert('Ingrese un monto válido');
            return;
        }

        const invoices = Storage.getInvoices();
        const index = invoices.findIndex(inv => inv.number === invoiceId);
        if (index === -1) return;

        const invoice = invoices[index];
        if (amount > invoice.balance) {
            alert('El monto excede el saldo pendiente');
            return;
        }

        invoice.payment += amount;
        invoice.balance = invoice.total - invoice.payment;
        
        if (invoice.balance <= 0) {
            invoice.paymentStatus = 'pagado';
        } else {
            invoice.paymentStatus = 'abonado';
        }

        Storage.saveInvoices(invoices);
        Backup.saveInvoice(invoice);
        this.closePaymentModal();
        History.load();
        App.updateDashboard();
        alert('Abono registrado exitosamente');
    },

    toggleDispatch(invoiceId) {
        const invoices = Storage.getInvoices();
        const invoice = invoices.find(inv => inv.number === invoiceId);
        if (!invoice) return;

        const statuses = ['pendiente', 'despachado', 'cliente_recoge'];
        const currentIndex = statuses.indexOf(invoice.dispatchStatus);
        invoice.dispatchStatus = statuses[(currentIndex + 1) % statuses.length];

        Storage.saveInvoices(invoices);
        History.load();
    },

    getCurrentInvoiceData() {
        if (this.items.length === 0) return null;

        const client = this.getClientData();
        const formData = this.getFormData();
        const total = this.items.reduce((sum, item) => sum + item.total, 0);

        return {
            number: parseInt(formData.number),
            date: formData.date,
            client,
            shippingAddress: formData.shippingAddress,
            items: [...this.items],
            total,
            payment: formData.payment,
            paymentStatus: formData.paymentStatus,
            dispatchStatus: formData.dispatchStatus
        };
    }
};
