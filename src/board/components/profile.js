import { Fragment, useState } from 'react';
import h from 'react-hyperscript';
import helpers from 'hyperscript-helpers';
import Dropzone from 'react-dropzone';
import withState from '../fractals/profile';
import { Link } from 'react-router-dom';
import { injectState } from 'freactal';
import { number, ago, t } from '../../i18n';
import { MemoizedMarkdown } from '../utils';
import { toast } from 'react-toastify';

const tags = helpers(h);
const { main, div, section } = tags;
const { figure, article, a, img } = tags;
const { h3, h1, span, p, i, input, button } = tags;

function Profile({ state, effects }) {
    const { profile, auth, gamification, comments, posts } = state;
    const user = profile.id === auth.user.id ? auth.user : profile.data;

    // Loading state.
    if (profile.loading || profile.id === false) {
        return main('.profile.flex-auto', {}, div('.pv2', {}, div('.loading')));
    }

    const level = user.gaming.level || 0;
    const lvl = gamification.rules.find(rule => rule.level == level) || {};
    const starts = lvl.swords_start || 0;
    const ends = lvl.swords_end || 0;
    const gap = ends - starts;
    const rest = ends - user.gaming.swords;
    const gapPercent = Math.round(rest / gap * 10000) / 100;
    const { image, username } = user;

    function onDrop(acceptedFiles) {
        if (acceptedFiles.length == 0) {
            return;
        }
        let form = new window.FormData();
        form.append('file', acceptedFiles[0]);
        effects.updateAvatar(form);
    }

    const editable = state.canUpdate(user.id);
    return main('.profile.flex-auto', [
        section('.fade-in.tc', [
            state.canUpdate(user.id) &&
                h(
                    Dropzone,
                    { onDrop },
                    ({ getRootProps, getInputProps /*, isDragActive*/ }) =>
                        h(Fragment, [
                            figure(
                                '.avatar.avatar-xl.tooltip',
                                {
                                    style: { borderRadius: '100%' },
                                    dataset: {
                                        tooltip: t`Arrastra una imagen para cambiar tu avatar`,
                                        initial: username.substr(0, 1),
                                    },
                                    ...getRootProps(),
                                },
                                [
                                    input({ ...getInputProps() }),
                                    image &&
                                        img({
                                            src: image,
                                            alt: t`Perfil de ${username}`,
                                        }),
                                ]
                            ),
                        ])
                ),
            state.canUpdate(user.id) === false &&
                figure(
                    '.avatar.avatar-xl',
                    {
                        style: { borderRadius: '100%' },
                        dataset: { initial: username.substr(0, 1) },
                    },
                    [
                        image &&
                            img({
                                src: image,
                                alt: `Perfil de ${username}`,
                            }),
                    ]
                ),
            user.username &&
                h(
                    UpdatableProfileField,
                    {
                        editable,
                        value: user.username,
                        onUpdate: username =>
                            effects
                                .updateCurrentProfile({ username })
                                .then(state => state.profile.data.username),
                    },
                    div('.flex-auto.mv3', [
                        h1(`${user.username}`),
                        user.validated === false &&
                            span(
                                '.label.label-warning',
                                t`Correo electrónico no validado.`
                            ),
                        user.validated === true &&
                            span('.label.label-success', t`Perfíl confirmado`),
                    ])
                ),
            user.email &&
                h(
                    UpdatableProfileField,
                    {
                        editable,
                        value: user.email,
                        onUpdate: email =>
                            effects
                                .updateCurrentProfile({ email })
                                .then(state => state.profile.data.email),
                    },
                    p('.flex-auto', user.email)
                ),
            h(
                UpdatableProfileField,
                {
                    editable,
                    value: user.description,
                    onUpdate: description =>
                        effects
                            .updateCurrentProfile({ description })
                            .then(state => state.profile.data.description),
                },
                p(
                    '.flex-auto',
                    user.description ||
                        user.username + ' ' + t`no ha escrito su biografía aún.`
                )
            ),
            editable &&
                h(
                    UpdatableProfileField,
                    {
                        editable,
                        value: '',
                        inputProps: {
                            type: 'password',
                            placeholder: t`Escribe tu nueva contraseña...`,
                        },
                        onUpdate: password =>
                            effects
                                .updateCurrentProfile({ password })
                                .then(() => ''), // promise will reset inner value to empty when resolved.
                    },
                    p('.flex-auto', `●●●●●●●●`)
                ),
            editable &&
                !user.description &&
                div(
                    '.toast.toast-warning.measure-wide.center.lh-copy.mv3',
                    t`Aún no has escrito tu biografía. Ayuda a otros a conocer sobre ti escribiendo una en tu perfil.`
                ),
            //holi
            div('.mw5.mb3.center', [
                i('.icon-crown.gold.f5'),
                span('.db.mb2.f5', [
                    span('.b', number(user.gaming.swords)),
                    ' / reputación',
                ]),
                div('.flex.items-center.mb2', [
                    span('.ph2', String(level)),
                    div(
                        '.bar.bar-sm',
                        {},
                        div('.bar-item', {
                            role: 'progressbar',
                            style: {
                                width: `${gapPercent}%`,
                            },
                        })
                    ),
                    span('.ph2', String(level + 1)),
                ]),
                span('.db.mb2', t`${number(rest)} para el siguiente nivel`),
            ]),
            div('.flex.flex-wrap.pb4.boxed', [
                span('.flex-auto', [
                    span('.icon-location.mr2'),
                    user.profile.country || t`Desconocido`,
                ]),
                span('.flex-auto', [
                    span('.icon-calendar.mr2'),
                    t`Miembro hace ${ago(user.created_at)}`,
                ]),
                span('.flex-auto', [
                    span('.icon-doc.mr2'),
                    span('.b', String(number(posts.count || 0))),
                    t` publicaciones`,
                ]),
                span('.flex-auto', [
                    span('.icon-chat.mr2'),
                    span('.b', number(comments.count)),
                    t` comentarios`,
                ]),
            ]),
            div('.db.flex-ns.mt4', [
                div('.flex-auto.w-50-ns', [
                    h3('.f5.mb3', t`Ultimas publicaciones`),
                    div('.tl.boxed', { style: { padding: '0' } }, [
                        posts.loading === true &&
                            div('.pv2', {}, div('.loading')),
                        posts.loading === false &&
                            div(
                                posts.list.map(post =>
                                    h(PostView, {
                                        key: post.id,
                                        post,
                                        subcategories: state.subcategories,
                                    })
                                )
                            ),
                        posts.loading === false &&
                            posts.list.length === 0 &&
                            div(
                                '.pv2.tc',
                                {},
                                t`No encontramos ningúna publicación de este usuario`
                            ),
                    ]),
                ]),
                div('.ph3.dn.db-ns'),
                div('.flex-auto.mt3.w-50-ns.mt0-ns', [
                    h3('.f5.mb3', t`Ultimos comentarios`),
                    div('.tl.boxed', { style: { padding: '0' } }, [
                        comments.loading === true &&
                            div('.pv2', {}, div('.loading')),
                        comments.loading === false &&
                            div(
                                comments.list.map(comment =>
                                    h(CommentView, {
                                        key: comment.id,
                                        comment,
                                    })
                                )
                            ),
                        comments.loading === false &&
                            comments.list.length === 0 &&
                            div(
                                '.pv2.tc',
                                {},
                                t`No encontramos ningún comentario de este usuario`
                            ),
                    ]),
                ]),
            ]),
        ]),
    ]);
}

