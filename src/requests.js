import { jsonReq } from './board/utils';
import { request } from './utils';

export function requestFlags() {
    return jsonReq(request('reasons/flag')).then(res => res.reasons);
}

export function requestBans() {
    return jsonReq(request('reasons/ban')).then(res => res.reasons);
}

export function requestMentionable(str) {
    return jsonReq(request(`search/users/${str}`)).then(res => res.list);
}
