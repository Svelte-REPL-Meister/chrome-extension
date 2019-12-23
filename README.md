# Svelte REPL Meister Chrome Extension

enhances the [Svelte REPL: https://svelte.dev/repl/](https://svelte.dev/repl/) with:

* Autosave on Tab switch and after 1 minute inactive
* Scrollbar position save between Tabs
* Global search in selected N Tabs
* Sourcecode History per Tab

## Install the Browser Extension from the [Chrome Web Store](https://chrome.google.com/webstore/detail/svelte-repl-meister/nmncamfbjoeickkimpgfghdiklhfbikh)

## OR run the Browser Extension from your local system:

1. Clone this repo to a local directory

    a. On Windows **disable** the creation of the **Thumbs.db** file: 
    
    1. select the Advanced Attributes properties of the created folder 
    2. UNselect the Allow Index files

2. Open **[chrome://extensions](chrome://extensions/)** in the Chrome Browser

3. Switch to Developer Mode (top right)

4. Click the **[Load Unpacked]** button

5. Select directory from step 1

6. The REPL extension will now activate on any https://svelte.dev/repl page

7. After making sourcefile edits you have to refresh the extension in [chrome://extensions](chrome://extensions)
