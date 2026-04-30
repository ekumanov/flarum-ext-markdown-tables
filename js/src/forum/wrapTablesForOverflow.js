// Wrap each <table> inside a Post body with a horizontally-scrolling container.
// PipeTables emits bare <table> elements; without a wrapper, a wide table on
// a narrow viewport overflows the post column or forces the whole page to scroll.
//
// Idempotent — safe to call repeatedly. We mark wrapped tables with a data attr
// so we don't double-wrap when Mithril re-runs oncreate/onupdate.
export default function wrapTablesForOverflow(root) {
    if (!root) return;

    const tables = root.querySelectorAll('table');
    for (const table of tables) {
        if (table.dataset.markdownTablesWrapped === '1') continue;

        const parent = table.parentNode;
        if (!parent) continue;

        // Don't wrap a table that's already inside a wrapper (e.g. from the
        // Tiptap composer, which adds its own .tableWrapper).
        if (parent.classList && parent.classList.contains('markdown-table-wrapper')) {
            table.dataset.markdownTablesWrapped = '1';
            continue;
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'markdown-table-wrapper';
        parent.insertBefore(wrapper, table);
        wrapper.appendChild(table);
        table.dataset.markdownTablesWrapped = '1';
    }
}
