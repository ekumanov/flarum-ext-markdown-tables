// Markdown parser/serializer wiring for tables.
//
// Parsing: markdown-it ships pipe-table support out of the box but disables it
// in CommonMark mode, which is what fof-rich-text uses. We flip the rule on
// and register Tiptap-node tokens for each table token markdown-it emits.
//
// Serializing: walk the table node's children and emit standard pipe-table
// markdown. The header row is mandatory; alignment from the cell `style` attr
// produces the `:--:` separator.

export function patchMarkdownParserBuilder(MarkdownParserBuilder) {
    const origBuildTokenizer = MarkdownParserBuilder.prototype.buildTokenizer;
    MarkdownParserBuilder.prototype.buildTokenizer = function () {
        const md = origBuildTokenizer.call(this);
        md.enable('table');
        return md;
    };

    const origBuildTokens = MarkdownParserBuilder.prototype.buildTokens;
    MarkdownParserBuilder.prototype.buildTokens = function () {
        const tokens = origBuildTokens.call(this);
        return {
            ...tokens,

            table: { block: 'table' },
            thead: { block: 'tableHead' },
            tbody: { block: 'tableBody' },
            tr: { block: 'tableRow' },
            th: {
                block: 'tableHeader',
                getAttrs: (tok) => ({ style: tok.attrGet('style') }),
            },
            td: {
                block: 'tableCell',
                getAttrs: (tok) => ({ style: tok.attrGet('style') }),
            },
        };
    };
}

export function patchMarkdownSerializerBuilder(MarkdownSerializerBuilder) {
    const origBuildNodes = MarkdownSerializerBuilder.prototype.buildNodes;
    MarkdownSerializerBuilder.prototype.buildNodes = function () {
        const nodes = origBuildNodes.call(this);
        return {
            ...nodes,
            table: serializeTable,
            tableHead: noopSerializer,
            tableBody: noopSerializer,
            tableRow: noopSerializer,
            tableCell: noopSerializer,
            tableHeader: noopSerializer,
        };
    };
}

// table/row/cell serialization is driven from the top-level `table` handler so
// per-row pipes can be ordered alongside the alignment separator.
function noopSerializer() {
    /* no-op — table handler owns the rendering */
}

function alignmentFromStyle(style) {
    if (!style) return null;
    const match = String(style).match(/text-align:\s*(left|right|center)/i);
    return match ? match[1].toLowerCase() : null;
}

function alignmentSeparator(alignment) {
    switch (alignment) {
        case 'left':   return ':---';
        case 'right':  return '---:';
        case 'center': return ':---:';
        default:       return '---';
    }
}

function serializeRowCells(state, row, isHeader) {
    const alignments = [];
    state.write('|');
    row.forEach((cell) => {
        if (cell.type.name !== (isHeader ? 'tableHeader' : 'tableCell')) {
            // Header rows can occasionally contain non-header cells (e.g. when
            // the user pastes mixed content). Treat them as cells either way.
        }
        state.write(' ');
        // Inline cells contain text + marks. Use renderInline which respects
        // configured inline marks (bold, italic, code, etc.).
        // Pipe characters inside cells must be escaped to avoid breaking the
        // table syntax.
        const buf = state.out;
        state.renderInline(cell);
        // Replace any newly-written `|` in the just-rendered slice with `\|`.
        const written = state.out.slice(buf.length).replace(/\|/g, '\\|');
        state.out = buf + written;

        state.write(' |');
        alignments.push(alignmentFromStyle(cell.attrs.style));
    });
    state.write('\n');
    return alignments;
}

function serializeTable(state, node) {
    let columnAlignments = [];

    node.forEach((section) => {
        if (section.type.name === 'tableHead') {
            // The head should contain exactly one row of `tableHeader` cells.
            section.forEach((row) => {
                if (row.type.name === 'tableRow') {
                    columnAlignments = serializeRowCells(state, row, true);
                }
            });
            // Alignment / separator row.
            state.write('|');
            for (const alignment of columnAlignments) {
                state.write(' ' + alignmentSeparator(alignment) + ' |');
            }
            state.write('\n');
        } else if (section.type.name === 'tableBody') {
            section.forEach((row) => {
                if (row.type.name === 'tableRow') {
                    serializeRowCells(state, row, false);
                }
            });
        }
    });

    state.closeBlock(node);
}
