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

exports.npm = {
    styles: {'spectre.css': ['dist/spectre.min.css'], 'tachyons': ['css/tachyons.min.css']}
};

exports.plugins = {
    babel: {
        presets: ['latest']
    },
    uglify: {
      mangle: true,
      compress: {
        global_defs: {
          DEBUG: false
        }
      }
    },
    postcss: {
        processors: [
            require('postcss-import')(),
            require('postcss-cssnext')(),
            require('lost')()
        ]
    }
};