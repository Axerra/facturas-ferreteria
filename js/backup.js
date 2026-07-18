const Backup = {
    dirHandle: null,
    statusEl: null,

    getStatusEl() {
        if (!this.statusEl) {
            this.statusEl = document.getElementById('backup-status');
        }
        return this.statusEl;
    },

    showStatus(msg, isError) {
        const el = this.getStatusEl();
        if (el) {
            el.textContent = msg;
            el.style.color = isError ? '#c62828' : '#2e7d32';
        }
    },

    async selectFolder() {
        try {
            this.dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
            localStorage.setItem('gallinaza_backup_folder', this.dirHandle.name);
            this.showStatus(`Carpeta activa: ${this.dirHandle.name}`);
            return true;
        } catch (e) {
            this.showStatus('Selección de carpeta cancelada', true);
            return false;
        }
    },

    async ensureFolder() {
        if (this.dirHandle) {
            try {
                await this.dirHandle.getDirectoryHandle('test', { create: true });
                return true;
            } catch (e) {
                this.dirHandle = null;
            }
        }

        try {
            this.dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
            localStorage.setItem('gallinaza_backup_folder', this.dirHandle.name);
            return true;
        } catch (e) {
            return false;
        }
    },

    getMonthName(month) {
        const names = [
            'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
            'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
        ];
        return names[month];
    },

    sanitizeFileName(str) {
        return str.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim();
    },

    generatePDF(invoice) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const pageWidth = doc.internal.pageSize.getWidth();
        let y = 15;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text('GALLINAZA Y MATERIALES TEJADA', pageWidth / 2, y, { align: 'center' });
        y += 6;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text('NIT: 4640733-0', pageWidth / 2, y, { align: 'center' });
        y += 5;
        doc.text('Arcadio Tejada Nunez Responsable del IVA', pageWidth / 2, y, { align: 'center' });
        y += 5;
        doc.text('Vda. La Florida Piendamo', pageWidth / 2, y, { align: 'center' });
        y += 5;
        doc.text('Cel: 3168305501 - 3117096101', pageWidth / 2, y, { align: 'center' });
        y += 8;

        doc.setDrawColor(0, 0, 0);
        doc.line(15, y, pageWidth - 15, y);
        y += 8;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text('FACTURA DE VENTA', pageWidth / 2, y, { align: 'center' });
        y += 10;

        doc.setFontSize(10);
        const numStr = String(invoice.number).padStart(6, '0');
        doc.setFont('helvetica', 'normal');
        doc.text('Fecha: ' + invoice.date, 15, y);
        doc.setFont('helvetica', 'bold');
        doc.text('No. Factura: ' + numStr, pageWidth - 15, y, { align: 'right' });
        y += 7;

        doc.setFont('helvetica', 'normal');
        doc.text('Cliente: ' + (invoice.client.name || 'N/A'), 15, y);
        doc.text('NIT/Cedula: ' + (invoice.client.id || 'N/A'), pageWidth - 15, y, { align: 'right' });
        y += 7;
        doc.text('Telefono: ' + (invoice.client.phone || 'N/A'), 15, y);
        doc.text('Direccion: ' + (invoice.client.address || 'N/A'), pageWidth - 15, y, { align: 'right' });
        y += 7;

        if (invoice.shippingAddress) {
            doc.setFont('helvetica', 'bold');
            doc.text('Direccion de Envio: ', 15, y);
            doc.setFont('helvetica', 'normal');
            doc.text(invoice.shippingAddress, 52, y);
            y += 7;
        }

        y += 3;

        // Table header
        doc.setFillColor(26, 35, 126);
        doc.rect(15, y, pageWidth - 30, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('Cant.', 20, y + 5.5);
        doc.text('Detalles', 38, y + 5.5);
        doc.text('V. Unitario', 120, y + 5.5);
        doc.text('V. Total', 155, y + 5.5);
        y += 8;

        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');

        let subtotal = 0;
        invoice.items.forEach(item => {
            doc.text(String(item.quantity), 22, y + 4.5);
            doc.text(item.name, 38, y + 4.5);
            doc.text(Products.formatCurrency(item.unitPrice), 120, y + 4.5);
            doc.text(Products.formatCurrency(item.total), 155, y + 4.5);
            subtotal += item.total;
            y += 7;

            if (y > 260) {
                doc.addPage();
                y = 20;
            }
        });

        doc.line(15, y, pageWidth - 15, y);
        y += 3;

        // Total
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('TOTAL:', 120, y + 5);
        doc.text(Products.formatCurrency(invoice.total), 155, y + 5);
        y += 10;

        // Payment section
        doc.setDrawColor(0, 0, 0);
        doc.roundedRect(15, y, pageWidth - 30, 30, 2, 2, 'S');
        y += 6;

        doc.setFontSize(10);
        const payStatus = invoice.paymentStatus === 'pagado' ? 'PAGADO' :
                          invoice.paymentStatus === 'abonado' ? 'ABONADO' : 'PENDIENTE';
        doc.setFont('helvetica', 'bold');
        doc.text('Estado de Pago: ' + payStatus, 20, y);
        y += 6;

        doc.setFont('helvetica', 'normal');
        doc.text('Total:', 20, y);
        doc.text(Products.formatCurrency(invoice.total), 60, y);
        doc.text('Abono:', 95, y);
        doc.text(Products.formatCurrency(invoice.payment || 0), 130, y);
        y += 6;
        doc.setFont('helvetica', 'bold');
        doc.text('Saldo:', 20, y);
        doc.text(Products.formatCurrency(invoice.balance || 0), 60, y);
        y += 12;

        const dispatchText = invoice.dispatchStatus === 'despachado' ? 'DESPACHADO' :
                             invoice.dispatchStatus === 'cliente_recoge' ? 'CLIENTE RECOGE' : 'PENDIENTE';
        doc.setFont('helvetica', 'normal');
        doc.text('Estado de Despacho: ' + dispatchText, 20, y);
        y += 15;

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('Gallinaza y Materiales Tejada - Vda. La Florida Piendamo', pageWidth / 2, y, { align: 'center' });
        y += 4;
        doc.text('Cel: 3168305501 - 3117096101', pageWidth / 2, y, { align: 'center' });

        return doc;
    },

    async saveInvoice(invoice) {
        const hasFolder = await this.ensureFolder();
        if (!hasFolder) {
            this.showStatus('No se pudo guardar la factura en disco. Seleccione una carpeta.', true);
            return false;
        }

        try {
            const date = new Date(invoice.date);
            const monthYear = `${this.getMonthName(date.getMonth())} ${date.getFullYear()}`;
            const monthDir = await this.dirHandle.getDirectoryHandle(monthYear, { create: true });

            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            const clientName = this.sanitizeFileName(invoice.client.name || 'SinCliente');
            const fileName = `Factura ${day}-${month}-${year} ${clientName}.pdf`;

            const doc = this.generatePDF(invoice);
            const pdfBlob = doc.output('blob');

            const fileHandle = await monthDir.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(pdfBlob);
            await writable.close();

            this.showStatus(`Factura PDF guardada: ${monthYear}/${fileName}`);
            return true;
        } catch (e) {
            console.error('Error guardando factura:', e);
            this.showStatus('Error guardando factura: ' + e.message, true);
            return false;
        }
    },

    async updateInvoice(invoice) {
        return this.saveInvoice(invoice);
    },

    async restoreFromFolder() {
        try {
            const dirHandle = await window.showDirectoryPicker({ mode: 'read' });
            let count = 0;

            for await (const entry of dirHandle.values()) {
                if (entry.kind === 'directory') {
                    for await (const file of entry.values()) {
                        if (file.kind === 'file' && file.name.endsWith('.json')) {
                            const fileHandle = await entry.getFileHandle(file.name);
                            const fileData = await fileHandle.getFile();
                            const text = await fileData.text();
                            const invoice = JSON.parse(text);

                            if (invoice.number && invoice.type === 'factura') {
                                const invoices = Storage.getInvoices();
                                const exists = invoices.some(inv => inv.number === invoice.number);
                                if (!exists) {
                                    invoices.push(invoice);
                                    Storage.saveInvoices(invoices);
                                    count++;
                                }
                            }
                        }
                    }
                }
            }

            return count;
        } catch (e) {
            return 0;
        }
    },

    async exportAll() {
        const invoices = Storage.getInvoices();
        const quotations = Storage.getQuotations();
        const products = Storage.getProducts();

        const data = {
            invoices,
            quotations,
            products,
            exportDate: new Date().toISOString(),
            companyName: 'Gallinaza y Materiales Tejada'
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const date = new Date();
        const fileName = `backup-gallinaza-${date.getDate()}-${date.getMonth()+1}-${date.getFullYear()}.json`;
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
    },

    async importFromBackup() {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) { resolve(0); return; }

                try {
                    const text = await file.text();
                    const data = JSON.parse(text);

                    if (data.invoices) {
                        const existing = Storage.getInvoices();
                        const existingNumbers = new Set(existing.map(i => i.number));
                        const newInvoices = data.invoices.filter(i => !existingNumbers.has(i.number));
                        Storage.saveInvoices([...existing, ...newInvoices]);
                    }
                    if (data.quotations) {
                        const existing = Storage.getQuotations();
                        const existingNumbers = new Set(existing.map(q => q.number));
                        const newQuotations = data.quotations.filter(q => !existingNumbers.has(q.number));
                        Storage.saveQuotations([...existing, ...newQuotations]);
                    }
                    if (data.products) {
                        const existing = Storage.getProducts();
                        const existingCodes = new Set(existing.map(p => p.code));
                        const newProducts = data.products.filter(p => !existingCodes.has(p.code));
                        Storage.saveProducts([...existing, ...newProducts]);
                    }

                    resolve((data.invoices || []).length + (data.quotations || []).length);
                } catch (err) {
                    resolve(0);
                }
            };
            input.click();
        });
    }
};
