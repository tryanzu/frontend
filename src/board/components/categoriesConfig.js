import { useEffect, useState, useReducer } from 'react';
import h from 'react-hyperscript';
import helpers from 'hyperscript-helpers';
import { t } from '../../i18n';

const tags = helpers(h);
const { div, i, a } = tags;
const { span, h2, form, input, label } = tags;

function cloneCategories({ categories }) {
    function clone(category) {
        return {
            ...category,
            subcategories: [...category.subcategories.map(one => ({ ...one }))],
        };
    }
    return [...categories.map(clone)];
}

const initialState = { categories: [], dirty: false, saving: false };

function reducer(state, action) {
    const { categories } = state;
    switch (action.type) {
        case 'swapCategory': {
            const a = categories[action.from];
            const b = categories[action.to];
            const copy = categories.slice();
            copy[action.from] = b;
            copy[action.to] = a;
            return { ...state, dirty: true, categories: copy };
        }
        case 'swapSubcategory': {
            const a = categories[action.k].subcategories[action.from];
            const b = categories[action.k].subcategories[action.to];
            const copy = categories.slice();
            copy[action.k].subcategories[action.from] = b;
            copy[action.k].subcategories[action.to] = a;
            return { ...state, dirty: true, categories: copy };
        }
        case 'newCategory': {
            const base = {
                name: '',
                description: '',
                subcategories: [],
            };
            return {
                ...state,
                dirty: true,
                categories: categories.concat(base),
            };
        }
        case 'newSubcategory': {
            const copy = categories.slice();
            const newItem = {
                name: '',
                description: '',
            };
            copy[action.k].subcategories = copy[action.k].subcategories.concat(
                newItem
            );
            return {
                ...state,
                dirty: true,
                categories: copy,
            };
        }
        case 'updateCategory': {
            const copy = categories.slice();
            copy[action.k] = {
                ...copy[action.k],
                ...action.changes,
            };
            return { ...state, dirty: true, categories: copy };
        }
        case 'updateSubcategory': {
            const copy = categories.slice();
            copy[action.k].subcategories[action.index] = {
                ...copy[action.k].subcategories[action.index],
                ...action.changes,
            };
            return { ...state, dirty: true, categories: copy };
        }
        case 'deleteCategory': {
            const filtered = categories.filter((_, k) => k !== action.index);
            return { ...state, dirty: true, categories: filtered };
        }
        case 'deleteSubcategory': {
            const copy = categories.slice();
            const category = copy[action.k];
            const filtered = category.subcategories.filter(
                (_, i) => i !== action.index
            );
            copy[action.k].subcategories = filtered;
            return { ...state, dirty: true, categories: copy };
        }
        case 'cancelConfig': {
            return { ...state, dirty: false, categories: action.categories };
        }
        case 'saving': 
            return { ...state, saving: true };
        case 'saved': 
            return { ...state, saving: false };
        default:
            throw new Error('invalid action type');
    }
}

