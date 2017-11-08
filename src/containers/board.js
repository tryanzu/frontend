import switchPath from 'switch-path';
import xs from 'xstream';
import sampleCombine from 'xstream/extra/sampleCombine';
import {h} from '@cycle/dom';
import {Feed} from '../components/feed';
import {Navbar} from '../components/navbar';
import {Post} from '../components/post';

const Routes = {
    '/': false,
    '/p/:slug/:id': (slug, id) => ({type: 'goTo', page: 'post', post: {id, slug}})
};

export function Board(sources) {
	const {DOM, HTTP, storage, socketIO, socketIOChat, history} = sources;
    const {routePath$, authToken$} = intent(sources);
    const effects = model({routePath$, authToken$});

	/**
     * Child component wiring...
     * Pass through some read sinks & read some effects.
     */
    const navbar = Navbar({DOM, HTTP, storage, socketIO, socketIOChat});
    const feed = Feed({DOM, HTTP, props: {authToken$}});
    const post = Post({DOM, HTTP, props: {fetchPost$: feed.linkPost, authToken$}});

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
    const http$ = xs.merge(effects.HTTP, navbar.HTTP, feed.HTTP, post.HTTP);
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

function intent({history, storage}) {
    const routePath$ = history
        .map(location => switchPath(location.pathname, Routes))
        .filter(route => route.value != false);

    const authToken$ = storage.local.getItem('id_token')
        .filter(token => token !== null && String(token).length > 0)
        .startWith(false)
        .map(token => token != false ? headers => ({...headers, Authorization: 'Bearer ' + token}) : f => f);

    return {
        routePath$, 
        authToken$
    };
}

function model(actions) {

    const http$ = xs.merge(
        // Post loading route action transformed into http request.
        actions.routePath$
            .map(route => route.value)
            .filter(action => action.page == 'post')
            .compose(sampleCombine(actions.authToken$))
            .map(([action, withAuth]) => ({
                method: 'GET',
                url: Anzu.layer + 'posts/' + action.post.id, 
                category: 'post',
                headers: withAuth({})
            }))
    );
        
    return {
        HTTP: http$
    };
}