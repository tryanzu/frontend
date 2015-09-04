var FeedService = ['$resource', function($resource) {
  return $resource(layer_path + 'feed');
}];