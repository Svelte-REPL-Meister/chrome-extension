window.addEventListener('load', () => {
    setTimeout(() => {
        let $Script = document.createElement('script');
        $Script.src = chrome.runtime.getURL('svelteREPLmeister.js');
        document.head.append($Script);
    }, 1000);
});