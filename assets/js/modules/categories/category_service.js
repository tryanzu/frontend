var CategoryService = ['$resource', function($resource) {
  return $resource(layer_path + 'category/:categoryId',
    {
      categoryId: '@categoryId'
    },
    {
      'update': {
        method:'PUT'
      },
      'writable': {
        method: 'GET',
        params: {permissions:'write'},
        isArray: true
      }
    }
  );
}];