function CommentView({ comment }) {
    const href = `/p/${comment.slug}/${comment.related_id}`;

    return article('.comment', [
        div('.flex.items-center', [
            div(
                '.flex-auto',
                {},
                h(Link, { className: 'category link', to: href }, comment.title)
            ),
        ]),
        div([
            h(MemoizedMarkdown, { content: comment.content }),
            div({}, span('.ago', t`Comentado hace ` + ago(comment.created_at))),
        ]),
    ]);
}

function PostView({ post, subcategories }) {
    const href = `/p/${post.slug}/${post.id}`;
    const category = subcategories.id[post.category] || false;

    return article('.post', [
        div('.flex.items-center', [
            div(
                '.flex-auto',
                {},
                category != false
                    ? h(
                          Link,
                          {
                              className: 'link category',
                              to: `/c/${category.slug}`,
                          },
                          category.name
                      )
                    : a('.category', {}, span('.loading'))
            ),
            post.pinned && span('.icon-pin.pinned-post'),
        ]),
        div('.flex.items-center', [
            div('.flex-auto', [
                h1(
                    '.lh-copy',
                    {},
                    h(
                        Link,
                        {
                            className: 'link',
                            to: href,
                            dataset: {
                                postId: post.id,
                            },
                        },
                        post.title
                    )
                ),
                div(
                    {},
                    span('.ago', t`Publicado hace ` + ago(post.created_at))
                ),
            ]),
            div(
                '.tc',
                {
                    style: {
                        minWidth: '50px',
                        flexShrink: 0,
                    },
                },
                [span('.icon-chat-alt'), span('.pl2.b', post.comments.count)]
            ),
        ]),
    ]);
}

function UpdatableProfileField({
    editable,
    value,
    children,
    onUpdate,
    ...props
}) {
    const inputProps = props.inputProps || {};
    const isPassword = inputProps.type === 'password';
    const [updating, setUpdating] = useState(false);
    const [_value, setValue] = useState(value);
    const [confirmValue, setConfirm] = useState('');
    if (updating === false) {
        return div('.flex.measure-wide.center.items-center.ph2.ph0-ns', [
            children,
            editable &&
                button(
                    '.btn.btn-sm.btn-action',
                    { onClick: () => setUpdating(true) },
                    i('.icon-edit')
                ),
        ]);
    }

    return h(
        'form.mv3.ph2.ph0-ns',
        {
            onSubmit: event => {
                event.preventDefault();
                if (isPassword && confirmValue !== _value) {
                    return;
                }
                onUpdate(_value).then(value => {
                    toast.success(t`Cambios al perfil guardados`);
                    setValue(value);
                    setUpdating(false);
                });
            },
        },
        [
            div('.input-group.measure-wide.center', [
                input('.form-input', {
                    onChange: event => setValue(event.target.value),
                    type: 'text',
                    required: true,
                    value: _value,
                    autoFocus: true,
                    ...inputProps,
                }),
                isPassword &&
                    input('.form-input', {
                        onChange: event => setConfirm(event.target.value),
                        type: 'password',
                        required: true,
                        value: confirmValue,
                        placeholder: t`Confirma tu nueva contraseña`,
                    }),
                button(
                    '.btn.btn-primary.input-group-btn',
                    {
                        type: 'submit',
                        disabled:
                            isPassword &&
                            _value.length > 0 &&
                            _value !== confirmValue,
                    },
                    t`Guardar cambios`
                ),
                button(
                    '.btn.input-group-btn',
                    {
                        type: 'cancel',
                        onClick: () => {
                            setUpdating(false);
                            setValue(value);
                        },
                    },
                    t`Cancelar`
                ),
            ]),
        ]
    );
}
export default withState(injectState(Profile));
