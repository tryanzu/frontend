import qs from 'querystring';
import { provideState, update } from 'freactal';
import { toast } from 'react-toastify';
import { request } from '../../utils';
import { kvReducer, jsonReq } from '../utils';
import { dateToString, t } from '../../i18n';

const EMPTY_HASHTABLES = {
    comments: {},
    votes: {},
};

function initialState(props) {
    const postId = props.match.params.id || false;
    const categorySlug =
        props.match.path === '/c/:slug' ? props.match.params.slug : false;
    const params = new window.URLSearchParams(props.location.search);
    return {
        boardInit: false,
        counters: {
            posts: 0,
            acknowledged: {}, // Acknowledged new comments.
            recent: {}, // Recent new comments. (to be loaded while reading post)
            missed: {}, // Comments in other posts.
        },
        post: {
            error: false,
            loading: postId && true,
            id: postId,
            data: {},
        },
        comments: {
            loading: postId && true,
            loadingPrevious: false,
            loadingRecent: false,
            hashtables: {
                ...EMPTY_HASHTABLES,
            },
            list: [],
            before: 0, // How many comments are before the first fetched comment?
            missing: 0,
            replying: true,
            voting: false,
        },
        feed: {
            loading: false,
            endReached: false,
            list: [],
            limit: 10,
            offset: 0,
            category: categorySlug,
            relevant: false,
            search: params.get('search') || '',
        },
        publisher: {
            draft: true,
            isQuestion: false,
            disabledComments: false,
            pinned: false,
            hideGuidelines: false,
            title: '',
            content: '',
            category: false,
            step: 0,
            saving: false,
            lastPost: false,
        },
        ui: {
            commenting: false,
            commentingType: false,
            commentingId: false,
            reply: '',
        },
    };
}

async function initialize(effects, props) {
    const categorySlug =
        props.match.path === '/c/:slug' ? props.match.params.slug : false;

    // Fetch feed for the first time.
    const state = await effects.fetchFeed(categorySlug);
    if (state.post.id) {
        await effects.fetchPost(state.post.id);
    }

    return state => ({
        ...state,
        boardInit: true,
    });
}

async function fetchRecentPosts(effects) {
    const state = await effects.feed('loading', true);
    const { category } = state.feed;
    let params = {
        limit: state.counters.posts,
        offset: 0,
    };
    const latest = state.feed.list.find(
        post => (post.pinned || false) === false
    );
    if (latest) {
        params.before = latest.created_at;
    }
    if (state.feed.relevant !== false) {
        params.relevant = dateToString(new Date(), 'YYYY-MM-DD');
    }
    if (category !== false) {
        const bySlug = subcategoriesBy(state.categories, 'slug');
        params.category = bySlug[category].id || false;
    }
    const result = await jsonReq(request(`feed`, { query: params }));
    return state => ({
        ...state,
        counters: {
            ...state.counters,
            posts: 0,
        },
        feed: {
            ...state.feed,
            loading: false,
            list: result.feed.concat(state.feed.list),
            limit: result.limit,
        },
    });
}

async function fetchMorePosts(effects) {
    const state = await effects.feed('loading', true);
    const { category, limit } = state.feed;
    let params = {
        limit,
        offset: state.feed.offset + 10,
    };
    if (state.feed.relevant !== false) {
        params.relevant = dateToString(new Date(), 'YYYY-MM-DD');
    }
    if (category !== false) {
        const bySlug = subcategoriesBy(state.categories, 'slug');
        params.category = bySlug[category].id || false;
    }
    const remote = await request(`feed?${qs.stringify(params)}`);
    const result = await remote.json();
    return state => ({
        ...state,
        feed: {
            ...state.feed,
            list: state.feed.list.concat(result.feed),
            limit: result.limit,
            offset: state.feed.offset + result.feed.length,
            endReached: result.feed.length < 10,
            loading: false,
        },
    });
}

function setTab(effects, relevant = false) {
    return effects
        .feed({ relevant, offset: 0, limit: 10 })
        .then(() => effects.fetchFeed())
        .then(() => state => state);
}

function search(effects, search) {
    return effects
        .feed({ search })
        .then(() => effects.fetchFeed())
        .then(() => state => state);
}

async function fetchFeed(effects, category = false) {
    const state = await effects.feed('loading', true);
    let params = {
        limit: state.feed.limit,
        offset: state.feed.offset,
    };
    if (state.feed.search.length > 0) {
        params.search = state.feed.search;
    }
    if (state.feed.relevant !== false) {
        params.relevant = dateToString(new Date(), 'YYYY-MM-DD');
    }
    if (category !== false) {
        const authState = await effects.fetchCategories();
        params.category = authState.subcategories.slug[category].id || false;
    }
    const remote = await request(`feed?${qs.stringify(params)}`);
    const result = await remote.json();
    return state => ({
        ...state,
        feed: {
            ...state.feed,
            list: result.feed,
            limit: result.limit,
            offset: result.offset,
            category,
            loading: false,
            endReached: result.feed.length < result.limit,
        },
    });
}

