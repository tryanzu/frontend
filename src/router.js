import xs from 'xstream';
import {Board} from './containers/board';
import {Feed} from './components/feed';

export function AnzuRouter(sources) {
    const match$ = sources.router.define({
        '/': Board,
        '/p/:slug/:id': params => {
            return sources => Feed({...sources, props$: xs.of(params)});
        }
    }).debug();

    const page$ = match$.map(({path, value}) => {
        return value({...sources, router: sources.router.path(path)});
    });

    return {
        DOM: page$.map(c => c.DOM).flatten(),
        HTTP: page$.map(c => c.HTTP).flatten(),
        router: page$.map(c => c.router).flatten()
    };
}