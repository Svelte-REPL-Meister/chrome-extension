
// Svelte REPL Meister Chrome Extension
// Adds Auto-save, Global Search, Scroll position saving and Code History per Tab
// Injected in every https://svelte.dev/repl page:

// Store: https://chrome.google.com/webstore/detail/svelte-repl-meister/nmncamfbjoeickkimpgfghdiklhfbikh

// GitHub: https://github.com/Svelte-REPL-Meister/chrome-extension

// LICENSE: unlicense.org

// VERSION HISTORY
// ===============
// dec 23 2019 - v1.0 - initial release
// jan  3 2020 - v1.1 - fixed duplicate handlers/code search bug
//                      added optional trace 
// jan 13 2020 - v1.2 - fixed new tab error 
//                      added double click = search selected word
//                      added set trace mode with click on Title
//                      added save last selected Tab in localStorage

// Publish instructions
// ====================
// update versionnr in APPtitle below
// Update versionnr in manifest.json
// add version comments above
// publish code to GitHub: commit, push
// create ZIP file (open Explorer, dragged newer files into svelteREPLmeister.zip)
// upload ZIP in Google Developers dashboard (https://chrome.google.com/webstore/devconsole) (package->Upload Updated package)
// Copy version comments to Extension description
// Save Draft, Publish