function publishPost(effects) {
    return effects
        .publisher('saving', true)
        .then(state => {
            const { publisher } = state;
            const body = {
                kind: 'category-post',
                content: publisher.content,
                title: publisher.title,
                category: publisher.category,
                lock: publisher.disabledComments,
                is_question: publisher.isQuestion,
                pinned: publisher.pinned,
            };
            return request('post', { method: 'POST', body }).then(res => {
                if (res.status !== 200) {
                    return res.json().then(({ message }) => {
                        throw message;
                    });
                }

                return res.json();
            });
        })
        .then(({ post }) => effects.fetchPost(post.id))
        .then(() => state => ({
            ...state,
            publisher: {
                ...state.publisher,
                saving: false,
                lastPost: { ...state.post.data },
            },
        }))
        .catch(message => {
            toast.error(t`${message}`);
            return state => ({
                ...state,
                publisher: {
                    ...state.publisher,
                    saving: false,
                },
            });
        });
}

function updatePost(effects, data) {
    return effects
        .publisher('saving', true)
        .then(state => {
            const body = {
                kind: 'category-post',
                ...data,
            };
            return jsonReq(
                request(`posts/${state.post.id}`, {
                    method: 'PUT',
                    body,
                })
            );
        })
        .then(() => state => ({
            ...state,
            post: {
                ...state.post,
                data: {
                    ...state.post.data,
                    ...data,
                },
            },
        }))
        .catch(message => {
            toast.error(t`${message}`);
            return state => ({
                ...state,
                publisher: {
                    ...state.publisher,
                    saving: false,
                },
            });
        });
}

async function publishReply(effects, content, type, id) {
    const state = await effects.comments('replying', true);
    const authState = await effects.auth('lastUsed', new Date());
    const body = { content };
    try {
        const comment = await jsonReq(
            request(`comments/${id}?type=${type}`, {
                method: 'POST',
                body,
            })
        );
        const withAuthor = {
            ...comment,
            votes: {},
            author: {
                ...authState.auth.user,
            },
            replies: { list: [], count: 0 },
        };
        if (type === 'comment') {
            const replied = state.comments.hashtables.comments[id];
            const replies = replied.replies || {};
            const list = replies.list || [];
            const count = replies.count || 0;
            const updated = {
                ...replied,
                replies: {
                    list: list.concat(withAuthor),
                    count: count + 1,
                },
            };
            return state => ({
                ...state,
                comments: {
                    ...state.comments,
                    hashtables: {
                        ...state.comments.hashtables,
                        comments: {
                            ...state.comments.hashtables.comments,
                            [id]: updated,
                            [comment.id]: withAuthor,
                        },
                    },
                },
                ui: {
                    ...state.ui,
                    replying: false,
                },
            });
        }
        return state => ({
            ...state,
            feed: {
                ...state.feed,
                list: state.feed.list.map(item => {
                    if (item.id != state.post.id) {
                        return item;
                    }
                    return {
                        ...item,
                        comments: {
                            ...item.comments,
                            count: item.comments.count + 1,
                        },
                    };
                }),
            },
            post: {
                ...state.post,
                data: {
                    ...state.post.data,
                    comments: {
                        ...state.post.data.comments,
                        count: state.post.data.comments.count + 1,
                    },
                },
            },
            comments: {
                ...state.comments,
                hashtables: {
                    ...state.comments.hashtables,
                    comments: {
                        ...state.comments.hashtables.comments,
                        [comment.id]: withAuthor,
                    },
                },
                list: state.comments.list.concat(comment.id),
            },
            ui: {
                ...state.ui,
                replying: false,
            },
        });
    } catch (message) {
        toast.error(t`${message}`);
        return state => ({
            ...state,
            ui: {
                ...state.ui,
                replying: false,
            },
        });
    }
}

