import { Navbar } from './components/navbar';
import { Chat } from './components/chat';
import { Feed } from './components/feed';
import { Board } from './containers/board';
import { run } from '@cycle/run';
import { makeDOMDriver } from '@cycle/dom';
import { makeHistoryDriver } from '@cycle/history';
import { makeHTTPDriver } from '@cycle/http';
import { makeGlueDriver } from './drivers/glue';
import { ngDriver } from './drivers/angular';
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

export function navbar(element, ngCallback) {
    run(Navbar, {
        DOM: makeDOMDriver(element),
        HTTP: makeHTTPDriver(),
        angular: ngDriver(ngCallback),
        storage: storageDriver,
        beep: beepDriver,
    });
}

export function chat(element) {
    run(Chat, {
        DOM: makeDOMDriver(element),
        HTTP: makeHTTPDriver(),
        storage: storageDriver,
    });
}

export function feed(element) {
    run(Feed, {
        DOM: makeDOMDriver(element),
        HTTP: makeHTTPDriver(),
    });
}
