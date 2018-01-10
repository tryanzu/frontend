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

    // Category fetch posts
    const feedCategory$ = fractal.state$
        .map(state => {
            const { category, subcategoriesBySlug } = state.own
            return category !== false && subcategoriesBySlug !== false
                ? subcategoriesBySlug[category].id
                : false
        })
        .compose(dropRepeats())
        .remember()

    /**
     * Router read effects including:
     * - Feed links
     */
    const linkPost$ = DOM.select('.feed a').events('click', {preventDefault: true})
        .map((event) => {
            const {currentTarget} = event
            return {path: currentTarget.getAttribute('href')}
        })

    /**
     * DOM intents including:
     */
    const scroll$ = DOM.select('.feed .list').events('scroll')
        .compose(debounce(120))
        .map(e => ({bottom: e.target.scrollHeight - e.target.scrollTop - e.target.clientHeight < 1}))

    const fetch$ = props.router$
        .filter(action => (action.page == 'board' || action.page == 'category'))
        .map(action => ({
            type: 'reload',
            category: 'category' in action && action.category !== false ? action.category.slug : false
        }))
        .remember()
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
        feedCategory$,
        authToken$: props.authToken$,
    }
}