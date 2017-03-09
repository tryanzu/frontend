var PublishController = ['$scope', '$routeParams', '$http', 'Category', 'Part', 'Upload',
  function($scope, $routeParams, $http, Category, Part, Upload) {

  $scope.publishing = true;
  $scope.message = "";

  $scope.helpers = {
    category_added: false,
    title_added: false
  };

  if(!$scope.user.isLogged) {
    window.location = '/';
  }

	$scope.categories = [];

  $scope.post = {
    title: '',
    content: '',
    category: '',
    components: false,
    is_question: false,
    pinned: false
  };

	$scope.budgetFlexibility = [
		{
			label: 'Fijo',
			type:  'Fijo',
			flexibility: '0'
		},
		{
			label: '10% Más',
			type:  'Flexible',
			flexibility: '10'
		},
		{
			label: '20% Más',
			type:  'Flexible',
			flexibility: '20'
		},
		{
			label: '30% Más',
			type:  'Flexible',
			flexibility: '30'
		},
		{
			label: 'Muy Flexible',
			type:  'Muy flexible',
			flexibility: '0'
		}
	];

	$scope.computerPost = {
		budget: $scope.budgetFlexibility[0],
		components: {
      cpu: {
        value: '',
        owned: false,
        poll: false
      },
      motherboard: {
        value: '',
        owned: false,
        poll: false
      },
      ram: {
        value: '',
        owned: false,
        poll: false
      },
      storage: {
        value: '',
        owned: false,
        poll: false
      },
      cooler: {
        value: '',
        owned: false,
        poll: false
      },
      power: {
        value: '',
        owned: false,
        poll: false
      },
      cabinet: {
        value: '',
        owned: false,
        poll: false
      },
      screen: {
        value: '',
        owned: false,
        poll: false
      },
      videocard: {
        value: '',
        owned: false,
        poll: false
      },
      software: '',
      budget: '0',
      budget_currency: 'MXN'
    }
	}

  $scope.adding_file = false;
  $scope.uploadPicture = function(files) {
    if(files.length == 1) {
      var file = files[0];
      $scope.adding_file = true;
      Upload.upload({
        url: layer_path + "post/image",
        file: file
      }).success(function (data) {
        if($scope.post.content.length > 0) {
          $scope.post.content += '\n' + data.url;
        } else {
          $scope.post.content = data.url;
        }
        $scope.post.content += '\n';
        $scope.adding_file = false;
        $('.publish-content textarea').focus();
      }).error(function(data) {
        $scope.adding_file = false;
      });
    }
  };

	$scope.normalPostPublish = function() {
    if(!['55dc153f3f6ba10071000004','55dc15513f6ba10071000005'].indexOf($scope.post.category) > -1) {
      if($scope.post.title === '') {
        $scope.message = "Te falta el título de tu publicación";
        return;
      }
    }
    if($scope.post.content === '') {
      $scope.message = "Te falta el contenido de tu publicación";
    } else if($scope.post.category.length < 1) {
      $scope.message = "Te falta elegir categoría";
    } else {
      $scope.publishing = true;

  		var post = {
        kind: 'category-post',
  			name: $scope.post.title,
  			category: $scope.post.category,
        content: $scope.post.content,
        is_question: $scope.post.is_question,
        pinned: $scope.post.pinned,
        lock: $scope.post.lock
  		};

      if(['55dc153f3f6ba10071000004','55dc15513f6ba10071000005'].indexOf($scope.post.category) > -1) {
        var components = $scope.computerPost.components;
        components.budget_type = $scope.computerPost.budget.type;
        components.budget_flexibility = $scope.computerPost.budget.flexibility;

        for (var i in components) {
          if (typeof components[i] === 'object' && 'owned' in components[i]) {
            if (components[i].owned == 'true') { components[i].owned = true; }
            if (components[i].owned == 'false') { components[i].owned = false; }
          }
        }

        post.kind = 'recommendations';
        post.components = components;
      }

  		$http.post(layer_path + 'post', post).then(function success(response) {
        window.location.href = "/p/"+response.data.post.slug+"/"+response.data.post.id;
  		}, function(err) {
        console.log(err);
      });
    }
	};

  // Load categories
  Category.writable(function(data) {
    $scope.categories = data;
    if($routeParams.cat_slug != undefined) {
      for (var i = 0; i < $scope.categories.length; i++) {
        for(var j in $scope.categories[i].subcategories) {
          if ($scope.categories[i].subcategories[j].slug === $routeParams.cat_slug) {
            $scope.post.category = $scope.categories[i].subcategories[j].id;
            break;
          }
        }
      }
    }
    $scope.publishing = false;
  });
}];