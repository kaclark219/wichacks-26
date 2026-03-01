const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
    ping: () => "pong",
    closeWindow: () => ipcRenderer.invoke("window-close"),
    updateTimerState: (state) => ipcRenderer.send("timer-state-update", state),
    analyzeFrame: (payload) => ipcRenderer.invoke("analyze-frame", payload),
    sendObservation: (payload) => ipcRenderer.invoke("send-observation", payload),
    startWindowDrag: (payload) => ipcRenderer.send("window-drag-start", payload),
    updateWindowDrag: (payload) => ipcRenderer.send("window-drag-update", payload),
    endWindowDrag: () => ipcRenderer.send("window-drag-end"),
});