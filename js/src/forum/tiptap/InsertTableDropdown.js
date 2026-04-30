import app from 'flarum/forum/app';
import Dropdown from 'flarum/common/components/Dropdown';
import Button from 'flarum/common/components/Button';
import Tooltip from 'flarum/common/components/Tooltip';
import Stream from 'flarum/common/utils/Stream';
import classList from 'flarum/common/utils/classList';
import extractText from 'flarum/common/utils/extractText';

import { insertTable, inTable, addRow, removeRow, addColumn, removeColumn, deleteTable } from './commands';

// Toolbar dropdown with two faces:
//  • outside a table → form to set rows/cols and insert
//  • inside a table  → menu of row/column ops + delete table
export default class InsertTableDropdown extends Dropdown {
    static initAttrs(attrs) {
        super.initAttrs(attrs);
        attrs.className = classList(attrs.className, 'MarkdownTablesInsertDropdown');
        attrs.buttonClassName = 'Button Button--icon hasIcon';
        attrs.icon = 'fas fa-table';
    }

    oninit(vnode) {
        super.oninit(vnode);
        this.numCols = Stream(3);
        this.numRows = Stream(4);
    }

    view(vnode) {
        const editor = this.attrs.editor;
        if (!editor) return null;

        const dropdown = super.view(vnode);
        // Wrap the toggle button in a tooltip so the user knows what it does.
        return (
            <Tooltip text={app.translator.trans('ekumanov-markdown-tables.lib.composer.table_tooltip')}>
                {dropdown}
            </Tooltip>
        );
    }

    getButtonContent() {
        return [<i className={'icon ' + this.attrs.icon} />];
    }

    getMenu(items) {
        const editor = this.attrs.editor;
        if (!editor) return super.getMenu(items);

        const insideTable = inTable(editor.state);
        return (
            <ul className={'Dropdown-menu dropdown-menu MarkdownTablesContextMenu'}>
                {insideTable ? this.contextMenuItems() : this.insertFormItems()}
            </ul>
        );
    }

    insertFormItems() {
        const trans = app.translator.trans.bind(app.translator);
        const onInsert = (e) => {
            e.preventDefault();
            const cols = Math.max(1, parseInt(this.numCols(), 10) || 1);
            const rows = Math.max(2, parseInt(this.numRows(), 10) || 2);
            this.attrs.editor.commands.command(insertTable(rows, cols));
        };

        return [
            <li>
                <div className="Form-group">
                    <label>{trans('ekumanov-markdown-tables.lib.composer.table_menu.num_cols')}</label>
                    <input
                        type="number"
                        min="1"
                        max="20"
                        className="FormControl"
                        value={this.numCols()}
                        oninput={(e) => this.numCols(e.target.value)}
                        placeholder={extractText(trans('ekumanov-markdown-tables.lib.composer.table_menu.num_cols'))}
                    />
                </div>
            </li>,
            <li>
                <div className="Form-group">
                    <label>{trans('ekumanov-markdown-tables.lib.composer.table_menu.num_rows')}</label>
                    <input
                        type="number"
                        min="2"
                        max="50"
                        className="FormControl"
                        value={this.numRows()}
                        oninput={(e) => this.numRows(e.target.value)}
                        placeholder={extractText(trans('ekumanov-markdown-tables.lib.composer.table_menu.num_rows'))}
                    />
                </div>
            </li>,
            <li>
                <Button className="Button Button--primary" onclick={onInsert}>
                    {trans('ekumanov-markdown-tables.lib.composer.table_menu.insert_table')}
                </Button>
            </li>,
        ];
    }

    contextMenuItems() {
        const trans = app.translator.trans.bind(app.translator);
        const editor = this.attrs.editor;

        const make = (key, command) => (
            <li>
                <Button
                    className="Button Button--text"
                    onclick={() => editor.commands.command(command)}
                >
                    {trans(`ekumanov-markdown-tables.lib.composer.table_menu.${key}`)}
                </Button>
            </li>
        );

        return [
            make('insert_row_before', addRow(true)),
            make('insert_row_after',  addRow(false)),
            make('remove_row',        removeRow()),
            <li className="Dropdown-separator" />,
            make('insert_column_before', addColumn(true)),
            make('insert_column_after',  addColumn(false)),
            make('remove_column',        removeColumn()),
            <li className="Dropdown-separator" />,
            make('delete_table', deleteTable()),
        ];
    }
}