async function reactTo(effects, relatedTo, id, type) {
    const collections = {
        post: 'post',
        comment: 'comments',
    };
    const update = collections[relatedTo] || false;
    if (false === update) {
        return state => state;
    }
    const state = await effects[update]('voting', true);
    try {
        const reaction = await jsonReq(
            request(`react/${relatedTo}/${id}`, {
                method: 'POST',
                body: { type },
            })
        );
        if (relatedTo == 'post') {
            const post = state.post.data;
            const reactions = post.voted || [];
            const updated = {
                ...post,
                votes: {
                    ...post.votes,
                    [type]: reaction.count,
                },
                voted: reaction.active
                    ? reactions.concat(type)
                    : reactions.filter(r => r !== type),
            };
            return state => ({
                ...state,
                post: {
                    ...state.post,
                    data: {
                        ...state.post.data,
                        ...updated,
                    },
                    voting: false,
                },
            });
        } else if (relatedTo == 'comment') {
            const comment = state.comments.hashtables.comments[id];
            const updated = {
                ...comment,
                votes: {
                    ...comment.votes,
                    [type]: reaction.count,
                },
            };
            const reactions = state.comments.hashtables.votes[id] || [];
            return state => ({
                ...state,
                comments: {
                    ...state.comments,
                    hashtables: {
                        ...state.comments.hashtables,
                        comments: {
                            ...state.comments.hashtables.comments,
                            [id]: updated,
                        },
                        votes: {
                            ...state.comments.hashtables.votes,
                            [id]: reaction.active
                                ? reactions.concat(type)
                                : reactions.filter(r => r !== type),
                        },
                    },
                    voting: true,
                },
            });
        }
    } catch (message) {
        toast.error(t`${message}`);
        return state => state;
    }
}

function initPost() {
    return state => ({
        ...state,
        post: {
            ...state.post,
            loading: true,
        },
        comments: {
            ...state.comments,
            hashtables: { ...EMPTY_HASHTABLES },
            list: [],
        },
    });
}

async function fetchPost(effects, id) {
    try {
        await effects.initPost();
        if (id === false) {
            return state => ({
                ...state,
                post: {
                    ...state.post,
                    loading: false,
                    error: false,
                    id: false,
                    data: {},
                },
            });
        }

        // Fetch remote post data.
        const post = await jsonReq(request(`posts/${id}`));
        await effects.fetchComments(id);
        return state => ({
            ...state,
            counters: {
                ...state.counters,
                acknowledged: {
                    ...state.counters.acknowledged,
                    [id]:
                        (state.counters.recent[id] || 0) +
                        (state.counters.missed[id] || 0),
                },
                recent: {
                    ...state.counters.recent,
                    [id]: 0,
                },
                missed: {
                    ...state.counters.missed,
                    [id]: 0,
                },
            },
            post: {
                ...state.post,
                loading: false,
                error: false,
                id,
                data: post,
            },
        });
    } catch (error) {
        return state => ({
            ...state,
            post: {
                ...state.post,
                loading: false,
                data: {},
                id,
                error,
            },
        });
    }
}

function fetchComments(effects, id) {
    return effects
        .comments('loading', true)
        .then(() => {
            const query = { limit: 10 };
            return jsonReq(request(`comments/${id}`, { query }));
        })
        .then(remote => state => ({
            ...state,
            comments: {
                ...state.comments,
                loading: false,
                before: remote.count - remote.list.length,
                hashtables: mergeHashtables(
                    state.comments.hashtables,
                    remote.hashtables
                ),
                list: [...state.comments.list, ...remote.list],
            },
        }));
}

function fetchPreviousComments(effects, before, limit = 10) {
    return effects
        .comments('loadingPrevious', true)
        .then(state => {
            const query = { limit, before };
            return jsonReq(request(`comments/${state.post.id}`, { query }));
        })
        .then(remote => state => ({
            ...state,
            comments: {
                ...state.comments,
                loadingPrevious: false,
                before: remote.count - remote.list.length,
                hashtables: mergeHashtables(
                    state.comments.hashtables,
                    remote.hashtables
                ),
                list: [...remote.list, ...state.comments.list],
            },
        }));
}

function mergeHashtables(h1, h2) {
    return {
        comments: {
            ...h1.comments,
            ...h2.comments,
        },
        votes: {
            ...h1.votes,
            ...h2.votes,
        },
    };
}

async function fetchRecentComments(effects, { after, limit }) {
    const tempState = await effects.comments('loadingRecent', true);
    const id = tempState.post.id;
    const params = {
        offset: 0,
        limit,
        after,
    };
    const data = await jsonReq(
        request(`comments/${id}?${qs.stringify(params)}`)
    );
    return state => ({
        ...state,
        counters: {
            ...state.counters,
            acknowledged: {
                ...state.counters.acknowledged,
                [id]:
                    (state.counters.acknowledged[id] || 0) +
                    (state.counters.recent[id] || 0),
            },
            recent: {
                ...state.counters.recent,
                [id]: 0,
            },
        },
        // Update the post in the feed list (to update the missed count to 0)
        feed: {
            ...state.feed,
            list: state.feed.list.map(post => {
                if (post.id !== id) {
                    return post;
                }
                return {
                    ...post,
                    comments: {
                        ...post.coments,
                        count: state.counters.recent[id] || post.comments.count,
                    },
                };
            }),
        },
        comments: {
            ...state.comments,
            loadingRecent: false,
            hashtables: {
                comments: {
                    ...state.comments.hashtables.comments,
                    ...data.hashtables.comments,
                },
                votes: {
                    ...state.comments.hashtables.votes,
                    ...data.hashtables.votes,
                },
            },
            list: [...state.comments.list, ...data.list],
        },
    });
}

