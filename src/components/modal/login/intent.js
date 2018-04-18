import xs from 'xstream';

export function intent(dom, http) {
    const token$ = http
        .select('token')
        .map(response$ => response$.replaceError(err => xs.of(err)))
        .flatten();

    const recover$ = http
        .select('recover-password')
        .map(response$ => response$.replaceError(err => xs.of(err)))
        .flatten();

    /**
     * DOM intents including:
     *
     * - email & password input
     * - login form submit
     */
    const email$ = dom
        .select('#email')
        .events('input')
        .map(ev => ev.target.value)
        .startWith('');

    const password$ = dom
        .select('#password')
        .events('input')
        .map(ev => ev.target.value)
        .startWith('');

    const sent$ = dom
        .select('form')
        .events('submit', { preventDefault: true })
        .map(ev => ev.target.name);

    const forgot$ = dom
        .select('#forgot')
        .events('click')
        .mapTo(true)
        .fold(acc => !acc, false);

    const rememberMe$ = dom
        .select('#rememberme')
        .events('change')
        .mapTo(true)
        .fold(acc => !acc, false);

    const fields$ = xs.combine(email$, password$);

    return {
        fields$,
        sent$,
        token$,
        forgot$,
        recover$,
        rememberMe$,
    };
}
