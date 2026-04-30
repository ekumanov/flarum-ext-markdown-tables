import app from 'flarum/forum/app';
import { extend } from 'flarum/common/extend';
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
