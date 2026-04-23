const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'icon.png'), // Bạn có thể thêm icon sau
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Load file index.html của bạn
  mainWindow.loadFile('index.html');

  // Tu dong mo DevTools neu muon debug (co the xoa khi hoan thien)
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
