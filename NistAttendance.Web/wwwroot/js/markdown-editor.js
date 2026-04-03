/**
 * MarkdownLab — JS Interop for Blazor
 * Handles CodeMirror editor, marked.js preview, and toolbar actions.
 */
window.MarkdownEditor = (() => {
    'use strict';

    let editor = null;
    let dotnetRef = null;

    /** Initialize CodeMirror on the given textarea */
    function init(textareaId, dotnetObjRef) {
        dotnetRef = dotnetObjRef;

        const textarea = document.getElementById(textareaId);
        if (!textarea) return;

        editor = CodeMirror.fromTextArea(textarea, {
            mode: 'gfm',
            theme: 'default',
            lineNumbers: true,
            lineWrapping: true,
            tabSize: 2,
            indentUnit: 2,
            indentWithTabs: false,
            matchBrackets: true,
            extraKeys: {
                'Enter': 'newlineAndIndentContinueMarkdownList',
                'Tab': (cm) => cm.replaceSelection(' '.repeat(cm.getOption('tabSize')), 'end'),
            },
            placeholder: 'Start writing your Markdown here...',
        });

        editor.getWrapperElement().style.fontSize = '14px';

        // Live preview on change
        let previewTimeout;
        editor.on('change', () => {
            clearTimeout(previewTimeout);
            previewTimeout = setTimeout(() => {
                updatePreview();
                updateStats();
            }, 150);
        });

        // Cursor position
        editor.on('cursorActivity', () => {
            const pos = editor.getCursor();
            const el = document.getElementById('stat-cursor');
            if (el) el.textContent = `Ln ${pos.line + 1}, Col ${pos.ch + 1}`;
        });

        // Sync scroll
        editor.on('scroll', () => {
            const scrollInfo = editor.getScrollInfo();
            const ratio = scrollInfo.top / (scrollInfo.height - scrollInfo.clientHeight || 1);
            const preview = document.querySelector('.md-preview-wrapper');
            if (preview) {
                preview.scrollTop = ratio * (preview.scrollHeight - preview.clientHeight);
            }
        });

        // Initial render
        updatePreview();
        updateStats();
    }

    /** Render markdown to HTML preview */
    function updatePreview() {
        if (!editor) return;
        const md = editor.getValue();

        marked.setOptions({ gfm: true, breaks: true });

        const raw = marked.parse(md);
        const clean = DOMPurify.sanitize(raw, {
            ADD_TAGS: ['input'],
            ADD_ATTR: ['type', 'checked', 'disabled'],
        });

        const preview = document.getElementById('md-preview');
        if (preview) {
            preview.innerHTML = clean;
            preview.querySelectorAll('pre code').forEach(block => {
                hljs.highlightElement(block);
            });
            preview.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                cb.disabled = true;
            });
        }
    }

    /** Update word/line/char stats */
    function updateStats() {
        if (!editor) return;
        const text = editor.getValue();
        const lines = editor.lineCount();
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const chars = text.length;

        const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
        el('stat-lines', `Lines: ${lines}`);
        el('stat-words', `Words: ${words}`);
        el('stat-chars', `Chars: ${chars}`);
    }

    /** Toolbar actions */
    function toolbarAction(action, level) {
        if (!editor) return;
        editor.focus();
        const sel = editor.getSelection();
        const cursor = editor.getCursor();

        switch (action) {
            case 'heading': {
                const prefix = '#'.repeat(parseInt(level)) + ' ';
                const line = editor.getLine(cursor.line);
                const stripped = line.replace(/^#{1,6}\s*/, '');
                editor.replaceRange(prefix + stripped, { line: cursor.line, ch: 0 }, { line: cursor.line, ch: line.length });
                break;
            }
            case 'bold': wrapSel('**', '**', 'bold text'); break;
            case 'italic': wrapSel('*', '*', 'italic text'); break;
            case 'strikethrough': wrapSel('~~', '~~', 'strikethrough'); break;
            case 'inline-code': wrapSel('`', '`', 'code'); break;
            case 'link': {
                const url = sel.startsWith('http') ? sel : 'url';
                const text = sel.startsWith('http') ? 'link text' : (sel || 'link text');
                editor.replaceSelection(`[${text}](${url})`);
                break;
            }
            case 'image-url': {
                const imgUrl = prompt('Enter image URL:');
                if (imgUrl) editor.replaceSelection(`![${sel || 'alt text'}](${imgUrl})`);
                break;
            }
            case 'ul': prefixLines('- '); break;
            case 'ol': prefixLinesNumbered(); break;
            case 'task-list': prefixLines('- [ ] '); break;
            case 'blockquote': prefixLines('> '); break;
            case 'code-block': {
                const lang = sel ? '' : 'language';
                const code = sel || 'code here';
                editor.replaceSelection(`\n\`\`\`${lang}\n${code}\n\`\`\`\n`);
                break;
            }
            case 'table':
                editor.replaceSelection('\n| Header 1 | Header 2 | Header 3 |\n| -------- | -------- | -------- |\n| Cell 1   | Cell 2   | Cell 3   |\n| Cell 4   | Cell 5   | Cell 6   |\n');
                break;
            case 'hr': editor.replaceSelection('\n---\n'); break;
        }
    }

    function wrapSel(before, after, placeholder) {
        const sel = editor.getSelection();
        if (sel) {
            editor.replaceSelection(before + sel + after);
        } else {
            const cursor = editor.getCursor();
            editor.replaceSelection(before + placeholder + after);
            editor.setSelection(
                { line: cursor.line, ch: cursor.ch + before.length },
                { line: cursor.line, ch: cursor.ch + before.length + placeholder.length }
            );
        }
    }

    function prefixLines(prefix) {
        const sel = editor.getSelection();
        if (sel) {
            editor.replaceSelection(sel.split('\n').map(l => prefix + l).join('\n'));
        } else {
            const cursor = editor.getCursor();
            const line = editor.getLine(cursor.line);
            editor.replaceRange(prefix + line, { line: cursor.line, ch: 0 }, { line: cursor.line, ch: line.length });
        }
    }

    function prefixLinesNumbered() {
        const sel = editor.getSelection();
        if (sel) {
            editor.replaceSelection(sel.split('\n').map((l, i) => `${i + 1}. ${l}`).join('\n'));
        } else {
            const cursor = editor.getCursor();
            const line = editor.getLine(cursor.line);
            editor.replaceRange(`1. ${line}`, { line: cursor.line, ch: 0 }, { line: cursor.line, ch: line.length });
        }
    }

    /** Get raw markdown from editor */
    function getContent() {
        return editor ? editor.getValue() : '';
    }

    /** Set editor content */
    function setContent(text) {
        if (editor) {
            editor.setValue(text);
            updatePreview();
            updateStats();
        }
    }

    /** Get rendered HTML from preview */
    function getRenderedHtml() {
        const preview = document.getElementById('md-preview');
        return preview ? preview.innerHTML : '';
    }

    /** Set view mode */
    function setViewMode(mode) {
        const main = document.getElementById('md-main');
        if (!main) return;
        main.classList.remove('md-editor-only', 'md-preview-only');
        if (mode === 'editor') main.classList.add('md-editor-only');
        else if (mode === 'preview') main.classList.add('md-preview-only');
        if (editor) setTimeout(() => editor.refresh(), 50);
    }

    /** Set editor theme */
    function setEditorTheme(theme) {
        if (editor) editor.setOption('theme', theme);
    }

    /** Set font size */
    function setFontSize(px) {
        if (editor) editor.getWrapperElement().style.fontSize = px + 'px';
    }

    /** Divider drag resize */
    function initDivider() {
        const divider = document.getElementById('md-divider');
        const main = document.getElementById('md-main');
        const editorPane = document.getElementById('md-editor-pane');
        const previewPane = document.getElementById('md-preview-pane');
        if (!divider || !main || !editorPane || !previewPane) return;

        let isResizing = false;

        divider.addEventListener('mousedown', (e) => {
            isResizing = true;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            const rect = main.getBoundingClientRect();
            const pct = Math.max(20, Math.min(80, ((e.clientX - rect.left) / rect.width) * 100));
            editorPane.style.flex = 'none';
            editorPane.style.width = pct + '%';
            previewPane.style.flex = 'none';
            previewPane.style.width = (100 - pct) + '%';
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                if (editor) editor.refresh();
            }
        });
    }

    /** Cleanup */
    function dispose() {
        if (editor) {
            editor.toTextArea();
            editor = null;
        }
        dotnetRef = null;
    }

    return {
        init,
        toolbarAction,
        getContent,
        setContent,
        getRenderedHtml,
        setViewMode,
        setEditorTheme,
        setFontSize,
        initDivider,
        dispose,
    };
})();
