import app from 'flarum/forum/app';
import { extend } from 'flarum/common/extend';
import Post from 'flarum/forum/components/Post';
import CommentPost from 'flarum/forum/components/CommentPost';

import wrapTablesForOverflow from './wrapTablesForOverflow';
import configureRichText from './configureRichText';

app.initializers.add('ekumanov/flarum-ext-markdown-tables', () => {
    // Wrap rendered tables in a horizontally-scrolling container so wide tables
    // don't blow out the post column on narrow viewports.
    extend(Post.prototype, 'oncreate', function () {
        wrapTablesForOverflow(this.element);
    });

    extend(Post.prototype, 'onupdate', function () {
        wrapTablesForOverflow(this.element);
    });

    // Composer preview rerenders on every keystroke — rewrap there too.
    extend(CommentPost.prototype, 'oncreate', function () {
        wrapTablesForOverflow(this.element);
    });

    extend(CommentPost.prototype, 'onupdate', function () {
        wrapTablesForOverflow(this.element);
    });

    configureRichText();
});
