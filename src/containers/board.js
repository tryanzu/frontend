import xs from 'xstream'
import onionify from 'cycle-onionify'
import isolate from '@cycle/isolate'
import sampleCombine from 'xstream/extra/sampleCombine'
import { div, header, main } from '@cycle/dom'
import { Feed } from '../components/feed'
import { Navbar } from '../components/navbar'
import { Post } from '../components/post'
import { Modal } from './modal'
import { model } from './board/model'
import { intent } from './board/intent'
import { Publisher } from './publisher';

/**
 * Board component wrapped in the onion interface for fractal state.
 */
export const Board = onionify(board, 'fractal')

function board(sources) {
    const actions = intent(sources)
    const effects = model(actions)

    // Destructure some sources & read effects to be shared
    const { DOM, HTTP, storage, history, fractal, glue } = sources
    const { authToken$ } = actions
    const { router$ } = effects

	/**
     * Child component wiring...
     * Pass through some read sinks & read some effects.
     */
    const modal = isolate(Modal, { fractal: modalLens() })({ DOM, HTTP, storage, fractal, glue })
    const navbar = Navbar({ DOM, HTTP, storage, fractal, glue, props: { authToken$ } })
    const feed = isolate(Feed, { fractal: feedLens() })({ DOM, HTTP, fractal, glue, props: { authToken$, router$ } })
    const post = isolate(Post, { fractal: postLens() })({ DOM, HTTP, fractal, glue, props: { authToken$, router$ } })
    const publisher = isolate(Publisher, { fractal: publisherLens() })({ DOM, HTTP, storage, fractal, glue, props: { authToken$, router$ } })
    
    // Compute merged vdom trees.
    const vtree$ = xs.combine(
        actions.page$,
        feed.DOM, 
        navbar.DOM, 
        post.DOM, 
        modal.DOM,
        publisher.DOM,
    ).map(([page, feedVNode, navbarVNode, postVNode, modalVNode, publisherVNode]) => {
        return div('.flex.flex-column.flex-auto', [
            modalVNode,
            header(navbarVNode),
            main(`.board.flex.flex-auto${page.post !== false ? '.post-active' : ''}`, 
                page.current == 'board' 
                    ? [
                        feedVNode,
                        postVNode,
                    ]
                    : publisherVNode 
            )
        ])
    })

    /**
     * Merged write side effects.
     * Including HTTP, history, beep & storage effects in
     * navbar, feed, post components.
     */
    const reducers$ = xs.merge(
        effects.fractal, 
        feed.fractal, 
        navbar.fractal, 
        post.fractal, 
        modal.fractal,
        publisher.fractal,
    )
    const http$ = xs.merge(effects.HTTP, navbar.HTTP, feed.HTTP, post.HTTP, modal.HTTP, publisher.HTTP)
    const history$ = xs.merge(feed.history, publisher.history)
    const beep$ = navbar.beep
    const storage$ = xs.merge(effects.storage, modal.storage, navbar.storage)

    return {
        DOM: vtree$,
        beep: beep$,
        HTTP: http$,
        history: history$,
        storage: storage$,
        fractal: reducers$,
        glue: effects.glue,
    }
}

/**
 * Fractal state lenses. 
 * 
 * Some child components need some lenses to "see" through other parts of the state.
 */
function modalLens() {
    return {
        get: ({ site, modal }) => ({ site, ...modal }),
        set: (state, child) => ({ ...state, modal: child })
    }
}

function postLens() {
    return {
        get: ({ post, user, modal, subcategories, categories }) => ({ own: post, shared: { user: user.user, modal, subcategories, categories } }),
        set: (state, child) => ({ ...state, post: child.own, modal: child.shared.modal })
    }
}

function feedLens() {
    return {
        get: ({ feed, user, post, categories, page, modal, subcategories }) => ({ own: feed, shared: { page, categories, user: user.user, postId: post.postId, modal, subcategories } }),
        set: (state, child) => ({ ...state, feed: child.own, modal: child.shared.modal })
    }
}

function publisherLens() {
    return {
        get: ({ publisher, categories, feed }) => ({ publisher, categories, subcategories: feed.subcategories }),
        set: (state, updated) => ({ ...state, publisher: { ...updated } })
    }
}