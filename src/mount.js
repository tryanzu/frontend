import {Navbar} from './components/navbar';
import {run} from '@cycle/run';
import {makeDOMDriver} from '@cycle/dom';
import {makeHTTPDriver} from '@cycle/http';
import storageDriver from '@cycle/storage';	

function ngDriver(ngCallback) {
	return function(ng$) {
		ng$.addListener({
            next: event => {
                console.log('ng$: ', event);
                ngCallback(event);
            },
            error: err => console.error(err),
            complete: () => console.log('location completed'),
        });
	}
}

export function navbar(element, ngCallback) {
	run(Navbar, {
		DOM: makeDOMDriver(element),
		HTTP: makeHTTPDriver(),
		angular: ngDriver(ngCallback),
		storage: storageDriver,
	});
}