<?php

use Flarum\Extend;
use s9e\TextFormatter\Configurator;

return [
    (new Extend\Frontend('forum'))
        ->js(__DIR__.'/js/dist/forum.js')
        ->css(__DIR__.'/resources/less/forum.less'),

    new Extend\Locales(__DIR__.'/locale'),

    (new Extend\Formatter())
        ->configure(function (Configurator $config) {
            $config->PipeTables;
        }),
];
