const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

const isDev = process.env.ELECTRON_DEV === "1";
const devUrl = process.env.ELECTRON_RENDERER_URL || "http://localhost:5173";
const useTransparentWindow = process.env.ELECTRON_TRANSPARENT !== "0";
const disableGpu = process.env.ELECTRON_DISABLE_GPU === "1";

if (disableGpu) {
    app.disableHardwareAcceleration();
    app.commandLine.appendSwitch("disable-gpu");
}

let mainWindow;

// global ipc handlers
ipcMain.handle("window-close", () => {
    if (mainWindow) {
        mainWindow.close();
    }
});

ipcMain.on("timer-state-update", (event, state) => {
    console.log("Timer state received:", state);
});

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1100,
        height: 750,
        transparent: useTransparentWindow,
        frame: !useTransparentWindow,
        backgroundColor: useTransparentWindow ? "#00000000" : "#1e1e1e",
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    if (isDev) {
        mainWindow.loadURL(devUrl).catch(() => {
            mainWindow.loadFile(path.join(__dirname, "../renderer/dist/index.html"));
        });
        mainWindow.webContents.openDevTools({ mode: "detach" });
    } else {
        mainWindow.loadFile(path.join(__dirname, "../renderer/dist/index.html"));
    }

    mainWindow.webContents.on("did-fail-load", (_event, code, description, validatedURL) => {
        console.error("Renderer failed to load:", code, description, validatedURL);
    });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});