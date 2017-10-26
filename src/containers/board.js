import xs from 'xstream';
import {h} from '@cycle/dom';
import {Feed} from '../components/feed';
import {Quickstart} from '../components/quickstart';

export function Board({DOM, HTTP}) {
    /*const actions = intent(sources);
    const effects = model(actions);
    const vtree$ = view(effects.state$);*/

    const feed = Feed({DOM, HTTP});
    const state$ = xs.of({lastFetch: 0});

    return {
        DOM: xs.combine(state$, feed.DOM).map(([state, feedVNode]) => {
        	return h('div.flex.flex-auto', [
        		h('main.board.flex.flex-auto', [
		    		feedVNode,
		    		h('section.fade-in.post', [
		    			Quickstart()
		    		])
		    	])
        	]);
        }),
        HTTP: feed.HTTP,
        router: xs.empty()
    };
};