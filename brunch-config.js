exports.files = {
    javascripts: {
        joinTo: {
            'others.js': /^(node_modules\/(callbag-(.+)|process))/,
            'core.js': /^(?!(node_modules\/callbag-(.+)|src\/components))/,
        },
    },
    stylesheets: {
        joinTo: {
            'autumn.min.css': [
                /^(src\/themes\/autumn\/theme\.scss)/,
                /^(src\/themes\/autumn\/app\.css)/,
            ],
            // This is how you can compile another isolated theme...
            //'autumn-yellow.min.css': [/^(src\/themes\/autumn-yellow\/)/],
        },
        order: { after: path => path.endsWith('root.css') },
    },
};

exports.paths = {
    public: 'public/dist',
    watched: ['src'],
};

exports.npm = {
    static: ['callbag-basics/dist/bundle.min.js'],
};

exports.plugins = {
    babel: {
        presets: ['env'],
    },
    eslint: {
        pattern: /^src\/.*\.js$/,
        warnOnly: true,
        formatter: 'table',
    },
    uglify: {
        ignored: /others\.js/,
        mangle: true,
        compress: {
            global_defs: {
                DEBUG: false,
            },
        },
    },
    postcss: {
        processors: [
            require('postcss-import')(),
            require('postcss-cssnext')(),
            require('lost')(),
        ],
    },
    sass: {
        precision: 8,
    },
};
