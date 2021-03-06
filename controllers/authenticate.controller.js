var db = require('../config/sequelize');

/**
 *
 * @POST
 * @path /authenticate
 */
exports.authenticate = function (req, res, next) {

    function validateEmail(email) {
        var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(email);
    }

    // if ((req.body.email || req.body.username) && req.body.password) {
    if ((req.body.email || req.body.username || req.body.cpf) && req.body.password) {

        var userId = req.body.email || req.body.username || req.body.cpf;
        var password = req.body.password;

        var where = {};
        if (validateEmail(userId)) {
            where.email = userId;
        } else {//if(req.body.cpf){
            where.cpf = userId;
        }
        // where.status = 'ENABLED';

        db.User.find({where: where}).then(function (user) {

            if (!user)  {
                res.type('json');
                //done(null, false, { message: 'Unknown user' });
                res.status(401).send({message: 'Unknown user'});
            }
             else {

                var crypto = require('crypto');
                var salt2 = new Buffer(user.salt, 'base64');
                var hashedPassword = crypto.pbkdf2Sync(req.body.password, salt2, 10000, 64, 'sha1').toString('base64');

                if (hashedPassword == user.hashedPassword) {
                    var jwt = require("jwt-simple");
                    var cfg = require('../config/env/' + NODE_ENV + '.js');
                    var payload = {id: user.id, username: user.username,role:user.role};
                    if (!req.body.rememberMe) {

                    }
                    var token = jwt.encode(payload, cfg.jwtSecret);
                    delete user.dataValues.hashedPassword;
                    delete user.dataValues.salt;
                    res.json({user: user, token: token});
                } else {
                    res.status(401).send({message: 'Invalid user or password'});
                }


            }
        }).catch(function (err) {
            res.status(401).send(err);
        });

    } else {
        res.sendStatus(401);
    }

};

/**
 * @POST
 * @path /update-password
 * @authenticated
 */
exports.updatePassword = (req, res, next) => {

    /** req.user is authenticated user */
    var user = req.user;
    var crypto = require('crypto');
    var salt2 = new Buffer(user.salt, 'base64');

    var hashedPassword = crypto.pbkdf2Sync(req.body.currentPassword, salt2, 10000, 64,'sha1').toString('base64');


    if (user.hashedPassword != hashedPassword) {
        res.status(400).send({error: 'Senha atual inválida'});
        return;
    } else {

        user.hashedPassword = crypto.pbkdf2Sync(req.body.newPassword, salt2, 10000, 64,'sha1').toString('base64');

        user.save().then(function () {
            res.send();
        });

    }

};

/**
 * @POST
 * @path  /create
 * @role ADMIN
 */
exports.create = function (req, res, next) {

    var crypto = require('crypto');

    //req.body is user json model
    req.body.status = 'ENABLED';
    var user = db.User.build(req.body);

    user.provider = 'local';
    user.salt = crypto.randomBytes(16).toString('base64');

    var salt2 = new Buffer(user.salt, 'base64');
    try {
        // console.log(crypto.getHashes());
        user.hashedPassword = crypto.pbkdf2Sync(req.body.password, salt2, 10000, 64, 'sha1').toString('base64');
    } catch (err) {
        console.log(err);
    }


    console.log('New User (local) : { id: ' + user.id + ' username: ' + user.username + ' }');

    user.save().then(function (user) {
        res.json(user);
    }).catch(function (err) {
        res.status(500).send(err);
    });

};
