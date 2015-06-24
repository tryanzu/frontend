var ReaderViewController = function($scope, $rootScope, $http, $timeout, Post) {

	$scope.waiting = true;
	$scope.post = {};
	$scope.comment = '';

	$scope.forceFirstComment = function() {
		// TO-DO analytics about this trigger
		// Force to show the comment box
		$scope.force_comment = true;
	};

  $scope.publish = function() {
    if($scope.waiting == false) {
        $scope.waiting = true;
        $scope.publishComment().then(function(data) {
          var comment = $scope.post.comments.set[$scope.post.comments.count - 1];
          addImagePreview(comment);
          // Allow to comment once again
          $scope.waiting = false;
          $scope.comment = '';
          $scope.composer.minimized = true;
        }, function(error) {
          console.log("Error publicando comentario...");
        });
    }
  };

	$scope.publishComment = function() {
		// Check for the post integrity and then send the comment and return the promise
		if ('id' in $scope.post) {
			var date = new Date();
			$scope.post.comments.count = $scope.post.comments.count + 1;
			$scope.post.comments.set.push({
				user_id: $scope.user.info.id,
				author: {
					id: $scope.user.info.id,
					username: $scope.user.info.username,
					email: $scope.user.info.email,
					description: $scope.user.info.description
				},
				content: $scope.comment,
				created_at: date.toISOString(),
				position: $scope.post.comments.count - 1,
				votes: {down: 0, up: 0}
			});

			return $http.post(layer_path + 'post/comment/' + $scope.post.id, {content: $scope.comment});
		}
	};

  $scope.show_composer = function() {
    $scope.composer.open = true;
    $scope.composer.minimized = false;
    $timeout(function() {
      $(window).scrollTop($('.stream.discussion-posts.posts').height() + 300);
    }, 50);
  };

	$scope.$on('pushLoggedComment', function(event, comment) {
    console.log("voy a pushear un comment");
		// Push the comment to the main set of comments
    addImagePreview(comment);
		$scope.post.comments.set.push(comment);
	});

	$scope.$on('resolvePost', function(event, post) {
		$scope.waiting = false;
		$scope.resolving = true;
		$scope.post = post;
		$scope.force_comment = false;

		Post.get({id: post.id}, function(data) {
      //console.log(data);
			$scope.post = data;
      $scope.post.category = {slug: data.categories[0]};

      for (var category in $scope.categories) {
        if($scope.categories[category].slug == $scope.post.category.slug) {
          $scope.post.category.name = $scope.categories[category].name;
          break;
        }
      }

      for( var c in $scope.post.comments.set) {
        addImagePreview($scope.post.comments.set[c]);
      }
      $scope.resolving = false;
		});
	});

  var addImagePreview = function(comment) {
    //console.log(comment);
    var regex = new RegExp("(https?:\/\/.*\.(?:png|jpg|jpeg|JPEG|PNG|JPG|gif|GIF))");
    var res = regex.exec(comment.content);
    if(res) {
      // TODO: Create directive and template
      var image = "<div class=\"img-preview\"><p>Vista previa</p><a href=\""+res[0]+"\" target=\"_blank\"><img src=\"" + res[0] + "\" style=\"max-height: 200px; width: auto; max-width: 100%;\"></a></div>";
      comment.content += image;
    }
  }
};