!(function addSvelteMeister() {

    const APPtitle = `Svelte REPL Meister v1.2`;

    // extra console logging information, toggle on/off with click on APPtitle
    let trace = false;//can not use: document.location.href.includes('trace');//Svelte resets/reloads URI

    // one name for id variables, classes
    const const_id_SRMerror = "SRMerror";
    const const_id_SRMsearch = "SRMsearch";
    const const_class_SRMcurrent = "SRMcurrent";
    const const_id_SRMaddhistory = "SRMaddHistory";
    const const_id_SRMhistorylist = "SRMHistoryList";
    const const_store_currentTab = "currentTab";
    const constSRMrestoreHistory = "SRMrestoreHistory";
    const constSRMdeleteHistory = "SRMdeleteHistory";
    const const_class_SRMmanagedTab = "SRMmanagedTab"
    const constSRMfirstload = "First load";
    const constSRMlastErrorTab = "lastErrorTab";

    // !! Svelte REPL deletes and creates new CodeMirror instance on each Tab switch
    // !! so we need to grab the correct DOM element every time
    const $CM = () => $class("CodeMirror").CodeMirror;

    let saveAllDelayInterval;
    let saveAllDelayTime = 1000 * 60;// after 60 seconds inactivity

    //!! Svelte REPL recreates CodeMIrror instance, so EventHandlers have to be re-attachecd, without creating duplicate handlers
    let CodeMirrorEventHandlers = [];

    log('initialized');

    function SRM_handleTabClick(evt) {
        // todo prevent doubleclick

        // !! the CodeMirror editor is destroyed/created by the Svelte REPL on each tab switch
        // !! this click function executes *after* those new DOM elements are created

        // experimental feature #5
        check_for_Svelte_Errors_report_to_console();

        $clicked_SvelteREPL_tabButton = SvelteREPL_findTabButton(evt.path);

        let tabid = $clicked_SvelteREPL_tabButton.id;

        if (!tabManager.has(tabid)) {
            tabManager.addTab(tabid)
            $clicked_SvelteREPL_tabButton.classList.add(const_class_SRMmanagedTab);
        } else {
            tabManager.selectTab(tabid);
        }

        $localStorage(const_store_currentTab, tabid);

        tabManager.currentTab.saveEditorContent();

        showHistoryList();

        $localStorage(const_class_SRMcurrent, tabManager.currentTab.id);

        SvelteREPL_track_and_restore_ScrollPosition();
        SvelteREPL_saveAllFiles();
        SvelteREPL_CodeMirror_EventHandlers();
    }


    /** classes ************************************************************************************************************
     * 
     * SRMTabManager - global variable: srm
     * - _previousTab
     * - _currentTab
     * - tabs #Map() of SRMTab
     * - tab {} reference to tabs for CLI use in F12 console: srm.App.clear()
     * - has(id)
     * - addTab(id)
     * - selectTab(id)
     * - get tabEntries()
     * - get previousTab()
     * - get currentTab()
     * - saveHistory()
     * - clear()
     *    SRMTab
     *    - tabid
     *    - value
     *    - histories #SRMHistories()
     *    - saveEditorContent(changeObj)
     *    - saveHistory(label)
     *    - deleteHistory(historyid)
     *    - get Historyentries()
     *       SRMHistories
     *       - tabid
     *       - save([historid])
     *          SRMTabHistory
     *          - tabid
     *          - historyid
     *          - value
     *          - update(content)
     *          - restore()
     *          - remove()
     * 
     */
    class SRMTabHistory {
        constructor(tabid, historyid) {
            this.tabid = tabid;
            this.historyid = historyid;
            if (trace) log(`new History (${tabid}) ${historyid}`);
            this.value = $CM().doc.getValue();
        }
        update(content) {
            this.value = content;
        }
        restore() {
            //            tabManager.tabs.get(this.tabid).saveHistory();
            $CM().doc.setValue(this.value);
        }
        remove() {
            tabManager.tabs.get(this.tabid).deleteHistory(this.historyid);
        }
    }
    class SRMHistories extends Map {
        constructor(tabid) {
            super();
            this.tabid = tabid;
        }
        save(historyid = new Date() / 1) {
            this.set(historyid, new SRMTabHistory(this.tabid, historyid));
        }
    }
    class SRMTab {
        constructor(tabid) {
            this.tabid = tabid;
            this.value = "";
            this.histories = new SRMHistories(tabid);
            this._LINE = 0;          // line number
            this._CH = 0;            // character number in line

            this.saveHistory(constSRMfirstload);
        }
        saveEditorContent(changeObj) {// CodeMirror changeObj
            this.value = $CM().doc.getValue();
            if (changeObj) {
                this._LINE = changeObj.from.line + 1;
                this._CH = changeObj.from.ch;
            }
            if (trace) log("saveEditor", this.tabid, this.value.length, 'bytes', 'line:', this._LINE, this, changeObj ? 'By CodeMirror Event' : '');
        }
        saveHistory(label) {
            this.histories.save(label);
        }
        deleteHistory(historyid) {
            this.histories.delete(historyid);
        }
        get Historyentries() {
            return [...this.histories.entries()];
        }
        unload() {
            $id(this.tabid).classList.remove(const_class_SRMmanagedTab);
            tabManager.tabs.delete(this.tabid);
            $id("App").click();
        }
    }
    class SRMTabManager {
        constructor() {
            this._previousTab = false;
            this._currentTab = false;
            this.tabs = new Map();
            this.tab = {};
        }
        has(id) {
            return this.tabs.has(id);
        }
        addTab(id) {
            this.tabs.set(id, new SRMTab(id));
            this.tab[id] = this.tabs.get(id);
            return this.selectTab(id);
        }
        selectTab(id) {
            this._previousTab = this._currentTab;
            this._currentTab = id;
            let _tab = this.tabs.get(id)
            if (trace) log(id, _tab);
            return _tab;
        }
        get tabEntries() {
            return this.tabs.entries();
        }
        get previousTab() {
            return this.tabs.get(this._previousTab);
        }
        get currentTab() {
            return this.tabs.get(this._currentTab);
        }
        saveHistory() {
            this.currentTab.saveHistory();
            //showHistoryList();
        }
        clear() {
            for (let [tabid, tab] of tabManager.tabEntries) {
                tab.unload();
            }
        }
    }

    //!! Init
    const tabManager = new SRMTabManager();             // store all Tab data

    let selectedTab = $localStorage(const_store_currentTab) || "App"; // initial/first Svelte REPL tab
    let $clicked_SvelteREPL_tabButton = $id(selectedTab);

    window.srm = tabManager;                            // for CLI actions in F12 console

    add_SRM_GUI_Interface();

    add_SRM_SearchBoxListener();

    $class("file-tabs").addEventListener("click", SRM_handleTabClick); // one click event for all Svelte Tabs

    $clicked_SvelteREPL_tabButton.click();// click first tab 


    /** hoisted functions ************************************************************************************************************
     * $(selector)
     * $class(classname)
     * $id(id)
     * addEvent(...)
     * throttled(delay,func)
     * log(...arguments)
     * add_SRM_GUI_Interface()
     * add_SRM_SearchBoxListener()
     * SvelteREPL_findTabButton(evtpath)
     * SvelteREPL_saveAllFiles()
     * SvelteREPL_track_and_restore_ScrollPosition()
     * SvelteREPL_CodeMirror_EventHandlers()
     * showHistoryList()
     * date2time(timestamp)
     * addHistoryItemHTML(entry)
     * check_for_Svelte_Errors_report_to_console()
     */

    function $(x) {
        return document.querySelector(x);
    }
    function $class(x) {
        return $("." + x);
    }
    function $id(x) {
        return $("#" + x);
    }

    function $localStorage(x, y = false) {// getter and setter
        return localStorage[(y ? "set" : "get") + "Item"](x, y);
    }

    function addEvent({
        element = document,
        eventtype = "click",
        selector = console.error("addEvent: missing selector"),
        func = console.error("addEvent: missing function declaration")
    }) {
        element
            .querySelector(selector)
            .addEventListener(eventtype, throttled(1000, func));
    }

    function throttled(delay, fn) {
        let lastCall = 0;
        return function (...args) {
            const now = (new Date).getTime();
            if (now - lastCall < delay) return;
            lastCall = now;
            return fn(...args);
        }
    }

    function log() {
        // using console.info because console.log is overwritten in (my) other extensions
        console.info(`%c ${APPtitle}: `, "background:#FF3E00;color:white", ...arguments); // svelte --prime color background
    }

    /**
     * Main Svelte REPL Meister UI
     */
    function add_SRM_GUI_Interface() {
        // injected HTML
        let HTMLsearch = `<span>search: <input id=${const_id_SRMsearch} type=text placeholder="seen/green tabs!"/>  </span>`;
        let HTMLerror = `<span id=${const_id_SRMerror} style="color:orange;"></span>`;
        let HTMLheader = `<div id=SRMheader><span id="apptitle">${APPtitle}</span> - ${HTMLsearch} - ${HTMLerror}<span class=${const_class_SRMcurrent}></span>&nbsp;&nbsp;</div>`;

        if (!$id("SRMheader"))
            $class("app-controls").insertAdjacentHTML("afterbegin", HTMLheader);

        document
            .getElementById('apptitle')
            .addEventListener("click", () => {
                trace = !trace;
                log('trace', trace ? 'ON' : 'OFF', tabManager);
            });
    }

    /**
     * add searchbox listener, output search results to the F12 console
     */
    function add_SRM_SearchBoxListener() {
        let searchInput = $id(const_id_SRMsearch);
        if (searchInput) searchInput.addEventListener("keyup", SRM_processSearch);//end search code

        function SRM_processSearch(evt) {
            if (evt.key === "Enter") {
                search_SRM_Tabs(evt.target.value);
            }
        }
    }// addSearchBoxListener

    /**
     * search all registered (green) Tabs for txt
     * output to F12 Console
     */
    function search_SRM_Tabs(txt = '') {
        log(`Searched: ► ${txt} ◄  in ${tabManager.tabs.size} tabs `);

        let highlightLineNr = "background:lightgreen";
        let highlightText = "background:lightgreen";

        const foundTextLine = (str, i) => str.includes(txt) && [i + 1, str] || false;            // record found and linenr
        const validLines = x => x && x[1].length < 120;                                          // disregard very long lines in (encoded) files
        const txtmatches = str => str.match(new RegExp(txt, "g"));                               // find txt in str
        const countOccurences = (
            str,                        // find txt in str
            matches = txtmatches(str)   // abuse as parameter to assign a new variable
        ) => matches ? matches.length : 0;
        const highlightedSentence = str => str.trim().split(txt).join(`%c${txt}%c`);
        const logSearchResult = str => console.info(str, highlightLineNr, highlightText);// multiple occurences are not highlighted
        const paddedLinenr = x => String(x).padStart(3, " ");

        for (let [tabid, tab] of tabManager.tabEntries) {

            const consoleSentence = ([linenr, str]) => countOccurences(str) + ` found in: ${tabid} \t line: %c${paddedLinenr(linenr)} \t ` + highlightedSentence(str);
            const showLineInConsole = x => logSearchResult(consoleSentence(x));

            tab.value// process one tab editor contents (from memory)
                .split("\n")
                // lines become array items: [ linenr , text ]
                .map(foundTextLine)
                .filter(validLines)
                .forEach(showLineInConsole);
        }
    }
    /**
     * Find the correct SvelteTab from the Tab click event (attached to the parent DIV)
     * @param {*} evtpath 
     */
    function SvelteREPL_findTabButton(evtpath) {
        const classContainsButton = x => evtpath[x].classList.contains("button");
        const hasClassList = x => evtpath[x].classList;
        const isClassButton = x => hasClassList(x) && classContainsButton(x);
        const isButton = x => evtpath[x].nodeName === 'BUTTON' || isClassButton(x);
        const isDocument = x => evtpath[x] === document;
        const notButtonTab = x => !isButton(x) && !isDocument(x);

        if (trace) log(evtpath);
        let idx = 0;
        while (notButtonTab(idx)) idx++;

        let buttonElement = evtpath[idx];
        if (trace) log(buttonElement);
        return buttonElement;
    }

    function SvelteREPL_saveAllFiles() {
        $('button[title="save"').click();
    }

    function SvelteREPL_track_and_restore_ScrollPosition() {
        const saveTabScollPosition = evt => tabManager.currentTab.scrollTop = $class("CodeMirror-scroll").scrollTop;

        $class("CodeMirror-scroll").addEventListener("scroll", saveTabScollPosition);
        $class("CodeMirror-scroll").scrollTop = tabManager.currentTab.scrollTop; // restore scoll position
    }

    /**
     * add Event Handlers to the active CodeMirror instance
    */
    function SvelteREPL_CodeMirror_EventHandlers() {
        CodeMirrorEventHandlers.map(removehandler => removehandler());// remove all added CodeMiror Handlers

        const addCodeMirrorEvent = (name, func) => {
            $CM().on(name, func);                   // attach CodeMirror handler
            return () => $CM().off(name, func);     // return CodeMirror off handler FUNCTION to remove Handler
        }

        //log('add CodeMirror CHANGE event', tabManager.currentTab.tabid);
        CodeMirrorEventHandlers.push(
            // CodeMirror CHANGE
            addCodeMirrorEvent("change", CodeMirror_Event_Change),
            // CodeMirror DoubleClick : search selection txt in SRM tabs
            addCodeMirrorEvent("dblclick",
                function () {
                    let searchText = $CM().getSelection();
                    $id(const_id_SRMsearch).value = searchText;
                    search_SRM_Tabs(searchText);
                }
            ),
            addCodeMirrorEvent("keyHandled",
                function (cm, keyname, evt) {
                    if (trace) log("keyHandled", keyname, evt);
                }
            ),
            addCodeMirrorEvent("blur",
                function (cm, evt) {
                    if (trace) log("blur", cm, tabManager.currentTab);
                })

        );//push

    }//SvelteREPL_CodeMirror_EventHandlers()

    /**
     * CodeMirror Change Event
     */
    function CodeMirror_Event_Change(doc, changeObj) {

        if (changeObj.origin === "setValue") {
            //!! race condition when switching Tabs: CodeMirror created by Svelte is the NEW tab!
            //!! but currentTab is still the previous tab
            //!! can NOT do:
            //!! tabManager.currentTab.saveEditorContent(changeObj);
        } else if (changeObj.origin === "+input") {                 // new content added in tab
            tabManager.currentTab.saveEditorContent(changeObj);
        } else {
            log("CodeMirror change event:", changeObj.origin, tabManager.currentTab.tabid, changeObj);
        }

        // experimental feature #5 detecting error locations
        setTimeout(() => {
            if ($(".message.error")) {
                $localStorage(constSRMlastErrorTab, `${tabManager.currentTab.id}:${tabManager.currentTab._LINE}`);
                console.error($localStorage(constSRMlastErrorTab));
            }
        });

        clearInterval(saveAllDelayInterval);
        saveAllDelayInterval = setInterval(SvelteREPL_saveAllFiles, saveAllDelayTime);
    }

    /**
     * display the HistoryList for the current Tab
     */
    function showHistoryList() {

        let $history = $id(const_id_SRMhistorylist);
        if ($history) {
            // clean existing Tab History List
            $history.innerHTML = "";
        } else {
            // create new Tab History List
            let $List = $class("CodeMirror").appendChild(document.createElement("DIV"));
            $List.id = "SRMHistory";// used by CSS
            $List.innerHTML = `<b id="${const_id_SRMaddhistory}">History +</b><div id="${const_id_SRMhistorylist}"></div>`;
            addEvent({
                selector: "#" + const_id_SRMaddhistory,
                func: evt => {
                    tabManager.saveHistory();
                    showHistoryList();
                }
            });
        }

        // add History List Items
        (tabManager.currentTab.Historyentries).forEach(addHistoryItemHTML);
    }

    /**
     * convert timestamp to HH:MM:SS notation
     * @param {*} timestamp 
     */
    function date2time(timestamp) {
        if (typeof timestamp === "string") return timestamp;

        const D = new Date(timestamp);
        const pad = x => String(x).padStart(2, "0");

        return pad(D.getHours()) + ":" + pad(D.getMinutes()) + ":" + pad(D.getSeconds());
    }

    /**
     * Add HistoryList DOM entry for new current tab content
     * @param {*} entry 
     */
    function addHistoryItemHTML(entry) {
        let [historyid, SRMHistoryItem] = entry;

        const historyIsSameAsEditor = tabManager.currentTab.value === SRMHistoryItem.value;

        const SPAN = (className, content) => `<span class="${className}">${content}</span>`;
        const HTMLrestoreLabel = SPAN(constSRMrestoreHistory, date2time(historyid));
        const HTMLdeleteLabelX = SPAN(constSRMdeleteHistory, "X")

        const restoreHistory = evt => {
            SRMHistoryItem.restore();
            showHistoryList();
        }
        const removeHistory = evt => {
            $button.remove();
            SRMHistoryItem.remove($button)
            showHistoryList();
        };

        const addClick = (selector, func) => addEvent({ element: $button, selector, func });

        //create DOM element in HistoryList
        let $button = document.createElement("DIV");

        $button.setAttribute("tabid", SRMHistoryItem.tabid);
        $button.setAttribute("historyid", historyid);
        $button.classList.toggle("SRMequalValue", historyIsSameAsEditor);
        $button.innerHTML = HTMLrestoreLabel + HTMLdeleteLabelX;

        $id(const_id_SRMhistorylist).prepend($button);  // latest at the top

        addClick("." + constSRMrestoreHistory, restoreHistory);
        addClick("." + constSRMdeleteHistory, removeHistory);
    }

    //feature #5 , try some better error reporting
    function check_for_Svelte_Errors_report_to_console() {
        if (tabManager.currentTab) {
            if ($(".message.error")) {
                let lastError = $localStorage(const_id_SRMerror);
                if (lastError) {
                    console.error("%c Last Svelte Error in: ", "background:red;color:white", lastError);
                } else {
                    $localStorage(const_id_SRMerror, tabManager.currentTab.id);
                }
                $id(const_id_SRMerror).innerHTML = "last error in: " + $localStorage(const_id_SRMerror);
            } else {
                $id(const_id_SRMerror).innerHTML = "";
                localStorage.removeItem(const_id_SRMerror);
            }
        }
    }

})();