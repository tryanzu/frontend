import xs from 'xstream'
import onionify from 'cycle-onionify'
import isolate from '@cycle/isolate'
import sampleCombine from 'xstream/extra/sampleCombine'
import { h, h2, div, header, main, h1, section, ul, li, a, form, option, select, label, input, p, small, i } from '@cycle/dom'
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

	/**
     * Child component wiring...
     * Pass through some read sinks & read some effects.
     */
    const postLens = {
        get: ({ post, user, modal }) => ({ own: post, shared: { user: user.user, modal } }),
        set: (state, child) => ({ ...state, post: child.own, modal: child.shared.modal })
    }

    const feedLens = {
        get: ({ feed, user, post, categories }) => ({ own: feed, shared: { categories, user: user.user, postId: post.postId } }),
        set: (state, child) => ({ ...state, feed: child.own })
    }

    const modal = isolate(Modal, 'modal')({ DOM, HTTP, storage, fractal, glue })
    const navbar = Navbar({ DOM, HTTP, storage, fractal, glue, props: { authToken$ } })
    const feed = isolate(Feed, { fractal: feedLens })({ DOM, HTTP, fractal, glue, props: { authToken$ } })
    const post = isolate(Post, { fractal: postLens })({ DOM, HTTP, fractal, glue, props: { authToken$ } })
    const publisher = isolate(Publisher, 'publisher')({ DOM, HTTP, storage, fractal, glue })
    
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
            main('.board.flex.flex-auto', 
                page == 'board' 
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
    const http$ = xs.merge(effects.HTTP, navbar.HTTP, feed.HTTP, post.HTTP, modal.HTTP)
    const history$ = feed.history
    const beep$ = navbar.beep
    const storage$ = xs.merge(effects.storage, modal.storage, navbar.storage).debug()

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