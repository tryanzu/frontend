var EditPostController = ['$scope', '$routeParams', '$http', 'Category', 'Part', 'Upload', 'Post', '$routeParams',
  function($scope, $routeParams, $http, Category, Part, Upload, Post, $routeParams) {

  $scope.publishing = true;
  $scope.message = "";
	$scope.categories = [];

  $scope.post_edit = {
    title: '',
    content: '',
    category: '',
    isQuestion: false,
    pinned: false
  };

  $scope.adding_file = false;
  $scope.uploadPicture = function(files) {
    if(files.length == 1) {
      var file = files[0];
      $scope.adding_file = true;
      Upload.upload({
        url: layer_path + "post/image",
        file: file
      }).success(function (data) {
        if($scope.post_edit.content.length > 0) {
          $scope.post_edit.content += '\n' + data.url;
        } else {
          $scope.post_edit.content = data.url;
        }
        $scope.post_edit.content += '\n';
        $scope.adding_file = false;
        $('.publish-content textarea').focus();
      }).error(function(data) {
        $scope.adding_file = false;
      });
    }
  };

	$scope.editPost = function() {
    if($scope.post_edit.title === '') {
      $scope.message = "Te falta el título de tu publicación";
    } else if($scope.post_edit.content === '') {
      $scope.message = "Te falta el contenido de tu publicación";
    } else if($scope.post_edit.category.length < 1) {
      $scope.message = "Te falta elegir categoría";
      console.log($scope.post_edit.category, $scope.post_edit.category.length < 1);
    } else {
      $scope.publishing = true;
      $scope.post_edit.name = $scope.post_edit.title;

  		$http.put(layer_path + 'posts/' + $scope.post.id, $scope.post_edit).then(function(data) {
  			// Return to home
        window.location.href = "/";
  		}, function(err) {
        console.log(err);
      });
    }
	};

  if(!$scope.user.isLogged) {
    window.location = '/';
  }

  // Load categories
  Category.writable(function(data) {
    $scope.categories = data;

    Post.get({id: $routeParams.id}, function(data) {
      $scope.post = data;
      $scope.post_edit = {
        title: data.title,
        content: data.content,
        category: data.category,
        kind: 'category-post',
        isQuestion: data.is_question,
        pinned: data.pinned
      };
      $scope.publishing = false;
    });
  });
}];