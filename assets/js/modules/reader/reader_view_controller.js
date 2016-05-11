var ReaderViewController = ['$scope', '$rootScope', '$http', '$timeout', 'Post', 'Upload', 'modalService', 'socket',
  function($scope, $rootScope, $http, $timeout, Post, Upload, modalService, socket) {

  $scope.post = {};
  $scope.comment = {content:''};
	$scope.waiting = true;
  $scope.waiting_comment = false;
  $scope.adding_file = false;
  $scope.comments_status = {
    'loaded': 10,
    'offset': -20,
    'limit': 10,
    'loading': false,
    'loading_new': false
  };

  $scope.setBestAnswer = function(comment) {
    $http.post(layer_path + "posts/" + $scope.post.id + "/answer/" + comment.position).then(function success(response){
      comment.chosen = true;
      $scope.post.solved = true;
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

  // Comment and Post vote
  $scope.comment_vote = function(post_id, comment, direction) {
    $http.post(layer_path + 'vote/comment/' + post_id, {
      comment: '' + comment.position,
      'direction': direction
    }).then(function success(response) {
      //comment.liked = !comment.liked;
      var d = {'up': 1, 'down': -1};
      if(comment.liked == d[direction]) {
        comment.liked = null;
      } else {
        comment.liked = d[direction];
      }
    });
  };
  $scope.post_vote = function(post, direction) {
    $http.post(layer_path + 'vote/post/' + post.id, {
      'direction': direction
    }).then(function success(response) {
      var d = {'up': 1, 'down': -1};
      if(post.liked == d[direction]) {
        post.liked = null;
      } else {
        post.liked = d[direction];
      }
    });
  };

  // Comment publishing
  $scope.publish = function() {
    if(!$scope.waiting_comment) {
      $scope.waiting_comment = true;
      // Check for the post integrity and then send the comment and return the promise
      if ('id' in $scope.post) {
        $http.post(layer_path + 'post/comment/' + $scope.post.id, {
          content: $scope.comment.content
        }).then(function success(response) {
          // Tell the UI we have a new message (our own message) and request for any pending messages...
          $scope.post.comments.new++;
          $scope.loadNewComments();

          // Allow to comment once again
          $scope.waiting_comment = false;
          $scope.comment.content = '';
        }, function(error) {
          console.log("Error publicando comentario...");
          // Allow to comment once again
          $scope.waiting_comment = false;
        });
      }
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
  };
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
  };

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
        .then(function success(response) {
          deleteCommentObject(comment);
        });
    });
  }
  var deleteCommentObject = function(comment) {
    var position = $scope.post.comments.set.indexOf(comment);
    if(position > -1) {
      $scope.post.comments.set.splice(position, 1);
      $scope.post.comments.count--; // Total remains the same
    }
    $scope.$broadcast('scrubberRecalculate');
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

  // Load previous comments
  $scope.loadPreviousComments = function() {
    $scope.comments_status.loading = true;
    //console.log("Loading", $scope.comments_status.loaded, $scope.comments_status.offset, $scope.post.comments.total);
    if($scope.post.comments.total - $scope.comments_status.loaded < 10) {
      $scope.comments_status.limit = $scope.post.comments.total - $scope.comments_status.loaded;
    }
    $http.get(layer_path + 'posts/' + $scope.post.id + '/comments', { params: {
      'offset': $scope.comments_status.offset,
      'limit': $scope.comments_status.limit
    } } ).then(function success(response){
      console.log(response.data.comments.set);
      new_comments = response.data.comments.set;
      for(var c in new_comments) {
        addMediaEmbed(new_comments[c]);
      }
      new_comments = new_comments.concat($scope.post.comments.set);
      $scope.post.comments.set = new_comments;
      $scope.comments_status.loaded += $scope.comments_status.limit;
      $scope.comments_status.offset -= $scope.comments_status.limit;
      $scope.comments_status.loading = false;

      console.log("Loaded", $scope.comments_status.loaded, $scope.comments_status.offset, $scope.post.comments.total);
    }, function(error){
      console.log("Error while loading...");
      $scope.comments_status.loading = false;
    });
  }
  $scope.loadAllPreviousComments = function() {
    $scope.comments_status.loading = true;
    if($scope.post.comments.total - $scope.comments_status.loaded > 0) {
      $http.get(layer_path + 'posts/' + $scope.post.id + '/comments', { params: {
        'offset': 0,
        'limit': $scope.post.comments.total - $scope.comments_status.loaded
      } } ).then(function success(response){
        //console.log(response.data.comments.set);
        $scope.comments_status.loaded += response.data.comments.set.length;
        new_comments = response.data.comments.set;
        for(var c in new_comments) {
          addMediaEmbed(new_comments[c]);
        }
        new_comments = new_comments.concat($scope.post.comments.set);
        $scope.post.comments.set = new_comments;
        $scope.comments_status.offset = 0;
        $scope.comments_status.loading = false;
      }, function(error){
        console.log("Error while loading...");
        $scope.comments_status.loading = false;
      });
    }
  }

  // Load new comments
  $scope.loadNewComments = function() {
    $scope.comments_status.loading_new = true;
    $http.get(layer_path + 'posts/' + $scope.post.id + '/comments', { params: {
      'offset': $scope.post.comments.total,
      'limit': $scope.post.comments.new
    } } ).then(function success(response) {
      if($scope.can("debug")) console.log(response.data.comments.set);
      new_comments = response.data.comments.set;
      for(var c in new_comments) {
        addMediaEmbed(new_comments[c]);
      }
      $scope.post.comments.set = $scope.post.comments.set.concat(new_comments);
      var added = new_comments.length;
      $scope.post.comments.new = 0;
      $scope.post.comments.total += added;
      $scope.post.comments.count += added;
      $scope.comments_status.loading_new = false;

      $scope.$emit('comments-loaded', {id: $scope.post.id});
    }, function(error){
      console.log("Error while loading new comments...");
      $scope.comments_status.loading_new = false;
    });
  }

  // Update post content
  var updatePostContent = function() {
    Post.get({id: $scope.post.id}, function success(data) {
      if($scope.can("debug")) console.log(data);
      $scope.post.content = data.content;
      $scope.post.title = data.title;
      addMediaEmbed($scope.post);
    }, function (error) {
      console.log("Error loading post", error);
    });
  }

  // For user profile preview
  // Todo: add a request for obtaining more info...
  $scope.toggleUserCard = function (comment){
    var time = comment.showAuthor ? 0:800;
    comment.showAuthor = !comment.showAuthor;
    if(comment.showAuthor) {
      var fbRef = new Firebase(firebase_url);
      var userRef = fbRef.child("users").child(comment.author.id);
      var presenceRef = userRef.child("presence");
      presenceRef.once('value', function(ss) {
        //$scope.$apply(function() {
          if(ss.val() !== null) {
            comment.author.status = true;
          } else {
            comment.author.status = false;
          }
        //});
      });
    }
    $timeout(function(){
      comment.showAuthorAnimation = !comment.showAuthorAnimation;
    }, time);
  };

  // Socket.io logic
  $scope.$watch('post.id', function(newValue, oldValue){
    if(oldValue !== undefined) {
      if($scope.can("debug")) console.log("Socket stop listening to 'post " + $scope.post.id + "'");
      socket.removeAllListeners("post " + oldValue);
    }
    if(newValue !== undefined) {
      /* Add socket listener */
      if($scope.can("debug")) console.log("Socket listening to 'post " + $scope.post.id + "'");
      socket.on('post ' + $scope.post.id, function (data) {
        debug = $scope.can("debug");
        if(data.fire) {
          switch(data.fire) {
            case "upvote":
              if(debug) console.log("New event: upvote", data);
              $scope.post.votes.up++;
              break;
            case "upvote-remove":
              if(debug) console.log("New event: upvote-remove", data);
              $scope.post.votes.up--;
              break;
            case "downvote":
              if(debug) console.log("New event: downvote", data);
              $scope.post.votes.down++;
              break;
            case "downvote-remove":
              if(debug) console.log("New event: downvote-remove", data);
              $scope.post.votes.down--;
              break;
            case "comment-upvote":
              if(debug) console.log("New event: comment-upvote", data);
              if($scope.post.comments) {
                for(var i in $scope.post.comments.set) {
                  if($scope.post.comments.set[i].position == data.index) {
                    $scope.post.comments.set[i].votes.up++;
                    break;
                  }
                }
              }
              break;
            case "comment-upvote-remove":
              if(debug) console.log("New event: comment-upvote-remove", data);
              for(var i in $scope.post.comments.set) {
                if($scope.post.comments.set[i].position == data.index) {
                  $scope.post.comments.set[i].votes.up--;
                  break;
                }
              }
              break;
            case "comment-downvote":
              if(debug) console.log("New event: comment-downvote", data);
              for(var i in $scope.post.comments.set) {
                if($scope.post.comments.set[i].position == data.index) {
                  $scope.post.comments.set[i].votes.down++;
                  break;
                }
              }
              break;
            case "comment-downvote-remove":
              if(debug) console.log("New event: comment-downvote-remove", data);
              for(var i in $scope.post.comments.set) {
                if($scope.post.comments.set[i].position == data.index) {
                  $scope.post.comments.set[i].votes.down--;
                  break;
                }
              }
              break;
            case "updated":
              if(debug) console.log("New event: updated", data);
              updatePostContent();
              break;
            case "comment-updated":
              if(debug) console.log("New event: comment-updated", data);
              for(var i in $scope.post.comments.set) {
                if($scope.post.comments.set[i].position == data.index) {
                  $http.get(layer_path + 'posts/' + $scope.post.id + '/comments', { params: {
                    'offset': data.index,
                    'limit': 1
                  }}).then(function success(response) {
                    if(response.data.comments.set.length == 1) {
                      new_comment = response.data.comments.set[0];
                      addMediaEmbed(new_comment);
                      if($scope.post.comments !== undefined) {
                        $scope.post.comments.set[i] = new_comment;
                      }
                    }
                  }, function (error){
                    console.log("Error updating comment");
                  });
                  break;
                }
              }
              break;
            case "delete-comment":
              if(debug) console.log("New event: delete-comment", data);
              for(var i in $scope.post.comments.set) {
                if($scope.post.comments.set[i].position == data.index) {
                  deleteCommentObject($scope.post.comments.set[i]);
                  break;
                }
              }
              break;
            case "locked":
              if(debug) console.log("New event: locked", data);
              $scope.post.lock = true;
              break;
            case "unlocked":
              if(debug) console.log("New event: unlocked", data);
              $scope.post.lock = false;
              break;
            default:
              if(debug) console.log("I don't know what the hell did Blacker say!")
          }
        }
      });
    }
  }, false);

  $scope.$on('new-comment', function(event, data) {
    if(data.id == $scope.post.id) {
      if($scope.post.comments) {
        $scope.post.comments.new++;
      }
    }
  });

	$scope.$on('resolvePost', function(event, post) {
		$scope.waiting = false;
		$scope.resolving = true;
    $scope.error_loading = false;
		$scope.post = post;
		$scope.force_comment = false;

		Post.get({id: post.id}, function success(data) {
      if($scope.can("debug")) console.log(data);
			$scope.post = data;
      addMediaEmbed($scope.post);

      if($scope.post.comments.answer) {
        addMediaEmbed($scope.post.comments.answer);
      }

      $scope.post.comments.new = 0;

      for (var c in $scope.categories) {
        for(var s in $scope.categories[c].subcategories) {
          if($scope.categories[c].subcategories[s].id == $scope.post.category) {
            $scope.post.category = {
              id: $scope.categories[c].subcategories[s].id,
              name: $scope.categories[c].subcategories[s].name,
              slug: $scope.categories[c].subcategories[s].slug,
              parent_slug: $scope.categories[c].slug,
              color: $scope.categories[c].color
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

      // If searching for a comment not loaded, load it:
      if($scope.view_comment.position >= 0 && $scope.view_comment.position != '') {
        if($scope.post.comments.total - $scope.comments_status.loaded > $scope.view_comment.position) {
          $scope.comments_status.loading = true;

          var comments_offset = $scope.view_comment.position;
          var comments_to_load = $scope.post.comments.total - comments_offset - $scope.comments_status.loaded;

          $http.get(layer_path + 'posts/' + $scope.post.id + '/comments', { params: {
            'offset': comments_offset,
            'limit': comments_to_load
          } } ).then(function success(response){
            //console.log(response.data.comments.set);
            new_comments = response.data.comments.set;
            for(var c in new_comments) {
              addMediaEmbed(new_comments[c]);
            }
            new_comments = new_comments.concat($scope.post.comments.set);
            $scope.post.comments.set = new_comments;
            $scope.comments_status.loaded += comments_to_load;
            $scope.comments_status.offset = comments_offset;
            $scope.comments_status.loading = false;

            $timeout(function() {
              var elem = $('.comment[data-number='+$scope.view_comment.position+']');
              if(elem.val() === "") {
                elem.addClass('active');
                $('.current-article').animate({scrollTop: (elem.offset().top - 80)}, 50);
              }
            }, 500);

            //console.log("Loaded", $scope.comments_status.loaded, $scope.comments_status.offset, $scope.post.comments.total);
          }, function(error){
            console.log("Error while loading...");
            $scope.comments_status.loading = false;
          });
        } else {
          $timeout(function() {
            var elem = $('.comment[data-number='+$scope.view_comment.position+']');
            if(elem.val() === "") {
              elem.addClass('active');
              $('.current-article').animate({scrollTop: (elem.offset().top - 80)}, 50);
            }
          }, 500);
        }
      }

      // Postproccess every comment
      for(var c in $scope.post.comments.set) {
        addMediaEmbed($scope.post.comments.set[c]);
      }
      $scope.resolving = false;

      // If searching for a comment, move to that comment
      /*if($scope.view_comment.position >= 0 && $scope.view_comment.position != '') {
        $timeout(function() {
          var elem = $('.comment[data-number='+$scope.view_comment.position+']');
          if(elem.val() === "") {
            elem.addClass('active');
            $('.current-article').animate({scrollTop: (elem.offset().top - 80)}, 50);
          }
        }, 1500);
      }*/

      /* TEMPORAL - TODO: MOVE TO A DIRECTIVE */
      $scope.total_h = $scope.viewport_h = 0;
      /*$timeout(function() {
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
      }, 350);*/

      var from_top, surplus, lastScrollTop = 0;
      $scope.scrubber = {
        current_c: 0
      };
      // Scrolling responses
      /*$('.current-article').scroll( function() {
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
      });*/
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
    var regex = new RegExp("(https?:\/\/.*\\.(?:png|jpg|jpeg|JPEG|PNG|JPG|gif|GIF)((\\?|\\&)[a-zA-Z0-9]+\\=[a-zA-Z0-9]+)*)", "gi");
    var to_replace = "<div class=\"img-preview\"><a href=\"$1\" target=\"_blank\"><img src=\"$1\"></a></div>";
    comment.content_final = comment.content.replace(regex, to_replace);

    // Replace Youtube videos
    var yt_re = /(https?:\/\/)?(www\.)?(youtu\.be\/|youtube\.com\/)(?:v\/|u\/\w\/|embed\/|watch\?v=)([^#\&\?]{11})\S*/g;
    var to_replace = "<iframe width=\"560\" height=\"315\" src=\"https://www.youtube.com/embed/$4\" frameborder=\"0\" allowfullscreen></iframe>";

    // Replace emoji
    var emojis = [
      "bowtie", "smile", "laughing", "blush", "smiley", "relaxed",
      "smirk", "heart_eyes", "kissing_heart", "kissing_closed_eyes", "flushed",
      "relieved", "satisfied", "grin", "wink", "stuck_out_tongue_winking_eye",
      "stuck_out_tongue_closed_eyes", "grinning", "kissing",
      "kissing_smiling_eyes", "stuck_out_tongue", "sleeping", "worried",
      "frowning", "anguished", "open_mouth", "grimacing", "confused", "hushed",
      "expressionless", "unamused", "sweat_smile", "sweat",
      "disappointed_relieved", "weary", "pensive", "disappointed", "confounded",
      "fearful", "cold_sweat", "persevere", "cry", "sob", "joy", "astonished",
      "scream", "neckbeard", "tired_face", "angry", "rage", "triumph", "sleepy",
      "yum", "mask", "sunglasses", "dizzy_face", "imp", "smiling_imp",
      "neutral_face", "no_mouth", "innocent", "alien", "yellow_heart",
      "blue_heart", "purple_heart", "heart", "green_heart", "broken_heart",
      "heartbeat", "heartpulse", "two_hearts", "revolving_hearts", "cupid",
      "sparkling_heart", "sparkles", "star", "star2", "dizzy", "boom",
      "collision", "anger", "exclamation", "question", "grey_exclamation",
      "grey_question", "zzz", "dash", "sweat_drops", "notes", "musical_note",
      "fire", "hankey", "poop", "shit", "\\+1", "thumbsup", "-1", "thumbsdown",
      "ok_hand", "punch", "facepunch", "fist", "v", "wave", "hand", "raised_hand",
      "open_hands", "point_up", "point_down", "point_left", "point_right",
      "raised_hands", "pray", "point_up_2", "clap", "muscle", "metal", "fu",
      "walking", "runner", "running", "couple", "family", "two_men_holding_hands",
      "two_women_holding_hands", "dancer", "dancers", "ok_woman", "no_good",
      "information_desk_person", "raising_hand", "bride_with_veil",
      "person_with_pouting_face", "person_frowning", "bow", "couplekiss",
      "couple_with_heart", "massage", "haircut", "nail_care", "boy", "girl",
      "woman", "man", "baby", "older_woman", "older_man",
      "person_with_blond_hair", "man_with_gua_pi_mao", "man_with_turban",
      "construction_worker", "cop", "angel", "princess", "smiley_cat",
      "smile_cat", "heart_eyes_cat", "kissing_cat", "smirk_cat", "scream_cat",
      "crying_cat_face", "joy_cat", "pouting_cat", "japanese_ogre",
      "japanese_goblin", "see_no_evil", "hear_no_evil", "speak_no_evil",
      "guardsman", "skull", "feet", "lips", "kiss", "droplet", "ear", "eyes",
      "nose", "tongue", "love_letter", "bust_in_silhouette",
      "busts_in_silhouette", "speech_balloon", "thought_balloon", "feelsgood",
      "finnadie", "goberserk", "godmode", "hurtrealbad", "rage1", "rage2",
      "rage3", "rage4", "suspect", "trollface", "sunny", "umbrella", "cloud",
      "snowflake", "snowman", "zap", "cyclone", "foggy", "ocean", "cat", "dog",
      "mouse", "hamster", "rabbit", "wolf", "frog", "tiger", "koala", "bear",
      "pig", "pig_nose", "cow", "boar", "monkey_face", "monkey", "horse",
      "racehorse", "camel", "sheep", "elephant", "panda_face", "snake", "bird",
      "baby_chick", "hatched_chick", "hatching_chick", "chicken", "penguin",
      "turtle", "bug", "honeybee", "ant", "beetle", "snail", "octopus",
      "tropical_fish", "fish", "whale", "whale2", "dolphin", "cow2", "ram", "rat",
      "water_buffalo", "tiger2", "rabbit2", "dragon", "goat", "rooster", "dog2",
      "pig2", "mouse2", "ox", "dragon_face", "blowfish", "crocodile",
      "dromedary_camel", "leopard", "cat2", "poodle", "paw_prints", "bouquet",
      "cherry_blossom", "tulip", "four_leaf_clover", "rose", "sunflower",
      "hibiscus", "maple_leaf", "leaves", "fallen_leaf", "herb", "mushroom",
      "cactus", "palm_tree", "evergreen_tree", "deciduous_tree", "chestnut",
      "seedling", "blossom", "ear_of_rice", "shell", "globe_with_meridians",
      "sun_with_face", "full_moon_with_face", "new_moon_with_face", "new_moon",
      "waxing_crescent_moon", "first_quarter_moon", "waxing_gibbous_moon",
      "full_moon", "waning_gibbous_moon", "last_quarter_moon",
      "waning_crescent_moon", "last_quarter_moon_with_face",
      "first_quarter_moon_with_face", "moon", "earth_africa", "earth_americas",
      "earth_asia", "volcano", "milky_way", "partly_sunny", "octocat", "squirrel",
      "bamboo", "gift_heart", "dolls", "school_satchel", "mortar_board", "flags",
      "fireworks", "sparkler", "wind_chime", "rice_scene", "jack_o_lantern",
      "ghost", "santa", "christmas_tree", "gift", "bell", "no_bell",
      "tanabata_tree", "tada", "confetti_ball", "balloon", "crystal_ball", "cd",
      "dvd", "floppy_disk", "camera", "video_camera", "movie_camera", "computer",
      "tv", "iphone", "phone", "telephone", "telephone_receiver", "pager", "fax",
      "minidisc", "vhs", "sound", "speaker", "mute", "loudspeaker", "mega",
      "hourglass", "hourglass_flowing_sand", "alarm_clock", "watch", "radio",
      "satellite", "loop", "mag", "mag_right", "unlock", "lock",
      "lock_with_ink_pen", "closed_lock_with_key", "key", "bulb", "flashlight",
      "high_brightness", "low_brightness", "electric_plug", "battery", "calling",
      "email", "mailbox", "postbox", "bath", "bathtub", "shower", "toilet",
      "wrench", "nut_and_bolt", "hammer", "seat", "moneybag", "yen", "dollar",
      "pound", "euro", "credit_card", "money_with_wings", "e-mail", "inbox_tray",
      "outbox_tray", "envelope", "incoming_envelope", "postal_horn",
      "mailbox_closed", "mailbox_with_mail", "mailbox_with_no_mail", "door",
      "smoking", "bomb", "gun", "hocho", "pill", "syringe", "page_facing_up",
      "page_with_curl", "bookmark_tabs", "bar_chart", "chart_with_upwards_trend",
      "chart_with_downwards_trend", "scroll", "clipboard", "calendar", "date",
      "card_index", "file_folder", "open_file_folder", "scissors", "pushpin",
      "paperclip", "black_nib", "pencil2", "straight_ruler", "triangular_ruler",
      "closed_book", "green_book", "blue_book", "orange_book", "notebook",
      "notebook_with_decorative_cover", "ledger", "books", "bookmark",
      "name_badge", "microscope", "telescope", "newspaper", "football",
      "basketball", "soccer", "baseball", "tennis", "8ball", "rugby_football",
      "bowling", "golf", "mountain_bicyclist", "bicyclist", "horse_racing",
      "snowboarder", "swimmer", "surfer", "ski", "spades", "hearts", "clubs",
      "diamonds", "gem", "ring", "trophy", "musical_score", "musical_keyboard",
      "violin", "space_invader", "video_game", "black_joker",
      "flower_playing_cards", "game_die", "dart", "mahjong", "clapper", "memo",
      "pencil", "book", "art", "microphone", "headphones", "trumpet", "saxophone",
      "guitar", "shoe", "sandal", "high_heel", "lipstick", "boot", "shirt",
      "tshirt", "necktie", "womans_clothes", "dress", "running_shirt_with_sash",
      "jeans", "kimono", "bikini", "ribbon", "tophat", "crown", "womans_hat",
      "mans_shoe", "closed_umbrella", "briefcase", "handbag", "pouch", "purse",
      "eyeglasses", "fishing_pole_and_fish", "coffee", "tea", "sake",
      "baby_bottle", "beer", "beers", "cocktail", "tropical_drink", "wine_glass",
      "fork_and_knife", "pizza", "hamburger", "fries", "poultry_leg",
      "meat_on_bone", "spaghetti", "curry", "fried_shrimp", "bento", "sushi",
      "fish_cake", "rice_ball", "rice_cracker", "rice", "ramen", "stew", "oden",
      "dango", "egg", "bread", "doughnut", "custard", "icecream", "ice_cream",
      "shaved_ice", "birthday", "cake", "cookie", "chocolate_bar", "candy",
      "lollipop", "honey_pot", "apple", "green_apple", "tangerine", "lemon",
      "cherries", "grapes", "watermelon", "strawberry", "peach", "melon",
      "banana", "pear", "pineapple", "sweet_potato", "eggplant", "tomato", "corn",
      "house", "house_with_garden", "school", "office", "post_office", "hospital",
      "bank", "convenience_store", "love_hotel", "hotel", "wedding", "church",
      "department_store", "european_post_office", "city_sunrise", "city_sunset",
      "japanese_castle", "european_castle", "tent", "factory", "tokyo_tower",
      "japan", "mount_fuji", "sunrise_over_mountains", "sunrise", "stars",
      "statue_of_liberty", "bridge_at_night", "carousel_horse", "rainbow",
      "ferris_wheel", "fountain", "roller_coaster", "ship", "speedboat", "boat",
      "sailboat", "rowboat", "anchor", "rocket", "airplane", "helicopter",
      "steam_locomotive", "tram", "mountain_railway", "bike", "aerial_tramway",
      "suspension_railway", "mountain_cableway", "tractor", "blue_car",
      "oncoming_automobile", "car", "red_car", "taxi", "oncoming_taxi",
      "articulated_lorry", "bus", "oncoming_bus", "rotating_light", "police_car",
      "oncoming_police_car", "fire_engine", "ambulance", "minibus", "truck",
      "train", "station", "train2", "bullettrain_front", "bullettrain_side",
      "light_rail", "monorail", "railway_car", "trolleybus", "ticket", "fuelpump",
      "vertical_traffic_light", "traffic_light", "warning", "construction",
      "beginner", "atm", "slot_machine", "busstop", "barber", "hotsprings",
      "checkered_flag", "crossed_flags", "izakaya_lantern", "moyai",
      "circus_tent", "performing_arts", "round_pushpin",
      "triangular_flag_on_post", "jp", "kr", "cn", "us", "fr", "es", "it", "ru",
      "gb", "uk", "de", "one", "two", "three", "four", "five", "six", "seven",
      "eight", "nine", "keycap_ten", "1234", "zero", "hash", "symbols",
      "arrow_backward", "arrow_down", "arrow_forward", "arrow_left",
      "capital_abcd", "abcd", "abc", "arrow_lower_left", "arrow_lower_right",
      "arrow_right", "arrow_up", "arrow_upper_left", "arrow_upper_right",
      "arrow_double_down", "arrow_double_up", "arrow_down_small",
      "arrow_heading_down", "arrow_heading_up", "leftwards_arrow_with_hook",
      "arrow_right_hook", "left_right_arrow", "arrow_up_down", "arrow_up_small",
      "arrows_clockwise", "arrows_counterclockwise", "rewind", "fast_forward",
      "information_source", "ok", "twisted_rightwards_arrows", "repeat",
      "repeat_one", "new", "top", "up", "cool", "free", "ng", "cinema", "koko",
      "signal_strength", "u5272", "u5408", "u55b6", "u6307", "u6708", "u6709",
      "u6e80", "u7121", "u7533", "u7a7a", "u7981", "sa", "restroom", "mens",
      "womens", "baby_symbol", "no_smoking", "parking", "wheelchair", "metro",
      "baggage_claim", "accept", "wc", "potable_water", "put_litter_in_its_place",
      "secret", "congratulations", "m", "passport_control", "left_luggage",
      "customs", "ideograph_advantage", "cl", "sos", "id", "no_entry_sign",
      "underage", "no_mobile_phones", "do_not_litter", "non-potable_water",
      "no_bicycles", "no_pedestrians", "children_crossing", "no_entry",
      "eight_spoked_asterisk", "eight_pointed_black_star", "heart_decoration",
      "vs", "vibration_mode", "mobile_phone_off", "chart", "currency_exchange",
      "aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpius",
      "sagittarius", "capricorn", "aquarius", "pisces", "ophiuchus",
      "six_pointed_star", "negative_squared_cross_mark", "a", "b", "ab", "o2",
      "diamond_shape_with_a_dot_inside", "recycle", "end", "on", "soon", "clock1",
      "clock130", "clock10", "clock1030", "clock11", "clock1130", "clock12",
      "clock1230", "clock2", "clock230", "clock3", "clock330", "clock4",
      "clock430", "clock5", "clock530", "clock6", "clock630", "clock7",
      "clock730", "clock8", "clock830", "clock9", "clock930", "heavy_dollar_sign",
      "copyright", "registered", "tm", "x", "heavy_exclamation_mark", "bangbang",
      "interrobang", "o", "heavy_multiplication_x", "heavy_plus_sign",
      "heavy_minus_sign", "heavy_division_sign", "white_flower", "100",
      "heavy_check_mark", "ballot_box_with_check", "radio_button", "link",
      "curly_loop", "wavy_dash", "part_alternation_mark", "trident",
      "black_square", "white_square", "white_check_mark", "black_square_button",
      "white_square_button", "black_circle", "white_circle", "red_circle",
      "large_blue_circle", "large_blue_diamond", "large_orange_diamond",
      "small_blue_diamond", "small_orange_diamond", "small_red_triangle",
      "small_red_triangle_down", "shipit"
    ],
    rEmojis = new RegExp(":(" + emojis.join("|") + "):", "g");
    comment.content_final = comment.content_final.replace(rEmojis, function (match, text) {
      return "<i class='emoji emoji_" + text + "' title=':" + text + ":'>" + text + "</i>";
    });

    comment.content_final = comment.content_final.replace(yt_re, to_replace);
  }
}];