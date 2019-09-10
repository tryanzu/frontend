import React from 'react';
import { provideState, update } from 'freactal';
import { request } from '../../utils';
import { kvReducer, jsonReq, channelToObs } from '../utils';
import { glue } from '../../drivers/ext/glue';
import { fromObs } from 'callbag-basics-esmodules';
import { toast } from 'react-toastify';
import { t, i18n } from '../../i18n';
import { adminTools } from '../../acl';

export const GlueContext = React.createContext(false);
export const AuthContext = React.createContext({});

function initialState() {
    const realtime = glue(window.Anzu.glue || '', {});
    const channels = {
        global: fromObs(channelToObs(realtime)),
        feed: fromObs(channelToObs(realtime, 'feed')),
    };
    const site = window.Anzu.site || {};
    realtime.on('connected', () => {
        if ('_authToken' in window) {
            realtime.send(
                JSON.stringify({
                    event: 'auth',
                    params: { token: window._authToken },
                })
            );
        }
    });
    return {
        init: false,
        working: false,
        realtime,
        channels,
        site: {
            name: '',
            description: '',
            nav: [],
            chat: [],
            logoUrl: '',
            ...site,
        },
        categories: [],
        notifications: {
            count: 0,
            loading: false,
            list: [],
        },
        subcategories: {
            loading: false,
            id: {},
            slug: {},
        },
        gamification: {
            loading: true, // This must be loaded as part of the initialize sequence and finally set to false.
            rules: [],
        },
        users: {
            list: [],
        },
        auth: {
            email: '',
            password: '',
            username: '',
            rememberMe: false,
            token: false,
            expires: false,
            user: false,
            loading: false,
            error: false,
            modal: false,
            intent: false,
            tab: 'login',
            lastUsed: false,
            forgot: false,
        },
        profile: {
            newPassword: '',
            confirmPassword: '',
        },
    };
}

function initialize(effects, props) {
    const _auth = props.auth || {};
    const session = JSON.parse(window.localStorage.getItem('_auth') || '{}');
    const auth = { ..._auth, ...session };
    const finalReducer = state => ({ ...state, init: true });
    const loadGamification = Promise.all([
        effects.fetchGamification(),
        effects.fetchCategories(),
    ]);

    if ('token' in auth && auth.token !== false) {
        window._authToken = auth.token;
        return loadGamification
            .then(() => effects.loading(true))
            .then(() => effects.change('token', auth.token))
            .then(() => effects.fetchAccount(auth.token))
            .then(() => finalReducer);
    }

    return loadGamification.then(() => finalReducer);
}

function performSignup(effects) {
    return effects
        .change('loading', true)
        .then(state => {
            const { email, password, username } = state.auth;
            const body = { email, password, username };
            return jsonReq(request('user', { method: 'POST', body }));
        })
        .then(({ token }) => {
            window._authToken = token;
            window.localStorage.setItem('_auth', JSON.stringify({ token }));
            return effects.fetchAccount(token);
        })
        .then(() => state => {
            return {
                ...state,
                auth: { ...state.auth, modal: false },
                init: true,
            };
        })
        .catch(error => state => {
            window.localStorage.removeItem('_auth');
            return {
                ...state,
                auth: {
                    ...state.auth,
                    error,
                    token: false,
                    user: false,
                    loading: false,
                },
                profile: {
                    newPassword: '',
                    confirmPassword: '',
                },
            };
        });
}

function performLogin(effects) {
    return effects
        .change('loading', true)
        .then(state => {
            const { email, password } = state.auth;
            const query = { email, password };
            return jsonReq(
                request('auth/get-token', { method: 'POST', query })
            );
        })
        .then(({ token }) => {
            window._authToken = token;
            window.localStorage.setItem('_auth', JSON.stringify({ token }));
            return effects.fetchAccount(token);
        })
        .then(() => state => {
            return {
                ...state,
                auth: { ...state.auth, modal: false },
                init: true,
            };
        })
        .catch(error => state => {
            window.localStorage.removeItem('_auth');
            return {
                ...state,
                auth: {
                    ...state.auth,
                    error,
                    token: false,
                    user: false,
                    loading: false,
                },
                profile: {
                    newPassword: '',
                    confirmPassword: '',
                },
            };
        });
}

