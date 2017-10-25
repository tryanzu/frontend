exports.files = {
    javascripts: {
        entryPoints: {
        	'src/mount.js': 'core.js'
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
    postcss: {
        processors: [
            require('postcss-import')(),
            require('postcss-cssnext')(),
            require('lost')()
        ]
    }
};