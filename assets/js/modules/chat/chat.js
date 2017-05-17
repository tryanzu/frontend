var ChatController = [
  '$scope',
  '$firebaseArray',
  '$firebaseObject',
  '$timeout',
  '$location',
  '$route',
  '$routeParams',
  '$http',
  '$uibModal',
  '$geolocation',
  'socket',
  function($scope, $firebaseArray, $firebaseObject, $timeout, $location, $route, $routeParams, $http, $uibModal, $geolocation, socket) {
    $scope.formatted_address=null;
    $scope.$geolocation = $geolocation;
    // basic usage
    $geolocation.getCurrentPosition().then(function(location) {
      $scope.location = location;
    });
    $scope.encuesta = {
      create: false,
      active: false,
      pregunta: true,
      encuesta: false,
      arts: [],
      poll: null
    };
    $scope.rifaID=null;
    $scope.tiempo=false;
    $scope.rifa = {
      create: false,
      active: false,
      pregunta: false,
      rifa: false,
      art:{
        cant:0,
        cantComprados:0,
        cantUser:0,
        imgUrl:null,
        nomArt:null,
        precioBole:0,
        userIdG: null,
        userIdGname: null,
        userIdGname_slug: null,
        userIdGemail:null,
        stop:false,
        countries:null,
        cities:null,
        go:false
      },
      user:{
        cant:1,
        //userid:null,
        //username:null,
        //username_slug:null,
        //email:null,
        ticketskey:null
      }
    };

    $scope.radioModel = 'chat';
    $scope.alert_rifa = false;
    $scope.alert_encuesta = false;
    $scope.a_rifa = function(){
      $scope.alert_rifa = false;
    };
    $scope.a_encuesta = function(){
      $scope.alert_encuesta = false;
    };

    $scope.dynamicPopover = {
      content: 'Hello, World!',
      templateUrl: 'myPopoverTemplate.html',
      title: 'Title'
    };

    $scope.placement = {
      options: [
        'top',
        'top-left',
        'top-right',
        'bottom',
        'bottom-left',
        'bottom-right',
        'left',
        'left-top',
        'left-bottom',
        'right',
        'right-top',
        'right-bottom'
      ],
      selected: 'top'
    };
    $scope.people = [];

    $scope.membersRef_global = [];
    $scope.emojiMessage = {};

    $scope.favorite = {
      status: false,
      comment:"salkd lkasdjlaksj lkajsd lkajs lkajs dlkjas lkjasd lkajs dlkajs dlkja slkj das",
      active: true,
    };

    $scope.sb_config = {
      users: {
        autoHideScrollbar: false,
        theme: 'dark-thick',
        advanced:{
          updateOnContentResize: true
        },
        setHeight: '93%',
        setWidth: '100%',
        scrollInertia: 0
      },
      chat: {
        autoHideScrollbar: false,
        theme: 'dark-thick',
        advanced:{
          updateOnContentResize: true
        },
        setHeight: '80%',
        setWidth: '100%',
        scrollInertia: 0
      }
    };

    $scope.users = false;
    $scope.usersViewChange = function($event){
      $event.preventDefault();
      $event.stopPropagation();
      $scope.users = !$scope.users;
    };

    $scope.status = {
      isopen: false
    };

    $scope.toggled = function(open) {
      $log.log('Dropdown is now: ', open);
    };

    $scope.toggleDropdown = function($event) {
      $event.preventDefault();
      $event.stopPropagation();
      $scope.status.isopen = !$scope.status.isopen;
    };

    $scope.appendToEl = angular.element(document.querySelector('#dropdown-long-content'));

    var firebaseRef = new Firebase(firebase_url);

    // Instantiate a new connection to Firebase.
    $scope._firebase = firebaseRef;

    // A unique id generated for each session.
    $scope._sessionId = null;

    // A mapping of event IDs to an array of callbacks.
    $scope._events = {};

    // A mapping of room IDs to a boolean indicating presence.
    $scope._rooms = {};

    // A mapping of operations to re-queue on disconnect.
    $scope._presenceBits = {};

    // Commonly-used Firebase references.
    $scope._userRef        = null;
    $scope._statusRef      = null;
    $scope._messageRef     = $scope._firebase.child('messages');
    $scope._channelRef     = $scope._firebase.child('channels');
    //$scope._pollRef        = $scope._firebase.child('poll');
    //$scope._ticketsPollRef = $scope._firebase.child('ticketsPoll');
    //$scope._rifasRef       = $scope._firebase.child('raffles');
    //$scope._participantsRef= $scope._firebase.child('participants');
    //$scope._ticketsRef     = $scope._firebase.child('tickets');
    //$scope._privateRoomRef = $scope._firebase.child('room-private-metadata');
    //$scope._moderatorsRef  = $scope._firebase.child('moderators');
    $scope._suspensionsRef = $scope._firebase.child('suspensions');

    $scope._firebaseRefR = null;
    $scope._firebaseRefRPart = null;
    $scope._firebaseRefRTickets = null;
    $scope._firebaseRefPoll = null;
    $scope._firebaseRefTicketsPoll = null;
    //$scope._usersOnlineRef = $scope._firebase.child('user-names-online');

    // Setup and establish default options.
    $scope._options = {};

    // The number of historical messages to load per room.
    $scope._options.numMaxMessages = $scope._options.numMaxMessages || 50;
    $scope._options.messagesLength = $scope._options.messagesLength || 200;

    $scope.channels = [];
    $scope.channel = {
      selected: null
    };
    $scope.messages = [];
    $scope.old_messages = [];
    $scope.message = {
      content: '',
      send_on_enter: true,
      previous: 'Acid Rulz!'
    };
    $scope.show_details = false;

    $scope.members = [];
    $scope.searchText = {
      content: ''
    };

    $scope.helpers = {
      writing: false,
      writing_timeout: null,
      spam_count: 0,
      validated: false,
      loaded: false,
      blocked: false
    };

    $scope.safeApply = function(fn) {
      var phase = this.$root.$$phase;
      if(phase == '$apply' || phase == '$digest') {
        if(fn && (typeof(fn) === 'function')) {
          fn();
        }
      } else {
        this.$apply(fn);
      }
    };
    $scope.copy_to_clip = function(){
      /*if($scope.rifa.art.userIdGemail!=null && window.clipboardData){
        window.clipboardData.setData("Text", $scope.rifa.art.userIdGemail+"");
      }*/
      // seleccionar el texto de la dirección de email
      var email = document.querySelector('.email');
      var range = document.createRange();
      range.selectNode(email);
      window.getSelection().addRange(range);

      try {
        // intentar copiar el contenido seleccionado
        var resultado = document.execCommand('copy');
        console.log(resultado ? 'Email copiado' : 'No se pudo copiar el email');
      } catch(err) {
        console.log('ERROR al intentar copiar el email');
      }

      // eliminar el texto seleccionado
      window.getSelection().removeAllRanges();
    }
    $scope.getRandomInt = function(min, max) {
      return Math.floor(Math.random() * (max - min)) + min;
    }
    $scope.ganadorRifa = function(){
      $scope._participantsRef.child($scope.channel.selected.$id)
      .once("value", function(snapshot) {
        var data = snapshot.val();
        //console.log(data);
        var participants = [];
        for(var i in data) {
          var cant=data[i].cant;
          for (var x = 0; x < cant; x++) {
            participants.push([
              data[i].cant,
              data[i].userid
            ]);
          }
        }
        var max=participants.length;
        var min=0;
        if(max>0){
          var y = $scope.getRandomInt(min,max);
          ///users/:id/info
          $scope._firebase.child('users').child(participants[y][1]).child('info').once("value", function(user){
            $scope._rifasRef.child($scope.channel.selected.$id)
            .update({
              userIdG: participants[y][1],
              userIdGname: user.val().username,
              //userIdGname_slug: user.val().username,
              //userIdGemail: user.val().username
            });
          });
        }else{
          alert('No hay participantes');
        }
      }, function (errorObject) {
        console.log("The read failed: " + errorObject.code);
      });
    }
    $scope.stopEncuesta = function(){
      $scope._pollRef.child($scope.channel.selected.$id)
      .update({
        stop: true
      });
    }
    $scope.startEncuesta = function(){
      $scope._pollRef.child($scope.channel.selected.$id)
      .update({
        stop: false
      });
    }
    $scope.stopRifa = function(){
      $scope._rifasRef.child($scope.channel.selected.$id)
      .update({
        stop: true
      });
    }
    $scope.startRifa = function(){
      $scope._rifasRef.child($scope.channel.selected.$id)
      .update({
        stop: false
      });
    }
    $scope.updateRifa = function(){
      $scope._ticketsRef.child($scope.channel.selected.$id).once("value", function(snapshot){
        if(snapshot.val()==null){
          var stop=false;
          $scope._rifasRef.child($scope.channel.selected.$id).once("value",function(snapshot2){
            if(snapshot2.val()!=null){
              stop=snapshot2.val().stop;
            }
          });
          $scope._rifasRef.child($scope.channel.selected.$id)
          .update({
            cantComprados: 0,
            stop: stop
          });
        }else{
          var countT=0;
          var stop=false;
          $scope._rifasRef.child($scope.channel.selected.$id).once("value",function(snapshot2){
            if(snapshot2.val()!=null){
              stop=snapshot2.val().stop;
              if(snapshot2.val().cant>0)
                countT=snapshot2.val().cant-1;
              else
                countT=snapshot2.val().cant;
            }
          });
          var count = Object.keys(snapshot.val()).length;
          if(count>=countT){
            stop = true;
            $scope._rifasRef.child($scope.channel.selected.$id)
            .update({
              /*cantComprados: count,*/
              stop: stop
            });
          }
        }
      });
    }
    $scope.dejarBoletos = function(){
      if(confirm("Desea dejar la rifa?")){
        var arrTK=$scope.rifa.user.ticketskey;
        for (var i = 0; i < arrTK.length; i++) {
          $scope._ticketsRef.child($scope.channel.selected.$id).child(arrTK[i]).set(null);
          $scope.ticketsUPDATE($scope._rifasRef.child($scope.channel.selected.$id),false);
        }
        var firebaseRefR = $scope._participantsRef.child($scope.channel.selected.$id).child($scope.user.info.id);
        var obj = $firebaseObject(firebaseRefR);
        obj.$remove().then(function(ref){
          // data has been deleted locally and in the database
          clicButtonRifa=true;
          //$scope.updateRifa();
        }, function(error) {
          console.log("Error:", error);
          clicButtonRifa=false;
        });
      }
    };
    $scope.ticketsUPDATE = function (postRef, action) {
      postRef.transaction(function(rifa) {
        if (rifa) {
          if (rifa.cantComprados<rifa.cant && action) {
            rifa.cantComprados++;
          }else if(!action) {
            rifa.cantComprados--;
          }
        }
        return rifa;
      });
    };
    $scope.getPosition = function() {
      //init geolocation
      if($scope.formatted_address == null && !($scope.rifa.art.countries === undefined && $scope.rifa.art.cities === undefined)) {
        var dir = "";
        var lat = $scope.location.coords.latitude;
        var lon = $scope.location.coords.longitude;
        var latlng = new google.maps.LatLng(lat, lon);
        var geocoder = new google.maps.Geocoder();
        geocoder.geocode({"latLng": latlng}, function(results, status)
        {
          if(status == google.maps.GeocoderStatus.OK) {
            if(results[0]) {
              $scope.formatted_address = results[0].formatted_address;
            }else{
              alert("No se ha podido obtener ninguna dirección en esas coordenadas");
            }
          } else {
            alert("El Servicio de Codificación Geográfica ha fallado con el siguiente error: " + status);
          }
        });
      }//End, init geolocation
    };
    $scope.pollUPDATE = function (postRef, action) {
      postRef.transaction(function(encuesta_item) {
        if (encuesta_item) {
          if (action) {
            encuesta_item.cant++;
          }else if(!action) {
            encuesta_item.cant--;
          }
        }
        return encuesta_item;
      });
    };
    $scope.pollbttn = function($nom){
      var x = false;
      for (var i = 0; i < $scope.encuesta.arts.length; i++) {
        if($scope.encuesta.arts[i]==$nom){
          x=true;
        }
      }
      return x;
    };
    $scope.quitarvoto = function($nom){
      var arrt = $scope.encuesta.poll.items;
      var arrtemp = $scope.encuesta.arts;
      var count=0;
      for (var i = 0; i < arrt.length; i++) {
        if(arrt[i].nombre==$nom){
          count=i;
          break;
        }
      }
      var arrnvo = [];
      for (var i = 0; i < arrtemp.length; i++) {
        if(arrtemp[i]!=$nom){
          arrnvo.push(arrtemp[i]);
        }
      }
      $scope._ticketsPollRef.child($scope.channel.selected.$id).child($scope.user.info.id)
      .set(arrnvo, function(error) {
        if(error){
          //$scope.encuesta.pregunta=true;
        }else{
          //$scope.encuesta.pregunta=false;
          $scope.pollUPDATE($scope._pollRef.child($scope.channel.selected.$id).child("items").child(count),false);
          $scope.pollUPDATE($scope._pollRef.child($scope.channel.selected.$id),false);
          $timeout(function(){});
          //$scope.updateRifa();
        }
      });
    };
    $scope.votar = function($nom){
      var arrtemp = $scope.encuesta.poll.items;
      var count=0;
      for (var i = 0; i < arrtemp.length; i++) {
        if(arrtemp[i].nombre==$nom){
          count=i;
          break;
        }
      }
      var x = $scope.encuesta.arts.length;
      if(x<$scope.encuesta.poll.cantUser){
        $scope.encuesta.arts.push($nom);
        $scope._ticketsPollRef.child($scope.channel.selected.$id).child($scope.user.info.id)
        .set($scope.encuesta.arts, function(error) {
          if(error){
            //$scope.encuesta.pregunta=true;
          }else{
            //$scope.encuesta.pregunta=false;
            $scope.pollUPDATE($scope._pollRef.child($scope.channel.selected.$id).child("items").child(count),true);
            $scope.pollUPDATE($scope._pollRef.child($scope.channel.selected.$id),true);
          }
        });
      }
    };
    var clicButtonRifa = true;
    $scope.comprarBoletos = function(){
      if(clicButtonRifa){
        clicButtonRifa=false;
        $scope.getPosition();
        if($scope.formatted_address!=null || ($scope.rifa.art.countries===undefined && $scope.rifa.art.cities===undefined)) {
          var valid_user_location = false;
          if($scope.rifa.art.cities !== undefined) {
            var ArrB=$scope.rifa.art.cities;
            var contArr=ArrB.length;
            for (var i = 0; i < contArr; i++) {
              var temp = ArrB[i];
              if ($scope.formatted_address.indexOf(''+temp)!=-1) {
                valid_user_location=true;
                break;
              }
            }
          }
          if($scope.rifa.art.countries !== undefined) {
            var ArrB=$scope.rifa.art.countries;
            var contArr=ArrB.length;
            for (var i = 0; i < contArr; i++) {
              var temp = ArrB[i];
              if ($scope.formatted_address.indexOf(''+temp) != -1) {
                valid_user_location = true;
                break;
              }
            }
          }
          if($scope.rifa.art.countries === undefined && $scope.rifa.art.cities === undefined) {
            valid_user_location = true;
          }
          if(valid_user_location) {
            if(($scope.rifa.user.cant % 1) == 0 && $scope.rifa.user.cant > 0 && $scope.rifa.user.cant <= $scope.rifa.art.cantUser && $scope.rifa.user.cant <= ($scope.rifa.art.cant - $scope.rifa.art.cantComprados)) {
              for (var i = 0; i < $scope.rifa.user.cant; i++) {
                var ticket_was_bought = false;
                $scope._rifasRef.child($scope.channel.selected.$id).transaction(function(raffle) {
                  if (raffle) {
                    if (raffle.cantComprados < raffle.cant-1) {
                      raffle.cantComprados++;
                      ticket_was_bought = true;
                      return raffle;
                    } else {
                      return; // Abort the transaction
                    }
                  }
                  return raffle;
                }, function(error, committed, snapshot) {
                  console.log(error,committed,snapshot);
                  if (error) {
                    console.log('Transaction failed abnormally!', error);
                    // Add message to user
                  }
                  if(ticket_was_bought && committed) {
                    var count = 0;
                    $scope._ticketsRef.child($scope.channel.selected.$id).once("value", function(snapshot) {
                      //var newticket = $scope._ticketsRef.child($scope.channel.selected.$id)
                      //  .push({'userid': $scope.rifa.user.userid});
                      newticket = $scope._ticketsRef.child($scope.channel.selected.$id).push({'userid': $scope.rifa.user.userid});
                      var key = newticket.key();
                      if(key == null) {
                        // No key
                      } else {
                        //Exito
                        if($scope.rifa.user.ticketskey === undefined || $scope.rifa.user.ticketskey == null) {
                          $scope.rifa.user.ticketskey=[];
                        }
                        var bolcomp = $scope.rifa.user.ticketskey;
                        bolcomp.push(key);
                        $scope.rifa.user.ticketskey = bolcomp;
                        $scope.rifa.user.cant = bolcomp.length;
                        $scope._participantsRef.child($scope.channel.selected.$id).child($scope.user.info.id)
                          .set($scope.rifa.user, function(error) {
                            if(error) {
                              //$timeout(function(){$scope.rifa.pregunta = true;},10);
                              clicButtonRifa=true;
                            } else {
                               //$timeout(function(){$scope.rifa.pregunta = false;},10);
                              clicButtonRifa=false;
                            }
                          });
                      }
                    });
                  }
                });
              }
            } else if (!($scope.rifa.user.cant % 1) == 0) {
              alert("Deben ser numero enteros sin fracción");
              $timeout(function(){
                $scope.rifa.pregunta = true;
              },10);
              clicButtonRifa=true;
            } else if ($scope.rifa.user.cant <= 0 || $scope.rifa.user.cant > $scope.rifa.art.cantUser || $scope.rifa.user.cant===undefined){
              alert("Sobrepasas los limite de boletos debe ser minimo 1 y menos o igual que "+$scope.rifa.art.cantUser+" Ó Deben ser numero enteros sin fracción");
              $timeout(function(){
                $scope.rifa.pregunta = true;
              },10);
              clicButtonRifa=true;
            } else if ($scope.rifa.user.cant <= ($scope.rifa.art.cant - $scope.rifa.art.cantComprados)) {
              alert("Lo siento boletos agotados mas rapido la proxima vez");
              $timeout(function(){
                $scope.rifa.pregunta = true;
              },10);
              clicButtonRifa=true;
            } else if ($scope.rifa.user.cant > ($scope.rifa.art.cant - $scope.rifa.art.cantComprados)) {
              alert("Intentaste comprar mas boletos de los que hay disponibles, esto pasó porque alguien fue mas rápido que tú.");
              $timeout(function(){
                $scope.rifa.pregunta = true;
              },10);
              clicButtonRifa=true;
            } else {
              alert("Fallo");
              $timeout(function(){
                $scope.rifa.pregunta = true;
              },10);
              clicButtonRifa=true;
            }
          } else {
            alert('Esta rifa no es para tu región');
            $timeout(function(){
              $scope.rifa.pregunta = true;
            },10);
            clicButtonRifa=true;
          }
        } else {
          alert('Para participar debes activar la geolocalización en tu navegador. Si tu navegador no soporta geolocalización, cambia de navegador a uno más reciente.');
          $timeout(function(){
            $scope.rifa.pregunta = true;
          },10);
          clicButtonRifa=true;
        }
      }
    };
    $scope.deleteEncuesta = function(){
      if(confirm("Desea continuar con la eliminación de la Encuesta?")){
        $scope._pollRef.child($scope.channel.selected.$id).set(null);
        $scope._ticketsPollRef.child($scope.channel.selected.$id).set(null);
        $scope.encuesta = {
          create: false,
          active: false,
          pregunta: true,
          encuesta: false,
          arts: [],
          poll: null
        };
      }
    };
    $scope.deleteRifa = function() {
      if(confirm("Desea continuar con la eliminación de la rifa?")){
        $scope._rifasRef.child($scope.channel.selected.$id).set(null);
        $scope._participantsRef.child($scope.channel.selected.$id).set(null);
        $scope._ticketsRef.child($scope.channel.selected.$id).set(null);
        $scope.rifa.create=false;
        $scope.rifa.active=false;
        $scope.rifa.pregunta=false;
        $scope.rifa.rifa=false;
        $scope.rifa.art.cant=0;
        $scope.rifa.art.cantComprados=0;
        $scope.rifa.art.cantUser=0;
        $scope.rifa.art.imgUrl=null;
        $scope.rifa.art.nomArt=null;
        $scope.rifa.art.precioBole=0;
        $scope.rifa.art.userIdG=null;
        $scope.rifa.art.userIdGname=null;
        $scope.rifa.art.userIdGname_slug=null;
        $scope.rifa.art.userIdGemail=null;
        $scope.rifa.art.stop=false;
        $scope.rifa.art.countries=null;
        $scope.rifa.art.cities=null;
        $scope.rifa.art.go=false;
        $scope.rifa.user.cant=1;
      }

    };
    $scope.createRifa = function() {
      var modalInstance = $uibModal.open({
        templateUrl: '/app/partials/create-rifa.html',
        controller: 'RifaController',
        size: 'lg',
        resolve: {
          Items: function() //scope del modal
            {
                return $scope;
            }
        }
      });

      modalInstance.result.then(function() {}, function() {
        //$log.info('Modal dismissed at: ' + new Date());
      });
    };
    $scope.createEncuesta = function() {
      var modalInstance = $uibModal.open({
        templateUrl: '/app/partials/create-encuesta.html',
        controller: 'EncuestaController',
        size: 'lg',
        resolve: {
          Items: function() //scope del modal
            {
                return $scope;
            }
        }
      });

      modalInstance.result.then(function() {}, function() {
        //$log.info('Modal dismissed at: ' + new Date());
      });
    };
    $scope.getMentionable = function() {
      var new_people = [];

      angular.forEach($scope.members, function(member) {
        new_people.push({'label': member.username});
      })
      $scope.people = new_people;
    }

    $scope.goToBottom = function() {
      var mh_window = $('.message-history');
      if(mh_window[0]) {
        mh_window.scrollTop(mh_window[0].scrollHeight);
      }
      $scope.old_messages = [];
      $scope.scroll_help.scrolledUp = false;
    }

    $scope.changeChannel = function(channel) {
      if($scope.channel.selected == channel) return;

      if($scope.channel.selected != null) {
        exitChannel();
      }
      $scope.channel.selected = channel;
      $location.path('/chat/' + channel.slug);

      if($scope.channel.selected.fullscreen) {
        $scope.channel.selected.new_yt_code = $scope.channel.selected.fullscreen.video;
      } else {
        $scope.channel.selected.new_yt_code = "";
      }
      $scope.messages = [];

      // When messages are loaded on UI and also when a new message arrives
      /*$scope.messages.$loaded().then(function(x) {
        $timeout(function() {
          var mh_window = $('.message-history');
          if(mh_window[0]) {
            mh_window.scrollTop(mh_window[0].scrollHeight);
          }
        }, 200);

        x.$watch(function(event) {
          if(event.event === "child_added") {
            //console.log(event);
            if(!$scope.scroll_help.scrolledUp) {
              $timeout(function() {
                var mh_window = $('.message-history');
                if(mh_window[0]) {
                  mh_window.scrollTop(mh_window[0].scrollHeight);
                }
              }, 200);
            }
          }
        });
      });*/

      var membersRef = new Firebase(firebase_url + 'members/' + channel.$id);
      $scope.members = $firebaseArray(membersRef);
      membersRef.on('value', function(snapshot) {
        var new_people = [];
        snapshot.forEach(function(childSnapshot) {
          new_people.push({'label': childSnapshot.val().username});
        });
        $scope.people = new_people;
      });

      // Some status validation if user is logged in
      if($scope.user.isLogged) {
        $scope.promises.self.then(function() {
          var amOnline = new Firebase(firebase_url + '.info/connected');
          $scope._statusRef = new Firebase(firebase_url + 'members/' + channel.$id + '/' + $scope.user.info.id);

          amOnline.on('value', function(snapshot) {
            if(snapshot.val()) {
              var image = $scope.user.info.image || "";
              $scope._statusRef.onDisconnect().remove();
              $scope._statusRef.on('value', function(ss) {
                if( ss.val() == null ) {
                  // another window went offline, so mark me still online
                  $scope._statusRef.set({
                    id: $scope.user.info.id,
                    username: $scope.user.info.username,
                    image: image,
                    writing: false
                  });
                }
              });
            }
          });
        });

        //poll
        /*$scope._firebaseRefPoll = $scope._pollRef.child(channel.$id);
        $scope._firebaseRefTicketsPoll = $scope._ticketsPollRef.child(channel.$id).child($scope.user.info.id);
        $scope._firebaseRefPoll.on("value", function(snapshot) {
          //console.log(snapshot.val());
          if(snapshot.val()==null){
            //$scope.safeApply(function(){
            $timeout(function(){
              $scope.encuesta.create=false;
              $scope.encuesta.active=false;
              //$scope.encuesta.pregunta=true;
              $scope.encuesta.encuesta=false;
              $scope.encuesta.arts=[];
              $scope.encuesta.poll=null;
              $scope.alert_encuesta = false;
            });
            //});
          }else{
            $timeout(function(){
              $scope.encuesta.create=true;
              $scope.encuesta.active=true;
              $scope.encuesta.encuesta=true;
              $scope._firebaseRefTicketsPoll
              .on('value', function(snapshott) {
                if(snapshott.val()==null){
                  $scope.encuesta.arts=[];
                  //$scope.encuesta.pregunta=true;
                }else{
                  $scope.encuesta.arts=snapshott.val();
                  //$scope.encuesta.pregunta=false;
                }
              }, function (errorObject) {
                console.log("The read failed: " + errorObject.code);
              });
              $scope.encuesta.poll=snapshot.val();
              if($scope.radioModel!="encuesta")
                $scope.alert_encuesta = true;
            });
          }
        }, function (errorObject) {
          console.log("The read failed: " + errorObject.code);
        });*/

        //updates for rifas
        /*$scope._firebaseRefR = $scope._rifasRef.child(channel.$id);
        $scope._firebaseRefRPart = $scope._participantsRef.child(channel.$id).child($scope.user.info.id);
        $scope._firebaseRefRTickets = $scope._ticketsRef.child(channel.$id);
        //var firebaseRefRPartAdmin = $scope._participantsRef.child(channel.$id);
        $scope._firebaseRefR.on("value", function(snapshot) {
          //console.log(snapshot.val());
          if(snapshot.val()==null){
            //$scope.safeApply(function(){
            $timeout(function(){
              $scope.rifa.create=false;
              $scope.rifa.active=false;
              $scope.rifa.pregunta=false;
              $scope.rifa.rifa=false;
              $scope.rifa.art.cant=0;
              $scope.rifa.art.cantComprados=0;
              $scope.rifa.art.cantUser=0;
              $scope.rifa.art.imgUrl=null;
              $scope.rifa.art.nomArt=null;
              $scope.rifa.art.precioBole=0;
              $scope.rifa.art.userIdG=null;
              $scope.rifa.art.userIdGname=null;
              $scope.rifa.art.userIdGname_slug=null;
              $scope.rifa.art.userIdGemail=null;
              $scope.rifa.art.stop=false;
              $scope.rifa.art.countries=null;
              $scope.rifa.art.cities=null;
              $scope.rifa.art.go=false;
              $scope.rifa.user.cant=1;
              $scope.alert_rifa = false;
            });
            clicButtonRifa=true;
            //});
          }else{
            //$scope.safeApply(function(){
            $timeout(function(){
              $scope.rifa.create=true;
              $scope.rifa.active=true;
              $scope.rifa.rifa=true;
              $scope._participantsRef.child($scope.channel.selected.$id).child($scope.user.info.id)
              .once('value', function(snapshott) {
                if(snapshott.val()==null){
                  $timeout(function(){$scope.rifa.pregunta=true;});
                }else{
                  $timeout(function(){$scope.rifa.pregunta=false;});
                }
              }, function (errorObject) {
                console.log("The read failed: " + errorObject.code);
              });
              $scope.rifa.art.cant=snapshot.val().cant;
              $scope.rifa.art.cantUser=snapshot.val().cantUser;
              $scope.rifa.art.imgUrl=snapshot.val().imgUrl;
              $scope.rifa.art.nomArt=snapshot.val().nomArt;
              $scope.rifa.art.precioBole=snapshot.val().precioBole;
              $scope.rifa.art.cantComprados=snapshot.val().cantComprados;
              $scope.rifa.art.userIdG=snapshot.val().userIdG;
              $scope.rifa.art.userIdGname=snapshot.val().userIdGname;
              $scope.rifa.art.userIdGname_slug=snapshot.val().userIdGname_slug;
              $scope.rifa.art.userIdGemail=snapshot.val().userIdGemail;
              $scope.rifa.art.stop=snapshot.val().stop;
              $scope.rifa.art.countries=snapshot.val().countries;
              $scope.rifa.art.cities=snapshot.val().cities;
              $scope.rifa.art.go=snapshot.val().go;
              if($scope.radioModel!="rifa")
                $scope.alert_rifa = true;
            });
          }
        }, function (errorObject) {
          console.log("The read failed: " + errorObject.code);
        });*/
        /*$scope._firebaseRefRPart.on("value", function(snapshot) {
          if(snapshot.val()==null){
            $timeout(function(){
              $scope.rifa.pregunta=true;
              $scope.rifa.user.cant=1;
              $scope.rifa.user.userid=$scope.user.info.id;
              $scope.rifa.user.ticketskey=null;
            });
          }else{
            $timeout(function(){
              $scope.rifa.pregunta=false;
              $scope.rifa.user={
                cant:snapshot.val().cant,
                userid:snapshot.val().userid,
                ticketskey:snapshot.val().ticketskey
              };
            });
          }
        }, function (errorObject) {
          console.log("The read failed: " + errorObject.code);
        });*/

        /*if($scope.can('board-config')){
          $scope._firebaseRefRTickets.on("value", function(snapshot) {
            if(snapshot.val()==null){
              $scope._firebaseRefR.once("value", function(snapshott){
                if(snapshott.val()!=null){
                  $scope.updateRifa();
                }
              }, function(errorObjectt){
                console.log("The read failed: " + errorObjectt.code);
              });
            }else{
              $scope.updateRifa();
            }
          }, function (errorObject) {
            console.log("The read failed: " + errorObject.code);
          });
        }*/
      }
    };

    var exitChannel = function() {
      if($scope.channel.selected) {
        channel = $scope.channel.selected;
        if($scope.user.isLogged) {
          if($scope._statusRef) {
            $scope._statusRef.off();
            $scope._statusRef.set(null);
          }
          /*if($scope._firebaseRefR){
            $scope._firebaseRefR.off();
          }
          if($scope._firebaseRefRPart){
            $scope._firebaseRefRPart.off();
          }
          if($scope._firebaseRefRTickets){
            $scope._firebaseRefRTickets.off();
          }
          if($scope._firebaseRefTicketsPoll){
            $scope._firebaseRefTicketsPoll.off();
          }
          if($scope._firebaseRefPoll){
            $scope._firebaseRefPoll.off();
          }*/
        }
      }
    };

    $scope.updateChannelMeta = function(){
      if($scope.channel.selected.new_yt_code == "") {
        $scope.channel.selected.fullscreen = null;
      } else {
        if(!$scope.channel.selected.fullscreen) {
          $scope.channel.selected.fullscreen = {
            video: null
          };
        }
        $scope.channel.selected.fullscreen.video = $scope.channel.selected.new_yt_code;
      }
      $scope.channels.$save($scope.channel.selected);
    }

    $scope.addMessage = function() {
      if($scope.message.content && ($scope.message.content.length <= $scope._options.messagesLength && $scope.message.content.length > 0)) {
        // If message is contained in previous message, or viceversa, or they're the same...
        if($scope.message.content === $scope.message.previous || ($scope.message.previous.indexOf($scope.message.content) > -1) || ($scope.message.content.indexOf($scope.message.previous) > -1)) {
          setTimeout(function() {
            $scope.helpers.spam_count = 0;
            $scope.message.content = '';
            $scope.message.previous = '';
          }, 20000);
          $scope.helpers.spam_count++;
        } else {
          if($scope.helpers.spam_count > 0) {
            $scope.helpers.spam_count--;
          }
        }

        if($scope.helpers.spam_count > 2) {
          $('.input-box_text').blur();
          if($scope._userRef) {
            $scope._userRef.child('chat/blocked').set(true);
          }
          $scope.helpers.spam_count = 0;
          $scope.message.content = '';
        } else {
          $scope.message.previous = $scope.message.content;

          socket.emit('chat send', $scope.channel.selected.slug, $scope.message.content);

          /*$http.post(layer_path + 'chat/messages', {
            channel: $scope.channel.selected.slug,
            content: $scope.message.content
          }).then(function success(response) {
          }, function error(response) {
            console.log(response);
          });*/
          $scope.message.content = '';
          $scope.emojiMessage = {};
        }
      }
    }

    $scope.toggle_details = function() {
      $scope.show_details = !$scope.show_details;
    }

    $scope.suspendUser = function(userId, timeLengthSeconds) {
      //var suspendedUntil = new Date().getTime() + 1000*timeLengthSeconds;
      $scope._suspensionsRef.child(userId).set(true, function(error) {
        if (error) {
          console.log("error in user ban")
        } else {
          console.log("user was banned")
        }
      });
    };

    $scope.channels = $firebaseArray($scope._channelRef);
    $scope.channels.$loaded().then(function() {
      if($routeParams.slug != undefined) {
        var found = false;
        for(i in $scope.channels) {
          if($scope.channels[i].slug == $routeParams.slug) {
            $scope.changeChannel($scope.channels[i]);
            found = true;
            return;
          }
        }
      }
      $scope.changeChannel($scope.channels[0]);
    });

    $scope.checkValidation = function() {
      if($scope.user.isLogged) {
        $scope.promises.self.then(function() {

          $scope._userRef = $scope._firebase.child("users").child($scope.user.info.id);

          $scope._userRef.child('validated').once('value', function(ss) {
            if(ss.val() == true) {
              $scope.helpers.validated = true;
            }
          });

          $scope._userRef.child('chat/blocked').on('value', function(ss) {
            if(ss.val() == true) {
              $scope.helpers.blocked = true;
              $timeout(function(){
                $scope._userRef.child('chat/blocked').set(null);
                $scope.helpers.blocked = false;
              }, 60000);
            }
          });
        });
      }
    };
    $scope.checkValidation();

    $scope.$on("userLogged", function() {
      $scope.checkValidation();
    });

    $scope.$on("$destroy", function() {
      if($scope.can('debug')) console.log("Closing chat");
      exitChannel();
    });

    // Socket.io logic
    $scope.$watch('channel.selected.slug', function(newValue, oldValue) {
      if(oldValue !== undefined) {
        if($scope.can("debug")) console.log("Socket stop listening to 'chat " + newValue + "'");
        socket.removeAllListeners("chat " + oldValue);
      }
      if(newValue !== undefined) {
        /* Add socket listener */
        if($scope.can("debug")) console.log("Socket listening to 'chat " + newValue + "'");
        socket.on('chat ' + newValue, function (data) {
          debug = $scope.can("debug");
          if(debug) console.log("New event: ", data);

          angular.forEach(data.list, function(value, key) {
            console.log(value);
            // Create a new JavaScript Date object based on the timestamp
            // Will display time in 10:30:23 format
            var formattedTime = new Date(value.timestamp * 1000 - (5 * 60 * 60 * 1000)).toISOString().slice(-13, -5);

            message = {
              author: {
                id: value.user_id,
                image: value.avatar,
                username: value.username
              },
              content: value.content,
              created_at: formattedTime
            };
            if($scope.messages.length > 50) {
              $scope.messages.shift();
            }
            $scope.messages.push(message);

            if(!$scope.scroll_help.scrolledUp) {
              $timeout(function() {
                var mh_window = $('.message-history');
                if(mh_window[0]) {
                  mh_window.scrollTop(mh_window[0].scrollHeight);
                }
              }, 100);
            }
          });
        });
        socket.emit('chat update-me', newValue);
      }
    });

    // Scrolling responses
    $scope.scroll_help = {
      lastScrollTop: 0,
      from_top: 0,
      max_height: 0,
      last_height: 0,
      scrolledUp: false
    }

    jQuery('.message-history').scroll(function() {
      if($(this).scrollTop() / ($(this)[0].scrollHeight - $(this)[0].offsetHeight) < 0.80){
        $scope.scroll_help.from_top = $(this).scrollTop();
        $scope.scroll_help.max_height = $(this)[0].scrollHeight - $(this).height();
        // If scrolling further than possible... (happens because of some OS effects)
        if($scope.scroll_help.from_top > $scope.scroll_help.max_height) {
          $scope.scroll_help.from_top = $scope.scroll_help.max_height; // we "saturate" from_top distance
        }

        if ($scope.scroll_help.from_top >= $scope.scroll_help.lastScrollTop) {
          // downscroll code
          //if($scope.can('debug')) console.log("Scrolling downward");
          if($scope.scroll_help.from_top == $scope.scroll_help.max_height) {
            $scope.scroll_help.scrolledUp = false;
            $scope.old_messages = [];
          }
        } else {
          //if($scope.can('debug')) console.log("Scrolling upward");
          if($scope.scroll_help.last_height <= $scope.scroll_help.max_height) {
            // upscroll code
            $scope.scroll_help.scrolledUp = true;
          }
        }
        $scope.scroll_help.lastScrollTop = $scope.scroll_help.from_top;
        $scope.scroll_help.last_height = $scope.scroll_help.max_height;
      }
    });

    // Hack, so we don't have to reload the controller if the route uses the same controller
    var lastRoute = $route.current;
    $scope.$on('$locationChangeSuccess', function(event) {
      if(lastRoute.$$route.controller === $route.current.$$route.controller) {
        // Will not load only if my view use the same controller
        // We recover new params
        new_params = $route.current.params;
        $route.current = lastRoute;
        $route.current.params = new_params;
      }
    });
  }
];

