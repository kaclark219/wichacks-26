const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

const isDev = process.env.ELECTRON_DEV === "1";
const devUrl = process.env.ELECTRON_RENDERER_URL || "http://localhost:5173";
const useTransparentWindow = process.env.ELECTRON_TRANSPARENT !== "0";
const disableGpu = process.env.ELECTRON_DISABLE_GPU === "1";
const FLASK_URL = process.env.FLASK_URL || "http://localhost:5050";

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

// flask server analyze frame handler
ipcMain.handle("analyze-frame", async (_event, payload) => {
    // payload: { bytes: Uint8Array, mime: string, userId: string }
    const { bytes, mime = "image/jpeg", userId = "default" } = payload || {};

    if (!bytes || bytes.length === 0) {
        return { ok: false, error: "No frame bytes provided" };
    }

    try {
        const form = new FormData();
        const blob = new Blob([bytes], { type: mime });
        form.append("frame", blob, "frame.jpg");

        const url = `${FLASK_URL}/api/analyze_frame?user_id=${encodeURIComponent(userId)}`;
        const res = await fetch(url, { method: "POST", body: form });

        const text = await res.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch {
            data = { raw: text };
        }

        return { ok: res.ok, status: res.status, data };
    } catch (err) {
        return { ok: false, error: String(err) };
    }
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