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

let BooksList = {
    containerNode: undefined,
    booksList: {},
    selectedBookId: 0,        // 0 means no id is selected
    searchedIds: [],
    searchedString: "",     //maintain what is being searched

    initialize(containerId, inputId) {
        this.containerNode = document.getElementById(containerId);
        //event listner to listen for books list
        let self = this;

        ipcRenderer.on('get-books-list', (event, list) => {
            //console.log(list) // prints "list of books"
            self.booksList = list;
            self.selectedBookId = 0;  //reset the selected book id;
            self.render();
            //whenever the focus is removed, don't show the books list.
            document.getElementById(inputId).addEventListener("blur", event => {
                document.getElementById(containerId).innerHTML = "";
            });
        });

        //attach the event "keyup" to the input element
        document.getElementById(inputId).addEventListener("keyup", event => {
            self.searchForBooks(event);
        });
    },

    deconstruct() {
        this.booksList = {};
        this.searchedIds = [];
        this.searchedString = "";
        this.selectedBookId = 0;
        this.containerNode = undefined;
    },

    searchForBooks(e) {
        if (e.keyCode === 38) {               //up arrow
            if ((this.selectedBookId === 0) || (this.selectedBookId === this.searchedIds[0])) {  //if no title is active or first title is focused then select the last one
                this.selectedBookId = this.searchedIds[this.searchedIds.length - 1];     //go back to last index
            } else {        //if previous selected Id is at some other index
                let prevIdIndex = this.searchedIds.indexOf(this.selectedBookId);      //get the previously selected id's index
                this.selectedBookId = this.searchedIds[prevIdIndex - 1];      //go back by one index
            }
            e.target.value = this.booksList[this.selectedBookId].title;
            this.render();
            return;
        } else if (e.keyCode === 40) {        //down arrow
            if ((this.selectedBookId === 0) || (this.selectedBookId === this.searchedIds[this.searchedIds.length - 1])) {  //if no title is active or last title is focused then select the first one
                this.selectedBookId = this.searchedIds[0];     //go back to last index
            } else {        //if previous selected Id is at some other index
                let prevIdIndex = this.searchedIds.indexOf(this.selectedBookId);      //get the previously selected id's index
                this.selectedBookId = this.searchedIds[prevIdIndex + 1];      //go back by one index
            }
            e.target.value = this.booksList[this.selectedBookId].title;
            this.render();
            return;
        }

        let str = e.target.value.trim();
        if (this.searchedString !== str) {          //if previous value is same then dont search again
            this.searchedString = str;
            //console.log(str);
            
            ipcRenderer.send('search-for-book', this.searchedString);
        }
    },

    render() {
        if (this.booksList.length === 0) {
            this.containerNode.innerHTML = "";
        } else {
            let html = '<ul class="list-group">';
            this.searchedIds = Object.keys(this.booksList);
            //console.log("ids: " + ids);
            this.searchedIds.forEach(id => {
                let book = this.booksList[id];
                html += `<li class="list-group-item d-flex justify-content-between align-items-center ${id === this.selectedBookId ? "active" : ""}">
                            (${book.code}) ${book.title}
                            <span class="badge badge-primary badge-pill">${book.price}/-</span>
                         </li>`;
            });
            html += '</ul>';
            this.containerNode.innerHTML = html;
        }
    }
}