var RifaController = [
  '$scope',
  '$firebaseArray',
  '$firebaseObject',
  '$modalInstance',
  'Items',
  '$http',
  'Upload',
  function($scope, $firebaseArray, $firebaseObject, $modalInstance, Items, $http ,Upload) {
    $scope.countriesarr = {
      model: null,
      availableOptions: [
        {value: 'Argentina', name: 'Argentina'},
        {value: 'Belice', name: 'Belice'},
        {value: 'Bolivia', name: 'Bolivia'},
        {value: 'Brasil', name: 'Brasil'},
        {value: 'Canad\u00e1', name: 'Canad\u00e1'},
        {value: 'Costa Rica', name: 'Costa Rica'},
        {value: 'Colombia', name: 'Colombia'},
        {value: 'Cuba', name: 'Cuba'},
        {value: 'Ecuador', name: 'Ecuador'},
        {value: 'Estados Unidos', name: 'Estados Unidos'},
        {value: 'España', name: 'España'},
        {value: 'El Salvador', name: 'El Salvador'},
        {value: 'Guatemala', name: 'Guatemala'},
        {value: 'Guyana', name: 'Guyana'},
        {value: 'Honduras', name: 'Honduras'},
        {value: 'M\u00e9xico', name: 'M\u00e9xico'},
        {value: 'Nicaragua', name: 'Nicaragua'},
        {value: 'Panam\u00e1', name: 'Panam\u00e1'},
        {value: 'Per\u00fa', name: 'Per\u00fa'},
        {value: 'Paraguay', name: 'Paraguay'},
        {value: 'Surinam', name: 'Surinam'},
        {value: 'Uruguay', name: 'Uruguay'},
        {value: 'Venezuela', name: 'Venezuela'}
      ]
    };
    $scope.citiesarr = {
      model: null,
      availableOptions: [
        {value: 'Aguascalientes', name: 'Aguascalientes'},
        {value: 'Baja California', name: 'Baja California'},
        {value: 'Baja California Sur', name: 'Baja California Sur'},
        {value: 'Campeche', name: 'Campeche'},
        {value: 'Chiapas', name: 'Chiapas'},
        {value: 'Chihuahua', name: 'Chihuahua'},
        {value: 'Coahuila', name: 'Coahuila'},
        {value: 'Colima', name: 'Colima'},
        {value: 'Distrito Federal', name: 'Distrito Federal'},
        {value: 'Estado de México', name: 'Estado de México'},
        {value: 'Ciudad de México', name: 'Ciudad de México'},
        {value: 'CDMX', name: 'CDMX'},
        {value: 'Méx.', name: 'Méx.'},
        {value: 'Durango', name: 'Durango'},
        {value: 'Guanajuato', name: 'Guanajuato'},
        {value: 'Guerrero', name: 'Guerrero'},
        {value: 'Hidalgo', name: 'Hidalgo'},
        {value: 'Jalisco', name: 'Jalisco'},
        {value: 'México', name: 'México'},
        {value: 'Michoacán', name: 'Michoacán'},
        {value: 'Morelos', name: 'Morelos'},
        {value: 'Nayarit', name: 'Nayarit'},
        {value: 'Nuevo León', name: 'Nuevo León'},
        {value: 'Puebla', name: 'Puebla'},
        {value: 'Querétaro', name: 'Querétaro'},
        {value: 'Quintana Roo', name: 'Quintana Roo'},
        {value: 'San Luis Potosí', name: 'San Luis Potosí'},
        {value: 'Sinaloa', name: 'Sinaloa'},
        {value: 'Sonora', name: 'Sonora'},
        {value: 'Tabasco', name: 'Tabasco'},
        {value: 'Tamaulipas', name: 'Tamaulipas'},
        {value: 'Tlaxcala', name: 'Tlaxcala'},
        {value: 'Veracruz', name: 'Veracruz'},
        {value: 'Yucatán', name: 'Yucatán'},
        {value: 'Zacatecas', name: 'Zacatecas'}
      ]
    };
    $scope.items = Items;
    $scope.rifa = {
      chatId: $scope.items.channel.selected.$id,
      userId: $scope.items.user.info.id,
      cant: 0,
      cantUser: 0,
      cantComprados: 0,
      precioBole: 0.00,
      nomArt: "",
      imgUrl: "",
      userIdG: null,
      userIdGname: null,
      userIdGname_slug: null,
      userIdGemail: null,
      stop: false,
      countries: null,
      cities: null,
      go: false
    };
    $scope.alert={
      msg:"",
      type:"success"
    };
    $scope.adding_img = false;

    var firebaseRef = new Firebase(firebase_url+'/raffles/'+$scope.items.channel.selected.$id);

    //var firebaseRefPart = new Firebase(firebase_url+'/participants');
    $scope.safeApply = function(fn) {
      var phase = this.$root.$$phase;
      if(phase == '$apply' || phase == '$digest') {
        if(fn && (typeof(fn) === 'function')) {
          fn();
        }
      } else {
        this.$apply(fn);
      }
    };
    $scope.save = function () {
      if($scope.rifa.cant===undefined || $scope.rifa.cant==null || $scope.rifa.cant<=0 || isNaN($scope.rifa.cant) || $scope.rifa.cant % 1 != 0){
        $scope.alert.msg="El campo Cantidad de boletos no puede estar vacio, menor o igual a cero y no numeros con fraccion";
        $scope.alert.type='warning';
        $scope.safeApply(function(){});
      } else if($scope.rifa.cantUser===undefined || $scope.rifa.cantUser==null || $scope.rifa.cantUser<=0 || isNaN($scope.rifa.cantUser) || $scope.rifa.cantUser % 1 != 0){
        $scope.alert.msg="El campo Cantidad de boletos por Usuario no puede estar vacio, menor o igual a cero y no numeros con fraccion";
        $scope.alert.type='warning';
        $scope.safeApply(function(){});
      } else if($scope.rifa.precioBole===undefined || $scope.rifa.precioBole==null || $scope.rifa.precioBole<0 || isNaN($scope.rifa.precioBole)){
        $scope.alert.msg="El campo Precio por boleto no puede estar vacio, recuerde solo 2 numeros despues del punto decimal";
        $scope.alert.type='warning';
        $scope.safeApply(function(){});
      } else if($scope.rifa.nomArt===undefined || $scope.rifa.nomArt==""){
        $scope.alert.msg="El campo Nombre del articulo no puede estar vacio";
        $scope.alert.type='warning';
        $scope.safeApply(function(){});
      } else if($scope.rifa.imgUrl===undefined || $scope.rifa.imgUrl==""){
        $scope.alert.msg="Aun no carga una imagen";
        $scope.alert.type='warning';
        $scope.safeApply(function(){});
      } else {
        var rifaChat = {
          userId: $scope.items.user.info.id,
          cant: $scope.rifa.cant+1,
          cantUser: $scope.rifa.cantUser,
          cantComprados: $scope.rifa.cantComprados,
          precioBole: $scope.rifa.precioBole,
          nomArt: $scope.rifa.nomArt,
          imgUrl: $scope.rifa.imgUrl,
          userIdG: null,
          userIdGname: null,
          userIdGname_slug: null,
          userIdGemail: null,
          stop: false,
          countries: $scope.rifa.countries,
          cities: $scope.rifa.cities,
          go: false
        };
        firebaseRef.set(rifaChat, function(error) {
          if(error){
            $scope.items.rifa.create=false;
            $scope.$apply(function(){
              $scope.alert.msg=error;
              $scope.alert.type='danger';
            });
          }else{
            $scope.items.rifa.create=true;
            $scope.$apply(function(){
              $scope.alert.msg='Creado correctamente';
              $scope.alert.type='success';
            });
          }
        });
      }
    };
    $scope.cancel = function () {
      $modalInstance.dismiss('cancel');
    };
    $scope.uploadPicture = function(files) {
      if(files.length == 1) {
        var file = files[0];
        $scope.adding_img = true;
        Upload.upload({
          url: layer_path + "post/image",
          file: file
        }).success(function (data) {
          if(!$scope.rifa.imgUrl.length > 0) {
            $scope.rifa.imgUrl += data.url;
          } else {
            $scope.rifa.imgUrl = data.url;
          }
          $scope.adding_img = false;
        }).error(function(data) {
          $scope.adding_img = false;
        });
      }
    };
  }
];
var EncuestaController = [
  '$scope',
  '$firebaseArray',
  '$firebaseObject',
  '$modalInstance',
  'Items',
  '$http',
  'Upload',
  function($scope, $firebaseArray, $firebaseObject, $modalInstance, Items, $http, Upload) {
    $scope.items = Items;
    $scope.item = {
      nombre:"",
      cant:0,
      imgUrl:""
    };
    $scope.data = {
      model: null,
      availableOptions: []
    };
    $scope.arrritem=[];
    $scope.encuesta = {
      chatId: $scope.items.channel.selected.$id,
      userId: $scope.items.user.info.id,
      pregunta: "",
      stop: false,
      go: false,
      items: null,
      cant: 0,
      cantUser: 1
    };
    $scope.alert={
      msg:"",
      type:"success"
    };
    $scope.alert2={
      msg:"",
      type:"success"
    };
    $scope.adding_img = false;
    var firebaseRef = new Firebase(firebase_url+'/poll/'+$scope.items.channel.selected.$id);
    var firebaseRef2 = new Firebase(firebase_url+'/polls/'+$scope.items.channel.selected.$id);
    //var firebaseRefPart = new Firebase(firebase_url+'/participants');
    $scope.safeApply = function(fn) {
      var phase = this.$root.$$phase;
      if(phase == '$apply' || phase == '$digest') {
        if(fn && (typeof(fn) === 'function')) {
          fn();
        }
      } else {
        this.$apply(fn);
      }
    };
    $scope.select_poll = function(){
      firebaseRef2.once("value", function(snapshot) {
        var data = snapshot.val();
        if(data==null){
          $scope.alert2.msg="No hay Encuestas creadas";
          $scope.alert2.type='warning';
          $scope.safeApply(function(){});
        }else{
          for(var i in data) {
            if($scope.data.model!=null && i+""==$scope.data.model+""){
              $scope.encuesta=data[i];
              $scope.arrritem=data[i].items;
              $scope.alert2.msg="Encuesta  cargada correctamente";
              $scope.alert2.type='success';
              $scope.safeApply(function(){});
            }else if($scope.data.model==null || $scope.data.model===undefined){
              $scope.alert2.msg="Seleccione un opcion para cargar";
              $scope.alert2.type='warning';
              $scope.safeApply(function(){});
            }
          }
          $scope.safeApply(function(){});
        }
      }, function (errorObject) {
        console.log("The read failed: " + errorObject.code);
      });
    };
    $scope.buscar_poll = function(){
      firebaseRef2.once("value", function(snapshot) {
        var data = snapshot.val();
        if(data==null){
          $scope.alert2.msg="No hay Encuestas creadas";
          $scope.alert2.type='warning';
          $scope.safeApply(function(){});
        }else{
          for(var i in data) {
            $scope.data.availableOptions.push(
              {id: i, name: data[i].pregunta}
            );
          }
          $scope.safeApply(function(){});
        }
      }, function (errorObject) {
        console.log("The read failed: " + errorObject.code);
      });
    };
    $scope.save_poll = function(){
      if($scope.encuesta.cantUser===undefined || $scope.encuesta.cantUser==null || $scope.encuesta.cantUser<=0 || isNaN($scope.encuesta.cantUser) || $scope.encuesta.cantUser % 1 != 0){
        $scope.alert.msg="El campo Votos por usuario no puede estar vacio, menor o igual a cero y no numeros con fraccion";
        $scope.alert.type='warning';
        $scope.safeApply(function(){});
      }else if($scope.arrritem.length <= 1 && $scope.encuesta.pregunta != ""){
        $scope.alert.msg="Debe agregar por lo menos 2 items a la encuesta";
        $scope.alert.type='warning';
        $scope.safeApply(function(){});
      }else if($scope.arrritem.length > 1 && $scope.encuesta.pregunta == ""){
        $scope.alert.msg="No debes dejar el campo Pregunta Vacio";
        $scope.alert.type='warning';
        $scope.safeApply(function(){});
      }else if($scope.arrritem.length <= 1 && $scope.encuesta.pregunta == ""){
        $scope.alert.msg="Debe agregar por lo menos 2 items a la encuesta, No debes dejar el campo Pregunta Vacio";
        $scope.alert.type='warning';
        $scope.safeApply(function(){});
      }else{
        var arrtemp=[];
        for (var i = 0; i < $scope.arrritem.length; i++) {
          arrtemp.push({
            nombre: $scope.arrritem[i].nombre,
            cant: $scope.arrritem[i].cant,
            imgUrl: $scope.arrritem[i].imgUrl
          });
        }
        $scope.encuesta.items=arrtemp;
        var data = $scope.encuesta;
        var newticket=firebaseRef2
        .push(data);
        var key = newticket.key();
        if(key==null){
          $scope.alert.msg='Problemas al guardar la Encuesta, intente otravez pueden ser problemas de conexión';
          $scope.alert.type='warning';
          $scope.safeApply(function(){});
        }else{
          $scope.alert.msg='Encuesta Guardada correctamente';
          $scope.alert.type='success';
          $scope.safeApply(function(){});
        }
      }
    };
    $scope.remove_item = function($nombre){
      var arrtemp=[];
      for (var i = 0; i < $scope.arrritem.length; i++) {
        if($scope.arrritem[i].nombre!=$nombre){
          arrtemp.push($scope.arrritem[i]);
        }
      }
      $scope.arrritem=arrtemp;
    };
    $scope.add_item = function() {
      if($scope.item.nombre==""){
        $scope.alert.msg="No debes dejar el campo Nombre del item Vacio";
        $scope.alert.type='warning';
        $scope.safeApply(function(){});
      }else{
        var nomequal=false;
        for (var i = 0; i < $scope.arrritem.length; i++) {
          if($scope.arrritem[i].nombre==$scope.item.nombre){
            nomequal=true;
          }
        }
        if(nomequal){
          $scope.alert.msg="El nombre "+$scope.item.nombre+" ya existe en la lista de items";
          $scope.alert.type='warning';
          $scope.safeApply(function(){});
        }else{
          $scope.arrritem.push({
            nombre: $scope.item.nombre,
            cant: $scope.item.cant,
            imgUrl: $scope.item.imgUrl
          });
          $scope.item.nombre="";
          $scope.item.cant=0;
          $scope.item.imgUrl="";
        }
      }
    };
    $scope.save = function (){
      if($scope.encuesta.cantUser===undefined || $scope.encuesta.cantUser==null || $scope.encuesta.cantUser<=0 || isNaN($scope.encuesta.cantUser) || $scope.encuesta.cantUser % 1 != 0){
        $scope.alert.msg="El campo Votos por usuario no puede estar vacio, menor o igual a cero y no numeros con fraccion";
        $scope.alert.type='warning';
        $scope.safeApply(function(){});
      }else if($scope.arrritem.length <= 1 && $scope.encuesta.pregunta != ""){
        $scope.alert.msg="Debe agregar por lo menos 2 items a la encuesta";
        $scope.alert.type='warning';
        $scope.safeApply(function(){});
      }else if($scope.arrritem.length > 1 && $scope.encuesta.pregunta == ""){
        $scope.alert.msg="No debes dejar el campo Pregunta Vacio";
        $scope.alert.type='warning';
        $scope.safeApply(function(){});
      }else if($scope.arrritem.length <= 1 && $scope.encuesta.pregunta == ""){
        $scope.alert.msg="Debe agregar por lo menos 2 items a la encuesta, No debes dejar el campo Pregunta Vacio";
        $scope.alert.type='warning';
        $scope.safeApply(function(){});
      }else{
        var arrtemp=[];
        for (var i = 0; i < $scope.arrritem.length; i++) {
          arrtemp.push({
            nombre: $scope.arrritem[i].nombre,
            cant: $scope.arrritem[i].cant,
            imgUrl: $scope.arrritem[i].imgUrl
          });
        }
        $scope.encuesta.items=arrtemp;

        var data = $scope.encuesta;
        firebaseRef.set(data, function(error) {
          if(error){
            $scope.items.encuesta.create=false;
            $scope.$apply(function(){
              $scope.alert.msg=error;
              $scope.alert.type='danger';
            });
          }else{
            $scope.items.encuesta.create=true;
            $scope.$apply(function(){
              $scope.alert.msg='Creada correctamente';
              $scope.alert.type='success';
            });
          }
        });
      }
    };
    $scope.uploadPicture = function(files) {
      if(files.length == 1) {
        var file = files[0];
        $scope.adding_img = true;
        Upload.upload({
          url: layer_path + "post/image",
          file: file
        }).success(function (data) {
          if(!$scope.item.imgUrl.length > 0) {
            $scope.item.imgUrl += data.url;
          } else {
            $scope.item.imgUrl = data.url;
          }
          $scope.adding_img = false;
        }).error(function(data) {
          $scope.adding_img = false;
        });
      }
    };
    $scope.cancel = function (){
      $modalInstance.dismiss('cancel');
    };
  }
];
var chatModule = angular.module('chatModule', ['firebase', 'ngSanitize']);

