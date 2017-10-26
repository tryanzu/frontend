exports.files = {
    javascripts: {
        joinTo: {
            'core.js': /^src/,
            'core.vendor.js': /^(?!src)/
        }
    },
    stylesheets: {joinTo: 'core.css', order: {after: path => path.endsWith('root.css')}}
};

exports.paths = {
    public: 'public/dist',
    watched: ['src']
};

exports.plugins = {
    babel: {
        presets: ['latest']
    },
    closurecompiler: {
        compilationLevel: 'SIMPLE',
        createSourceMap: true
    },
    postcss: {
        processors: [
            require('postcss-import')(),
            require('postcss-cssnext')(),
            require('lost')()
        ]
    }
};