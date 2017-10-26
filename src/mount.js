import io from 'socket.io-client';
import {Navbar} from './components/navbar';
import {Chat} from './components/chat';
import {Feed} from './components/feed';
import {AnzuRouter} from './router';
import {run} from '@cycle/run';
import {routerify} from 'cyclic-router';
import {makeDOMDriver} from '@cycle/dom';
import {makeHistoryDriver, captureClicks} from '@cycle/history';
import {makeHTTPDriver} from '@cycle/http';
import {makeSocketIODriver} from './drivers/socket-io';
import {ngDriver} from './drivers/angular';
import {beepDriver} from './drivers/beep';
import storageDriver from '@cycle/storage';	
import switchPath from 'switch-path';

export function AnzuApp(element) {
    const mainWithRouting = routerify(AnzuRouter, switchPath);

    run(mainWithRouting, {
        DOM: makeDOMDriver(element),
        history: captureClicks(makeHistoryDriver()),
        HTTP: makeHTTPDriver(),
		angular: ngDriver(x => console.log(x)),
		storage: storageDriver,
		beep: beepDriver,
		socketIO: makeSocketIODriver(socketIo()),
		socketIOChat: makeSocketIODriver(socketIo(Anzu.chatIO)),
    });
}

export function navbar(element, ngCallback) {
	run(Navbar, {
		DOM: makeDOMDriver(element),
		HTTP: makeHTTPDriver(),
		angular: ngDriver(ngCallback),
		socketIO: makeSocketIODriver(socketIo()),
		socketIOChat: makeSocketIODriver(socketIo(Anzu.chatIO)),
		storage: storageDriver,
		beep: beepDriver
	});
};

export function chat(element) {
	run(Chat, {
		DOM: makeDOMDriver(element),
		HTTP: makeHTTPDriver(),
		socketIO: makeSocketIODriver(socketIo(Anzu.chatIO)),
		storage: storageDriver
	});
};

export function feed(element) {
	run(Feed, {
		DOM: makeDOMDriver(element),
		HTTP: makeHTTPDriver()
	});
};

function socketIo(server = Anzu.globalIO) {
	const token = localStorage.getItem('id_token');

	return io(server, {query: token !== null && String(token).length > 0 ? 'token=' + token : ''});
}