function fetchAccount(effects, token) {
    return effects
        .loading()
        .then(state => {
            state.realtime.send(
                JSON.stringify({ event: 'auth', params: { token } })
            );
            return jsonReq(request('user/my'));
        })
        .then(user => effects.fetchCategories(true).then(() => user))
        .then(user => {
            user.profile = user.profile || { bio: '', country: '' };
            if ('Raven' in window) {
                window.Raven.setUserContext(user);
            }
            return state => {
                return {
                    ...state,
                    notifications: {
                        ...state.notifications,
                        count: user.notifications || 0,
                    },
                    auth: {
                        ...state.auth,
                        user,
                        token,
                        loading: false,
                    },
                };
            };
        })
        .catch(() => state => {
            window.localStorage.removeItem('_auth');
            return {
                ...state,
                auth: {
                    ...state.auth,
                    error: false,
                    token: false,
                    user: false,
                    loading: false,
                },
            };
        });
}

function change(effects, field, value, on = 'auth') {
    return state => ({
        ...state,
        [on]: {
            ...state[on],
            [field]: value,
        },
    });
}

function fetchNotifications(effects) {
    return effects
        .notifications('loading', true)
        .then(() => jsonReq(request('notifications')))
        .then(list => state => ({
            ...state,
            notifications: {
                ...state.notifications,
                list,
                count: 0,
                loading: false,
            },
        }));
}

function fetchGamification() {
    return request('gamification')
        .then(req => req.json())
        .then(data => state => ({
            ...state,
            gamification: {
                ...state.gamification,
                ...data,
                loading: false,
            },
        }));
}

function fetchUsers(effects, before = false) {
    return jsonReq(request('users', { query: { before } })).then(
        data => state => ({
            ...state,
            users: {
                ...state.users,
                list:
                    before === false
                        ? data.list
                        : state.users.list.concat(data.list),
            },
        })
    );
}

function fetchCategories(effects, invalidate = false) {
    return effects
        .change('loading', true, 'subcategories')
        .then(state => {
            if (invalidate || state.categories.length === 0) {
                return jsonReq(request('category'));
            }
            return Promise.resolve(state.categories);
        })
        .then(categories => state => ({
            ...state,
            categories,
            subcategories: {
                loading: false,
                id: subcategoriesBy(categories, 'id'),
                slug: subcategoriesBy(categories, 'slug'),
            },
        }));
}

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

function fetchRequest(effects, url, params = {}) {
    return effects.working(true).then(state => request(state, url, params));
}

function logout() {
    return state => {
        window.localStorage.removeItem('_auth');
        return {
            ...state,
            auth: {
                ...state.auth,
                error: false,
                token: false,
                user: false,
                loading: false,
            },
        };
    };
}

function onUpdatePass(effects) {
    return effects
        .change('loading', true)
        .then(state =>
            request(`${Anzu.layer}/account/password`, {
                method: 'PATCH',
                body: JSON.stringify({
                    Password: state.profile.newPassword,
                    ConfirmPassword: state.profile.confirmPassword,
                }),
            })
                .then(async result => {
                    if (result.status !== 200) {
                        throw await result.json();
                    }
                    return result.json();
                })
                .then(() =>
                    effects.change('password', state.profile.newPassword)
                )
                .then(() => effects.performLogin())
        )
        .catch(() => state => {
            return {
                ...state,
                auth: {
                    ...state.auth,
                    loading: false,
                },
            };
        });
}

function postNewAvatar(effects, form) {
    return jsonReq(
        request(`user/my/avatar`, {
            method: 'POST',
            body: form,
        })
    ).then(response => state => ({
        ...state,
        auth: {
            ...state.auth,
            user: {
                ...state.auth.user,
                image: response.url,
            },
        },
    }));
}

function requestFlag(effects, form) {
    const body = {
        related_to: form.related_to,
        related_id: form.related_id,
        category: form.reason,
        content: form.content,
    };
    return jsonReq(request(`flags`, { method: 'POST', body }))
        .then(res => {
            if (res.status === 'error') {
                throw res.message;
            }
            toast.success(
                t`Tu solicitud ha sido enviada. Alguien la revisará pronto.`
            );
            return state => state;
        })
        .catch(message => {
            toast.error(t`${message}`);
            return state => state;
        });
}

function requestUserBan(effects, form) {
    const body = {
        related_to: 'site',
        user_id: form.user_id,
        reason: form.reason,
        content: form.content,
    };
    return jsonReq(request('ban', { method: 'POST', body }))
        .then(res => {
            if (res.status === 'error') {
                throw res.message;
            }
            toast.success(t`La solicitud de baneo ha sido procesada.`);
            return state => state;
        })
        .catch(message => {
            toast.error(t`${message}`);
            return state => state;
        });
}

function updateChatChannelConfig(effects, channel, updates) {
    return effects
        .working(true)
        .then(state => {
            const list = state.site.chat || [];
            const updated = list.map(
                item =>
                    item.name === channel.name
                        ? {...channel, ...updates}
                        : item
            );

            const body = {
                section: 'site',
                changes: {
                    chat: updated,
                },
            };

            return Promise.all([
                jsonReq(request('config', { method: 'PUT', body })),
                updated,
            ]);
        })
        .then(([res, updated]) => {
            if (res.status === 'error') {
                throw res.message;
            }
            toast.success(t`Cambios guardados con éxito`);
            return state => ({
                ...state,
                site: {
                    ...state.site,
                    chat: updated
                },
            });
        })
        .catch(message => {
            toast.error(t`${message}`);
            return state => state;
        });
}

