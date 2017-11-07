import xs from 'xstream';
import {h} from '@cycle/dom';
import {Feed} from '../components/feed';
import {Navbar} from '../components/navbar';
import {Post} from '../components/post';

export function Board(sources) {
	const {DOM, HTTP, storage, socketIO, socketIOChat} = sources;
    const props$ = 'props$' in sources ? sources.props$.debug() : xs.empty();

	/**
     * Child component wiring...
     * Pass through some read sinks & read some effects.
     */
    const navbar = Navbar({DOM, HTTP, storage, socketIO, socketIOChat});
    const feed = Feed({DOM, HTTP, props$});
    const post = Post({DOM, HTTP, props: {fetchPost$: feed.linkPost}});

    // Compute merged vdom trees.
    const vtree$ = xs.combine(feed.DOM, navbar.DOM, post.DOM).map(([feedVNode, navbarVNode, postVNode]) => {
        return h('div.flex.flex-column.flex-auto', [
            h('header', navbarVNode),
            h('main.board.flex.flex-auto', [
                feedVNode,
                postVNode,
            ])
        ]);
    });

    /**
     * Merged write side effects.
     * Including HTTP, history, beep & storage effects in
     * navbar, feed, post components.
     */
    const http$ = xs.merge(navbar.HTTP, feed.HTTP);
    const history$ = feed.history;
    const beep$ = navbar.beep;
    const storage$ = navbar.storage;
    const socketIO$ = navbar.socketIOChat; 

    return {
        DOM: vtree$,
        beep: beep$,
        HTTP: http$,
        history: history$,
        storage: storage$,
        angular: xs.empty(),
        socketIOChat: socketIO$,
    };
};