const { ipcRenderer } = require('electron');
let catalouge = "";             //this holds the catalouge in JSON format
let container = document.getElementById("container");

window.addEventListener("load", function () {
    LoadTemplate("CatalougeSelect");
});

//Load html template by getting just the id of the template along with the before and after call functions
const LoadTemplate = (id, callbefore, callafter) => {
    let templates = document.getElementsByTagName("template");
    for (let i = 0; i < templates.length; i++) {
        if (templates[i].id === id) {
            if (typeof callbefore === "function") {
                callbefore();
            }

            container.innerHTML = templates[i].innerHTML;

            if (typeof callafter === "function") {
                callafter();
            } 
        } 
    }
};

//function that reads excel file by giving filepath to main process.
const ReadCatalouge = () => {
    let path = document.getElementById("inCatalouge").files[0].path;

    ipcRenderer.once('take-excelJson', (event, data) => {
        console.log(data) // prints "data"
        catalouge = data;
        LoadTemplate("CheckType");
    });

    ipcRenderer.send('get-me-excel', path);
};

//function that searches for the books from the given string.
const SeachForBooks = (str) => {
    //console.log('SeachForBooks is triggered');
    console.log(str);
}
