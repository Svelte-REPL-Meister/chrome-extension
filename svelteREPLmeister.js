!(function addSvelteMeister() {
    const APPtitle = `Svelte REPL Meister`;    // autosave, errortracking, scroll pin/save, search, history

    // one name for id and localStorage variables
    const constSRMerror = 'SRMerror';
    const constSRMsearch = 'SRMsearch';
    const constSRMcurrent = 'SRMcurrent';
    const constrSRMaddhistory = "SRMaddHistory";
    const constrSRMhistorylist = "SRMHistoryList";
    const constSRMfirstload = 'First load';
    const constSRMlastErrorTab = 'lastErrorTab';

    // !! Svelte REPL deletes and creates new CodeMirror instance on each Tab switch
    // !! so we need to grab the correct DOM element every time
    const $CM = () => $class('CodeMirror').CodeMirror;
    const $CMdoc = () => $CM().doc;

    let saveAllDelayInterval;
    let saveAllDelayTime = 1e3 * 60;// after 60 seconds inactivity

    log('starting');

    function SRM_handleTabClick(evt) {
        // todo prevent doubleclick

        // !! the CodeMirror editor is destroyed/created by the Svelte REPL on each tab switch
        // !! this click function executes *after* those new DOM elements are created

        add_SRM_errorHandler();

        $SvelteREPL_tabButton = SvelteREPL_findTabButton(evt.path);

        let tabid = $SvelteREPL_tabButton.id;

        if (!tabManager.has(tabid)) {
            tabManager.addTab(tabid)
            $SvelteREPL_tabButton.classList.add('SRMmanagedTab');
        } else {
            // tabs.currentTab points to previous tab?
            // log('current after switch',tabManager.previousTab.tabid,tabManager.currentTab.tabid);
            tabManager.selectTab(tabid);
        }

        tabManager.currentTab.saveEditorContent();

        showHistoryList();

        $store(constSRMcurrent, tabManager.currentTab.id);

        SvelteREPL_track_and_restore_ScrollPosition();
        SvelteREPL_saveAllFiles();
        SvelteREPL_CodeMirror_EventHandlers();
    }

    /***************************************************************************************************************/
    class SRMTabHistory {
        constructor(tabid, historyid) {
            this.tabid = tabid;
            this.historyid = historyid;
            log('new History', tabid);
            this.value = $CMdoc().getValue();
        }
        update(content) {
            this.value = content;
        }
        restore() {
            //            tabManager.tabs.get(this.tabid).saveHistory();
            $CMdoc().setValue(this.value);
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
            log('saveHistory', historyid, this.size);
            this.set(historyid, new SRMTabHistory(this.tabid, historyid));
        }
    }
    class SRMTab {
        constructor(tabid) {
            this.tabid = tabid;
            this.value = '';
            this.histories = new SRMHistories(tabid);
            this._LINE = 0;          // line number
            this._CH = 0;            // character number in line

            this.saveHistory(constSRMfirstload);
        }
        saveEditorContent(changeObj) {// CodeMirror changeObj
            //log("saveEditor", this.tabid);
            this.value = $CMdoc().getValue();
            if (changeObj) {
                this._LINE = changeObj.from.line + 1;
                this._CH = changeObj.from.ch;
            }
            //let latest=this.histories.get('latest');
            //if(latest)latest.update(this.value);
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
    }

    class SRMTabManager {
        constructor() {
            this._previousTab = false;
            this._currentTab = false;
            this.tabs = new Map();
        }
        has(id) {
            return this.tabs.has(id);
        }
        addTab(id) {
            this.tabs.set(id, new SRMTab(id));
            return this.selectTab(id);
        }
        selectTab(id) {
            this._previousTab = this._currentTab;
            this._currentTab = id;
            return this.tabs.get(id);
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
    }

    function showHistoryList() {
        //let allowPointerEvents = x => $id(constrSRMaddhistory).style.pointerEvents = x||'auto';

        let $history = $id(constrSRMhistorylist);
        if ($history) {
            $history.innerHTML = '';
        } else {
            let $List = $class('CodeMirror').appendChild(document.createElement('DIV'));
            $List.id = "SRMHistory";
            $List.innerHTML = `<b id="${constrSRMaddhistory}">History +</b><div id="${constrSRMhistorylist}"></div>`;
            addEvent({
                selector: '#SRMaddHistory',
                //debounce: 2000,
                func: evt => {
                    //allowPointerEvents('none');
                    tabManager.saveHistory();
                    showHistoryList();
                    //setTimeout( () => allowPointerEvents() , 2000 );
                }
            });
        }

        (tabManager.currentTab.Historyentries).forEach(addHistoryItemHTML);
    }

    function date2time(timestamp) {
        if (typeof timestamp === 'string') return timestamp;
        let D = new Date(timestamp);
        let pad = x => String(x).padStart(2, '0');
        return pad(D.getHours()) + ":" + pad(D.getMinutes()) + ":" + pad(D.getSeconds());
    }

    function addHistoryItemHTML(entry) {
        let [historyid, SRMHistoryItem] = entry;

        const _attr_TABID_______ = 'tabid';
        const _attr_HISTORYID___ = 'historyid';

        const historyIsSameAsEditor = tabManager.currentTab.value === SRMHistoryItem.value;

        const SPAN = (className, content) => `<span class="${className}">${content}</span>`;
        const HTMLrestoreLabel = SPAN("SRMrestoreHistory", date2time(historyid));
        const HTMLdeleteLabelX = SPAN("SRMdeleteHistory", "X")

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
        let $button = document.createElement('DIV');
        $button.setAttribute(_attr_TABID_______, SRMHistoryItem.tabid);
        $button.setAttribute(_attr_HISTORYID___, historyid);
        $button.classList.toggle('SRMequalValue', historyIsSameAsEditor);
        $button.innerHTML = HTMLrestoreLabel + HTMLdeleteLabelX;

        $id(constrSRMhistorylist).prepend($button);  // latest at the top

        addClick('.SRMrestoreHistory', restoreHistory);
        addClick('.SRMdeleteHistory', removeHistory);
    }

    const tabManager = new SRMTabManager();              // store all Tab data

    let $SvelteREPL_tabButton = $id('App');  // initial/first Svelte REPL tab // todo get tab from localStorage

    window.stabs = tabManager;// for debugging purposes

    add_SRM_GUI_Interface();

    add_SRM_SearchBoxListener();

    $class('file-tabs').addEventListener('click', SRM_handleTabClick); // one click event for all Svelte Tabs

    log('enabled');

    $SvelteREPL_tabButton.click();// click first tab 



    // hoisted variables &functions -------------------------------------------------------------------------------

    function $(x) {
        return document.querySelector(x);
    }
    function $class(x) {
        return $('.' + x);
    }
    function $id(x) {
        return $('#' + x);
    }
    function $store(x, y = false) {
        return localStorage[(y ? 'set' : 'get') + 'Item'](x, y);
    }

    function addEvent({
        element = document,
        eventtype = 'click',
        selector = console.error('addEvent: missing selector'),
        func = console.error('addEvent: missing function declaration')
    }) {
        element.querySelector(selector).addEventListener(eventtype, throttled(1000, func));
    }

    function throttled(delay, fn) {
        let lastCall = 0;
        return function (...args) {
            const now = (new Date).getTime();
            if (now - lastCall < delay) {
                return;
            }
            lastCall = now;
            return fn(...args);
        }
    }

    // using console.info because console.log is overwritten in (my) other extensions
    function log() {
        console.info(`%c ${APPtitle}: `, 'background:#FF3E00;color:white', ...arguments); // svelte --prime color background
    }

    function add_SRM_GUI_Interface() {
        // injected HTML
        let HTMLsearch = `<span>search: <input id=${constSRMsearch} type=text placeholder="seen/green tabs!"/>  </span>`;
        let HTMLerror = `<span id=${constSRMerror} style="color:orange;"></span>`;
        let HTMLheader = `<div id=SRMheader>${APPtitle} - ${HTMLsearch} - ${HTMLerror}<span class=${constSRMcurrent}></span>&nbsp;&nbsp;</div>`;

        if (!$id("SRMheader"))
            $class('app-controls').insertAdjacentHTML('afterbegin', HTMLheader);
    }


    function add_SRM_SearchBoxListener() {
        let searchInput = $id(constSRMsearch);
        if (searchInput) searchInput.addEventListener('keyup', SRM_processSearch);//end search code

        //hoisted functions
        function SRM_processSearch(evt) {
            if (evt.key === 'Enter') {
                let txt = evt.target.value;
                log(`Searched: ${txt} `);

                const foundTextLine = (str, i) => str.includes(txt) && [i + 1, str] || false;                               // record found and linenr
                const validLines = x => x && x[1].length < 120;                                                        // disregard very long lines in encoded files
                const txtmatches = str => str.match(new RegExp(txt, "g"));
                const countOccurences = (str, matches = txtmatches(str)) => matches ? matches.length : 0;
                const highlightedSentence = str => str.trim().split(txt).join(`%c${txt}%c`);
                const logSearchResult = x => console.info(x, 'background:lightgreen', 'background:white');// multiple occurences are not highlighted

                for (let [tabid, tab] of tabManager.tabEntries) {

                    const consoleSentence = ([linenr, str]) => countOccurences(str) + ` found in: ${tabid}\t line: ` + linenr + ' \t ' + highlightedSentence(str);
                    const showLineInConsole = x => logSearchResult(consoleSentence(x));

                    tab.value// process one tab editor contents (from memory)
                        .split('\n')
                        // lines become array items: [ linenr , text ]
                        .map(foundTextLine)
                        .filter(validLines)
                        .forEach(showLineInConsole);
                }
            }
        }
    }// addSearchBoxListener

    function add_SRM_errorHandler() {
        if (tabManager.currentTab) {
            if ($('.message.error')) {
                let lastError = $store(constSRMerror);
                if (lastError) {
                    console.error('%c Last Svelte Error in: ', 'background:red;color:white', lastError);
                } else {
                    $store(constSRMerror, tabManager.currentTab.id);
                    //window.alert('Error in: ' + lastError);
                }
                $id(constSRMerror).innerHTML = 'last error in: ' + $store(constSRMerror);
            } else {
                $id(constSRMerror).innerHTML = '';
                localStorage.removeItem(constSRMerror);
            }
        }
    }

    function SvelteREPL_findTabButton(evtpath) {
        const isButton = x => evtpath[x].classList.contains('button');
        const isDocument = x => evtpath[x] === document;
        const notButtonTab = x => !isButton(x) && !isDocument(x);
        let idx = 0;
        while (notButtonTab(idx)) idx++;
        return evtpath[idx];
    }

    function SvelteREPL_saveAllFiles() {
        $('button[title="save"').click();
    }

    function SvelteREPL_track_and_restore_ScrollPosition() {
        const saveTabScollPosition = evt => tabManager.currentTab.scrollTop = $class('CodeMirror-scroll').scrollTop;
        $class('CodeMirror-scroll').addEventListener('scroll', saveTabScollPosition);
        $class('CodeMirror-scroll').scrollTop = tabManager.currentTab.scrollTop; // restore scoll position
    }

    function SvelteREPL_CodeMirror_EventHandlers() {
        const addCodeMirrorEvent = (name, func) => $CM().on(name, func);
        addCodeMirrorEvent("blur", function (CM, evt) {
            log("blur");
        });
        addCodeMirrorEvent("change", function (doc, changeObj) {
            //log("change", tabManager.currentTab.id);
            tabManager.currentTab.saveEditorContent(changeObj);
            setTimeout(() => {
                if ($('.message.error')) {
                    $store(constSRMlastErrorTab, `${tabManager.currentTab.id}:${tabManager.currentTab._LINE}`);
                    console.error($store(constSRMlastErrorTab));
                }
            });

            clearInterval(saveAllDelayInterval);
            saveAllDelayInterval = setInterval(SvelteREPL_saveAllFiles, saveAllDelayTime);
            //tabs.currentTab.saveHistory();
        });
        addCodeMirrorEvent("keyHandled", function (cm, keyname, evt) {
            log("", keyname);
        });
    }

})();