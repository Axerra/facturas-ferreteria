const Backup = {
    backupPath: null,
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

    isElectron() {
        return typeof window.electronAPI !== 'undefined';
    },

    async selectFolder() {
        if (!this.isElectron()) {
            this.showStatus('Respaldo de archivos solo disponible en la aplicación de escritorio', true);
            return false;
        }

        const folder = await window.electronAPI.selectFolder();
        if (folder) {
            this.backupPath = folder;
            localStorage.setItem('gallinaza_backup_folder', folder);
            this.showStatus(`Carpeta activa: ${folder}`);
            return true;
        }
        this.showStatus('Selección de carpeta cancelada', true);
        return false;
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

        invoice.items.forEach(item => {
            doc.text(String(item.quantity), 22, y + 4.5);
            doc.text(item.name, 38, y + 4.5);
            doc.text(Products.formatCurrency(item.unitPrice), 120, y + 4.5);
            doc.text(Products.formatCurrency(item.total), 155, y + 4.5);
            y += 7;
            if (y > 260) { doc.addPage(); y = 20; }
        });

        doc.line(15, y, pageWidth - 15, y);
        y += 3;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('TOTAL:', 120, y + 5);
        doc.text(Products.formatCurrency(invoice.total), 155, y + 5);
        y += 10;

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
        doc.text('Gallinaza y Materiales Tejada - Vda. La Florida Piendamo', pageWidth / 2, y, { align: 'center' });
        y += 4;
        doc.text('Cel: 3168305501 - 3117096101', pageWidth / 2, y, { align: 'center' });

        return doc;
    },

    async saveInvoice(invoice) {
        if (!this.isElectron()) return false;

        if (!this.backupPath) {
            const path = await window.electronAPI.getBackupPath();
            if (path) {
                this.backupPath = path;
                localStorage.setItem('gallinaza_backup_folder', path);
            } else {
                const selected = await this.selectFolder();
                if (!selected) return false;
            }
        }

        try {
            const date = Storage.parseLocalDate(invoice.date);
            const monthYear = `${this.getMonthName(date.getMonth())} ${date.getFullYear()}`;
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            const numStr = String(invoice.number).padStart(6, '0');
            const clientName = this.sanitizeFileName(invoice.client.name || 'SinCliente');
            const fileName = `Factura ${numStr} ${day}-${month}-${year} ${clientName}.pdf`;

            const doc = this.generatePDF(invoice);
            const pdfBase64 = doc.output('datauristring').split(',')[1];

            const result = await window.electronAPI.savePDF({
                fileName,
                folderName: monthYear,
                pdfBase64
            });

            if (result.success) {
                this.showStatus(`Factura PDF guardada: ${monthYear}/${fileName}`);
                // Además del PDF, refrescamos un respaldo JSON completo (red de seguridad)
                await this.autoBackup();
                return true;
            } else {
                this.showStatus('Error: ' + result.message, true);
                return false;
            }
        } catch (e) {
            console.error('Error guardando factura:', e);
            this.showStatus('Error guardando factura: ' + e.message, true);
            return false;
        }
    },

    async updateInvoice(invoice) {
        return this.saveInvoice(invoice);
    },

    // Escribe un snapshot JSON completo (facturas + cotizaciones + productos)
    // en la carpeta de respaldo. Siempre sobrescribe el mismo archivo "al día".
    async autoBackup() {
        if (!this.isElectron() || !this.backupPath) return false;

        try {
            const data = {
                invoices: Storage.getInvoices(),
                quotations: Storage.getQuotations(),
                products: Storage.getProducts(),
                lastInvoiceNumber: Storage.get('lastInvoiceNumber') || 0,
                lastQuotationNumber: Storage.get('lastQuotationNumber') || 0,
                exportDate: new Date().toISOString(),
                companyName: 'Gallinaza y Materiales Tejada'
            };

            const result = await window.electronAPI.saveJson({
                fileName: 'Backup-Automatico.json',
                content: JSON.stringify(data, null, 2)
            });

            return result && result.success;
        } catch (e) {
            console.error('Error en respaldo automático:', e);
            return false;
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
        a.href = url;
        a.download = `backup-gallinaza-${date.getDate()}-${date.getMonth()+1}-${date.getFullYear()}.json`;
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
                        const merged = [...existing, ...newInvoices];
                        Storage.saveInvoices(merged);
                        // Mantener el contador por delante del número más alto para no reutilizar números
                        const maxInvoice = merged.reduce((m, i) => Math.max(m, Number(i.number) || 0),
                            Math.max(Storage.get('lastInvoiceNumber') || 0, Number(data.lastInvoiceNumber) || 0));
                        Storage.set('lastInvoiceNumber', maxInvoice);
                    }
                    if (data.quotations) {
                        const existing = Storage.getQuotations();
                        const existingNumbers = new Set(existing.map(q => q.number));
                        const newQuotations = data.quotations.filter(q => !existingNumbers.has(q.number));
                        const merged = [...existing, ...newQuotations];
                        Storage.saveQuotations(merged);
                        const maxQuote = merged.reduce((m, q) => Math.max(m, Number(q.number) || 0),
                            Math.max(Storage.get('lastQuotationNumber') || 0, Number(data.lastQuotationNumber) || 0));
                        Storage.set('lastQuotationNumber', maxQuote);
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
