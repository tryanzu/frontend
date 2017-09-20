import xs from 'xstream';

export function intent(dom, http, storage) {

    /**
     * DOM intents including:
     * - Signin & signup buttons.
     * - Logout button.
     */
    const modalLink$ = dom.select('.modal-link').events('click')
        .map(event => ({modal: event.target.dataset.modal}));

    const logoutLink$ = dom.select('#logout').events('click').mapTo(true);

    /**
     * LocalStorage read effects including:
     * - auth token stream.
     */
    const token$ = storage.local.getItem('id_token')
        .filter(token => token.length > 0)
        .startWith(false);

    /**
     * HTTP read effects including: 
     * - Logged user data.
     */
    const user$ = http.select('me')
        .map(response$ => response$.replaceError(err => xs.of(err)))
        .flatten()
        .filter(res => !(res instanceof Error))
        .map(res => res.body);

    return {modalLink$, logoutLink$, token$, user$};
};