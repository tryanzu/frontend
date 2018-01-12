import xs from 'xstream'
import dropRepeats from 'xstream/extra/dropRepeats'
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
            const {currentTarget} = event
            event.preventDefault()
            
            return {path: currentTarget.getAttribute('href')}
        })

    /**
     * DOM intents including:
     */
    const scroll$ = DOM.select('.feed .list').events('scroll')
        .compose(debounce(120))
        .map(e => ({bottom: e.target.scrollHeight - e.target.scrollTop - e.target.clientHeight < 1}))

    /**
     * Router read effects, including:
     * - Category listing route.
     * - General listing route.
     * - Post route (first page load only).
     */
    const fetch$ = xs.merge(

        // Router fetch effects.
        props.router$
            .filter(action => (action.page == 'board' || action.page == 'category'))
            .map(action => ({
                type: 'reload',
                category: 'category' in action && action.category !== false ? action.category.slug : false
            })),

        // Fetch effect when starting from post page.
        props.router$
            .take(1)
            .filter(action => (action.page == 'post'))
            .map(action => ({
                type: 'bootsrap'
            })), 
    ).remember()

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
        scroll$,
        linkPost$,
        feedGlue$, 
        authToken$: props.authToken$,
    }
}