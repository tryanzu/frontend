var ReaderViewController = function($scope, $rootScope, $http, $timeout, Post) {

  $scope.post = {};
  $scope.comment = {content:''};
	$scope.waiting = true;
  $scope.waiting_comment = false;

	$scope.forceFirstComment = function() {
		// TO-DO analytics about this trigger
		// Force to show the comment box
		$scope.force_comment = true;
	};

  $scope.show_composer = function() {
    $('.current-article').animate({ scrollTop: $('.current-article')[0].scrollHeight}, 100);
  }

  $scope.reply_to = function(username) {
    if($scope.comment.content == '') {
      $scope.comment.content = '@' + username + ' ';
    } else {
      $scope.comment.content = $scope.comment.content + '\n@' + username + ' ';
    }
    $('#comment-content').focus();
    $('.current-article').animate({ scrollTop: $('.current-article')[0].scrollHeight}, 100);
  }

  $scope.comment_like = function(post_id, comment) {
    $http.post(layer_path + 'vote/comment/' + post_id, {comment: '' + comment.position}).
      success(function(data, status, headers, config) {
        // this callback will be called asynchronously
        // when the response is available
        comment.liked = !comment.liked;
        if(comment.liked) {
          comment.votes.up = comment.votes.up + 1;
        } else {
          comment.votes.up = comment.votes.up - 1;
        }
        console.log(data);
      }).
      error(function(data, status, headers, config) {
        // called asynchronously if an error occurs
        // or server returns response with an error status.
        console.log(data);
      });
  }

  $scope.publish = function() {
    if(!$scope.waiting_comment) {
      $scope.waiting_comment = true;
      $scope.publishComment().then(function(data) {
        var comment = $scope.post.comments.set[$scope.post.comments.count - 1];
        addImagePreview(comment);
        // Allow to comment once again
        $scope.waiting_comment = false;
        $scope.comment.content = '';

        // Mixpanel track
        mixpanel.track("Comment", {id: $scope.post.id, category: $scope.post.category.slug});
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
        content: $scope.comment.content,
        created_at: date.toISOString(),
        position: $scope.post.comments.count - 1,
        votes: {down: 0, up: 0}
      });

      return $http.post(layer_path + 'post/comment/' + $scope.post.id, {content: $scope.comment.content});
    }
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

      $scope.page.title = "SpartanGeek.com | " + $scope.post.title;

      addImagePreview($scope.post);

      for (var category in $scope.categories) {
        if($scope.categories[category].slug == $scope.post.category.slug) {
          $scope.post.category.name = $scope.categories[category].name;
          break;
        }
      }

      for( var c in $scope.post.comments.set) {
        addImagePreview($scope.post.comments.set[c]);
      }

      if($scope.view_comment.position >= 0 && $scope.view_comment.position != '') {
        $timeout(function() {
          var elem = $('.comment[data-number='+$scope.view_comment.position+']');
          if(elem.val() === "") {
            elem.addClass('active');
            $('.current-article').animate({scrollTop: (elem.offset().top - 80)}, 50);
          }
        }, 100);
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