exports.files = {
    javascripts: {
        entryPoints: {
        	'src/mount.js': 'core.js'
        }
    }
};

exports.paths = {
    public: 'public/dist',
    watched: ['src']
};

exports.plugins = {
    babel: {
        presets: ['latest']
    }
};