let POTable = {
    containerNode: undefined,
    booksList: [],
    initialize(containerId) {
        this.containerNode = document.getElementById(containerId);
    },

    deconstruct() {
        this.booksList = [];
    },

    deleteTitle(id) {
        let indexToBeRemoved = -1;
        this.booksList.some((book, index) => {
            if (book.id === id) {
                indexToBeRemoved = index;           //get the index of that item
                return true;
            }
        });

        if (indexToBeRemoved !== -1) {
            this.booksList.splice(indexToBeRemoved, 1);      //remove it from the original array
            this.render();      //render the view again.
        }
    },

    render() {
        let html = `
            <table class="table table-sm table-scrollable">
                <thead>
                    <tr>
                        <th scope="col">#</th>
                        <th scope="col">Code</th>
                        <th scope="col">Title</th>
                        <th scope="col">Quantity</th>
                        <th scope="col">Rate</th>
                        <th scope="col">Amount</th>
                        <th scope="col"></th>
                    </tr>
                </thead>
                <tbody>`;

        this.booksList.forEach((book, index) => {
            html += `<tr>
                        <th scope="row">${index + 1}</th>
                        <td>${book.code}</td>
                        <td>${book.title}</td>
                        <td>${book.qty}</td>
                        <td>${book.price}</td>
                        <td>${book.qty * book.price}</td>
                        <td>
                            <button onclick="POTable.deleteTitle(${book.id})">
                                <svg class="bi bi-trash-fill" width="1em" height="1em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                    <path fill-rule="evenodd" d="M2.5 1a1 1 0 00-1 1v1a1 1 0 001 1H3v9a2 2 0 002 2h6a2 2 0 002-2V4h.5a1 1 0 001-1V2a1 1 0 00-1-1H10a1 1 0 00-1-1H7a1 1 0 00-1 1H2.5zm3 4a.5.5 0 01.5.5v7a.5.5 0 01-1 0v-7a.5.5 0 01.5-.5zM8 5a.5.5 0 01.5.5v7a.5.5 0 01-1 0v-7A.5.5 0 018 5zm3 .5a.5.5 0 00-1 0v7a.5.5 0 001 0v-7z" clip-rule="evenodd"/>
                                </svg>
                            </button>
                        </td>
                    </tr>`;
        });
                    
        this.containerNode.innerHTML = html + '</tbody></table>';
        //if there are no books in the table, then disable the button else enable it.
        this.booksList.length ? document.getElementById('btnCheckTitles').disabled = false : document.getElementById('btnCheckTitles').disabled = true;
    }
}

//add the selected title to the table
const addToTable = (dvTitleId, dvQtyId) => {
    let titleInputNode = document.getElementById(dvTitleId),
        qtyInputNode = document.getElementById(dvQtyId);
    let titleToAdd = {
        [BooksList.selectedBookId]: {
            ...BooksList.booksList[BooksList.selectedBookId],
            qty: parseInt(qtyInputNode.value),
        }
    };
    let id = parseInt(Object.keys(titleToAdd)[0]);
    POTable.booksList.push({ id, ...titleToAdd[id] });
    POTable.render();
    titleInputNode.value = "";      //clear out the values
    qtyInputNode.value = "";
    titleInputNode.focus();
};

const checkTitles = (event) => {
    const frm = event.target;
    const inputs = {};
    //if (!frm.elements["rdPO_type"].validity.valid) return;
    inputs.POType = frm.elements["rdPO_type"].value;

    if (!frm.elements["inReference"].validity.valid) return;
    inputs.ref = frm.elements["inReference"].value.trim();

    if (!frm.elements["inRefDate"].validity.valid) return;
    inputs.refDate = frm.elements["inRefDate"].value;

    if (!frm.elements["inPartyCode"].validity.valid) return;
    inputs.partyCode = frm.elements["inPartyCode"].value.trim();

    if (!frm.elements["inRefPartyCode"].validity.valid) return;
    inputs.refPartyCode = frm.elements["inRefPartyCode"].value.trim();

    inputs.titles = POTable.booksList;

    document.getElementById("dvGetDetails").hidden = true;      //hide the details component
    document.getElementById("dvChecking").hidden = false;       //Show checking sign

    //Checking Logic


    document.getElementById("dvResults").hidden = false;        //Show results page
    
};

//function that takes us back to main window
const goToMainWindow = () => {
    //clean out all the data first;

    LoadTemplate("CheckType", () => { POTable.deconstruct(); BooksList.deconstruct(); }, null);
};
