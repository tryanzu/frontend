import io from 'socket.io-client';
import {Navbar} from './components/navbar';
import {run} from '@cycle/run';
import {makeDOMDriver} from '@cycle/dom';
import {makeHTTPDriver} from '@cycle/http';
import {makeSocketIODriver} from './drivers/socket-io';
import storageDriver from '@cycle/storage';	

function ngDriver(ngCallback) {
	return function(ng$) {
		ng$.addListener({
            next: event => ngCallback(event),
            error: err => console.error(err),
            complete: () => console.log('location completed'),
        });
	}
}

function socketIo() {
	const token = localStorage.getItem('id_token');
    let params = {
        forceNew: true,
    };

    if (token !== null && String(token).length > 0) {
        params['query'] = 'token=' + token;
    }

    return io('//spartangeek.com', params);
}

export function navbar(element, ngCallback) {
	run(Navbar, {
		DOM: makeDOMDriver(element),
		HTTP: makeHTTPDriver(),
		angular: ngDriver(ngCallback),
		socketIO: makeSocketIODriver(socketIo()),
		storage: storageDriver,
	});
}