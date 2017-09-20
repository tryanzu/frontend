import xs from 'xstream';

export function intent(props$, dom, http) {
    const activeLogin$ = props$.filter(ev => ev.modal == 'signin')
        .mapTo(true)
        .fold(acc => !acc, false);

    const token$ = http.select('token')
        .map(response$ => response$.replaceError(err => xs.of(err)))
        .flatten();

    /**
     * DOM intents including:
     *
     * - email & password input
     * - login form submit
     */
    const email$ = dom.select('#email').events('input')
        .map(ev => ev.target.value)
        .startWith('');

    const password$ = dom.select('#password').events('input')
        .map(ev => ev.target.value)
        .startWith('');

    const sent$ = dom.select('form').events('submit', {preventDefault: true})
        .mapTo(true)
        .startWith(false);

    const fields$ = xs.combine(email$, password$);

    return {activeLogin$, fields$, sent$, token$};
}