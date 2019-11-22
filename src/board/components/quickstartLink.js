import h from 'react-hyperscript';
import { useState } from 'react';
import helpers from 'hyperscript-helpers';
import { adminTools } from '../../acl';
import { t } from '../../i18n';

const { p, div, a, span, h3 } = helpers(h);
const { form, label, input, button, textarea } = helpers(h);

export function QuickstartLink({ link, onUpdate, state }) {
    const { user } = state.auth;
    const [updating, setUpdating] = useState(false);
    const [href, setHref] = useState(link.href);
    const [name, setName] = useState(link.name);
    const [description, setDescription] = useState(link.description);

    function onSubmit(event) {
        event.preventDefault();
        onUpdate({
            name,
            description,
            href,
        });
        return setUpdating(false);
    }
    return div('.tile-quickstart.di', [
        h3('.flex', {}, [
            updating === false &&
                a('.pointer.flex-auto', { href: link.href }, [
                    link.name + ' ',
                    span('.icon.icon-arrow-right'),
                ]),
            updating === true &&
                form('.pv3', { onSubmit }, [
                    div('.form-group.flex-auto', [
                        label('.b.form-label', t`Nombre de la sección`),
                        input('.form-input', {
                            name: 'link-name',
                            type: 'text',
                            value: name,
                            placeholder: t`Escribe un saludo de bienvenida o un título`,
                            onChange: event => setName(event.target.value),
                        }),
                        label('.b.form-label', t`Vínculo`),
                        input('.form-input', {
                            name: 'link-href',
                            type: 'text',
                            value: href,
                            placeholder: t`Escribe un saludo de bienvenida o un título`,
                            onChange: event => setHref(event.target.value),
                        }),
                        label('.b.form-label', t`Descripción`),
                        textarea('.form-input', {
                            name: 'link-des',
                            type: 'text',
                            value: description,
                            placeholder: t`Escribe un saludo de bienvenida o un título`,
                            onChange: event =>
                                setDescription(event.target.value),
                            rows: 4,
                        }),
                    ]),
                    div('.pv2', [
                        button(
                            '.btn.btn-primary.input-group-btn',
                            {
                                type: 'submit',
                            },
                            t`Guardar cambios`
                        ),
                        button(
                            '.btn.input-group-btn',
                            {
                                type: 'cancel',
                                onClick: () => setUpdating(false),
                            },
                            t`Cancelar`
                        ),
                    ]),
                ]),
            adminTools({ user }) &&
                updating === false &&
                div('.tile-actions-q', [
                    a(
                        '.pointer.post-action',
                        { onClick: () => setUpdating(true) },
                        [span('.dib.icon-edit')]
                    ),
                ]),
        ]),
        updating === false && p(link.description),
    ]);
}
