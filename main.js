const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let selectedBackupPath = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        icon: path.join(__dirname, 'icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        },
        title: 'Gallinaza y Materiales Tejada - Facturación'
    });

    mainWindow.loadFile('index.html');
}

// Revisa GitHub Releases al iniciar y, si hay una versión más nueva, la descarga
// e instala automáticamente. Envuelto en try/catch para que la app funcione aunque
// el módulo electron-updater todavía no esté instalado (npm install).
function setupAutoUpdate() {
    try {
        const { autoUpdater } = require('electron-updater');

        autoUpdater.on('update-downloaded', () => {
            dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'Actualización disponible',
                message: 'Se descargó una nueva versión de la aplicación.',
                detail: 'Se instalará al reiniciar. ¿Desea reiniciar ahora?',
                buttons: ['Reiniciar ahora', 'Más tarde']
            }).then(result => {
                if (result.response === 0) autoUpdater.quitAndInstall();
            });
        });

        autoUpdater.on('error', (err) => {
            console.error('Error al buscar actualizaciones:', err);
        });

        autoUpdater.checkForUpdatesAndNotify();
    } catch (e) {
        console.log('Auto-actualización no disponible todavía:', e.message);
    }
}

app.whenReady().then(() => {
    createWindow();
    setupAutoUpdate();
});

app.on('window-all-closed', () => {
    app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory', 'createDirectory']
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    selectedBackupPath = result.filePaths[0];
    return selectedBackupPath;
});

ipcMain.handle('save-pdf', async (event, { fileName, folderName, pdfBase64 }) => {
    const basePath = selectedBackupPath;
    if (!basePath) return { success: false, message: 'No hay carpeta de respaldo seleccionada' };

    try {
        const monthDir = path.join(basePath, folderName);
        if (!fs.existsSync(monthDir)) {
            fs.mkdirSync(monthDir, { recursive: true });
        }

        const filePath = path.join(monthDir, fileName);
        const buffer = Buffer.from(pdfBase64, 'base64');
        fs.writeFileSync(filePath, buffer);

        return { success: true, path: filePath };
    } catch (e) {
        return { success: false, message: e.message };
    }
});

ipcMain.handle('get-backup-path', () => {
    return selectedBackupPath;
});

ipcMain.handle('save-json', async (event, { fileName, content }) => {
    const basePath = selectedBackupPath;
    if (!basePath) return { success: false, message: 'No hay carpeta de respaldo seleccionada' };

    try {
        const filePath = path.join(basePath, fileName);
        // Escritura atómica: se escribe a un archivo temporal y luego se renombra,
        // para que un corte de energía no deje el backup a medio escribir.
        const tmpPath = filePath + '.tmp';
        fs.writeFileSync(tmpPath, content, 'utf8');
        fs.renameSync(tmpPath, filePath);
        return { success: true, path: filePath };
    } catch (e) {
        return { success: false, message: e.message };
    }
});
