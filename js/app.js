const App = {
    init() {
        this.setupNavigation();
        Products.init();
        Quotations.init();
        Invoices.init();
        Electronic.init();
        History.load();
        this.updateDashboard();
    },

    setupNavigation() {
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.page;
                this.navigateTo(page);
            });
        });
    },

    navigateTo(page) {
        // Clear invoice filter when navigating away from history
        if (page !== 'history') {
            this.invoiceFilter = 'all';
        }

        // Update active link
        document.querySelectorAll('.nav-links a').forEach(l => l.classList.remove('active'));
        document.querySelector(`.nav-links a[data-page="${page}"]`).classList.add('active');

        // Show page
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(`page-${page}`).classList.add('active');

        // Refresh data when needed
        if (page === 'dashboard') this.updateDashboard();
        if (page === 'products') Products.load();
        if (page === 'history') History.load();
        if (page === 'invoices') {
            Invoices.init();
        }
        if (page === 'quotations') {
            Quotations.init();
        }
    },

    updateDashboard() {
        const invoices = Storage.getInvoices();
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Total facturas
        const totalInvoices = invoices.length;
        document.getElementById('stat-total-invoices').textContent = totalInvoices;

        // Porcentaje pagadas vs pendientes
        const paidInvoices = invoices.filter(inv => inv.paymentStatus === 'pagado').length;
        const pendingInvoices = invoices.filter(inv => inv.paymentStatus !== 'pagado').length;
        document.getElementById('stat-paid-pct').textContent = paidInvoices + ' Facturas';
        document.getElementById('stat-pending-pct').textContent = pendingInvoices + ' Facturas';

        // Ganancia del mes (suma de lo abonado/pagado)
        const monthlySales = invoices
            .filter(inv => {
                const invDate = new Date(inv.date);
                return invDate.getMonth() === currentMonth && 
                       invDate.getFullYear() === currentYear;
            })
            .reduce((sum, inv) => sum + (inv.payment || 0), 0);
        document.getElementById('stat-month-sales').textContent = Products.formatCurrency(monthlySales);

        // Ganancia total (suma de lo abonado/pagado)
        const totalSales = invoices
            .reduce((sum, inv) => sum + (inv.payment || 0), 0);
        document.getElementById('stat-total-sales').textContent = Products.formatCurrency(totalSales);
    },

    showInvoicesByStatus(status) {
        // Navigate to history
        this.navigateTo('history');
        
        // Set filter to facturas only
        document.getElementById('history-type').value = 'factura';
        
        // Store filter for history to use
        this.invoiceFilter = status;
        
        // Load history with filter
        History.load();
    },

    isInvoicePending(inv) {
        return inv.paymentStatus === 'pendiente' || inv.paymentStatus === 'abonado';
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
