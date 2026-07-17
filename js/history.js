const History = {
    load() {
        const type = document.getElementById('history-type').value;
        const search = document.getElementById('history-search').value.toLowerCase();
        
        // Only use status filter if we came from dashboard click
        const statusFilter = (App.invoiceFilter && type === 'factura') ? App.invoiceFilter : 'all';

        let items = [];

        if (type === 'all' || type === 'factura') {
            let invoices = Storage.getInvoices().map(inv => ({ ...inv, type: 'factura' }));
            
            // Apply status filter if set from dashboard
            if (statusFilter !== 'all') {
                invoices = invoices.filter(inv => inv.paymentStatus === statusFilter);
            }
            
            items = items.concat(invoices);
        }

        if (type === 'all' || type === 'cotizacion') {
            const quotations = Storage.getQuotations().map(q => ({ ...q, type: 'cotizacion' }));
            items = items.concat(quotations);
        }

        if (search) {
            items = items.filter(item => 
                (item.client && item.client.name && item.client.name.toLowerCase().includes(search)) ||
                (item.number && String(item.number).includes(search))
            );
        }

        items.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

        const tbody = document.getElementById('history-table-body');
        tbody.innerHTML = items.map(item => {
            const date = item.date ? new Date(item.date).toLocaleDateString('es-CO') : 'N/A';
            const typeBadge = item.type === 'factura' ? 
                '<span class="badge badge-dispatched">Factura</span>' : 
                '<span class="badge badge-waiting">Cotización</span>';
            
            let paymentStatus = '';
            let dispatchStatus = '';

            if (item.type === 'factura') {
                const payClass = item.paymentStatus === 'pagado' ? 'badge-paid' : 
                                item.paymentStatus === 'abonado' ? 'badge-partial' : 'badge-pending';
                const payText = item.paymentStatus === 'pagado' ? 'Pagado' : 
                               item.paymentStatus === 'abonado' ? 'Abonado' : 'Pendiente';
                paymentStatus = `<span class="badge ${payClass}">${payText}</span>`;

                const dispatchClass = item.dispatchStatus === 'despachado' ? 'badge-dispatched' :
                                     item.dispatchStatus === 'cliente_recoge' ? 'badge-pickup' : 'badge-waiting';
                const dispatchText = item.dispatchStatus === 'despachado' ? 'Despachado' :
                                    item.dispatchStatus === 'cliente_recoge' ? 'Cliente Recoge' : 'Pendiente';
                dispatchStatus = `<span class="badge ${dispatchClass}">${dispatchText}</span>`;

                const electronicBadge = item.electronicInvoice ? 
                    '<span class="badge badge-electronic">Electrónica</span>' : '';
                dispatchStatus += electronicBadge;
            } else {
                paymentStatus = '-';
                dispatchStatus = '-';
            }

            const number = item.number ? String(item.number).padStart(6, '0') : 'N/A';

            let actions = '';
            if (item.type === 'factura') {
                actions = `
                    <button class="btn btn-primary btn-small" onclick="History.printInvoice(${item.number})">Imprimir</button>
                    <button class="btn btn-success btn-small" onclick="Invoices.showPaymentModal(${item.number})">Abono</button>
                    <button class="btn btn-secondary btn-small" onclick="Invoices.toggleDispatch(${item.number})">Despacho</button>
                    ${!item.electronicInvoice ? `<button class="btn btn-electronic btn-small" onclick="Electronic.sendInvoiceByNumber(${item.number})">Electrónica</button>` : ''}
                `;
            } else {
                actions = `
                    <button class="btn btn-primary btn-small" onclick="History.printQuotation(${item.number})">Imprimir</button>
                `;
            }

            return `
                <tr>
                    <td>${typeBadge}</td>
                    <td>${number}</td>
                    <td>${date}</td>
                    <td>${item.client ? item.client.name : 'N/A'}</td>
                    <td>${Products.formatCurrency(item.total || 0)}</td>
                    <td>${paymentStatus}</td>
                    <td>${dispatchStatus}</td>
                    <td class="actions">${actions}</td>
                </tr>
            `;
        }).join('');

        if (items.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px;">No hay registros</td></tr>';
        }
    },

    printInvoice(number) {
        const invoices = Storage.getInvoices();
        const invoice = invoices.find(inv => inv.number === number);
        if (!invoice) return;

        const formData = {
            number: String(invoice.number).padStart(6, '0'),
            date: invoice.date,
            shippingAddress: invoice.shippingAddress,
            dispatchStatus: invoice.dispatchStatus,
            payment: invoice.payment,
            paymentStatus: invoice.paymentStatus
        };

        const html = Invoices.generatePrintHTML(formData, invoice.client, invoice.total);
        Invoices.openPrintWindow(html);
    },

    printQuotation(number) {
        const quotations = Storage.getQuotations();
        const quote = quotations.find(q => q.number === number);
        if (!quote) return;

        const html = Quotations.generatePrintHTML(
            quote.number,
            new Date(quote.date).toLocaleDateString('es-CO'),
            quote.client,
            quote.total
        );
        Quotations.openPrintWindow(html);
    }
};
