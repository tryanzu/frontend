import { useState } from 'react';
import h from 'react-hyperscript';
import helpers from 'hyperscript-helpers';
import { t } from '../../i18n';

const tags = helpers(h);
const { div, i, a } = tags;
const { span, h2, form, input, label } = tags;

export function CategoriesConfig({ state, effects }) {
    const [categories, setCategories] = useState(state.categories);

    function newItemList() {
        const newItem = {
            name: '',
            description: '',
            subcategories: [],
        };
        setCategories(categories.concat(newItem));
    }

    function newSubcategory(index) {
        const copy = categories.slice();
        const newItem = {
            name: '',
            description: '',
        };
        copy[index].subcategories = copy[index].subcategories.concat(newItem);
        setCategories(copy);
    }

    function deleteCategoriesItem(index) {
        const filtered = categories.filter((_, k) => k !== index);
        setCategories(filtered);
    }

    function deleteSubcategoriesItem(categoryIndex, index) {
        const copy = categories.slice();
        const category = copy[categoryIndex];
        const filtered = category.subcategories.filter((_, k) => k !== index);
        copy[categoryIndex].subcategories = filtered;
        setCategories(copy);
    }

    return form('.flex-auto.pa3.overflow-container', [
        div([
            div('.flex.header.justify-end', [
                h2('.flex-auto', t`Lista de Categorías`),
                /* dirty === true &&
                    span('.fixed.z-9999', [
                        span([
                            input('.btn.btn-primary.mr2', {
                                type: 'submit',
                                value: t`Guardar cambios`,
                            }),
                        ]),
                        span([
                            input('.btn', {
                                type: 'button',
                                value: t`Cancelar`,
                            }),
                        ]),
                    ]),*/
            ]),
        ]),
        div('.bt.b--light-gray.pt2', [
            div('.form-group', [
                label('.b.form-label', t`Menú de navegación`),
                div(
                    categories
                        .map((item, k) => {
                            return div([
                                div('.flex', [
                                    h(InputFields, {
                                        item,
                                        k,
                                        onChange: changes => {
                                            const copy = categories.slice();
                                            copy[k] = {
                                                ...copy[k],
                                                ...changes,
                                            };
                                            setCategories(copy);
                                        },
                                    }),
                                    a(
                                        '.btn.btn-icon.pointer.ml1',
                                        {
                                            onClick: () =>
                                                categories.length > 1 &&
                                                deleteCategoriesItem(k),
                                        },
                                        i('.icon-trash')
                                    ),
                                ]),
                                div(
                                    '.pl4.pb3',
                                    item.subcategories
                                        .map((item, index) => {
                                            return div('.flex', [
                                                h(InputFields, {
                                                    item,
                                                    index,
                                                    onChange: changes => {
                                                        const copy = categories.slice();
                                                        copy[k].subcategories[
                                                            index
                                                        ] = {
                                                            ...copy[k]
                                                                .subcategories[
                                                                index
                                                            ],
                                                            ...changes,
                                                        };
                                                        setCategories(copy);
                                                    },
                                                }),
                                                a(
                                                    '.btn.btn-icon.pointer.ml1',
                                                    {
                                                        onClick: () =>
                                                            deleteSubcategoriesItem(
                                                                k,
                                                                index
                                                            ),
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
                                                                newSubcategory(
                                                                    k
                                                                ),
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
                                        { onClick: newItemList },
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
