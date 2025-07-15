const js = require('@eslint/js');
const prettier = require('eslint-plugin-prettier');
const prettierConfig = require('eslint-config-prettier');

module.exports = [
    {
        ignores: ['**/*.min.js', 'node_modules', 'src/drivers/ext/glue.js'],
    },
    js.configs.recommended,
    prettierConfig,
    {
        plugins: {
            prettier,
        },
        languageOptions: {
            parser: require('@babel/eslint-parser'),
            parserOptions: {
                ecmaVersion: 2020,
                sourceType: 'module',
            },
            globals: {
                window: true,
                Anzu: true,
                console: true,
                Tribute: true,
                Promise: true,
                document: true,
                CURRENT_VERSION: true,
            },
        },
        rules: {
            'function-paren-newline': [0],
            'no-console': [0],
            'object-property-newline': [
                1,
                { allowMultiplePropertiesPerLine: true },
            ],
            'prettier/prettier': [
                'error',
                {
                    printWidth: 80,
                    singleQuote: true,
                    trailingComma: 'es5',
                    tabWidth: 4,
                    useTabs: false,
                    bracketSpacing: true,
                    arrowParens: 'avoid',
                    semi: true,
                    endOfLine: 'lf',
                    htmlWhitespaceSensitivity: 'css',
                    jsxBracketSameLine: false,
                    proseWrap: 'preserve',
                    requirePragma: false,
                },
            ],
        },
    },
];
