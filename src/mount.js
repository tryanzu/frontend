import {Feed} from './components/feed';
import {Navbar} from './components/navbar';
import {run} from '@cycle/run';
import {makeDOMDriver} from '@cycle/dom';
import {makeHTTPDriver} from '@cycle/http';
import storageDriver from '@cycle/storage';

export function feed(element) {
    run(Feed, {
        DOM: makeDOMDriver(element)
    });
}

export function navbar(element) {
	run(Navbar, {
		DOM: makeDOMDriver(element),
		HTTP: makeHTTPDriver(),
		storage: storageDriver
	});
}