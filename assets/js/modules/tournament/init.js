var TournamentModule = angular.module('sg.module.tournament', []);


// Rank module controllers
TournamentModule.controller('TournamentController', ['$scope', '$timeout', function($scope, $timeout) {

  var firebaseRef = new Firebase(firebase_url);
  // Instantiate a new connection to Firebase.
  $scope._firebase = firebaseRef;
  $scope._matchesRef = $scope._firebase.child('matches');


  $scope.section = 'groups';

  $scope.groups = [
    {'name': 'A', 'members': [
      {username:'RealWhistle8',steam_id:'RealWhistle8',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0},
      {username:'Leon',steam_id:'',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0},
      {username:'Dxmnttx',steam_id:'',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0},
      {username:'Meneses',steam_id:'',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0}
    ]},
    {'name': 'B', 'members': [
      {username:'shanks-bosco',steam_id:'Shanks_Bosco',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0},
      {username:'hjean17',steam_id:'hjean16',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0},
      {username:'jose-santillan-batani',steam_id:'drsantillanbatani',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0},
      {username:'eurovancrazy',steam_id:'eurovancrazy',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0}
    ]},
    {'name': 'C', 'members': [
      {username:'WarHell',steam_id:'WarHell',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0},
      {username:'KeinterCabezas',steam_id:'iKeinter',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0},
      {username:'Antonio-v',steam_id:'Antonio-V',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0},
      {username:'Drak',steam_id:'Drak Spartan',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0}
    ]},
    {'name': 'D', 'members': [
      {username:'nobody',steam_id:'nobody',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0},
      {username:'FBNKB',steam_id:'fbnkb',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0},
      {username:'Cesar-tiza',steam_id:'CesarTiza',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0},
      {username:'Miguemex64',steam_id:'',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0}
    ]},
    {'name': 'E', 'members': [
      {username:'TogeXD',steam_id:'TogexD',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0},
      {username:'Furybomber-Mancilla',steam_id:'',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0},
      {username:'Sadak-gr',steam_id:'Sadak',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0},
      {username:'Diego-armando-jordan-gonzalez',steam_id:'',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0}
    ]},
    {'name': 'F', 'members': [
      {username:'AcidRod',steam_id:'Rocky Raccoon',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0},
      {username:'GTBrother',steam_id:'GTBrother',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0},
      {username:'Jimp',steam_id:'Jimp',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0},
      {username:'Jharet-rulz',steam_id:'jharet89',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0}
    ]},
    {'name': 'G', 'members': [
      {username:'IdealistaMx',steam_id:'iDeaLiSTaMx',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0},
      {username:'Sheik000',steam_id:'Sheik000',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0},
      {username:'MauSV',steam_id:'',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0},
      {username:'DiegoWinchester',steam_id:'',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0}
    ]},
    {'name': 'H', 'members': [
      {username:'BolilloSpartano',steam_id:'BolilloSpartano',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0},
      {username:'Calvi',steam_id:'Calvi',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0},
      {username:'Sheko',steam_id:'',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0},
      {username:'Dannielnino',steam_id:'Dannielnino',pj:0,pg:0,pp:0,gf:0,gc:0,dg:0,points:0}
    ]},
  ];

  $scope.final_matches = []


  // Load matches
  var fb_info = [];
  $scope._matchesRef.once('value', function(ss) {
    console.log("Loading...")
    fb_info = ss.val();
    console.log("Loaded", fb_info)

    // Calculate matches
    for(var i in $scope.groups) {
      $scope.groups[i].matches = [];
      var members = $scope.groups[i].members
      for(var j in members) {
        for(var k in members) {
          if(members[j].username != members[k].username) {
            var slug = members[j].username + '-' + members[k].username;
            //console.log('Reading from ', slug)
            var match = null;
            if(fb_info && slug in fb_info) {
              match = fb_info[slug];
              if(match.winner != "") {
                //console.log("winner!", match.winner);
                for(m in members) {
                  if(members[m].username == match.winner) {
                    members[m].pj++;
                    members[m].pg++;
                    members[m].points += 3;
                    if(match.player1_score > match.player2_score) {
                      members[m].gf += match.player1_score;
                      members[m].gc += match.player2_score;
                    } else {
                      members[m].gf += match.player2_score;
                      members[m].gc += match.player1_score;
                    }
                    members[m].dg = members[m].gf - members[m].gc;
                  }
                  if(members[m].username == match.loser) {
                    members[m].pj++;
                    members[m].pp++;
                    if(match.player1_score > match.player2_score) {
                      members[m].gf += match.player2_score;
                      members[m].gc += match.player1_score;
                    } else {
                      members[m].gf += match.player1_score;
                      members[m].gc += match.player2_score;
                    }
                    members[m].dg = members[m].gf - members[m].gc;
                  }
                }
              }
            } else {
              match = {
                player1: members[j].username,
                player2: members[k].username,
                player1_score: "",
                player2_score: "",
                winner: "",
                loser: "",
                date: "29/04/2016 20:45"
              }
              $scope._matchesRef.child(slug).set(match);
            }
            //console.log(match);
            $scope.groups[i].matches.push(match);
          }
        }
      }
      //console.log($scope.groups[i].matches);
    }
    for(var m = 1; m < 16; m++) {
      var slug = "G" + m;
      if(fb_info && slug in fb_info) {
        match = fb_info[slug];
        /*if(match.winner != "") {
          //console.log("winner!", match.winner);
          for(m in members) {
            if(members[m].username == match.winner) {
              members[m].pj++;
              members[m].pg++;
              members[m].points += 3;
              if(match.player1_score > match.player2_score) {
                members[m].gf += match.player1_score;
                members[m].gc += match.player2_score;
              } else {
                members[m].gf += match.player2_score;
                members[m].gc += match.player1_score;
              }
              members[m].dg = members[m].gf - members[m].gc;
            }
            if(members[m].username == match.loser) {
              members[m].pj++;
              members[m].pp++;
              if(match.player1_score > match.player2_score) {
                members[m].gf += match.player2_score;
                members[m].gc += match.player1_score;
              } else {
                members[m].gf += match.player1_score;
                members[m].gc += match.player2_score;
              }
              members[m].dg = members[m].gf - members[m].gc;
            }
          }
        }*/
      } else {
        match = {
          player1: "",
          player2: "",
          player1_score: "",
          player2_score: "",
          winner: "",
          loser: "",
          date: "07/05/2016 20:00",
          slug: slug
        }
        $scope._matchesRef.child(slug).set(match);
      }
      $scope.final_matches.push(match);
    }
  });

  $scope.updateScore = function(match, group) {
    var slug = match.player1 + '-' + match.player2;
    //console.log('saving...', slug, match);
    console.log(match);
    var new_match = {
      player1: match.player1,
      player2: match.player2,
      player1_score: match.player1_score !== "" ? match.player1_score : "",
      player2_score: match.player2_score !== "" ? match.player2_score : "",
      winner: "",
      loser: "",
      date: match.date
    }
    if(match.player1_score !== "" && match.player2_score !== "") {
      if(match.player1_score > match.player2_score) {
        new_match.winner = match.player1;
        new_match.loser = match.player2;
      } else {
        new_match.winner = match.player2;
        new_match.loser = match.player1;
      }
    }
    console.log(new_match);
    $scope._matchesRef.child(slug).set(new_match);

    group.matches[slug] = new_match;

    for(m in group.members) {
      group.members[m].pj=0;
      group.members[m].pg=0;
      group.members[m].pp=0;
      group.members[m].gf=0;
      group.members[m].gc=0;
      group.members[m].dg=0;
      group.members[m].points=0;
    }
    for(ma in group.matches) {
      for(m in group.members) {
        if(group.members[m].username == group.matches[ma].winner) {
          group.members[m].pj++;
          group.members[m].pg++;
          group.members[m].points += 3;
          if(group.matches[ma].player1_score > group.matches[ma].player2_score) {
            group.members[m].gf += group.matches[ma].player1_score;
            group.members[m].gc += group.matches[ma].player2_score;
          } else {
            group.members[m].gf += group.matches[ma].player2_score;
            group.members[m].gc += group.matches[ma].player1_score;
          }
          group.members[m].dg = group.members[m].gf - group.members[m].gc;
        }
        if(group.members[m].username == group.matches[ma].loser) {
          group.members[m].pj++;
          group.members[m].pp++;
          if(group.matches[ma].player1_score > group.matches[ma].player2_score) {
            group.members[m].gf += group.matches[ma].player2_score;
            group.members[m].gc += group.matches[ma].player1_score;
          } else {
            group.members[m].gf += group.matches[ma].player1_score;
            group.members[m].gc += group.matches[ma].player2_score;
          }
          group.members[m].dg = group.members[m].gf - group.members[m].gc;
        }
      }
    }
    match.editing = false;
  };
}]);