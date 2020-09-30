const path = require("path");
const os = require("os");
const { app, BrowserWindow, Menu, ipcMain, shell, globalShortcut } = require("electron");
const imagemin = require("imagemin");
const imageminMozjpeg = require("imagemin-mozjpeg");
const imageminPngquant = require("imagemin-pngquant");
const slash = require("slash");
const log = require("electron-log");

process.env.NODE_ENV = "production";

const isDev = process.env.NODE_ENV !== "production" ? true : false;
const isMac = process.platform === "darwin" ? true : false;

let mainWindow;
let aboutWindow;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: isDev ? 1000 : 500,
    height: 600,
    title: "ImageOptimizer",
    icon: `${__dirname}/assets/icons/Icon_256x256.png`,
    resizable: isDev,
    backgroundColor: "#fff",
    webPreferences: {
      nodeIntegration: true
    }
  });
  mainWindow.loadFile(`${__dirname}/app/index.html`);
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

function createAboutWindow() {
  aboutWindow = new BrowserWindow({
    width: 300,
    height: 300,
    title: "About ImageOptimizer",
    icon: `${__dirname}/assets/icons/Icon_256x256.png`,
    resizable: false,
    backgroundColor: "#fff"
  });
  aboutWindow.loadFile(`${__dirname}/app/about.html`);
}

app.on("ready", () => {
  createMainWindow();
  const mainMenu = Menu.buildFromTemplate(menu);
  Menu.setApplicationMenu(mainMenu);

  // globalShortcut.register("CmdOrCtrl+R", () => mainWindow.reload());
  // globalShortcut.register(isMac ? "Command+Alt+I" : "Ctrl+Shift+I", () => mainWindow.toggleDevTools());

  mainWindow.on("closed", () => mainWindow = null);
});

const menu = [
  ...(isMac ?
    [
      {
        label: app.name,
        submenu: [
          {
            label: "About",
            click: createAboutWindow
          }
        ]
      }
    ] : []
  ),
  ...(!isMac ?
    [
      {
        label: "Help",
        submenu: [
          {
            label: "About",
            click: createAboutWindow
          }
        ]
      }
    ] : []
  ),
  {
    role: "fileMenu"
  },
  ...(isDev ? [
    {
      label: "Developer",
      submenu: [
        { role: "reload" },
        { role: "forcereload" },
        { type: "separator" },
        { role: "toggledevtools" }
      ]
    }
  ] : [])
  // {
  //   label: "File",
  //   submenu: [
  //     {
  //       label: "Quit",
  //       accelerator: "CmdOrCtrl+W",
  //       click: () => app.quit()
  //     }
  //   ]
  // }
];

ipcMain.on("image:minimize", (e, options) => {
  options.dest = path.join(os.homedir(), 'imageoptimizer');
  minifyImage(options)
});

async function minifyImage({ imgPath, quality, dest }) {
  try {
    const pngQuality = quality / 100;
    const files = await imagemin([slash(imgPath)], {
      destination: dest,
      plugins: [
        imageminMozjpeg({ quality }),
        imageminPngquant({
          quality: [pngQuality, pngQuality]
        })
      ]
    });
    log.info(files);
    shell.openPath(dest);
    mainWindow.webContents.send("image:done");
  } catch (e) {
    console.log(e);
    log.error(e);
  }
}

app.on("window-all-closed", () => {
  if (!isMac) {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});