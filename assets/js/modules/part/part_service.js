var PartService = ['$resource', function($resource) {
  return $resource(layer_path + 'part/:type/:action',
    {
      type: '@type',
      action: '@action'
    }
  );
}];