const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
    ping: () => "pong",
    closeWindow: () => ipcRenderer.invoke("window-close"),
    updateTimerState: (state) => ipcRenderer.send("timer-state-update", state),
    analyzeFrame: (payload) => ipcRenderer.invoke("analyze-frame", payload),
    sendObservation: (payload) => ipcRenderer.invoke("send-observation", payload),
});