const { app, BrowserWindow, ipcMain } = require('electron');

function createWindow() {
    // Create the browser window.
    let win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true
        }
    })

    // and load the index.html of the app.
    win.loadFile('index.html')
}

app.whenReady().then(createWindow)


ipcMain.on('get-me-excel', (event, arg) => {
    console.log(arg) // prints "ping"
    event.reply('take-excelJson', 'pong');
})