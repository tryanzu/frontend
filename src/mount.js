import { Board } from './containers/board';
import { run } from '@cycle/run';
import { makeDOMDriver } from '@cycle/dom';
import { makeHistoryDriver } from '@cycle/history';
import { makeHTTPDriver } from '@cycle/http';
import { makeGlueDriver } from './drivers/glue';
import { beepDriver } from './drivers/beep';
import storageDriver from '@cycle/storage';

export function AnzuApp(element) {
    run(Board, {
        DOM: makeDOMDriver(element),
        history: makeHistoryDriver(),
        HTTP: makeHTTPDriver(),
        storage: storageDriver,
        beep: beepDriver,
        glue: makeGlueDriver(),
    });
}
