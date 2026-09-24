import { extend } from 'flarum/common/extend';

import { createTableNodes } from './tiptap/nodes';
import { patchMarkdownParserBuilder, patchMarkdownSerializerBuilder } from './tiptap/markdown';
import InsertTableDropdown from './tiptap/InsertTableDropdown';

const NAMESPACE = 'fof-rich-text';

// Hook our table support into fof/rich-text. Its Tiptap driver lives in lazily
// loaded chunks that fof/rich-text imports only when the editor is actually
// needed: from its own TextEditor loader when the user's rich-text preference
// is on, or from the "Toggle Rich Text Mode" button when a markdown-mode user
// switches mid-session. Rather than importing those chunks ourselves (which
// made every logged-in user download the ~530 KB driver before the composer
// could open), we patch each module the moment it registers, whichever path
// loaded it.
//
// Timing: `flarum.reg.onLoad` runs its handler synchronously inside the
// chunk's module evaluation (or immediately, if the module is already
// registered). Both fof/rich-text paths await that import before calling
// buildEditor, so the table nodes and markdown patches are in place before
// the editor builds its schema and its markdown parser/serializer, and the
// toolbar button before TiptapMenu first renders.
export default function configureRichText() {
    if (!(NAMESPACE in flarum.extensions)) return;

    const moduleDefault = (mod) => (mod && mod.default ? mod.default : mod);

    flarum.reg.onLoad(NAMESPACE, 'common/tiptap/TiptapEditorDriver', (mod) => {
        let nodes = null;

        // Add our six table-related Tiptap nodes to the editor's extension list.
        // `Node` comes from a sibling module in the same chunk; it is resolved
        // at build time so registration order within the chunk doesn't matter.
        extend(moduleDefault(mod).prototype, 'buildExtensions', function (items) {
            if (!nodes) {
                nodes = createTableNodes(flarum.reg.get(NAMESPACE, 'common/tiptap/tiptap').Node);
            }

            items.add('mdtable',        nodes.Table);
            items.add('mdtableHead',    nodes.TableHead);
            items.add('mdtableBody',    nodes.TableBody);
            items.add('mdtableRow',     nodes.TableRow);
            items.add('mdtableCell',    nodes.TableCell);
            items.add('mdtableHeader',  nodes.TableHeader);
        });
    });

    // Add an "Insert table" button to the toolbar.
    flarum.reg.onLoad(NAMESPACE, 'common/components/TiptapMenu', (mod) => {
        extend(moduleDefault(mod).prototype, 'items', function (items) {
            const editor = this.attrs.editor;
            if (!editor) return;
            items.add('mdtable', InsertTableDropdown.component({ editor }), 35);
        });
    });

    flarum.reg.onLoad(NAMESPACE, 'common/tiptap/markdown/MarkdownParserBuilder', (mod) => {
        patchMarkdownParserBuilder(moduleDefault(mod));
    });

    flarum.reg.onLoad(NAMESPACE, 'common/tiptap/markdown/MarkdownSerializerBuilder', (mod) => {
        patchMarkdownSerializerBuilder(moduleDefault(mod));
    });
}
