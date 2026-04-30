// Tiptap v3 commands for table editing. Each command receives `{ state, dispatch }`
// from Tiptap's command system and either mutates a transaction or returns false.

const TABLE_NODE_NAMES = ['table', 'tableHead', 'tableBody', 'tableRow', 'tableCell', 'tableHeader'];

function inTable(state) {
    return TABLE_NODE_NAMES.includes(state.selection.$head.parent.type.name);
}

function inTableHeader(state) {
    return state.selection.$head.parent.type.name === 'tableHeader';
}

function findAncestorDepth(state, name) {
    const $head = state.selection.$head;
    for (let depth = $head.depth; depth >= 0; depth--) {
        if ($head.node(depth).type.name === name) return depth;
    }
    return -1;
}

// Insert a fresh table at the selection. The header is always the first row.
// Cells are seeded with a single space so they survive markdown round-tripping
// (PipeTables drops empty cells).
export function insertTable(numRows = 4, numCols = 3) {
    return ({ state, dispatch }) => {
        const schema = state.schema;
        if (!schema.nodes.table) return false;
        if (!dispatch) return true;

        const fillCell = (type) => type.create(null, schema.text(' '));

        const headerRow = schema.nodes.tableRow.create(
            null,
            Array.from({ length: numCols }, () => fillCell(schema.nodes.tableHeader))
        );
        const head = schema.nodes.tableHead.create(null, headerRow);

        const bodyRows = Array.from({ length: Math.max(1, numRows - 1) }, () =>
            schema.nodes.tableRow.create(
                null,
                Array.from({ length: numCols }, () => fillCell(schema.nodes.tableCell))
            )
        );
        const body = schema.nodes.tableBody.create(null, bodyRows);

        const table = schema.nodes.table.createChecked(null, [head, body]);

        let tr = state.tr.replaceSelectionWith(table);

        // Make sure there's a paragraph after the table so the user has somewhere
        // to keep typing. ProseMirror won't let the doc end on a table.
        const afterPos = tr.selection.to;
        if (afterPos >= tr.doc.content.size) {
            tr = tr.insert(afterPos, schema.nodes.paragraph.create());
        }

        dispatch(tr.scrollIntoView());
        return true;
    };
}

export function deleteTable() {
    return ({ state, dispatch }) => {
        if (!inTable(state)) return false;
        const tableDepth = findAncestorDepth(state, 'table');
        if (tableDepth === -1) return false;
        if (!dispatch) return true;

        const $head = state.selection.$head;
        const start = $head.before(tableDepth);
        const end = $head.after(tableDepth);
        dispatch(state.tr.delete(start, end).scrollIntoView());
        return true;
    };
}

export function addRow(before = false) {
    return ({ state, dispatch }) => {
        if (!inTable(state) || inTableHeader(state)) return false;
        const rowDepth = findAncestorDepth(state, 'tableRow');
        if (rowDepth === -1) return false;
        if (!dispatch) return true;

        const schema = state.schema;
        const $head = state.selection.$head;
        const currentRow = $head.node(rowDepth);
        const newCells = [];
        currentRow.forEach((cell) => {
            newCells.push(schema.nodes.tableCell.create(cell.attrs, schema.text(' ')));
        });
        const newRow = schema.nodes.tableRow.create(null, newCells);

        const insertPos = before ? $head.before(rowDepth) : $head.after(rowDepth);
        dispatch(state.tr.insert(insertPos, newRow).scrollIntoView());
        return true;
    };
}

export function removeRow() {
    return ({ state, dispatch }) => {
        if (!inTable(state) || inTableHeader(state)) return false;
        const rowDepth = findAncestorDepth(state, 'tableRow');
        const bodyDepth = findAncestorDepth(state, 'tableBody');
        if (rowDepth === -1 || bodyDepth === -1) return false;
        if (!dispatch) return true;

        const $head = state.selection.$head;
        const body = $head.node(bodyDepth);
        // Removing the last body row would leave an invalid table — drop the
        // whole thing instead.
        if (body.childCount === 1) {
            return deleteTable()({ state, dispatch });
        }

        const start = $head.before(rowDepth);
        const end = $head.after(rowDepth);
        dispatch(state.tr.delete(start, end).scrollIntoView());
        return true;
    };
}

// For column ops we walk every row in the table and stamp/strip a cell at the
// same index in each row. Indexes are computed from the current cell's index
// in its parent row.
export function addColumn(before = false) {
    return ({ state, dispatch }) => {
        if (!inTable(state)) return false;
        const tableDepth = findAncestorDepth(state, 'table');
        const rowDepth = findAncestorDepth(state, 'tableRow');
        if (tableDepth === -1 || rowDepth === -1) return false;
        if (!dispatch) return true;

        const schema = state.schema;
        const $head = state.selection.$head;
        const cellIndex = $head.index(rowDepth);
        const tableStart = $head.before(tableDepth);
        const table = $head.node(tableDepth);

        const insertions = [];
        table.descendants((node, pos) => {
            if (node.type.name === 'tableRow') {
                if (cellIndex < node.childCount) {
                    const target = node.child(cellIndex);
                    // Walk the row to find the absolute start of the target cell.
                    let cellAbsStart = tableStart + 1 + pos + 1; // table open + row pos + row open
                    for (let i = 0; i < cellIndex; i++) {
                        cellAbsStart += node.child(i).nodeSize;
                    }
                    const insertAt = before ? cellAbsStart : cellAbsStart + target.nodeSize;
                    const newCell = target.type.create(target.attrs, schema.text(' '));
                    insertions.push({ pos: insertAt, node: newCell });
                }
                return false;
            }
            return true;
        });

        let tr = state.tr;
        for (let i = insertions.length - 1; i >= 0; i--) {
            tr = tr.insert(insertions[i].pos, insertions[i].node);
        }
        dispatch(tr.scrollIntoView());
        return true;
    };
}

export function removeColumn() {
    return ({ state, dispatch }) => {
        if (!inTable(state)) return false;
        const tableDepth = findAncestorDepth(state, 'table');
        const rowDepth = findAncestorDepth(state, 'tableRow');
        if (tableDepth === -1 || rowDepth === -1) return false;
        if (!dispatch) return true;

        const $head = state.selection.$head;
        const currentRow = $head.node(rowDepth);
        // If this is the only column, removing it would empty every row; drop
        // the whole table instead.
        if (currentRow.childCount === 1) {
            return deleteTable()({ state, dispatch });
        }

        const cellIndex = $head.index(rowDepth);
        const tableStart = $head.before(tableDepth);
        const table = $head.node(tableDepth);

        const removals = [];
        table.descendants((node, pos) => {
            if (node.type.name === 'tableRow') {
                if (cellIndex < node.childCount) {
                    const target = node.child(cellIndex);
                    let cellAbsStart = tableStart + 1 + pos + 1;
                    for (let i = 0; i < cellIndex; i++) {
                        cellAbsStart += node.child(i).nodeSize;
                    }
                    removals.push({ from: cellAbsStart, to: cellAbsStart + target.nodeSize });
                }
                return false;
            }
            return true;
        });

        let tr = state.tr;
        for (let i = removals.length - 1; i >= 0; i--) {
            tr = tr.delete(removals[i].from, removals[i].to);
        }
        dispatch(tr.scrollIntoView());
        return true;
    };
}

export { inTable };