function updateProfile(effects, form) {
    return jsonReq(
        request(`user/my`, {
            method: 'PUT',
            body: form,
        })
    )
        .then(response => state => ({
            ...state,
            auth: {
                ...state.auth,
                user: {
                    ...state.auth.user,
                    ...(response.user || {}),
                },
            },
        }))
        .catch(message => {
            toast.error(t`${message}`);
            return state => state;
        });
}

function requestValidationEmail() {
    return jsonReq(request('auth/resend-confirmation'))
        .then(res => {
            if (res.status === 'error') {
                throw res.message;
            }
            toast.success(
                t`Un nuevo correo de confirmación ha sido enviado. Revisa tu bandeja de entrada.`
            );
            return state => state;
        })
        .catch(message => {
            toast.error(t`${message}`);
            return state => state;
        });
}

function requestPasswordReset(effects) {
    return effects
        .change('loading', true)
        .then(state => {
            const { email } = state.auth;
            const query = { email };
            return jsonReq(
                request('auth/lost-password', { method: 'GET', query })
            );
        })
        .then(res => {
            if (res.status === 'error') {
                throw res.message;
            }
            toast.success(
                t`An email has been sent to this address with instructions on how to reset your password.`
            );
            return state => state;
        })
        .then(() => state => {
            return {
                ...state,
                auth: {
                    ...state.auth,
                    modal: false,
                    loading: false,
                    error: false,
                    email: '',
                    forgot: false,
                },
            };
        })
        .catch(error => state => {
            return {
                ...state,
                auth: {
                    ...state.auth,
                    error,
                    loading: false,
                },
            };
        });
}

function updateGaming(effects, counters) {
    return effects
        .gamification({ ...counters })
        .then(state => {
            const { gamification, auth } = state;
            const diff = (gamification.swords || 0) - auth.user.gaming.swords;
            if (diff > 0) {
                toast.success(
                    i18n
                        .translate(
                            'You just received a reputation point. Thanks for sharing.'
                        )
                        .ifPlural(
                            diff,
                            'You just received %d reputation points. Thanks for contributing this community.'
                        )
                        .fetch(diff)
                );
            } else {
                toast.error(
                    i18n
                        .translate('You just lost %d reputation points. =/')
                        .ifPlural(
                            -diff,
                            'You just lost %d reputation points. =/'
                        )
                        .fetch(-diff)
                );
            }

            return delay(10000);
        })
        .then(() => state => ({
            ...state,
            auth: {
                ...state.auth,
                user: {
                    ...state.auth.user,
                    gaming: {
                        ...state.auth.user.gaming,
                        ...counters,
                    },
                },
            },
        }));
}

function loading() {
    return state => ({
        ...state,
        auth: {
            ...state.auth,
            loading: true,
        },
    });
}

function updateSite(effects, config) {
    return state => ({
        ...state,
        site: {
            ...state.site,
            ...config,
        },
    });
}

export default provideState({
    effects: {
        initialize,
        fetchAccount,
        performLogin,
        performSignup,
        change,
        updateChatChannelConfig,
        requestValidationEmail,
        requestPasswordReset,
        requestFlag,
        requestUserBan,
        fetchRequest,
        fetchGamification,
        postNewAvatar,
        updateProfile,
        fetchCategories,
        fetchNotifications,
        fetchUsers,
        onUpdatePass,
        loading,
        logout,
        updateSite,
        updateGaming,
        auth: kvReducer('auth'),
        notifications: kvReducer('notifications'),
        gamification: kvReducer('gamification'),
        working: update((state, working) => ({ working })),
    },
    computed: {
        ready({ init, auth }) {
            return init === true && auth.loading === false;
        },
        authenticated({ auth }) {
            return auth.user !== false && auth.loading === false;
        },
        canUpdate({ auth }) {
            return id => {
                return (
                    auth.user !== false &&
                    (auth.user.id == id || adminTools({ user: auth.user }))
                );
            };
        },
        chat({ site }) {
            return {
                channels: new window.Map(
                    site.chat.map(chan => [chan.name, chan])
                ),
            };
        },
        glue({ realtime }) {
            return realtime;
        },
    },
    initialState,
});
function delay(duration) {
    return function() {
        return new Promise(function(resolve) {
            window.setTimeout(function() {
                resolve();
            }, duration);
        });
    };
}
