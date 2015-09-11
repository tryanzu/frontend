var PublishController = ['$scope', '$routeParams', '$http', 'Category', 'Part', 'Upload',
  function($scope, $routeParams, $http, Category, Part, Upload) {

  $scope.publishing = true;
  $scope.message = "";

  if(!$scope.user.isLogged) {
    window.location = '/';
  }

	$scope.categories = [];

  $scope.post = {
    title: '',
    content: '',
    category: '',
    components: false,
    isQuestion: false,
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
	};

  $scope.partForm = {
    motherboard: {
      model: '',
      brand_list: null,
      model_list: null
    },
    cpu: {
      model: '',
      brand_list: null,
      model_list: null
    },
    'cpu-cooler': {
      model: '',
      brand_list: null,
      model_list: null
    },
    memory: {
      model: '',
      brand_list: null,
      model_list: null
    },
    storage: {
      model: '',
      brand_list: null,
      model_list: null
    }
  };

  $scope.changeModels = function(component_name, component_name_post) {
    if(!component_name_post){
      component_name_post = component_name;
    }
    Part.get({
      type: component_name,
      action:'models',
      manufacturer: $scope.partForm[component_name].model
    }, function(data) {
      if(component_name === 'memory') {
        for(var i = 0; i<data.parts.length; i++) {
          data.parts[i].full_name = data.parts[i].name + ' ' + data.parts[i].size + ' ' + data.parts[i].speed + ' ' + data.parts[i].memory_type;
        }
      }
      else if(component_name === 'cpu') {
        for(var i = 0; i < data.parts.length; i++) {
          data.parts[i].full_name = data.parts[i].name + ' ' + data.parts[i].partnumber;
        }
      }
      else if(component_name === 'storage') {
        for(var i = 0; i < data.parts.length; i++) {
          data.parts[i].full_name = data.parts[i].name + ' ' + data.parts[i].capacity + ' ' + data.parts[i].form_factor + '"';
        }
      }
      $scope.partForm[component_name].model_list = data.parts;
      $scope.computerPost.components[component_name_post].value = '';
    })
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

	$scope.activateComponents = function() {
    // Show the components selection form
		$scope.post.components = true;
    // If we haven't load Pc Parts Brands List, get them from API
    if(!$scope.partForm.motherboard.brand_list) {
      Part.get({type:'motherboard', action:'manufacturers'}, function(data){
        $scope.partForm.motherboard.brand_list = data.manufacturers;
      })
    }
    if(!$scope.partForm.cpu.brand_list) {
      Part.get({type:'cpu', action:'manufacturers'}, function(data){
        $scope.partForm.cpu.brand_list = data.manufacturers;
      })
    }
    if(!$scope.partForm['cpu-cooler'].brand_list) {
      Part.get({type:'cpu-cooler', action:'manufacturers'}, function(data){
        $scope.partForm['cpu-cooler'].brand_list = data.manufacturers;
      })
    }
    if(!$scope.partForm.memory.brand_list) {
      Part.get({type:'memory', action:'manufacturers'}, function(data){
        $scope.partForm.memory.brand_list = data.manufacturers;
      })
    }
    if(!$scope.partForm.storage.brand_list) {
      Part.get({type:'storage', action:'manufacturers'}, function(data){
        $scope.partForm.storage.brand_list = data.manufacturers;
      })
    }
	};
  $scope.deactivateComponents = function() {
    $scope.post.components = false;
  };

	$scope.computerPostPublish = function() {
		if($scope.post.title === '') {
      $scope.message = "Te falta el nombre de tu PC";
    } else if($scope.post.content === '') {
      $scope.message = "Te falta el contenido de tu publicación";
    } else if($scope.post.category.length < 1) {
      $scope.message = "Te falta elegir categoría";
      console.log($scope.post.category, $scope.post.category.length < 1);
    } else {
      $scope.publishing = true;
  		var components = $scope.computerPost.components;
  		components.budget_type = $scope.computerPost.budget.type;
  		components.budget_flexibility = $scope.computerPost.budget.flexibility;

  		for (var i in components) {
  			if (typeof components[i] === 'object' && 'owned' in components[i]) {
  				if (components[i].owned == 'true') { components[i].owned = true; }
  				if (components[i].owned == 'false') { components[i].owned = false; }
  			}
  		}

  		var post = {
  			kind: "recommendations",
        name: $scope.post.title,
        category: $scope.post.category,
        content: $scope.post.content,
        components: components
  		};

  		$http.post(layer_path + 'post', post).then(function(data) {
  			// Return to home
        window.location.href = "/";
  		}, function(err) {});
    }
	};
	$scope.normalPostPublish = function() {
    if($scope.post.title === '') {
      $scope.message = "Te falta el título de tu publicación";
    } else if($scope.post.content === '') {
      $scope.message = "Te falta el contenido de tu publicación";
    } else if($scope.post.category.length < 1) {
      $scope.message = "Te falta elegir categoría";
      console.log($scope.post.category, $scope.post.category.length < 1);
    } else {
      $scope.publishing = true;
  		var post = {
  			content: $scope.post.content,
  			name: $scope.post.title,
  			category: $scope.post.category,
  			kind: 'category-post',
        isquestion: $scope.post.isQuestion,
        pinned: $scope.post.pinned
  		};

  		$http.post(layer_path + 'post', post).then(function(data) {
  			// Return to home
        window.location.href = "/";
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