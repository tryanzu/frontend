var CategoryListController = ['$scope', '$timeout', '$location', 'Category', 'Feed', 'Bridge', '$route', '$routeParams',
  function($scope, $timeout, $location, Category, Feed, Bridge, $route, $routeParams) {

    /*
    var lastRoute = $route.current;
    $scope.$on('$locationChangeSuccess', function(event) {
      if($location.path() !== '/') {
        if(lastRoute.$$route.controller === $route.current.$$route.controller) {
          console.log(lastRoute.$$route.controller, $route.current.$$route.controller);
          // Will not load only if my view use the same controller
          // We recover new params
          new_params = $route.current.params;
          $route.current = lastRoute;
          $route.current.params = new_params;

          // get the current path
          var loc = $location.path();
          var params = $route.current.params;
          //console.log(loc, params);
          if (loc.indexOf("/c/") >= 0) {
            for (var category in $scope.categories) {
              if ($scope.categories[category].slug == params.slug) {
                $scope.category = $scope.categories[category];
                $scope.startupFeed($scope.category);
                break;
              }
            }
          }
          else if (loc.indexOf("/p/") >= 0) {
            $scope.viewPostID(params.id, params.slug);
          }
        }
        else
        {
          $scope.status.post_selected = false;
        }
      }
      else
      {
        $scope.status.post_selected = false;
      }
    });*/

  	$scope.categories = [];
  	$scope.resolving  = true;

  	$scope.category = {};
  	$scope.posts = [];
  	$scope.resolving_posts = true;
    $scope.adding_posts = false;
  	$scope.offset = 0;
  	$scope.previewStyle = {};

    $scope.activePostId = null;

    $scope.composer = {
      open: false,
      minimized: false
    };

    $scope.$on('status_change', function(e) {
      $scope.startupFeed($scope.category);
    });

  	$scope.startupFeed = function(category) {
  		$scope.resolving_posts = true;

  		Feed.get({limit: 10, offset: 0, category: category.slug}, function(data) {
        for(p in data.feed) {
          for(c in $scope.categories) {
            if (data.feed[p].categories[0] == $scope.categories[c].slug) {
              data.feed[p].category = {name: $scope.categories[c].name, color: $scope.categories[c].color, slug: $scope.categories[c].slug}
              break;
            }
          }
        }
  			$scope.posts = data.feed;
  			$scope.resolving_posts = false;
  			$scope.offset = 10;
  		});
      //$scope.walkFeed();

  		$timeout(function() {
  			$scope.$broadcast('changedContainers');
  		}, 500);
  	};

  	$scope.walkFeed = function() {
      $scope.adding_posts = true;
  		Feed.get({limit: 10, offset: $scope.offset, category: $scope.category.slug}, function(data) {
        for(p in data.feed) {
          for(c in $scope.categories) {
            if (data.feed[p].categories[0] == $scope.categories[c].slug) {
              data.feed[p].category = {name: $scope.categories[c].name, color: $scope.categories[c].color, slug: $scope.categories[c].slug}
              break;
            }
          }
        }
  			$scope.posts = $scope.posts.concat(data.feed);
  			$scope.offset = $scope.offset + 10;
        $scope.adding_posts = false;
  		});

  		ga('send', 'pageview', '/feed/' + $scope.category.slug);
  	};

  	$scope.turnCategory = function(category) {
  		$scope.category = category;
  		$scope.startupFeed(category);
  		$scope.previewStyle = {'background-image': 'url(/public/img/boards/'+$scope.category.slug+'.png)'};

  		// Reset counters if exists though
  		$scope.category.recent = 0;

  		// Persist the category in the first section of the url
  		// $location.path($scope.category.slug);

  		ga('send', 'pageview', '/category/' + $scope.category.slug);
  	};

  	$scope.viewPost = function(post) {
  		$scope.activePostId = post.id;
      $scope.status.post_selected = true;
  		Bridge.changePost(post);
      $(window).scrollTop(0);
  		ga('send', 'pageview', '/post/' + $scope.category.slug + '/' + post.id);
  	};

    $scope.viewPostID = function(postId, slug) {
      $scope.activePostId = postId;
      $scope.status.post_selected = true;
      Bridge.changePost({id: postId, slug: slug, name: "Rodrigo"});
      $(window).scrollTop(0);
      ga('send', 'pageview', '/post/' + slug + '/' + postId);
    };

  	// Resolve categories though
  	Category.query(function(data) {

  		$scope.resolving = false;
  		$scope.categories = data;

      //var colorThief = new ColorThief();
      for(var c in $scope.categories) {
        cat = $scope.categories[c];
        //console.log(cat.id != undefined)
        if(cat.id != undefined) {
          //var img = $("<img />").attr("src", "/images/boards/" + cat.slug + ".png");
          /*var img = new Image();
          img.onload = function () {
            var colorThief = new ColorThief();
            colorThief.getColor(img);
          };
          img.src = "/images/boards/" + cat.slug + ".png";*/

          //img.load(function(){
            //color = colorThief.getColor(img[0]);
          //});
          //console.log(img[0])
          //color = colorThief.getColor(img.src);
          //console.log('Color:' + color);
        }
      }

  		// Once the categories has been resolved then catch the first one and try to fetch the feed for it
  		var path = $location.path();
  		var loaded = false;

  		if (path.length > 0) {
  			var segments = path.split("/");
        var section_segment = segments[1];
  			var category_segment = segments[2];

        if(section_segment === 'c') {
    			for (var category in $scope.categories) {
    				if ($scope.categories[category].slug == category_segment) {
    					$scope.category = $scope.categories[category];
    					//$scope.previewStyle = {'background-image': 'url(/public/img/boards/'+$scope.category.slug+'.png)'};
    					$scope.startupFeed($scope.category);
    					$scope.$broadcast('changedContainers');
    					$scope.$broadcast('scrollMeUpdate');
    					loaded = true;
              break;
    				}
    			}
        } else if(section_segment === 'p') {
          $scope.viewPostID($routeParams.id, $routeParams.slug);
        }
  		}
  		if (loaded == false) {
  			$scope.category = {slug:''}//$scope.categories[0];
  			//$scope.previewStyle = {'background-image': 'url(/public/img/boards/'+$scope.category.slug+'.png)'};
  			$scope.startupFeed($scope.category);
  			$scope.$broadcast('changedContainers');
  		}

  		// Preload the images for each board
  		/*for (var category in $scope.categories) {
  			$("<img />").attr("src", "/public/img/boards/" + $scope.categories[category].slug + ".png");
  		}*/ // Error undefined
  	});

    //console.log(User);
  }
];