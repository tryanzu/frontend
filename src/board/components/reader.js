import React from 'react';
import h from 'react-hyperscript';
import withState from '../fractals/board';
import { injectState } from 'freactal/lib/inject';
import { Feed } from './feed';
import { Post } from './post';
import observe from 'callbag-observe';

class Reader extends React.Component {
    componentDidMount() {
        const { channels } = this.props.state;

        // Subscribe to some events that trigger effects.
        observe(event => this.onFeedNsEvent(event))(channels.feed);
    }
    onFeedNsEvent(data) {
        const params = data.p || {};
        const { fire } = params;
        if (!fire) {
            return;
        }
        this.props.effects.onFeedEvent(params);
    }
    componentDidUpdate(prev) {
        const { location, match, effects, state } = this.props;
        const params = new window.URLSearchParams(location.search);
        const search = params.get('search') || '';
        if (search !== state.feed.search) {
            effects.search(search);
            return;
        }
        if (match.path === '/' && prev.match.path !== '/') {
            effects.fetchPost(false).then(() => effects.fetchFeed());
        }
        if (match.path === '/p/:slug/:id') {
            const postId = match.params.id || false;
            const prevId = prev.match.params.id || false;
            if (postId !== prevId && postId !== state.post.id) {
                effects.fetchPost(postId);
            }
        }
        if (match.path === '/c/:slug') {
            const id = match.params.slug || false;
            const prevId = prev.match.params.slug || false;
            if (id !== prevId && id !== state.feed.category) {
                effects.fetchFeed(id);
            }
        }
    }
    render() {
        const { post } = this.props.state;
        return h(
            'main.board.flex.flex-auto',
            { className: post.id !== false ? 'post-active' : '' },
            [h(Feed, { ...this.props }), h(Post, { ...this.props })]
        );
    }
}

export default withState(injectState(Reader));
