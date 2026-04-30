import app from 'flarum/forum/app';
import { extend, override } from 'flarum/common/extend';
import TextEditor from 'flarum/common/components/TextEditor';

import { createTableNodes } from './tiptap/nodes';
import { patchMarkdownParserBuilder, patchMarkdownSerializerBuilder } from './tiptap/markdown';
import InsertTableDropdown from './tiptap/InsertTableDropdown';

// Hook our table support into fof/rich-text. fof/rich-text loads its Tiptap
// driver lazily inside TextEditor.oninit via a `_loaders` queue — we push our
// own loader onto that queue. By the time the editor is constructed, Tiptap's
// prototypes have been patched and our extensions are in the schema.
export default function configureRichText() {
    if (!('fof-rich-text' in flarum.extensions)) return;

    // Workaround for an upstream timing race in flarum/core's TextEditor.
    // oncreate calls `_load().then(() => setTimeout(this.onbuild, 50))`. The
    // 50ms timer can fire before Mithril has flushed the redraw triggered by
    // `_load` setting `loading=false`, so `.TextEditor-editorContainer` isn't
    // in the DOM yet. onbuild then calls buildEditor with `target=undefined`,
    // Tiptap's Editor skips its mount() (gated on `options.element`), and any
    // subsequent access to `editor.view.dom` throws "view is not available".
    // The composer falls back to a broken BBCode toolbar — no Tiptap menu, so
    // our table button has nowhere to attach.
    //
    // Force-flushing the redraw inside `_load` guarantees the container is in
    // the DOM by the time the 50ms timer fires.
    override(TextEditor.prototype, '_load', function (original) {
        return original().then(() => {
            try { m.redraw.sync(); } catch (e) {}
        });
    });

    // Belt-and-braces: if the sync redraw above is ever insufficient, retry
    // onbuild on the next tick rather than letting Tiptap mount against an
    // undefined target.
    override(TextEditor.prototype, 'onbuild', function (original) {
        if (!this.$('.TextEditor-editorContainer')[0]) {
            try { m.redraw.sync(); } catch (e) {}
            if (!this.$('.TextEditor-editorContainer')[0]) {
                setTimeout(() => this.onbuild(), 50);
                return;
            }
        }
        return original();
    });

    extend(TextEditor.prototype, 'oninit', function () {
        const user = app.session.user;
        if (!user || !user.preferences()?.useRichTextEditor) return;

        this._loaders = this._loaders || [];
        this._loaders.push(() =>
            Promise.all([
                import('ext:fof/rich-text/common/tiptap/TiptapEditorDriver'),
                import('ext:fof/rich-text/common/components/TiptapMenu'),
                import('ext:fof/rich-text/common/tiptap/markdown/MarkdownParserBuilder'),
                import('ext:fof/rich-text/common/tiptap/markdown/MarkdownSerializerBuilder'),
                import('ext:fof/rich-text/common/tiptap/tiptap'),
            ]).then(([driverMod, menuMod, parserMod, serializerMod, tiptapMod]) => {
                patchOnce(
                    driverMod.default,
                    menuMod.default,
                    parserMod.default,
                    serializerMod.default,
                    tiptapMod.Node
                );
            })
        );
    });
}

let patched = false;

function patchOnce(TiptapEditorDriver, TiptapMenu, MarkdownParserBuilder, MarkdownSerializerBuilder, Node) {
    if (patched) return;
    patched = true;

    const { Table, TableHead, TableBody, TableRow, TableCell, TableHeader } = createTableNodes(Node);

    // Add our six table-related Tiptap nodes to the editor's extension list.
    extend(TiptapEditorDriver.prototype, 'buildExtensions', function (items) {
        items.add('mdtable',        Table);
        items.add('mdtableHead',    TableHead);
        items.add('mdtableBody',    TableBody);
        items.add('mdtableRow',     TableRow);
        items.add('mdtableCell',    TableCell);
        items.add('mdtableHeader',  TableHeader);
    });

    // Add an "Insert table" button to the toolbar.
    extend(TiptapMenu.prototype, 'items', function (items) {
        const editor = this.attrs.editor;
        if (!editor) return;
        items.add('mdtable', InsertTableDropdown.component({ editor }), 35);
    });

    patchMarkdownParserBuilder(MarkdownParserBuilder);
    patchMarkdownSerializerBuilder(MarkdownSerializerBuilder);
}
