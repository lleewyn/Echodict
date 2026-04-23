const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1300,
    height: 900,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile('index.html');
  // mainWindow.webContents.openDevTools();
}

// --- IPC Handlers ---

// Chọn thư mục
ipcMain.handle('dialog:selectFolder', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  if (canceled) return null;
  return filePaths[0];
});

// Lưu dự án vào thư mục
ipcMain.handle('file:saveProject', async (event, { folderPath, fileName, audioData, projectData }) => {
  try {
    const projectDirName = fileName.replace(/\.[^/.]+$/, "").replace(/[<>:"/\\|?*]/g, '_');
    const projectDir = path.join(folderPath, projectDirName);
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }

    // Lưu file audio (nếu có dữ liệu mới)
    const audioPath = path.join(projectDir, fileName);
    if (audioData) {
      fs.writeFileSync(audioPath, Buffer.from(audioData));
    }

    // Lưu file config JSON
    const configPath = path.join(projectDir, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify(projectData, null, 2));

    return { success: true, projectDir, projectDirName };
  } catch (error) {
    console.error(error);
    return { success: false, error: error.message };
  }
});

// Lấy danh sách thư viện
ipcMain.handle('file:getLibrary', async (event, folderPath) => {
  try {
    if (!fs.existsSync(folderPath)) return [];
    const dirs = fs.readdirSync(folderPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory());
    
    const projects = [];
    for (const dir of dirs) {
      const configPath = path.join(folderPath, dir.name, 'config.json');
      if (fs.existsSync(configPath)) {
        try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            projects.push({
              id: config.id,
              name: config.name,
              lastModified: config.lastModified,
              folderName: dir.name,
              audioFileName: config.audioFileName,
              segmentCount: config.segments ? config.segments.length : 0
            });
        } catch (e) {}
      }
    }
    return projects;
  } catch (error) {
    return [];
  }
});

// Load audio file từ path
ipcMain.handle('file:loadAudio', async (event, filePath) => {
  try {
    const data = fs.readFileSync(filePath);
    return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  } catch (error) {
    return null;
  }
});

// Xóa dự án
ipcMain.handle('file:deleteProject', async (event, { folderPath, projectName }) => {
  try {
    const projectPath = path.join(folderPath, projectName);
    fs.rmSync(projectPath, { recursive: true, force: true });
    return true;
  } catch (error) {
    return false;
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
