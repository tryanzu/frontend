import xs from 'xstream';
import {h} from '@cycle/dom';
import {Feed} from '../components/feed';
import {Navbar} from '../components/navbar';
import {Quickstart} from '../components/quickstart';

export function Board(sources) {
	const {DOM, HTTP} = sources;
    /*const actions = intent(sources);
    const effects = model(actions);
    const vtree$ = view(effects.state$);*/

    const feed = Feed({DOM, HTTP});
    const navbar = Navbar(sources);
    const state$ = xs.of({lastFetch: 0});

    const http$ = xs.merge(navbar.HTTP, feed.HTTP);

    return {
        DOM: xs.combine(state$, feed.DOM, navbar.DOM).map(([state, feedVNode, navbarVNode]) => {
        	return h('div.flex.flex-column.flex-auto', [
        		h('header', navbarVNode),
        		h('main.board.flex.flex-auto', [
		    		feedVNode,
		    		h('section.fade-in.post', [
		    			Quickstart()
		    		])
		    	])
        	]);
        }),
        HTTP: http$,
        router: xs.empty()
    };
};