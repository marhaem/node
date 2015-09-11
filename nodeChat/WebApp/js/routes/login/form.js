import $ from 'jquery';
import 'bootstrap';
import riot from 'riot';

riot.tag(
    'login-form',
    '<div class="container">' +
      '<form class="form-signin">' +
        '<h2 class="form-signin-heading">Please sign in</h2>' +
        '<label for="inputEmail" class="sr-only">Email address</label>' +
        '<input type="email" id="inputEmail" class="form-control" placeholder="Email address" required="" autofocus="">' +
        '<label for="inputPassword" class="sr-only">Password</label>' +
        '<input type="password" id="inputPassword" class="form-control" placeholder="Password" required="">' +
        '<div class="checkbox">' +
          '<label>' +
            '<input type="checkbox" value="remember-me"> Remember me' +
          '</label>' +
        '</div>' +
        '<button class="btn btn-lg btn-primary btn-block" type="submit" onclick="{ onClick }">Sign in</button>' +
      '</form>' +
    '</div>',
    function(opts) {
        this.onClick = function onClick() {
            // ajax call to rest service
            
            // response is good
            // --> store login response
            //     --> route (hash) to chat
            
            // response is bad
            // --> display something
        };
    }
);