import xs from 'xstream';

export function intent(dom, http) {
    const token$ = http.select('signup')
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

    const username$ = dom.select('#username').events('input')
        .map(ev => ev.target.value)
        .startWith('');

    const sent$ = dom.select('form').events('submit', {preventDefault: true})
        .mapTo(true)
        .startWith(false);

    const finished$ = dom.select('a.finish').events('click')
        .mapTo(true);

    const fields$ = xs.combine(email$, username$, password$);

    return {fields$, sent$, token$, finished$};
}