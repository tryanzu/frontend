import React, { useEffect } from 'react';
import h from 'react-hyperscript';
import observe from 'callbag-observe';
import { Navbar } from '../components/navbar';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Reader from '../components/reader';
import Profile from '../components/profile';
import Publisher from '../components/publisher';
import withState, { AuthContext } from '../fractals/auth';
import { injectState } from 'freactal/lib/inject';
import { Account } from '../components/account';
import { ToastContainer } from 'react-toastify';
import Chat from '../components/chat';
import { audio } from '../utils';

// Default export has the injected auth state.
export default withState(injectState(Home));

// Inject state into Reader. (share some parent state with initialize).
const ReaderWithParentState = injectState(Reader);
const PublisherWithState = injectState(Publisher);

export function Home({ state, effects }) {
    useEffect(() => {
        // Subscribe to some events that trigger effects.
        observe(data => onGlobalNsEvent({ data, effects }))(
            state.channels.global
        );
    }, []);
    return h(
        AuthContext.Provider,
        { value: state },
        h(
            Router,
            {},
            h(React.Fragment, [
                h('div.flex.flex-column.flex-auto', [
                    h(Navbar, { state, effects }),
                    h(Switch, [
                        h(Route, {
                            exact: true,
                            path: '/',
                            component: ReaderWithParentState,
                        }),
                        h(Route, {
                            path: '/chat',
                            component: Chat,
                        }),
                        h(Route, {
                            path: '/u/:slug/:id',
                            component: Profile,
                        }),
                        h(Route, {
                            path: '/c/:slug',
                            component: ReaderWithParentState,
                        }),
                        h(Route, {
                            path: '/p/:slug/:id',
                            component: ReaderWithParentState,
                        }),
                        h(Route, {
                            path: '/publicar',
                            component: PublisherWithState,
                        }),
                    ]),
                ]),
                h(Account, { state, effects }),
                h(ToastContainer),
            ])
        )
    );
}

function onGlobalNsEvent({ data, effects }) {
    const type = data.event || data.action;
    switch (type) {
        case 'config':
            return effects.updateSite(data.params || {});
        case 'notification':
            window.setTimeout(audio.play, 200);
            return effects.notifications('count', data.p.count || 0);
        case 'gaming':
            return effects.updateGaming(data.p);
        default:
            console.log('Remote message could not be handled', data);
    }
}
