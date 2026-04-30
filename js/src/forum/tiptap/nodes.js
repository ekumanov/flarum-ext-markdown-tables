// Tiptap v3 Node specs for tables. Built lazily because fof-rich-text exposes
// `Node` from `@tiptap/core` only after its async chunk loads — so we receive
// the constructor from the caller instead of resolving it at module load.
//
// Layout:
//   table > tableHead > tableRow > tableHeader   (one head row)
//         > tableBody > tableRow > tableCell     (zero or more body rows)
//
// Cells store an optional `style` attribute carrying `text-align: left|center|right`,
// produced by markdown-it's pipe-table parser when `:---:` style separators are used.

export function createTableNodes(Node) {
    const Table = Node.create({
        name: 'table',
        group: 'block',
        content: 'tableHead tableBody*',
        isolating: true,
        selectable: false,

        parseHTML() {
            return [{ tag: 'table' }];
        },

        renderHTML() {
            return ['div', { class: 'markdown-table-wrapper' }, ['table', {}, 0]];
        },
    });

    const TableHead = Node.create({
        name: 'tableHead',
        group: 'tableBlock',
        content: 'tableRow',
        isolating: true,
        selectable: false,

        parseHTML() {
            return [{ tag: 'thead' }];
        },

        renderHTML() {
            return ['thead', {}, 0];
        },
    });

    const TableBody = Node.create({
        name: 'tableBody',
        group: 'tableBlock',
        content: 'tableRow+',
        isolating: true,
        selectable: false,

        parseHTML() {
            return [{ tag: 'tbody' }];
        },

        renderHTML() {
            return ['tbody', {}, 0];
        },
    });

    const TableRow = Node.create({
        name: 'tableRow',
        group: 'tableBlock',
        content: '(tableCell | tableHeader)+',
        isolating: true,
        selectable: false,

        parseHTML() {
            return [{ tag: 'tr' }];
        },

        renderHTML() {
            return ['tr', {}, 0];
        },
    });

    const cellAttrs = {
        style: { default: null },
    };

    const parseStyleAttr = (dom) => {
        const textAlign = dom.style.textAlign;
        return textAlign ? { style: `text-align: ${textAlign}` } : null;
    };

    const TableCell = Node.create({
        name: 'tableCell',
        group: 'tableBlock',
        content: 'inline*',
        isolating: true,
        selectable: false,

        addAttributes() {
            return cellAttrs;
        },

        parseHTML() {
            return [
                {
                    tag: 'td',
                    getAttrs: parseStyleAttr,
                },
            ];
        },

        renderHTML({ node }) {
            const attrs = node.attrs.style ? { style: node.attrs.style } : {};
            return ['td', attrs, 0];
        },
    });

    const TableHeader = Node.create({
        name: 'tableHeader',
        group: 'tableBlock',
        content: 'inline*',
        isolating: true,
        selectable: false,

        addAttributes() {
            return cellAttrs;
        },

        parseHTML() {
            return [
                {
                    tag: 'th',
                    getAttrs: parseStyleAttr,
                },
            ];
        },

        renderHTML({ node }) {
            const attrs = node.attrs.style ? { style: node.attrs.style } : {};
            return ['th', attrs, 0];
        },
    });

    return { Table, TableHead, TableBody, TableRow, TableCell, TableHeader };
}