chatModule.controller('ChatController', ChatController);
chatModule.controller('RifaController', RifaController);
chatModule.controller('EncuestaController', EncuestaController);

chatModule.directive('sgEnter', function() {
  return {
    link: function(scope, element, attrs) {
      //console.log(scope.message.send_on_enter);
      element.bind("keydown keypress", function(event) {
        if(event.which === 13 && scope.message.send_on_enter) {
          scope.$apply(function(){
            scope.$eval(attrs.sgEnter, {'event': event});
          });
          event.preventDefault();
        }
      });
    }
  };
});

chatModule.directive('youtube', function($sce) {
  return {
    restrict: 'EA',
    scope: {
      code: '='
    },
    replace: true,
    template: '<div class="yt-video"><iframe style="overflow:hidden;height:100%;width:100%" width="100%" height="100%" src="{{url}}" frameborder="0" allowfullscreen></iframe></div>',
    link: function (scope) {
      scope.$watch('code', function (newVal) {
        if (newVal) {
          scope.url = $sce.trustAsResourceUrl("https://www.youtube.com/embed/" + newVal);
        }
      });
    }
  };
});

chatModule.directive('showImages', [function() {
  var urlPattern = /(http|https):\/\/[\w-]+(\.[\w-]+)+([\w.,@?^=%&amp;:\/~+#-]*[\w@?^=%&amp;\/~+#-])?/gi;
  /*var regex = new RegExp("(https?:\/\/.*\\.(?:png|jpg|jpeg|gif)((\\?|\\&)[a-zA-Z0-9]+\\=[a-zA-Z0-9]+)*)", "gi");
  var to_replace = "<div class=\"img-preview\"><div class=\"url-text\">$1 <i class=\"fa fa-chevron-down\"></i><i class=\"fa fa-chevron-up\"></i></div><a href=\"$1\" target=\"_blank\" ng-show=\"show_image\"><img src=\"$1\"></a></div>";*/

  var entityMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': '&quot;',
    "'": '&#39;'
  };

  function escapeHtml(string) {
    return String(string).replace(/[&<>"']/g, function (s) {
      return entityMap[s];
    });
  }

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

  return {
    restrict: 'A',
    scope: {
      'content' : '@',
      'username' : '@'
    },
    replace: true,
    link: function (scope, element, attrs, controller) {
      var usernamePattern = new RegExp("(\@" + scope.username + ")", "gi");
      var unReplace = "<span class=\"mention\">$1</span>"

      //scope.$watch('content', function (value) {
        var text = escapeHtml(scope.content);
        /*scope.show_image = false;
        var images = text.replace(regex, to_replace);*/
        var new_text = text.replace(urlPattern, '<a target="_blank" href="$&">$&</a>');
        new_text = new_text.replace(rEmojis, function (match, text) {
                return "<i class='emoji emoji_" + text + "' title=':" + text + ":'>" + text + "</i>";
            });
        if(scope.username) {
          new_text = new_text.replace(usernamePattern, unReplace);
        }
        element.html(new_text);
      //});
    }
  };
}]);