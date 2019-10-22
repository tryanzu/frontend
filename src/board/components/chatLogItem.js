import { memo } from 'react';
import { format } from 'date-fns';
import { t, translate } from '../../i18n';
import h from 'react-hyperscript';
import helpers from 'hyperscript-helpers';

const { div, small } = helpers(h);

export const ChatLogItem = memo(function({ message }) {
    const i18nParams = message.i18n || [];
    const translated = i18nParams.map(item => t`${item}`);
    return div('.tile.mb2.ph3.log', { key: message.id }, [
        div('.tile-icon', { style: { width: '2rem' } }, [
            small('.time', [format(message.at, 'HH:mm')]),
        ]),
        div('.tile-content', [
            div('.tile-title', [
                small('.text-bold.text-gray', t`System message:`),
            ]),
            div(
                '.tile-subtitle.mb1.text-small',
                translate`${message.msg}`.fetch(...translated)
            ),
        ]),
    ]);
});
