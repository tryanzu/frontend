var PostService = ['$resource', function($resource) {
  return $resource(layer_path + 'posts/:id',
    {
      postId: '@id'
    },
    {
      'update': {
        method:'PUT'
      },
      'light': {
        method: 'GET',
        url: layer_path + 'posts/:id/light'
      }
    }
  );
}];