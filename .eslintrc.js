module.exports = {
    extends: ['eslint:recommended', 'prettier'], // extending recommended config and config derived from eslint-config-prettier
    plugins: ['prettier'], // activating esling-plugin-prettier (--fix stuff)
    rules: {
        'function-paren-newline': [0],
        'no-console': [0],
        'object-property-newline': [1, { "allowMultiplePropertiesPerLine": true }],
        'prettier/prettier': [ // customizing prettier rules (unfortunately not many of them are customizable)
            'error',
            {
                singleQuote: true, 
                trailingComma: 'es5',
                tabWidth: 4
            },
        ]
    },
    globals: {
        window: true,
        Anzu: true,
        console: true,
        Tribute: true,
        Promise: true,
        document: true,
    },
    "parserOptions": { "ecmaVersion": 2018, sourceType: 'module' }
};