import xs from 'xstream'
import debounce from 'xstream/extra/debounce'

const ENTER_KEY = 13
const ESC_KEY = 27

/**
 *
 * @param dom
 * @param socket
 * @param history
 */
export function intent({DOM, HTTP, fractal, props, glue}) {

    /**
     * Router read effects including:
     * - Feed links
     */
    const linkPost$ = DOM.select('.feed a').events('click', {preventDefault: true})
        .map((event) => {
            const {target} = event
            event.preventDefault()
            return {path: target.getAttribute('href')}
        })

    /**
     * DOM intents including:
     */
    const scroll$ = DOM.select('.feed .list').events('scroll')
        .compose(debounce(120))
        .map(e => ({bottom: e.target.scrollHeight - e.target.scrollTop - e.target.clientHeight < 1}))

    const fetch$ = scroll$
        .filter(event => (event.bottom === true))
        .mapTo({ type: 'next' })
        .startWith({ type: 'bootstrap' })

    /**
     * HTTP read effects including: 
     * - New requested posts.
     * - Fetched categories.
     * - Fetched individual posts.
     */
    const posts$ = HTTP.select('posts')
        .map(response$ => response$.replaceError(err => xs.of(err)))
        .flatten()
        .filter(res => !(res instanceof Error))
        .map(res => res.body)

    const feedGlue$ = glue.get('feed').map(event => event.p)
    
    return {
        fetch$,
        posts$,
        linkPost$,
        feedGlue$,
        authToken$: props.authToken$,
    }
}