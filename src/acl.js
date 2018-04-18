import { combineRules, allow, deny } from 'functional-acl';

export const permissions = {
    administrator: {
        permissions: ['board-config', 'sensitive-data'],
        parents: ['super-moderator'],
    },
    'category-moderator': {
        permissions: [],
        parents: ['child-moderator'],
    },
    'child-moderator': {
        permissions: [
            'block-category-post-comments',
            'edit-category-comments',
            'edit-category-posts',
            'solve-category-posts',
            'delete-category-posts',
            'delete-category-comments',
        ],
        parents: ['spartan-girl'],
    },
    developer: {
        permissions: ['debug', 'dev-tools'],
        parents: ['administrator'],
    },
    editor: {
        permissions: [],
        parents: ['user'],
    },
    'spartan-girl': {
        permissions: ['block-own-post-comments'],
        parents: ['user'],
    },
    'super-moderator': {
        permissions: [
            'block-board-post-comments',
            'edit-board-comments',
            'edit-board-posts',
            'solve-board-posts',
            'delete-board-comments',
            'delete-board-posts',
            'pin-board-posts',
        ],
        parents: ['category-moderator'],
    },
    user: {
        permissions: [
            'publish',
            'comment',
            'edit-own-posts',
            'solve-own-posts',
            'delete-own-posts',
            'edit-own-comments',
            'delete-own-comments',
        ],
        parents: [],
    },
};

const admins = ({ user }) =>
    user &&
    user.roles.filter(
        ({ name }) => name == 'developer' || name == 'administrator'
    ).length > 0;
const guests = ({ user }) => !user;
export const reading = ({ operation }) => operation === 'read';
export const writing = ({ operation }) => operation === 'write';

export const adminTools = combineRules(deny(guests), allow(admins));