async function deleteComment(effects, id, reason = '') {
    const response = await request(`comments/${id}`, {
        method: 'DELETE',
        query: { reason },
    });
    if (response.status != 200) {
        return state => state;
    }
    return state => ({
        ...state,
        comments: {
            ...state.comments,
            list: state.comments.list.filter(cid => cid !== id),
        },
    });
}

function deletePost(effects, id, reason = '') {
    return request(`posts/${id}`, {
        method: 'DELETE',
        query: { reason },
    }).then(response => {
        if (response.status != 200) {
            return state => state;
        }
        return effects.fetchPost(false).then(() => state => ({
            ...state,
            feed: {
                ...state.feed,
                list: state.feed.list.filter(item => item.id !== id),
            },
        }));
    });
}

async function updateComment(effects, { content, id }) {
    try {
        const state = await effects.comments('replying', true);
        const body = { content };
        const comment = await jsonReq(
            request(`comments/${id}`, {
                method: 'PUT',
                body,
            })
        );
        const replied = state.comments.hashtables.comments[id];
        const updated = {
            ...replied,
            content: comment.content,
        };
        return state => ({
            ...state,
            comments: {
                ...state.comments,
                hashtables: {
                    ...state.comments.hashtables,
                    comments: {
                        ...state.comments.hashtables.comments,
                        [id]: updated,
                    },
                },
            },
            ui: {
                ...state.ui,
                replying: false,
            },
        });
    } catch (message) {
        toast.error(t`${message}`);
        return state => ({
            ...state,
            ui: {
                ...state.ui,
                replying: false,
            },
        });
    }
}

async function replyFocus(effects, type, id = false) {
    const authState = await effects.auth('lastUsed', new Date());
    if (authState.auth.user === false && authState.auth.loading === false) {
        return effects.auth('modal', true).then(() => state => state);
    }
    const [commentingId, commentingType, commenting] =
        id === false && type === false
            ? [false, false, false]
            : [id, type, true];

    return state => ({
        ...state,
        ui: {
            ...state.ui,
            commentingId,
            commentingType,
            commenting,
        },
    });
}

function onFeedEvent(effects, params) {
    const fire = params.fire || false;
    switch (fire) {
        case 'new-comment':
            return state => {
                return {
                    ...state,
                    counters: {
                        ...state.counters,
                        recent: {
                            ...state.counters.recent,
                            [params.id]: params.count,
                        },
                    },
                };
            };
        case 'delete-post':
            return state => {
                const id = params.id;
                return {
                    ...state,
                    feed: {
                        ...state.feed,
                        list: state.feed.list.filter(item => item.id !== id),
                    },
                };
            };
        case 'new-post':
            return state => ({
                ...state,
                counters: {
                    ...state.counters,
                    posts: state.counters.posts + 1,
                },
            });
        default:
            console.info('Feed event could not be handled', params);
            return state => state;
    }
}

export default provideState({
    effects: {
        initialize,
        initPost,
        search,
        fetchFeed,
        fetchPost,
        fetchComments,
        fetchPreviousComments,
        fetchRecentComments,
        publishPost,
        updatePost,
        reactTo,
        replyFocus,
        publishReply,
        updateComment,
        deleteComment,
        deletePost,
        onFeedEvent,
        fetchRecentPosts,
        fetchMorePosts,
        setTab,
        feed: kvReducer('feed'),
        post: kvReducer('post'),
        publisher: kvReducer('publisher'),
        ui: kvReducer('ui'),
        comments: kvReducer('comments'),
        counters: kvReducer('counters'),
        working: update((state, working) => ({ working })),
        loading: update((state, loading) => ({ auth: { loading } })),
    },
    computed: {
        firstCommentID({ comments }) {
            return comments.list !== false && comments.list.length > 0
                ? comments.list[0]
                : false;
        },
        lastCommentID({ comments }) {
            return comments.list !== false && comments.list.length > 0
                ? comments.list[comments.list.length - 1]
                : false;
        },
        mentionable({ post }) {
            const users = post.data.usersHashtable || {};
            return Object.keys(users).map(user => ({
                id: user,
                display: user,
            }));
        },
    },
    initialState,
});

function subcategoriesBy(categories, field) {
    return categories
        .map(category => category.subcategories)
        .reduce((kvmap, subcategories) => {
            for (let k in subcategories) {
                kvmap[subcategories[k][field]] = subcategories[k];
            }

            return kvmap;
        }, {});
}
