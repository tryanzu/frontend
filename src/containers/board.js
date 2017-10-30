import xs from 'xstream';
import {h} from '@cycle/dom';
import {Feed} from '../components/feed';
import {Navbar} from '../components/navbar';
import {Post} from '../components/post';

export function Board(sources) {
	const {DOM, HTTP} = sources;
    const props$ = 'props$' in sources ? sources.props$.debug() : xs.empty();

	/**
     * Child component wiring...
     * Pass through some read sinks & read some effects.
     */
    const feed = Feed({DOM, HTTP, props$});
    const navbar = Navbar(sources);
    const post = Post({DOM, HTTP});

    // Compute merged vdom trees.
    const vtree$ = xs.combine(feed.DOM, navbar.DOM, post.DOM);

    return {
        DOM: vtree$.map(([feedVNode, navbarVNode, postVNode]) => {
        	return h('div.flex.flex-column.flex-auto', [
        		h('header', navbarVNode),
        		h('main.board.flex.flex-auto', [
		    		feedVNode,
		    		postVNode,
		    	])
        	]);
        }),
        HTTP: xs.merge(navbar.HTTP, feed.HTTP),
        router: xs.empty()
    };
};