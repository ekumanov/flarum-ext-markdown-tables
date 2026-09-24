import app from 'flarum/forum/app';

import configureRichText from './configureRichText';

app.initializers.add('ekumanov/flarum-ext-markdown-tables', () => {
    // Wide rendered tables scroll horizontally via CSS alone (see forum.less).
    // Post bodies are Mithril m.trust content, so moving their nodes into a
    // wrapper would break Mithril's later removal of them.
    configureRichText();
});
