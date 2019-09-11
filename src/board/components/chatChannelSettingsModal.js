import h from 'react-hyperscript';
import classNames from 'classnames';
import helpers from 'hyperscript-helpers';
import { useState } from 'react';
import { withRouter } from 'react-router-dom';
import { t } from '../../i18n';
import { Modal } from './modal';

const tags = helpers(h);
const { div, p, form, input, h3, label, i } = tags;

export const ChatChannelSettings = withRouter(function ChatChannelSettings(
    props
) {
    const { channel, effects, isOpen, onRequestClose, ...otherProps } = props;
    const [enableVideo, setEnableVideo] = useState(!!channel.youtubeVideo);
    const [deleteChannel, setDeleteChannel] = useState(false);
    const [name, setName] = useState(channel.name);
    const [description, setDescription] = useState(channel.description);
    const [videoId, setVideoId] = useState(channel.youtubeVideo);
    const disabled =
        (name == channel.name || !name) &&
        description == channel.description &&
        videoId == channel.youtubeVideo &&
        (enableVideo == !!channel.youtubeVideo || !videoId) &&
        !deleteChannel;

    async function onSubmit(event) {
        event.preventDefault();
        if (disabled === true) {
            return;
        }
        const updated = {
            ...channel,
            name,
            description,
            youtubeVideo: enableVideo ? videoId : '',
            deleted: deleteChannel === true ? true : false,
        };
        await effects.updateChatChannelConfig(channel, updated);
        props.history.push(`/chat/`);
        onRequestClose();
    }
    return h(
        Modal,
        {
            isOpen,
            onRequestClose,
            contentLabel: otherProps.action || 'Feedback',
            className: 'chat-config-modal',
        },
        [
            div('.modal-container', { style: { width: '360px' } }, [
                form('.modal-body', { onSubmit }, [
                    div('.flex.items-center.header', [
                        h3('.flex-auto', t`Configuración del canal`),
                    ]),
                    div('.form-group', [
                        label('.b.form-label', t`Nombre del canal`),
                        input('.form-input', {
                            pattern: '^[a-z0-9\\-_]+$',
                            name: 'name',
                            type: 'text',
                            placeholder: t`Ej. Canal-de-Anzu`,
                            value: name,
                            onChange: event => setName(event.target.value),
                        }),
                        p(
                            '.form-input-hint',
                            t`Para el nombre solo se admiten letras, números y guiones `
                        ),
                    ]),
                    div('.form-group', [
                        label('.b.form-label', t`Desripción del canal`),
                        input('.form-input', {
                            maxlenght: '120',
                            name: 'description',
                            type: 'text',
                            placeholder: t`Ej. Este canal se usa para...`,
                            value: description,
                            onChange: event =>
                                setDescription(event.target.value),
                        }),
                        p(
                            '.form-input-hint',
                            t`Describe cúal es el proposito de tu canal.`
                        ),
                    ]),
                    channel.name !== '' &&
                        div('.form-group', [
                            label('.b.form-switch.normal', [
                                input({
                                    type: 'checkbox',
                                    onChange: event =>
                                        setDeleteChannel(event.target.checked),
                                    checked: deleteChannel,
                                }),
                                i('.form-icon'),
                                t`Borrar canal`,
                            ]),
                        ]),
                    deleteChannel === false &&
                        div('.form-group', [
                            label('.b.form-switch.normal', [
                                input({
                                    type: 'checkbox',
                                    onChange: event =>
                                        setEnableVideo(event.target.checked),
                                    checked: enableVideo,
                                }),
                                i('.form-icon'),
                                t`Video de Youtube`,
                            ]),
                        ]),
                    deleteChannel === false &&
                        enableVideo === true &&
                        div('.form-group', [
                            label('.b.form-label', t`ID del video`),
                            input('.form-input', {
                                name: 'videoId',
                                type: 'text',
                                placeholder: t`ID del video`,
                                value: videoId,
                                onChange: event =>
                                    setVideoId(event.target.value),
                            }),
                            p(
                                '.form-input-hint',
                                t`Mostrado alrededor del sitio, el nombre de tu comunidad.`
                            ),
                        ]),
                    input('.btn.btn-block', {
                        disabled,
                        type: 'submit',
                        value: deleteChannel
                            ? 'Borrar Canal'
                            : 'Guardar Configuración',
                        className: classNames({
                            'btn-primary': true,
                            'btn-error': deleteChannel === true,
                        }),
                    }),
                ]),
            ]),
        ]
    );
});
