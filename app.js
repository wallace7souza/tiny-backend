let PROCESS_ENV = null;
var path = require("path");
var resolve = path.resolve;
var fs = require('fs');

process.argv.forEach(function (val, index, array) {
    if (val.indexOf('NODE_ENV=') > -1) {
        let processenv = val.replace('NODE_ENV=','');
        PROCESS_ENV = processenv;
    }
});

global.NODE_ENV = PROCESS_ENV || process.env.NODE_ENV || 'development';


let path1 = resolve('./config/env/' + NODE_ENV + '.js');
if (!fs.existsSync(path1)) {

    console.log('Arquivo de ambiente não encontrado ' + path1);
    process.exit();
}

var express = require('express');
var glob = require('glob');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var cors = require('cors');
var forceSsl = require('force-ssl');

var passport = require('passport');
var passportJWT = require('passport-jwt');
var ExtractJwt = passportJWT.ExtractJwt;
var JwtStrategy = passportJWT.Strategy;
var config = require('./config/env/' + NODE_ENV + '.js');

var annotations = require('annotations');
var db = require('./config/sequelize');
var CronJob = require('cron').CronJob;

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
app.use(cors());
forceSsl.https_port = config.app.port;
if (process.env.NODE_ENV && process.env.NODE_ENV === 'production') {
    app.use(forceSsl);
}

function startup() {

    console.log(db.User);
    app.use(bodyParser.json());
    app.use(passport.initialize());
    app.use(bodyParser.urlencoded({extended: false}));
    app.use(cookieParser());

    app.route('/').get(function (req, res, next) {
        res.send({enviroment: NODE_ENV});
    });

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
                            } else {
                                /** TODO: Melhorar validação para N níveis  do json*/
                                var attrs = model.split(',');
                                attrs.forEach(attr => {
                                    if (!req.body.hasOwnProperty(attr)) {
                                        // if(!req.body[attr]){
                                        res.status(400).send(`${attr} not found`);
                                        return;
                                    }
                                });

                                next();

                            }

                        }.bind(routerAnotations[functionName].model));
                    }

                    chainResponse.push(controller[functionName]);


                    var routeMethod = null;

                    if (routerAnotations[functionName].path) {
                        routeMethod = '/api' + (controller.prefix ? '/' + controller.prefix : '') + routerAnotations[functionName].path;
                    } else {
                        routeMethod = '/api' + (controller.prefix ? '/' + controller.prefix : '') + routerAnotations[functionName][requestMethod.toUpperCase()];
                    }

                    console.log(requestMethod, routeMethod);
                    app.route(routeMethod)[requestMethod](chainResponse);
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

    glob("./service/*.service.js", {}, function (er, files) {

        files.forEach(filePath => {
            let servicePath = path.resolve(filePath);
            var service = require(servicePath);
            var routerAnotations = annotations.getSync(servicePath);

            // console.log(filePath);
            Object.keys(routerAnotations).forEach(function (functionName) {

                if (routerAnotations[functionName].CronJob) {
                    let cronJob = new CronJob(routerAnotations[functionName].CronJob, service[functionName], null, true, 'America/Sao_Paulo');
                }
                if (routerAnotations[functionName].Init) {
                    service[functionName]();
                }

            })
        })
    })


}

db.init(startup);

module.exports = app;
// Synchronous version
//var result = annotations.getSync('./controllers/authenticate.controller.js');



