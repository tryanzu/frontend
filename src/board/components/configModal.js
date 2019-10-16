import { useState } from 'react';
import h from 'react-hyperscript';
import Modal from 'react-modal';
import helpers from 'hyperscript-helpers';
import { t } from '../../i18n';
import { GeneralConfig } from './generalConfig';
import { CategoriesConfig } from './categoriesConfig';
import classNames from 'classnames';

const tags = helpers(h);
const { div, img, i, a } = tags;

export function ConfigModal({ state, setOpen, effects }) {
    const [activeTab, setActiveTab] = useState('general');

    return h(
        Modal,
        {
            isOpen: true,
            onRequestClose: () => setOpen(false),
            ariaHideApp: false,
            contentLabel: t`Configuración`,
            className: 'config-modal',
            style: {
                overlay: {
                    zIndex: 301,
                    backgroundColor: 'rgba(0, 0, 0, 0.30)',
                },
            },
        },
        div('.modal-container.config.fade-in.', { style: { width: '640px' } }, [
            div('.flex', [
                h('nav', [
                    a([
                        img('.w3', {
                            src: '/images/anzu.svg',
                            alt: 'Anzu',
                        }),
                    ]),
                    a(
                        {
                            onClick: () => setActiveTab('general'),
                            className: classNames({
                                active: activeTab === 'general',
                            }),
                        },
                        [i('.icon-cog.mr1'), t`General`]
                    ),
                    a(
                        {
                            onClick: () => setActiveTab('categories'),
                            className: classNames({
                                active: activeTab === 'categories',
                            }),
                        },
                        [i('.icon-th-list-outline.mr1'), t`Categorías`]
                    ),
                    a([i('.icon-lock-open.mr1'), t`Permisos`]),
                    a([i('.icon-picture-outline.mr1'), t`Diseño`]),
                ]),
                div([
                    activeTab === 'general' &&
                        h(GeneralConfig, { state, setOpen, effects }),
                    activeTab === 'categories' &&
                        h(CategoriesConfig, { state, setOpen, effects }),
                ]),
            ]),
        ])
    );
}
