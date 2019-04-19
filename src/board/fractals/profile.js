import { provideState } from 'freactal';
import { request } from '../../utils';
import { kvReducer } from '../utils';

function initialState() {
    return {
        profile: {
            error: false,
            loading: false,
            id: false,
            data: {},
            posts: {},
        },
        comments: {
            loading: false,
            count: 0,
            list: [],
        },
        posts: {
            loading: false,
            count: 0,
            list: [],
        },
    };
}

async function initialize(effects, props) {
    const userId = props.match.params.id || false;
    if (userId) {
        await effects.syncProfile(userId);
    }
    return state => state;
}

function initProfile(_, id = false) {
    return state => ({
        ...state,
        profile: {
            ...state.profile,
            data: {},
            loading: id && true,
            id,
        },
        comments: {
            ...state.comments,
            loading: true,
        },
        posts: {
            ...state.posts,
            loading: true,
        },
    });
}

function jsonReq(req) {
    return req.then(response => response.json());
}

function syncProfile(effects, id) {
    return effects
        .fetchProfile(id)
        .then(() =>
            Promise.all([
                jsonReq(request(`users/${id}/comments`)),
                jsonReq(
                    request(`feed`, {
                        query: { user_id: id, offset: 0, limit: 10 },
                    })
                ),
            ])
        )
        .then(([comments, posts]) => state => ({
            ...state,
            posts: {
                ...state.posts,
                count: posts.count,
                list: posts.feed,
                loading: false,
            },
            comments: {
                ...state.comments,
                count: comments.count,
                list: comments.activity,
                loading: false,
            },
        }));
}

function updateAvatar(effects, form) {
    return effects.postNewAvatar(form).then(authState => state => ({
        ...state,
        profile: {
            ...state.profile,
            data: {
                ...state.profile.data,
                image: authState.auth.user.image,
            },
        },
    }));
}

function updateCurrentProfile(effects, form) {
    return effects.updateProfile(form).then(authState => state => ({
        ...state,
        profile: {
            ...state.profile,
            data: {
                ...state.profile.data,
                ...authState.auth.user,
            },
        },
    }));
}

async function fetchProfile(effects, id) {
    try {
        await effects.initProfile(id);

        // Stop side effects if false userId was provided.
        if (id === false) {
            return state => state;
        }

        // Fetch remote post data.
        const remote = await request(`users/${id}`);
        if (remote.status !== 200) {
            throw remote.status;
        }
        const data = await remote.json();
        return state => ({
            ...state,
            profile: {
                ...state.profile,
                loading: false,
                error: false,
                id,
                data,
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

export default provideState({
    effects: {
        initialize,
        initProfile,
        fetchProfile,
        syncProfile,
        updateAvatar,
        updateCurrentProfile,
        profile: kvReducer('profile'),
    },
    computed: {},
    initialState,
});
