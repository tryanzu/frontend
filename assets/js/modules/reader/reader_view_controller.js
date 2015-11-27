var ReaderViewController = ['$scope', '$rootScope', '$http', '$timeout', 'Post', 'Upload', 'modalService',
  function($scope, $rootScope, $http, $timeout, Post, Upload, modalService) {

  $scope.post = {};
  $scope.comment = {content:''};
	$scope.waiting = true;
  $scope.waiting_comment = false;
  $scope.adding_file = false;

  $scope.people = [
    { label: 'AcidKid', username: 'AcidKid'},
    { label: 'Alberto', username: 'Alberto'},
    { label: 'Drak', username: 'Drak'},
    { label: 'fernandez14', username: 'fernandez14'}
  ];

	$scope.forceFirstComment = function() {
		// TO-DO analytics about this trigger
		// Force to show the comment box
		$scope.force_comment = true;
	};


  $scope.best_answer = function(comment) {
    $http.post(layer_path + "posts/" + $scope.post.id + "/answer/" + comment).then(function success(response){
      console.log(response);
    }, function(error){
      console.log(error, "No se puedo elegir como mejor respuesta.");
    })
  };

  $scope.show_composer = function() {
    $('.current-article').animate({ scrollTop: $('.current-article')[0].scrollHeight}, 100);
    $('#comment-content').focus();
  };

  $scope.reply_to = function(username, comment) {
    if($scope.comment.content == '') {
      $scope.comment.content = '@' + username + '#' + comment + ' ';
    } else {
      $scope.comment.content = $scope.comment.content + '\n\n@' + username + '#' + comment + ' ';
    }
    $('#comment-content').focus();
    $('.current-article').animate({ scrollTop: $('.current-article')[0].scrollHeight}, 100);
  }

  $scope.comment_vote = function(post_id, comment, direction) {
    $http.post(layer_path + 'vote/comment/' + post_id, {comment: '' + comment.position, 'direction': direction}).
      success(function(data, status, headers, config) {
        //comment.liked = !comment.liked;
        var d = {'up': 1, 'down': -1};
        if(comment.liked == d[direction]) {
          comment.liked = null;
          if(direction == 'up') {
            comment.votes.up = comment.votes.up - 1;
          } else {
            comment.votes.down = comment.votes.down - 1;
          }
        } else {
          comment.liked = d[direction];
          if(direction == 'up') {
            comment.votes.up = comment.votes.up + 1;
          } else {
            comment.votes.down = comment.votes.down + 1;
          }
        }
        //console.log(data);
      }).
      error(function(data) {
        //console.log(data);
      });
  }

  $scope.post_vote = function(post, direction) {
    $http.post(layer_path + 'vote/post/' + post.id, {'direction': direction}).
      success(function(data) {
        var d = {'up': 1, 'down': -1};
        if(post.liked == d[direction]) {
          post.liked = null;
          if(direction == 'up') {
            post.votes.up = post.votes.up - 1;
          } else {
            post.votes.down = post.votes.down - 1;
          }
        } else {
          post.liked = d[direction];
          if(direction == 'up') {
            post.votes.up = post.votes.up + 1;
          } else {
            post.votes.down = post.votes.down + 1;
          }
        }
      }).
      error(function(data) {
        //console.log(data);
      });
  }

  $scope.publish = function() {
    if(!$scope.waiting_comment) {
      $scope.waiting_comment = true;
      $scope.publishComment().then(function(response) {
        var date = new Date();
        $scope.post.comments.count = $scope.post.comments.count + 1;
        $scope.post.comments.set.push({
          user_id: $scope.user.info.id,
          author: {
            id: $scope.user.info.id,
            username: $scope.user.info.username,
            email: $scope.user.info.email,
            description: $scope.user.info.description || "Sólo otro Spartan Geek más",
            image: $scope.user.info.image,
            roles: $scope.user.info.roles,
            level: $scope.user.info.gaming.level
          },
          content: response.data.message,
          created_at: date.toISOString(),
          position: parseInt(response.data.position),
          votes: {down: 0, up: 0}
        });

        var comment = $scope.post.comments.set[$scope.post.comments.count - 1];
        addMediaEmbed(comment);
        // Allow to comment once again
        $scope.waiting_comment = false;
        $scope.comment.content = '';
      }, function(error) {
        console.log("Error publicando comentario...");
      });
    }
  };

  $scope.uploadPicture = function(files, comment) {
    if(files.length == 1) {
      var file = files[0];
      $scope.adding_file = true;
      Upload.upload({
        url: layer_path + "post/image",
        file: file
      }).success(function (data) {
        if(comment) {
          // Particular comment edition
          if(comment.content_edit.length > 0) {
            comment.content_edit += '\n' + data.url;
          } else {
            comment.content_edit = data.url;
          }
          comment.content_edit += '\n';
          $scope.adding_file = false;
          $('*[data-number="' + comment.position + '"] .idiot-wizzy.edit #comment-content').focus();
        } else {
          // Global comment edition
          if($scope.comment.content.length > 0) {
            $scope.comment.content += '\n' + data.url;
          } else {
            $scope.comment.content = data.url;
          }
          $scope.comment.content += '\n';
          $scope.adding_file = false;
          $('#comment-content').focus();
        }
      }).error(function(data) {
        $scope.adding_file = false;
      });
    }
  };

	$scope.publishComment = function() {
    // Check for the post integrity and then send the comment and return the promise
    if ('id' in $scope.post) {
      return $http.post(layer_path + 'post/comment/' + $scope.post.id, {content: $scope.comment.content});
    }
  };

  // Comment edition
  $scope.editCommentShow = function(comment) {
    var to_edit = $('<div>' + comment.content + '</div>');
    to_edit.find('a.user-mention').each(function(index) {
      var text = $(this).html()
      if($(this).data('comment')) {
        text += '#' + $(this).data('comment');
      }
      $(this).replaceWith(text);
    });
    comment.content_edit = to_edit.html();
    comment.editing = true;
  }
  $scope.editComment = function(comment) {
    // If did not change
    if(comment.content_edit === comment.content) {
      comment.editing = false;
    } else {
      // Insert promise here...
      $http.put(layer_path + 'post/comment/' + $scope.post.id + '/' + comment.position, {content: comment.content_edit})
        .then(function() {
          // On success
          comment.content = comment.content_edit;
          addMediaEmbed(comment);
          comment.editing = false;
        })
    }
  }

  // Comment deletion
  $scope.deleteComment = function(comment) {
    var modalOptions = {
      closeButtonText: 'Cancelar',
      actionButtonText: 'Eliminar comentario',
      headerText: '¿Eliminar comentario?',
      bodyText: 'Una vez que se elimine, no podrás recuperarlo.'
    };

    modalService.showModal({}, modalOptions).then(function(result) {
      $http.delete(layer_path + 'post/comment/' + $scope.post.id + '/' + comment.position)
        .then(function() {
          var position = $scope.post.comments.set.indexOf(comment);
          if(position > -1) {
            $scope.post.comments.set.splice(position, 1);
            $scope.post.comments.count--;
          }
          $scope.$broadcast('scrubberRecalculate');
        });
    });
  }

  // Delete post
  $scope.deletePost = function() {
    var modalOptions = {
      closeButtonText: 'Cancelar',
      actionButtonText: 'Eliminar publicación',
      headerText: '¿Eliminar publicación?',
      bodyText: 'Una vez que se elimine, no podrás recuperarla.'
    };

    modalService.showModal({}, modalOptions).then(function(result) {
      $http.delete(layer_path + 'posts/' + $scope.post.id)
        .then(function() {
          //$scope.$emit('postDeleted');
          // Return to home
          window.location.href = "/";
        });
    });
  }

	$scope.$on('pushLoggedComment', function(event, comment) {
		// Push the comment to the main set of comments
    addMediaEmbed(comment);
		$scope.post.comments.set.push(comment);
	});

	$scope.$on('resolvePost', function(event, post) {
		$scope.waiting = false;
		$scope.resolving = true;
    $scope.error_loading = false;
		$scope.post = post;
		$scope.force_comment = false;

		Post.get({id: post.id}, function(data) {
      console.log(data);
			$scope.post = data;
      addMediaEmbed($scope.post);

      for (var c in $scope.categories) {
        for(var s in $scope.categories[c].subcategories) {
          if($scope.categories[c].subcategories[s].id == $scope.post.category) {
            $scope.post.category = {
              id: $scope.categories[c].subcategories[s].id,
              name: $scope.categories[c].subcategories[s].name,
              slug: $scope.categories[c].subcategories[s].slug,
              parent_slug: $scope.categories[c].slug
            }
            break;
          }
        }
      }

      // Attach title and description for SEO purposes
      $scope.page.title = "SpartanGeek.com | "  + $scope.post.title + " en " + $scope.post.category.name;
      if($scope.post.content.length - 1 < 157) {
        $scope.page.description = $scope.post.content;
      } else {
        $scope.page.description = $scope.post.content.substring(0, 157) + '...';
      }

      // Postproccess every comment
      for( var c in $scope.post.comments.set) {
        addMediaEmbed($scope.post.comments.set[c]);
      }
      $scope.resolving = false;

      // If searching for a comment, move to that comment
      if($scope.view_comment.position >= 0 && $scope.view_comment.position != '') {
        $timeout(function() {
          var elem = $('.comment[data-number='+$scope.view_comment.position+']');
          if(elem.val() === "") {
            elem.addClass('active');
            $('.current-article').animate({scrollTop: (elem.offset().top - 80)}, 50);
          }
        }, 400);
      }

      /* TEMPORAL - TODO: MOVE TO A DIRECTIVE */
      $scope.total_h = $scope.viewport_h = 0;
      $timeout(function() {
        $scope.total_h = $('.current-article')[0].scrollHeight;
        $scope.viewport_h = $('.current-article').height();

        $scope.ratio = $scope.viewport_h/$scope.total_h*100;
        $scope.scrollable = 0;
        $scope.scrollable_h = $scope.total_h - $scope.viewport_h;
        if($scope.ratio < 35) {
          $scope.ratio = 35;
          $scope.scrollable = 65;
        } else {
          $scope.scrollable = 100 - $scope.ratio;
        }
        $scope.surplus = $scope.scrollable;
        //console.log($scope.viewport_h, $scope.total_h, $scope.scrollable_h, $scope.ratio, $scope.surplus);

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
      // Scrolling responses
      $('.current-article').scroll( function() {
        from_top = $(this).scrollTop();

        if (from_top > lastScrollTop){
          // downscroll code
          if($scope.scrubber.current_c < $scope.comments_positions.length - 1) {
            while( (from_top + 210) > $scope.comments_positions[$scope.scrubber.current_c].bottom ) {
              $scope.scrubber.current_c++;
            }
            $scope.$apply(function () {
              $scope.scrubber.current_c;
            });
          }
        } else {
          // upscroll code
          if($scope.scrubber.current_c > 0) {
            while ( (from_top + 210) < $scope.comments_positions[$scope.scrubber.current_c].top ) {
              $scope.scrubber.current_c--;
            }
            $scope.$apply(function () {
              $scope.scrubber.current_c;
            });
          }
        }
        lastScrollTop = from_top;

        surplus = from_top / $scope.scrollable_h;
        surplus = 100 - surplus * 100;
        if(surplus < 0) { surplus = 0; }
        $scope.surplus = surplus * $scope.scrollable / 100;

        $('.scrubber-before').css('height', (100 - $scope.ratio - $scope.surplus) + '%');
        $('.scrubber-slider').css('height', $scope.ratio + '%');
        $('.scrubber-after').css('height', $scope.surplus + '%');
      });
      /* End TODO */
		}, function(response) {
      $scope.resolving = false;
      $scope.error_loading = true;
    });
	});

  $scope.$on('scrubberRecalculate', function(event) {
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

      $scope.comments_positions = [{
        top: 0,
        bottom: $('div.discussion-posts div.content').height()
      }];
      $('div.comment').each(function(index) {
        var t = $(this);
        $scope.comments_positions[index + 1] = {
          top: t.position().top,
          bottom: t.position().top + t.height()
        };
      });
    }, 500);
  });

  var addMediaEmbed = function(comment) {
    // Replace any image
    var regex = new RegExp("(https?:\/\/.*\\.(?:png|jpg|jpeg|JPEG|PNG|JPG|gif|GIF)((\\?|\\&)[a-zA-Z0-9]+\\=[a-zA-Z0-9]+)*)", "g");
    var to_replace = "<div class=\"img-preview\"><a href=\"$1\" target=\"_blank\"><img src=\"$1\"></a></div>"
    comment.content_final = comment.content.replace(regex, to_replace);

    // Replace Youtube videos
    var yt_re = /(https?:\/\/)?(www\.)?(youtu\.be\/|youtube\.com\/)(?:v\/|u\/\w\/|embed\/|watch\?v=)([^#\&\?]{11})\S*/g;
    var to_replace = "<iframe width=\"560\" height=\"315\" src=\"https://www.youtube.com/embed/$4\" frameborder=\"0\" allowfullscreen></iframe>";
    comment.content_final = comment.content_final.replace(yt_re, to_replace);
  }
}];