const { app, BrowserWindow, ipcMain } = require('electron');
const Excel = require('exceljs');

function createWindow() {
    // Create the browser window.
    let win = new BrowserWindow({
        webPreferences: {
            nodeIntegration: true
        }
    })

    win.maximize();         //maximize the window size
    // and load the index.html of the app.
    win.loadFile('index.html');
}

app.whenReady().then(createWindow)


ipcMain.once('get-me-excel', (event, filePath) => {                 //main process listening to get request once from renderer process to read the catalouge excel film
    console.log(filePath) // prints "file path"

    var workbook = new Excel.Workbook();
    workbook.xlsx.readFile(filePath).then(function () {
        let worksheet = workbook.getWorksheet(1);
        let firstRow = worksheet.getRow(1).values.map(val => val.toLowerCase());
        //console.log("firstRow: " + firstRow);
        let codeIndex = firstRow.indexOf("code");
        let titleIndex = firstRow.indexOf("title");
        let priceIndex = (firstRow.indexOf("price") || firstRow.indexOf("price with dvd") || firstRow.indexOf("price with crayons"));
        //console.log(`codeIndex: ${codeIndex}, titleIndex: ${titleIndex}, priceIndex: ${priceIndex}`);
        let retData = "{data: ";
        worksheet.eachRow((row, rowNumber) => {
            retData += row.getCell(codeIndex).value;
        });
        event.reply('take-excelJson', retData);
    });
});

ipcMain.on('search-for-book', (event, str) => {                 //main process listening to get request once from renderer process to search for books for a given string
    console.log(str) // prints given string
    
    var sqlite3 = require('sqlite3');
    var db = new sqlite3.Database('./data/titles_checker.db');
    let retData = {};

    db.serialize(function () {
        db.all(`SELECT catalouge.id, code, (sections.name || " " || title) AS title, price, ("(" || code || ") " || sections.name || " " || title) AS uniqueName FROM catalouge 
                    LEFT JOIN sections ON catalouge.section_id = sections.id
                    LEFT JOIN series ON catalouge.series_id = series.id
                    WHERE uniqueName LIKE "%${str}%"`, function (err, rows) {
                if (err) {
                    throw new Error(err);
                    return;
                }
                //console.log(rows);
                rows.forEach(row => {
                    retData[row.id] = { code: row.code, title: row.title, price: row.price };
                });                

                event.reply('get-books-list', retData);
        });
    });

    db.close();
    
});
