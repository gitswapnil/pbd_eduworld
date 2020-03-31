const { ipcRenderer } = require('electron');
let container = document.getElementById("container");

window.addEventListener("load", () => LoadTemplate("CheckType"));

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

class BooksList {
    #containerNode;
    #booksList;
    #selectedBookId = 0;        // 0 means no id is selected
    #searchedIds;
    #seachedString;     //maintain what is being searched

    constructor(containerId, inputId) {
        this.#containerNode = document.getElementById(containerId);
        //event listner to listen for books list
        let self = this;

        ipcRenderer.on('get-books-list', (event, list) => {
            //console.log(list) // prints "list of books"
            self.#booksList = list;
            self.#selectedBookId = 0;  //reset the selected book id;
            self.render();
            //whenever the focus is removed, don't show the books list.
            document.getElementById(inputId).addEventListener("blur", event => {
                document.getElementById(containerId).innerHTML = "";
            });
        });

        document.getElementById(inputId).addEventListener("keyup", event => {
            self.searchForBooks(event);
        });
    }

    searchForBooks(e) {
        if (e.keyCode === 38) {               //up arrow
            if ((this.#selectedBookId === 0) || (this.#selectedBookId === this.#searchedIds[0])) {  //if no title is active or first title is focused then select the last one
                this.#selectedBookId = this.#searchedIds[this.#searchedIds.length - 1];     //go back to last index
            } else {        //if previous selected Id is at some other index
                let prevIdIndex = this.#searchedIds.indexOf(this.#selectedBookId);      //get the previously selected id's index
                this.#selectedBookId = this.#searchedIds[prevIdIndex - 1];      //go back by one index
            }
            e.target.value = this.#booksList[this.#selectedBookId].title;
            this.render();
            return;
        } else if (e.keyCode === 40) {        //down arrow
            if ((this.#selectedBookId === 0) || (this.#selectedBookId === this.#searchedIds[this.#searchedIds.length - 1])) {  //if no title is active or last title is focused then select the first one
                this.#selectedBookId = this.#searchedIds[0];     //go back to last index
            } else {        //if previous selected Id is at some other index
                let prevIdIndex = this.#searchedIds.indexOf(this.#selectedBookId);      //get the previously selected id's index
                this.#selectedBookId = this.#searchedIds[prevIdIndex + 1];      //go back by one index
            }
            e.target.value = this.#booksList[this.#selectedBookId].title;
            this.render();
            return;
        }

        let str = e.target.value.trim();
        if (this.#seachedString !== str) {          //if previous value is same then dont search again
            this.#seachedString = str;
            //console.log(str);
            
            ipcRenderer.send('search-for-book', this.#seachedString);
        }
    }

    render() {
        if (this.#booksList.length === 0) {
            this.#containerNode.innerHTML = "";
        } else {
            let html = '<ul class="list-group">';
            this.#searchedIds = Object.keys(this.#booksList);
            //console.log("ids: " + ids);
            this.#searchedIds.forEach(id => {
                let book = this.#booksList[id];
                html += `<li class="list-group-item d-flex justify-content-between align-items-center ${id === this.#selectedBookId ? "active" : ""}">
                            (${book.code}) ${book.title}
                            <span class="badge badge-primary badge-pill">${book.price}/-</span>
                         </li>`;
            });
            html += '</ul>';
            this.#containerNode.innerHTML = html;
        }
    }
}

////function that reads excel file by giving filepath to main process.
//const ReadCatalouge = () => {
//    let path = document.getElementById("inCatalouge").files[0].path;

//    ipcRenderer.once('take-excelJson', (event, data) => {
//        console.log(data) // prints "data"
//        catalouge = data;
//        LoadTemplate("CheckType");
//    });

//    ipcRenderer.send('get-me-excel', path);
//};

//function that takes us back to main window
const goToMainWindow = () => {
    //clean out all the data first;

    LoadTemplate("CheckType");
};
