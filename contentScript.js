//!! wait till Svelte REPLE has initiated first Tab / CodeMirror instance
window.addEventListener('load', () => {
    if (!location.href.includes('nomeister')) // optional disabled REPL Meister without uninstalling extension
        setTimeout(() => {
            let $Script = document.createElement('script');
            $Script.src = chrome.runtime.getURL('svelteREPLmeister.js');
            document.head.append($Script);
        }, 3000);// brutal delay should be enough (only at the start of your REPL session)
});