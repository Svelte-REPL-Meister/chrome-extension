chrome.tabs.getSelected(null, tab => {
    if (tab.url.includes('svelte.dev/repl')) {

        let $ = x => document.querySelector(x);
        let $id = x => $('#' + x);

        $id('Instructions').setAttribute('hidden', 'hidden');
        $id('Options').removeAttribute('hidden');
    }
});