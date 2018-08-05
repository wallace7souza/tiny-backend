global.NODE_ENV = process.env.NODE_ENV || 'development';
var express = require('express');
var glob = require('glob');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var passport = require('passport');
var passportJWT = require('passport-jwt');
var ExtractJwt = passportJWT.ExtractJwt;
var JwtStrategy = passportJWT.Strategy;
var config = require('./config/env/' + NODE_ENV + '.js');

const path = require('path');
var annotations = require('annotations');
var db = require('./config/sequelize');


var params = {
    secretOrKey: config.jwtSecret,
    jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme("jwt")
};

var strategy = new JwtStrategy(params, function (jwt_payload, next) {
    console.log('payload received', jwt_payload);
    // usually this would be a database call:

    db.User.findOne({where: {id: jwt_payload.id, status: 'ENABLED'}}).then(function (user) {
        if (user) {
            next(null, user);
        } else {
            next(null, false);
        }
    });

});
passport.use(strategy);

var app = express();

function startup() {

    console.log(db.User);
    app.use(bodyParser.json());
    app.use(passport.initialize());
    app.use(bodyParser.urlencoded({extended: false}));
    app.use(cookieParser());

    glob("./controllers/*.controller.js", {}, function (er, files) {
        // files is an array of filenames.
        // If the `nonull` option is set, and nothing
        // was found, then files is ["**/*.js"]
        // er is an error object or null.

        var authenticate = passport.authenticate('jwt', {session: false});

        files.forEach(filePath => {
            let controllerPath = path.resolve(filePath);
            //console.log(controllerPath) ;
            var controller = require(controllerPath);
            var routerAnotations = annotations.getSync(controllerPath);

            Object.keys(routerAnotations).forEach(function (functionName) {

                let methods = ['GET', 'POST', 'PUT', 'DELETE'];
                var requestMethod = null;
                for (x = 0, method = methods[x]; x < methods.length; x++, method = methods[x]) {
                    if (routerAnotations[functionName][method]) {
                        requestMethod = method.toLowerCase();
                        break;
                    }
                }


                var chainResponse = [];

                if (requestMethod) {
                    if (routerAnotations[functionName].authenticated || routerAnotations[functionName].role) {

                        chainResponse.push(authenticate)
                    }
                    if (routerAnotations[functionName].role) {

                        chainResponse.push(function (req, res, next) {

                            let roles = this.split(',');
                            if (roles.indexOf(req.user.role) > -1) {
                                if (next) {
                                    next();
                                }
                            } else {
                                res.status(403).send('role not authorized')
                            }

                        }.bind(routerAnotations[functionName].role));
                    }
                    if (routerAnotations[functionName].model) {

                        chainResponse.push(function (req, res, next) {

                            function isJson(str) {
                                try {
                                    JSON.parse(str);
                                } catch (e) {
                                    return false;
                                }
                                return true;
                            }

                            console.log(this);
                            var model = this.trim();
                            if (isJson(model)) {
                                /** TODO: Fazer validação a partir de json*/
                            }else{
                                /** TODO: Melhorar validação para N níveis  do json*/
                                var attrs = model.split(',');
                                attrs.forEach(attr=>{
                                    if(!req.body.hasOwnProperty(attr)){
                                    // if(!req.body[attr]){
                                        res.status(400).send(`${attr} not found`);
                                        return;
                                    }
                                })
                                
                            }

                        }.bind(routerAnotations[functionName].model));
                    }

                    chainResponse.push(controller[functionName]);


                    let routeMethod = '/api' + (controller.prefix ? '/' + controller.prefix : '') + routerAnotations[functionName].path;
                    app.route(routeMethod)[requestMethod](chainResponse);

                    console.log(requestMethod, routeMethod);
                }
                else if (routerAnotations[functionName].PathParam) {
                    app.param(routerAnotations[functionName].PathParam, controller[functionName])
                }

                //console.log(functionName,routerAnotations[functionName]);
            });

        });


        app.use(function (req, res, next) {
            var err = new Error('Not Found');
            err.status = 404;
            next(err);
        });

// error handler
        app.use(function (err, req, res, next) {
            // set locals, only providing error in development
            res.locals.message = err.message;
            res.locals.error = req.app.get('env') === 'development' ? err : {};

            // render the error page
            res.status(err.status || 500);
            res.render('error');
        });


    });

    // require('./cron/send-sms-daily.cron');


}

db.init(startup);

module.exports = app;
// Synchronous version
//var result = annotations.getSync('./controllers/authenticate.controller.js');



