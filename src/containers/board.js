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
    const actions = intent(sources);
    const effects = model(actions);

    // Destructure some sources & read effects to be shared
    const {DOM, HTTP, storage, socketIO, socketIOChat, history} = sources;
    const {routePath$, authToken$} = actions;

	/**
     * Child component wiring...
     * Pass through some read sinks & read some effects.
     */
    const navbar = Navbar({DOM, HTTP, storage, socketIO, socketIOChat});
    const feed = Feed({DOM, HTTP, props: {authToken$}});
    const post = Post({DOM, HTTP, props: {authToken$}});

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
    const storage$ = xs.merge(effects.storage, navbar.storage).debug();
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

function intent({history, storage, HTTP}) {
    const routePath$ = history
        .map(location => switchPath(location.pathname, Routes))
        .filter(route => route.value != false);

    const authToken$ = storage.local.getItem('id_token')
        .filter(token => token !== null && String(token).length > 0)
        .startWith(false)
        .map(token => {
            if (token != false) {
                return headers => ({...headers, Authorization: 'Bearer ' + token});
            }

            return f => f
        });

    const unauthorized$ = HTTP
        .filter(req => {
            return 'headers' in req && 'Authorization' in req.headers;
        })
        .select() // This fetches all happening requests having the Auth header present.
        .map(response$ => response$.replaceError(err => xs.of(err)))
        .flatten()
        .filter(res => res instanceof Error && res.message == 'Unauthorized');

    return {
        routePath$, 
        authToken$,
        unauthorized$
    };
}

function model(actions) {
    const postRoute$ = actions.routePath$
        .map(route => route.value)
        .filter(action => action.page == 'post')
        .compose(sampleCombine(actions.authToken$));

    const storage$ = actions.unauthorized$.map(res => ({key: 'id_token', action: 'removeItem'}));

    const http$ = xs.merge(
        // Fetch fresh user data whenever authToken$ gets a value.
        actions.authToken$
            .filter(withAuth => {
                const headers = {},
                    x = withAuth(headers);
                return x != headers;
            })
            .map(withAuth => ({
                url: Anzu.layer + 'user/my', 
                category: 'me',
                headers: withAuth({})
            })),

        // Post loading route action transformed into http requests.
        postRoute$.map(([action, withAuth]) => xs.of(
            {
                method: 'GET',
                url: Anzu.layer + 'posts/' + action.post.id, 
                category: 'post',
                headers: withAuth({})
            },
            {
                method: 'GET',
                url: Anzu.layer + 'comments/' + action.post.id, 
                category: 'comments',
                headers: withAuth({})
            }
        )).flatten(),
    );

    const fetchPost$ = xs.create();
    //fetchPost$.imitate(postRoute$);
        
    return {
        HTTP: http$,
        storage: storage$,
        fetchPost$
    };
}