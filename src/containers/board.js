import onionify from 'cycle-onionify';
import xs from 'xstream';
import isolate from '@cycle/isolate';
import sampleCombine from 'xstream/extra/sampleCombine';
import {h} from '@cycle/dom';
import {Feed} from '../components/feed';
import {Navbar} from '../components/navbar';
import {Post} from '../components/post';
import {model} from './board/model';
import {intent} from './board/intent';

/**
 * Board component wrapped in the onion interface for fractal state.
 */
export const Board = onionify(board, 'fractal');

function board(sources) {
    const actions = intent(sources);
    const effects = model(actions);

    // Destructure some sources & read effects to be shared
    const {DOM, HTTP, storage, history, fractal} = sources;
    const {authToken$} = actions;

	/**
     * Child component wiring...
     * Pass through some read sinks & read some effects.
     */
    const postLens = {
        get: ({post, user}) => ({own: post, shared: {user: user.user}}),
        set: (state, child) => ({...state, post: child.own})
    };

    const navbar = Navbar({DOM, HTTP, storage, fractal});
    const feed = isolate(Feed, 'feed')({DOM, HTTP, fractal, props: {authToken$}});
    const post = isolate(Post, {fractal: postLens})({DOM, HTTP, fractal, props: {authToken$}});

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
    const reducers$ = xs.merge(effects.fractal, feed.fractal, post.fractal);
    const http$ = xs.merge(effects.HTTP, navbar.HTTP, feed.HTTP, post.HTTP);
    const history$ = feed.history;
    const beep$ = navbar.beep;
    const storage$ = xs.merge(effects.storage, navbar.storage);

    return {
        DOM: vtree$,
        beep: beep$,
        HTTP: http$,
        history: history$,
        storage: storage$,
        fractal: reducers$
    };
};