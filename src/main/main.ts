/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import * as pathlib from 'path';
import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import fs from 'fs';
import * as mm from 'music-metadata'


class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});

ipcMain.handle('read-catalog', async (event, { path }) => {
  try {
    const files = fs.readdirSync(path);
    return files.map(file => ({
      filename: file,
      name: file.split('.')[0],
      filePath: pathlib.join(path, file)
    }));
  } catch (error) {
    console.error('Error reading directory', error);
    return [];
  }
});

ipcMain.handle('track-duration', async (event, { path }) => {
    const metadata = await mm.parseFile(path);
    if (metadata && metadata.format && metadata.format.duration) {
      return metadata.format.duration * 1000; // Преобразуем секунды в миллисекунды
    } else {
      throw new Error('Cannot find duration in the file metadata');
    }
});


ipcMain.handle('write-file', async (event, { path, data }) => {
  try {
      fs.writeFileSync(path, data, 'utf8');
      return { success: true };
  } catch (error: any) {
      console.error('Ошибка записи файла:', error);
      return { success: false, error: error.message };
  }
});

ipcMain.handle('read-file', async (event, { path }) => {
  try {
      const data = fs.readFileSync(path, 'utf8');
      return { success: true, data };
  } catch (error: any) {
      console.error('Ошибка чтения файла:', error);
      return { success: false, error: error.message };
  }
});

ipcMain.handle('read-raw-file', async (event, { path }) => {
  try {
      const data = fs.readFileSync(path);
      return { success: true, data };
  } catch (error: any) {
      console.error('Ошибка чтения файла:', error);
      return { success: false, error: error.message };
  }
});

ipcMain.handle('dialog:save-file', async (event, options) => {
  const result = await dialog.showSaveDialog({
      title: options.title || 'Save File',
      defaultPath: options.defaultPath || '',
      filters: options.filters || [{ name: 'All Files', extensions: ['*'] }]
  });

  return result;
});

ipcMain.handle('dialog:open-file', async (event, options) => {
  const result = await dialog.showOpenDialog({
      title: options.title || 'Open File',
      filters: options.filters || [{ name: 'All Files', extensions: ['*'] }],
      properties: ['openFile']
  });

  return result;
});


if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? pathlib.join(process.resourcesPath, 'assets')
    : pathlib.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return pathlib.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 850,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: app.isPackaged
        ? pathlib.join(__dirname, 'preload.js')
        : pathlib.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
