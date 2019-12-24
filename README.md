# Svelte REPL Meister Chrome Extension

Enhances the [Svelte REPL: https://svelte.dev/repl/](https://svelte.dev/repl/) with:

* Autosave on Tab switch and after 1 minute inactive
* Scrollbar position save between Tab switches 
* Global search in selected (green) Tabs, output to F12 Console
* Sourcecode History per Tab

## Install the Browser Extension from the [Chrome Web Store](https://chrome.google.com/webstore/detail/svelte-repl-meister/nmncamfbjoeickkimpgfghdiklhfbikh)

## OR run the Browser Extension from your local system:

1. Clone this repo to a local directory

    1. On Windows: **disable** the creation of the **Thumbs.db** file:  
    select the Advanced Attributes properties of the created folder  
    UNselect the Allow Index files

2. Open **[chrome://extensions](chrome://extensions/)** in the Chrome Browser

3. Switch to Developer Mode (top right)

4. Click the **[Load Unpacked]** button

5. Select directory from step 1

6. The REPL extension will now activate on any https://svelte.dev/repl page

# Features

## Autosave

![](https://i.imgur.com/hDWxbRN.jpg)

The Svelte save button is clicked on every Tab switch and after 60 seconds of inactivity

## Scrollbar position save

The Svelte REPL replaces the whole CodeMirror editor on every Tab switch, this (ofcourse) resets the Tab position to the top.

![](https://i.imgur.com/V3lbP2k.jpg)


The Svelte REPL Meister records the Scroll Position on every Editor change,  
and restores the Scroll Position after a Tab switch

## Global search

The Svelte REPL Meister stores all editor contents on Tab switch.

![](https://i.imgur.com/8y7Vebi.jpg)

The searchbox searches all these (green/seen) Tabs and outputs the results to the F12 Console

![](https://i.imgur.com/4yaqdtl.jpg)

'Unload' green/seen tabs by reloading the whole REPL

## Source code History - per Tab

You can store/restore the editor contents per Tab

![](https://i.imgur.com/MuCY700.jpg)

Bold green indicates the History content is the same as the current editor

**Reloading the page will destroy all history!!!**

But you hardly every have to reload/F5 the Svelte REPL
