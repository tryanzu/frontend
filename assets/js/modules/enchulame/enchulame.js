var DonationsModule = angular.module("sg.module.enchulame", []);

DonationsModule.controller('EnchulameController', ['$scope', '$http', '$route', function($scope, $http, $route) {
  $scope.form = {
    'nombres': null,
    'apellidos': null,
    'email': null,
    'celular': null,
    'fecha_nacimiento': null,
    'estado': null,
    'cp': null,
    'modo_elegido': null,
    'historia': '',
    'compania': '',
    'modalidad': '',
    'modelo_celular': '',
    'direccion': '',
    'email_secundario': '',
    'celular_secundario': ''
  };
  $scope.helpers = {
    'historia_old': '',
    'current_step': 0,
    'validating_number': false
  }

  $scope.tutorial = [
    {'title':'1. Lee muy bien cada pregunta y revisa lo que contestas.', 'index': 1,'description': ['No te precipites, no tienen mayores posibilidades de ganar quienes contesten más rápido.', 'No es un proceso corto, pero tampoco estamos regalando unos calcetines.']},
    {'title':'2. No seas deshonesto sólo para conseguir algo material. Responde con datos reales.', 'index': 2,'description':['Verificaremos la información de las historias que seleccionemos como finalistas.']},
    {'title':'3. Escribe tu historia de la manera más clara y resumida que te sea posible.', 'index': 3,'description':['Recuerda que debemos leerlas nosotros (seres humanos, no máquinas), y si no la escribes de manera entendible tus probabilidades de ganar disminuyen.']},
    {'title':'4. No ocupes espacio en contarnos lo fanático que eres de Spartan Geek. Ya sabemos que somos los mejores :v', 'index': 4,'description':['Nos interesan sólo los datos importantes de TU historia.']},
    {'title':'5. Entiende que no es posible que todos resulten ganadores de un Enchúlame la PC.', 'index': 5,'description':['Esto lo hacemos con mucho esfuerzo para ustedes, pero no tenemos ninguna obligación. Si tú te enojas por "injusticias" o crees que eres "más merecedor" que los demás, ése es tu problema y no el nuestro.', 'Así de claros debemos ser.']}
  ];
  $scope.tutorial_index = 1;

  $scope.tutorialNext = function() {
    $scope.tutorial_index++;
  }

  $scope.validateNumber = function() {
    $scope.helpers.validating_number = true;
    saveData();
  }

  $scope.nextStep = function() {
    $scope.helpers.current_step++;
    saveData();
  }

  $scope.prevStep = function() {
    $scope.helpers.current_step--;
    saveData();
  }

  $scope.selectType = function(type) {
    $scope.modo_elegido = type;
    $scope.nextStep();
  }

  // Send current form data
  var saveData = function() {
    payload = {
      "name": $scope.form.nombres + ' ' + $scope.form.apellidos,
      "email": $scope.form.email,
      "phone": $scope.form.celular,
      "birthday": $scope.form.fecha_nacimiento,
      "additional": {
        "contest": $scope.form.modo_elegido,
        "history": $scope.form.historia,
        "state": $scope.form.estado,
        "zipcode": $scope.form.cp,
        "cell_company": $scope.form.compania,
        "cell_mode": $scope.form.modalidad,
        "cell_phone": $scope.form.modelo_celular,
        "address": $scope.form.direccion,
        "email2": $scope.form.email_secundario,
        "phone2": $scope.form.celular_secundario
      },
      "step": $scope.helpers.current_step
    }

    if($scope.form.code) {
      payload.code = $scope.form.code;
    }

    $http.put(layer_path + 'contest-lead', payload).then(function success(response) {
      console.log(response.data);

    }, function(error){
      console.log(error);
    });
  }

  var getData = function() {
    $http.get(layer_path + 'contest-lead').then(function success(response){
      console.log(response.data);
      $scope.helpers.current_step = response.data.step;
    });
  }
  // Retrieve current filled info
  getData();
}]);