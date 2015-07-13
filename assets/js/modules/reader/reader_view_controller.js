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
          description: $scope.user.info.description,
          image: $scope.user.info.image
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
			$scope.post = data;
      $scope.post.category = {slug: data.categories[0]};

      addImagePreview($scope.post);

      for (var category in $scope.categories) {
        if($scope.categories[category].slug == $scope.post.category.slug) {
          $scope.post.category.name = $scope.categories[category].name;
          break;
        }
      }

      $scope.page.title = "SpartanGeek.com | "  + $scope.post.title + " en " + $scope.post.category.name;

      if($scope.post.content.length - 1 < 157) {
        $scope.page.description = $scope.post.content;
      } else {
        $scope.page.description = $scope.post.content.substring(0, 157) + '...';
      }

      for( var c in $scope.post.comments.set) {
        addImagePreview($scope.post.comments.set[c]);
      }
      $scope.resolving = false;

      if($scope.view_comment.position >= 0 && $scope.view_comment.position != '') {
        $timeout(function() {
          var elem = $('.comment[data-number='+$scope.view_comment.position+']');
          if(elem.val() === "") {
            elem.addClass('active');
            $('.current-article').animate({scrollTop: (elem.offset().top - 80)}, 50);
          }
        }, 100);
      }

      /* TEMPORAL - TODO: MOVE TO A DIRECTIVE */
      $scope.total_h = $scope.viewport_h = 0;
      $timeout(function() {
        $scope.total_h = $('.current-article')[0].scrollHeight;
        $scope.viewport_h = $('.current-article').height();

        $scope.ratio = $scope.viewport_h/$scope.total_h*100;
        $scope.scrollable = 0;
        $scope.scrollable_h = $scope.total_h - $scope.viewport_h;
        if($scope.ratio < 15) {
          $scope.ratio = 15;
          $scope.scrollable = 85;
        } else {
          $scope.scrollable = 100 - $scope.ratio;
        }
        $scope.surplus = $scope.scrollable;
        console.log($scope.viewport_h, $scope.total_h, $scope.scrollable_h, $scope.ratio, $scope.surplus);

        $('.scrubber-before').css('height', (100 - $scope.ratio - $scope.surplus) + '%');
        $('.scrubber-slider').css('height', $scope.ratio + '%');
        $('.scrubber-after').css('height', $scope.surplus + '%');

        $scope.comments_positions = [{
          top: 0,
          bottom: $('div.discussion-posts div.content').height()
        }];
        //console.log(0, $scope.comments_positions[0]);
        $('div.comment').each(function(index) {
          var t = $(this);
          $scope.comments_positions[index + 1] = {
            top: t.position().top,
            bottom: t.position().top + t.height()
          };
          //console.log(index + 1, $scope.comments_positions[index+1]);
        });
      }, 350);

      var from_top, surplus, lastScrollTop = 0;
      $scope.scrubber = {
        current_c: 0
      };
      $('.current-article').scroll(function() {
        from_top = $(this).scrollTop();

        if (from_top > lastScrollTop){
          // downscroll code
          if($scope.scrubber.current_c < $scope.comments_positions.length - 1) {
            if( (from_top + 210) > $scope.comments_positions[$scope.scrubber.current_c].bottom ) {
              $scope.$apply(function () {
                $scope.scrubber.current_c++;
              });
            }
          }
        } else {
          // upscroll code
          if($scope.scrubber.current_c > 0) {
            if ( (from_top + 210) < $scope.comments_positions[$scope.scrubber.current_c].top ) {
              $scope.$apply(function () {
                $scope.scrubber.current_c--;
              });
            }
          }
        }
        lastScrollTop = from_top;

        //console.log($scope.scrubber.current_c);

        surplus = from_top / $scope.scrollable_h;
        surplus = 100 - surplus * 100;
        if(surplus < 0) { surplus = 0; }
        $scope.surplus = surplus * $scope.scrollable / 100;

        $('.scrubber-before').css('height', (100 - $scope.ratio - $scope.surplus) + '%');
        $('.scrubber-slider').css('height', $scope.ratio + '%');
        $('.scrubber-after').css('height', $scope.surplus + '%');
      });

      /* End TODO */

		});
	});

  var addImagePreview = function(comment) {
    //console.log(comment);
    var regex = new RegExp("(https?:\/\/.*\\.(?:png|jpg|jpeg|JPEG|PNG|JPG|gif|GIF)((\\?|\\&)[a-zA-Z0-9]+\\=[a-zA-Z0-9]+)*)");
    var res = regex.exec(comment.content);
    if(res) {
      // TODO: Create directive and template
      comment.attach = {
        url: res[0],
        type: 'image'
      };
    }
  }
};