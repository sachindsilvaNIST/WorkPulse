/**
 * NotesEditor — minimal JS interop for a contenteditable rich-text note body.
 * Mirrors the window.XxxModule IIFE pattern used by markdown-editor.js.
 */
window.NotesEditor = (() => {
    'use strict';

    function getHtml(id) {
        const el = document.getElementById(id);
        return el ? el.innerHTML : '';
    }

    function setHtml(id, html) {
        const el = document.getElementById(id);
        if (el && el.innerHTML !== (html || '')) {
            el.innerHTML = html || '';
        }
    }

    function exec(command) {
        document.execCommand(command, false, null);
    }

    function focusEl(id) {
        const el = document.getElementById(id);
        if (el) el.focus();
    }

    return { getHtml, setHtml, exec, focus: focusEl };
})();
