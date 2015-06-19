var FeedService = function($resource){
    return $resource(layer_path + 'feed');
};