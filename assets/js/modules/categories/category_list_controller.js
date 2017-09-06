var CategoryListController = ['$scope', '$rootScope', '$timeout', '$location', 'Category', 'Feed', 'Bridge', '$route', '$routeParams', '$http', 'socket',
    function($scope, $rootScope, $timeout, $location, Category, Feed, Bridge, $route, $routeParams, $http, socket) {
        $scope.categories = [];
        $scope.resolving = {
            categories: true,
            init: false,
            older: false,
            newer: false,
            loaded: false,
        };

        $scope.category = {};
        $scope.posts = []; // General feed
        $scope.top_posts = []; // Top feed
        $scope.offset = 0; // We use this to know how many posts have we loaded

        // Auxiliar variable to know what comment to show
        $scope.view_comment = {
            position: -1
        };

        $scope.activePostId = null;
        $scope.viewing = {
            top_posts: false
        };

        $scope.showTopPosts = function() {
            $scope.viewing.top_posts = true;
            $scope.getTopFeed();
        };

        $scope.hideTopPosts = function() {
            $scope.viewing.top_posts = false;
        };


        $scope.toggleCategories = function() {
            $scope.status.show_categories = !$scope.status.show_categories;
            if (!$scope.status.show_categories) {
                $scope.startupFeed($scope.category);
            }
            $timeout(function() {
                $scope.$broadcast('changedContainers');
            }, 50);
        }

        $scope.appendCategories = function(data, mark_as_unread) {
            mark_as_unread = typeof mark_as_unread !== 'undefined' ? mark_as_unread : false;
            for (p in data) {
                for (c in $scope.categories) {
                    for (s in $scope.categories[c].subcategories) {
                        if (data[p].category == $scope.categories[c].subcategories[s].id)  {
                            data[p].category = {
                                name: $scope.categories[c].subcategories[s].name,
                                color: $scope.categories[c].color,
                                slug: $scope.categories[c].subcategories[s].slug
                            }
                            break;
                        }
                    }
                }
                if (mark_as_unread) {
                    data[p].unread = true;
                    data[p].new = true;
                }
            }
        };

        $scope.getTopFeed = function() {
            $scope.resolving_posts = true;
            $scope.top_posts = [];
            var date = new Date();

            var request_vars = {
                limit: 30,
                offset: 0,
                relevant: date.getFullYear() + '-' + ("0" + (date.getMonth() + 1)).slice(-2) + '-' + ("0" + date.getDate()).slice(-2)
            };

            Feed.get(request_vars, function(response) {
                $scope.appendCategories(response.feed);

                $scope.top_posts = response.feed;
                $scope.page.title = "SpartanGeek.com | Comunidad de tecnología, geeks y más";
                $scope.page.description = "Creamos el mejor contenido para Geeks, y lo hacemos con pasión e irreverencia de Spartanos.";
                $scope.resolving_posts = false;
            });
        };

        $scope.startupFeed = function(category) {
            $scope.resolving_posts = true;
            $scope.posts = [];
            $scope.resolving.loaded = false;

            var vp_h = $(window).height();
            var limit = 10 * Math.ceil(vp_h / 700);

            Feed.get({
                limit: limit,
                offset: 0,
                category: category.id
            }, function(data) {

                // For logged users, sync the feed position for new messages notifications
                if ($scope.user.isLogged) {
                    $scope.status.pending = 0;
                    // For sync purposes
                    if (category.slug == null) {
                        $scope.status.viewing = 'all';
                    } else {
                        $scope.status.viewing = category.id;
                    }
                }

                if (data.feed.length > 0) {
                    $scope.appendCategories(data.feed);
                    $scope.status.newer_post_date = get_newer_date(data.feed);
                    $scope.posts = data.feed;
                }

                // Title... ToDo: Use a service to update this
                if (category.slug != null)  {
                    $scope.page.title = "SpartanGeek.com | " + category.name;
                    $scope.page.description = category.description;
                } else {
                    $scope.page.title = "SpartanGeek.com | Comunidad de tecnología, geeks y más";
                    $scope.page.description = "Creamos el mejor contenido para Geeks, y lo hacemos con pasión e irreverencia de Spartanos.";
                }

                $scope.resolving_posts = false;
                $scope.offset = data.feed.length;
                $scope.resolving.loaded = true;
            });
        };

        $scope.walkFeed = function() {
            //console.log($scope.resolving.older);
            if (!$scope.resolving.older) {
                $scope.resolving.older = true;
                var pending = $scope.status.pending;
                //console.log($scope.offset, pending);
                Feed.get({
                    limit: 10,
                    offset: $scope.offset + pending,
                    category: $scope.category.id
                }, function(data) {
                    $scope.appendCategories(data.feed);
                    $scope.posts = $scope.posts.concat(data.feed);
                    $scope.offset = $scope.offset + data.feed.length;
                    $scope.resolving.older = false;
                });
                dataLayer.push({
                    'event': 'VirtualPageview',
                    'virtualPageURL': '/feed/' + $scope.category.slug,
                });
            } else {
                console.log("FeedGet already running...");
            }
        };

        var get_newer_date = function(posts) {
            var newer_d = new Date(posts[0].created_at);
            var newer_i = 0;
            for (var i = 1; i < posts.length; i++) {
                var test = new Date(posts[i].created_at);
                if (newer_d < test)  {
                    newer_d = test;
                    newer_i = i;
                }
            }
            return posts[newer_i].created_at;
        }

        $scope.getNewer = function(scroll_to) {
            scroll_to = typeof scroll_to !== 'undefined' ? scroll_to : true;

            if (!$scope.resolving.newer) {
                $scope.resolving.newer = true;
                var pending = $scope.status.pending;

                Feed.get({
                    limit: pending,
                    before: $scope.status.newer_post_date,
                    category: $scope.category.id
                }, function success(data) {
                    if (data.feed.length > 0) {
                        // append and mark as unread
                        $scope.appendCategories(data.feed, true);
                        // return to feed if in top posts
                        $scope.viewing.top_posts = false;

                        // Visual helper in posts
                        $timeout(function()  {
                            for (p in data.feed) {
                                data.feed[p].new = false;
                            }
                        }, 1500);

                        $scope.status.newer_post_date = get_newer_date(data.feed);

                        $scope.posts = data.feed.concat($scope.posts);
                        $scope.offset = $scope.offset + data.feed.length;
                        $scope.status.pending -= data.feed.length;
                    } else {
                        $scope.status.pending = 0;
                    }
                    $scope.resolving.newer = false;
                    if (scroll_to) {
                        // return to the top of the feed
                        $('.discussions-list').animate({
                            scrollTop: 0
                        }, 100);
                    }
                }, function(error) {
                    console.log("Error getting new posts");
                    $scope.status.pending = 0;
                });
                // Push event to Google Analytics
                dataLayer.push({
                    'event': 'VirtualPageview',
                    'virtualPageURL': '/feed/' + $scope.category.slug,
                });
            } else {
                console.log("FeedGet already running...");
            }
        };

        $scope.turnCategory = function(category) {
            $scope.category = category;
            $scope.startupFeed(category);

            //ga('send', 'pageview', '/category/' + $scope.category.slug);
            dataLayer.push({
                'event': 'VirtualPageview',
                'virtualPageURL': '/category/' + $scope.category.slug,
            });
        };

        /*
         * Toggle individual category switch, if error, invert switch
         */
        $scope.toggleSubscription = function(category) {
            if (category.selected) {
                $http.put(layer_path + 'category/subscription/' + category.id)
                    .then(function success(response) {
                        if ($scope.user.info.categories) {
                            if ($scope.user.info.categories.indexOf(category.id) == -1) {
                                $scope.user.info.categories.push(category.id);
                            }
                        } else {
                            $scope.user.info.categories = [category.id];
                        }
                    }, function(error) {
                        category.selected = false;
                    });
            } else {
                $http.delete(layer_path + 'category/subscription/' + category.id)
                    .then(function success(response) {
                        if ($scope.user.info.categories) {
                            if ($scope.user.info.categories.indexOf(category.id) > -1) {
                                $scope.user.info.categories.splice($scope.user.info.categories.indexOf(category.id), 1);
                            }
                        }
                    }, function(error) {
                        category.selected = true;
                    });
            }
        };

        /*
         * Toggle all upper switch
         */
        $scope.subscribeToAll = function() {
            for (c in $scope.categories) {
                for (s in $scope.categories[c].subcategories) {
                    if (!$scope.categories[c].subcategories[s].selected) {
                        $scope.categories[c].subcategories[s].selected = true;
                        $scope.toggleSubscription($scope.categories[c].subcategories[s]);
                    }
                }
            }
        }

        $scope.viewPost = function(post) {
            $scope.activePostId = post.id;
            $scope.status.post_selected = true;
            Bridge.changePost(post);

            //ga('send', 'pageview', '/post/' + $scope.category.slug + '/' + post.id);
            dataLayer.push({
                'event': 'VirtualPageview',
                'virtualPageURL': '/post/' + $scope.category.slug + '/' + post.id,
            });
        };

        $scope.viewPostID = function(postId, slug) {
            $scope.activePostId = postId;
            $scope.status.post_selected = true;
            Bridge.changePost({
                id: postId,
                slug: slug,
                name: ""
            });

            //ga('send', 'pageview', '/post/' + slug + '/' + postId);
            dataLayer.push({
                'event': 'VirtualPageview',
                'virtualPageURL': '/post/' + slug + '/' + postId,
            });
        };

        $scope.reloadPost = function() {
            $scope.viewPostID($scope.activePostId, "");
        }

        $scope.matchCategories = function() {
            // For loged users, we match their personal feed current values
            if ($scope.user.isLogged) {
                $scope.promises.self.then(function success(response) {
                    if ($scope.user.info.categories) {
                        for (var i in $scope.categories) {
                            for (var j in $scope.categories[i].subcategories) {
                                if ($scope.user.info.categories.indexOf($scope.categories[i].subcategories[j].id) > -1) {
                                    $scope.categories[i].subcategories[j].selected = true;
                                }
                            }
                        }
                    }
                });
            }
        };

        $scope.consolidateComments = function(post) {
            post.unread = false;
            if (!post.comments.new) {
                post.comments.new = 0;
            }
            post.comments.count += post.comments.new;
            post.comments.new = 0;
        }

        /* Watchers */
        $scope.$on('userLogged', function(e)  {
            $scope.matchCategories();
        });

        $scope.$on('reloadPost', function(e)  {
            $scope.reloadPost();
        });

        $scope.$on('postDeleted', function(e) {
            // Doing...
        });

        $scope.$on('comments-loaded', function(event, data) {
            for (var i = 0; i < $scope.posts.length; i++) {
                if ($scope.posts[i].id == data.id) {
                    $scope.consolidateComments($scope.posts[i]);
                    break;
                }
            }
        });

        socket.on('feed action', function(data) {
            debug = $scope.can("debug");
            if (data.fire) {
                switch (data.fire) {
                    case "new-post":
                        if (debug) console.log("New event: new-post", data);
                        if ($scope.status.viewing == 'all' || $scope.status.viewing == data.category) {
                            $scope.status.pending++;
                        }
                        break;
                    case "new-comment":
                        if (debug) console.log("New event: new-comment", data);
                        for (var i = 0; i < $scope.posts.length; i++) {
                            if ($scope.posts[i].id == data.id) {
                                console.log($scope.posts[i]);
                                if (!$scope.posts[i].comments.new) {
                                    $scope.posts[i].comments.new = 0;
                                }
                                if ($scope.user.isLogged) {
                                    $scope.promises.self.then(function() {
                                        if (data.user_id != $scope.user.info.id) {
                                            $scope.posts[i].comments.new++;
                                            $scope.posts[i].unread = true;
                                        }
                                    });
                                } else {
                                    $scope.posts[i].comments.count++;
                                }
                                break;
                            }
                        }
                        if ($scope.user.isLogged) {
                            $scope.promises.self.then(function() {
                                if (data.user_id != $scope.user.info.id) {
                                    $scope.$broadcast('new-comment', data);
                                }
                            });
                        }
                        break;
                    case "delete-post":
                        if (debug) console.log("New event: delete-post");
                        for (var i = 0; i < $scope.posts.length; i++) {
                            if ($scope.posts[i].id == data.id) {
                                $scope.posts.splice(i, 1);
                                $scope.offset--;
                                break;
                            }
                        }
                        break;
                    case "delete-comment":
                        if (debug) console.log("New event: delete-comment");
                        for (var i = 0; i < $scope.posts.length; i++) {
                            if ($scope.posts[i].id == data.id) {
                                $scope.posts[i].comments.count--;
                                break;
                            }
                        }
                        break;
                    case "pinned":
                        if (debug) console.log("New event: pinned");
                        for (var i = 0; i < $scope.posts.length; i++) {
                            if ($scope.posts[i].id == data.id) {
                                $scope.posts[i].pinned = true;
                                break;
                            }
                        }
                        break;
                    case "unpinned":
                        if (debug) console.log("New event: unpinned");
                        for (var i = 0; i < $scope.posts.length; i++) {
                            if ($scope.posts[i].id == data.id) {
                                //$scope.posts[i].pinned = false;
                                delete $scope.posts[i].pinned;
                                break;
                            }
                        }
                        break;
                    case "best-answer":
                        if (debug) console.log("New event: best-answer");
                        for (var i = 0; i < $scope.posts.length; i++) {
                            if ($scope.posts[i].id == data.id) {
                                $scope.posts[i].solved = true;
                                break;
                            }
                        }
                        break;
                    case "changed-title":
                        if (debug) console.log("New event: changed-title");
                        for (var i = 0; i < $scope.posts.length; i++) {
                            if ($scope.posts[i].id == data.id) {
                                $scope.posts[i].title = data.title;
                                $scope.posts[i].slug = data.slug;
                                break;
                            }
                        }
                    default:
                        if (debug) console.log("I don't know what the hell did Blacker say!")
                }
            }
        });

        $scope.$on('$destroy', function(event, data) {
            if ($scope.can("debug")) console.log("Socket stop listening to 'feed action'");
            socket.removeAllListeners('feed action');
        });

        // Hack, so we don't have to reload the controller if the route uses the same controller
        var lastRoute = $route.current;
        $scope.$on('$locationChangeSuccess', function(event) {
            if ($location.path() !== '/') {
                if (lastRoute.$$route.controller === $route.current.$$route.controller) {
                    // console.log(lastRoute.$$route.controller, $route.current.$$route.controller);
                    // Will not load only if my view use the same controller
                    // We recover new params
                    new_params = $route.current.params;
                    $route.current = lastRoute;
                    $route.current.params = new_params;

                    // get the current path
                    var loc = $location.path();
                    var params = $route.current.params;
                    //console.log(loc, params);
                    if (loc.indexOf("/c/") >= 0) {
                        for (var i in $scope.categories) {
                            for (var j in $scope.categories[i].subcategories) {
                                if ($scope.categories[i].subcategories[j].slug == params.slug) {
                                    $scope.category = $scope.categories[i].subcategories[j];
                                    break;
                                }
                            }
                        }
                        $scope.toggleCategories();
                    } else if (loc.indexOf("/p/") >= 0) {
                        var cn = loc.split('/');
                        if (cn.length == 5) {
                            cn = cn[4]; // comment number
                            //console.log("Watching comment:", cn);
                            $scope.view_comment.position = cn;
                        } else {
                            $scope.view_comment.position = -1;
                        }
                        $scope.viewPostID(params.id, params.slug);
                    }
                } else {
                    $scope.status.post_selected = false;
                }
            } else {
                $scope.status.post_selected = false;
            }
        });

        // Resolve categories though
        Category.query(function(data) {
            $scope.resolving.categories = false;
            $scope.categories = data;
            $scope.matchCategories();

            $timeout(function() {
                $scope.$broadcast('changedContainers');
            }, 100);

            // Once the categories has been resolved then catch the first one and try to fetch the feed for it
            var path = $location.path();
            var loaded = false;

            if (path.length > 0) {
                var segments = path.split("/");
                var section_segment = segments[1];
                var category_segment = segments[2];

                if (section_segment === 'c') {
                    for (var i in $scope.categories) {
                        for (var j in $scope.categories[i].subcategories) {
                            if ($scope.categories[i].subcategories[j].slug == category_segment) {
                                $scope.category = $scope.categories[i].subcategories[j];
                                $scope.startupFeed($scope.category);
                                $scope.$broadcast('scrollMeUpdate');
                                loaded = true;
                                break;
                            }
                        }
                    }
                } else if (section_segment === 'p') {
                    $scope.viewPostID($routeParams.id, $routeParams.slug);
                    var cn = path.split('/');
                    if (cn.length == 5) {
                        cn = cn[4]; // comment number
                        $scope.view_comment.position = cn;
                    } else {
                        $scope.view_comment.position = -1;
                    }
                }
            }
            if (loaded == false) {
                $scope.startupFeed($scope.category);
            }
        });
    }
];