export function CategoriesConfig({ state, effects }) {
    const [internalState, dispatch] = useReducer(reducer, {
        categories: cloneCategories(state),
    });
    const { categories, dirty, saving } = internalState;

    return form('.flex-auto.pa3.overflow-container', [
        div([
            div('.flex.header.justify-end', [
                h2('.flex-auto', t`Lista de Categorías`),
                dirty === true &&
                    span('.fixed.z-9999', [
                        span([
                            input('.btn.btn-primary.mr2', {
                                type: 'button',
                                value: t`Guardar cambios`,
                                onClick: () => {
                                    dispatch({ type: 'saving' });
                                    return effects
                                        .updateCategories(categories)
                                        .then(() => dispatch({type: 'saved'}));
                                },
                            }),
                        ]),
                        span([
                            input('.btn', {
                                type: 'button',
                                value: t`Cancelar`,
                                onClick: () =>
                                    dispatch({
                                        type: 'cancelConfig',
                                        categories: cloneCategories(state),
                                    }),
                            }),
                        ]),
                    ]),
            ]),
        ]),
        div('.bt.b--light-gray.pt2', [
            div('.form-group', [
                label('.b.form-label', t`Categorías`),
                div(
                    categories
                        .map((item, k) => {
                            return div([
                                div('.flex', [
                                    a(
                                        '.btn.btn-icon.pointer.mr1',
                                        {
                                            onClick: () =>
                                                k > 0 &&
                                                dispatch({
                                                    type: 'swapCategory',
                                                    from: k,
                                                    to: k - 1,
                                                }),
                                        },
                                        i('.icon-up-outline')
                                    ),
                                    a(
                                        '.btn.btn-icon.pointer.mr1',
                                        {
                                            onClick: () =>
                                                k < categories.length - 1 &&
                                                dispatch({
                                                    type: 'swapCategory',
                                                    from: k,
                                                    to: k + 1,
                                                }),
                                        },
                                        i('.icon-down-outline')
                                    ),
                                    h(InputFields, {
                                        item,
                                        k,
                                        onChange: changes =>
                                            dispatch({
                                                type: 'updateCategory',
                                                changes,
                                                k,
                                            }),
                                    }),
                                    a(
                                        '.btn.btn-icon.pointer.ml1',
                                        {
                                            onClick: () =>
                                                dispatch({
                                                    type: 'deleteCategory',
                                                    index: k,
                                                }),
                                        },
                                        i('.icon-trash')
                                    ),
                                ]),
                                div(
                                    '.pl4.pb3',
                                    item.subcategories
                                        .map((item, index) => {
                                            return div('.flex', [
                                                a(
                                                    '.btn.btn-icon.pointer.mr1',
                                                    {
                                                        onClick: () =>
                                                            index > 0 &&
                                                            dispatch({
                                                                type:
                                                                    'swapSubcategory',
                                                                from: index,
                                                                to: index - 1,
                                                                k: k,
                                                            }),
                                                    },
                                                    i('.icon-up-outline')
                                                ),
                                                a(
                                                    '.btn.btn-icon.pointer.mr1',
                                                    {
                                                        onClick: () =>
                                                            index <
                                                                categories[k]
                                                                    .subcategories
                                                                    .length -
                                                                    1 &&
                                                            dispatch({
                                                                type:
                                                                    'swapSubcategory',
                                                                from: index,
                                                                to: index + 1,
                                                                k: k,
                                                            }),
                                                    },
                                                    i('.icon-down-outline')
                                                ),
                                                h(InputFields, {
                                                    item,
                                                    index,
                                                    onChange: changes =>
                                                        dispatch({
                                                            type:
                                                                'updateSubcategory',
                                                            changes,
                                                            k,
                                                            index,
                                                        }),
                                                }),
                                                a(
                                                    '.btn.btn-icon.pointer.ml1',
                                                    {
                                                        onClick: () =>
                                                            dispatch({
                                                                type:
                                                                    'deleteSubcategory',
                                                                k,
                                                                index,
                                                            }),
                                                    },
                                                    i('.icon-trash')
                                                ),
                                            ]);
                                        })
                                        .concat([
                                            h('div.tc.mt2', {}, [
                                                h([
                                                    span(
                                                        '.btn.btn-sm.pointer',
                                                        {
                                                            onClick: () =>
                                                                dispatch({
                                                                    type:
                                                                        'newSubcategory',
                                                                    k,
                                                                }),
                                                        },
                                                        t`Agregar Subcategoría`
                                                    ),
                                                ]),
                                            ]),
                                        ])
                                ),
                            ]);
                        })
                        .concat([
                            h('div.tc.mt2', {}, [
                                h([
                                    span(
                                        '.btn.btn-primary.btn-sm.pointer.mb3',
                                        {
                                            onClick: () =>
                                                dispatch({
                                                    type: 'newCategory',
                                                }),
                                        },
                                        t`Agregar Categoría`
                                    ),
                                ]),
                            ]),
                        ])
                ),
            ]),
        ]),
    ]);
}

function InputFields({ item, onChange }) {
    return div('.input-group.mb2.fade-in', {}, [
        input('.form-input', {
            name: 'name',
            type: 'text',
            placeholder: '...',
            value: item.name,
            onChange: event => onChange({ name: event.target.value }),
            required: true,
        }),
        input('.form-input', {
            name: 'href',
            type: 'text',
            placeholder: '...',
            value: item.description,
            onChange: event => onChange({ description: event.target.value }),
            required: true,
        }),
    ]);
}
